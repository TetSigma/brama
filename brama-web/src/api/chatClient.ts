import type { ChatStreamEvent, SendChatInput } from '@/@types/chat'
import { streamMockChat } from './chatMock'

/**
 * Toggle between the real `/api/chat` stream and the mock adapter.
 * Use VITE_USE_MOCK_CHAT=true for local UI-only work without the backend.
 */
const USE_MOCK = import.meta.env.VITE_USE_MOCK_CHAT === 'true'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''
const BLOCKS_DELIMITER = '\n--BRAMA--\n'

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

function maybeParseBlocksEnvelope(rawEnvelope: string): unknown | null {
  try {
    const parsed = JSON.parse(rawEnvelope) as unknown
    if (typeof parsed !== 'object' || parsed === null || !('blocks' in parsed)) {
      return null
    }

    return (parsed as { blocks: unknown }).blocks
  } catch {
    return null
  }
}

function couldBeBlocksEnvelope(buffer: string): boolean {
  const trimmed = buffer.trimStart()
  return trimmed.length === 0 || trimmed.startsWith('{')
}

async function* streamPlainText(response: Response): AsyncGenerator<ChatStreamEvent> {
  const reader = response.body?.pipeThrough(new TextDecoderStream()).getReader()
  if (!reader) return

  let fullResponse = ''
  let pendingEnvelope = ''
  let envelopeResolved = false

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue

      fullResponse += value
      console.info('[chat] server response chunk', value)

      if (envelopeResolved) {
        yield { type: 'token', delta: value }
        continue
      }

      pendingEnvelope += value
      const delimiterIndex = pendingEnvelope.indexOf(BLOCKS_DELIMITER)
      if (delimiterIndex !== -1) {
        const rawEnvelope = pendingEnvelope.slice(0, delimiterIndex)
        const prose = pendingEnvelope.slice(delimiterIndex + BLOCKS_DELIMITER.length)
        const blocks = maybeParseBlocksEnvelope(rawEnvelope)

        envelopeResolved = true
        pendingEnvelope = ''

        if (blocks !== null) {
          yield { type: 'blocks', blocks }
        } else {
          yield { type: 'token', delta: `${rawEnvelope}${BLOCKS_DELIMITER}` }
        }
        if (prose.length > 0) {
          yield { type: 'token', delta: prose }
        }
        continue
      }

      if (!couldBeBlocksEnvelope(pendingEnvelope)) {
        envelopeResolved = true
        yield { type: 'token', delta: pendingEnvelope }
        pendingEnvelope = ''
      }
    }

    if (!envelopeResolved && pendingEnvelope.length > 0) {
      yield { type: 'token', delta: pendingEnvelope }
    }
  } finally {
    console.info('[chat] full server response', {
      length: fullResponse.length,
      response: fullResponse,
    })
  }
}

async function* streamSse(response: Response): AsyncGenerator<ChatStreamEvent> {
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
      console.info('[chat] server response chunk', value)

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
      length: fullResponse.length,
      response: fullResponse,
    })
  }
}

/** Real streaming client for POST /api/chat. Supports plain text chunks and SSE frames. */
async function* streamRealChat(
  input: SendChatInput,
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
    contentType,
    status: response.status,
    url: response.url,
  })

  if (contentType.includes('text/event-stream')) {
    yield* streamSse(response)
    return
  }

  yield* streamPlainText(response)
}

export function streamChat(
  input: SendChatInput,
  signal?: AbortSignal,
): AsyncGenerator<ChatStreamEvent> {
  return USE_MOCK ? streamMockChat(input) : streamRealChat(input, signal)
}
