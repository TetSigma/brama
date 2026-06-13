import type { ChatStreamEvent, SendChatInput } from '@/@types/chat'
import { streamMockChat } from './chatMock'

/**
 * Toggle between the real `/api/chat` stream and the mock adapter.
 * Use VITE_USE_MOCK_CHAT=true for local UI-only work without the backend.
 */
const USE_MOCK = import.meta.env.VITE_USE_MOCK_CHAT === 'true'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''
const MIN_COMPLETE_TEXT_LENGTH = 8
const MAX_STREAM_ATTEMPTS = 2

class IncompleteChatResponseError extends Error {
  readonly responseText: string

  constructor(responseText: string) {
    super('Chat response ended before a complete answer was received')
    this.name = 'IncompleteChatResponseError'
    this.responseText = responseText
  }
}

type ChatRequestBody = {
  conversationId: string
  lang: string
  message: string
  documentId?: string
  action?: SendChatInput['action']
}

function toRequestBody(input: SendChatInput): ChatRequestBody {
  return {
    conversationId: input.conversationId,
    lang: input.lang,
    message: input.message,
    ...(input.documentId ? { documentId: input.documentId } : {}),
    ...(input.action ? { action: input.action } : {}),
  }
}

function parseSseFrame(frame: string): ChatStreamEvent | null {
  const lines = frame.split(/\r?\n/)
  const eventLine = lines.find((line) => line.startsWith('event:'))
  if (!eventLine) return null

  const dataLines = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
  const data = dataLines.length > 0 ? JSON.parse(dataLines.join('\n')) : {}
  const event = eventLine.slice(6).trim()

  if (event === 'token') return { type: 'token', delta: data.delta ?? '' }
  if (event === 'blocks') return { type: 'blocks', blocks: data.blocks }
  if (event === 'meta') return { type: 'meta', answerId: data.answerId, grounded: data.grounded }
  if (event === 'done') return { type: 'done' }

  return null
}

async function* streamPlainText(
  response: Response,
  attempt: number,
): AsyncGenerator<ChatStreamEvent> {
  const reader = response.body?.pipeThrough(new TextDecoderStream()).getReader()
  if (!reader) return

  let receivedLength = 0
  let fullResponse = ''
  let pendingText = ''
  let hasFlushedPendingText = false

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue

      fullResponse += value
      receivedLength += value.trim().length

      if (hasFlushedPendingText) {
        yield { type: 'token', delta: value }
      } else {
        pendingText += value
        if (receivedLength >= MIN_COMPLETE_TEXT_LENGTH) {
          hasFlushedPendingText = true
          yield { type: 'token', delta: pendingText }
          pendingText = ''
        }
      }
    }

    if (receivedLength > 0 && receivedLength < MIN_COMPLETE_TEXT_LENGTH) {
      throw new IncompleteChatResponseError(fullResponse)
    }
  } finally {
    console.info('[chat] full server response', {
      attempt,
      complete: receivedLength === 0 || receivedLength >= MIN_COMPLETE_TEXT_LENGTH,
      length: fullResponse.length,
      response: fullResponse,
    })
  }
}

async function* streamSse(response: Response, attempt: number): AsyncGenerator<ChatStreamEvent> {
  const reader = response.body?.pipeThrough(new TextDecoderStream()).getReader()
  if (!reader) return

  let buffer = ''
  let fullResponse = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += value
      fullResponse += value

      let boundary = buffer.indexOf('\n\n')
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        boundary = buffer.indexOf('\n\n')

        const event = parseSseFrame(frame)
        if (event) yield event
      }
    }

    if (buffer.length > 0) {
      const event = parseSseFrame(buffer)
      if (event) yield event
    }
  } finally {
    console.info('[chat] full server response', {
      attempt,
      complete: true,
      length: fullResponse.length,
      response: fullResponse,
    })
  }
}

/** Real streaming client for POST /api/chat. Supports plain text chunks and SSE frames. */
async function* streamRealChatAttempt(
  input: SendChatInput,
  attempt: number,
  signal?: AbortSignal,
): AsyncGenerator<ChatStreamEvent> {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/plain' },
    body: JSON.stringify(toRequestBody(input)),
    signal,
  })

  if (!response.ok || !response.body) {
    throw new Error(`Chat request failed: ${response.status}`)
  }

  const contentType = response.headers.get('content-type') ?? ''
  console.info('[chat] server response headers', {
    attempt,
    contentType,
    status: response.status,
    url: response.url,
  })

  if (contentType.includes('text/event-stream')) {
    yield* streamSse(response, attempt)
    return
  }

  yield* streamPlainText(response, attempt)
}

async function* streamRealChat(
  input: SendChatInput,
  signal?: AbortSignal,
): AsyncGenerator<ChatStreamEvent> {
  for (let attempt = 1; attempt <= MAX_STREAM_ATTEMPTS; attempt += 1) {
    try {
      yield* streamRealChatAttempt(input, attempt, signal)
      return
    } catch (error) {
      const shouldRetry =
        error instanceof IncompleteChatResponseError && attempt < MAX_STREAM_ATTEMPTS
      console.warn('[chat] server response incomplete', {
        attempt,
        retrying: shouldRetry,
        response: error instanceof IncompleteChatResponseError ? error.responseText : undefined,
      })

      if (!shouldRetry) {
        throw error
      }
    }
  }
}

export function streamChat(
  input: SendChatInput,
  signal?: AbortSignal,
): AsyncGenerator<ChatStreamEvent> {
  return USE_MOCK ? streamMockChat(input) : streamRealChat(input, signal)
}
