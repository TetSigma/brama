import type { ChatStreamEvent, SendChatInput } from '@/@types/chat'
import { streamMockChat } from './chatMock'

/**
 * Toggle between the real `/api/chat` stream and the mock adapter.
 * Use VITE_USE_MOCK_CHAT=true for local UI-only work without the backend.
 */
const USE_MOCK = import.meta.env.VITE_USE_MOCK_CHAT === 'true'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

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

/** Real streaming client for POST /api/chat. Supports plain text chunks and SSE frames. */
async function* streamRealChat(
  input: SendChatInput,
  signal?: AbortSignal,
): AsyncGenerator<ChatStreamEvent> {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
    body: JSON.stringify(toRequestBody(input)),
    signal,
  })

  if (!response.ok || !response.body) {
    throw new Error(`Chat request failed: ${response.status}`)
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += value

    if (!buffer.includes('event:')) {
      yield { type: 'token', delta: buffer }
      buffer = ''
      continue
    }

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
    yield { type: 'token', delta: buffer }
  }
}

export function streamChat(
  input: SendChatInput,
  signal?: AbortSignal,
): AsyncGenerator<ChatStreamEvent> {
  return USE_MOCK ? streamMockChat(input) : streamRealChat(input, signal)
}
