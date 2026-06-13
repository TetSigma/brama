import type { ChatStreamEvent, SendChatInput } from '@/@types/chat'
import { streamMockChat } from './chatMock'

/**
 * Toggle between the mock adapter and the real `/api/chat` SSE endpoint.
 * BE has no chat route yet, so the mock is the default. Flip via VITE_USE_MOCK_CHAT=false.
 */
const USE_MOCK = import.meta.env.VITE_USE_MOCK_CHAT !== 'false'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

/** Real SSE client — parses `event:`/`data:` frames from POST /api/chat. */
async function* streamRealChat(
  input: SendChatInput,
  signal?: AbortSignal,
): AsyncGenerator<ChatStreamEvent> {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
    body: JSON.stringify(input),
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

    let boundary = buffer.indexOf('\n\n')
    while (boundary !== -1) {
      const frame = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      boundary = buffer.indexOf('\n\n')

      const eventLine = frame.split('\n').find((line) => line.startsWith('event:'))
      const dataLine = frame.split('\n').find((line) => line.startsWith('data:'))
      if (!eventLine) continue

      const event = eventLine.slice(6).trim()
      const data = dataLine ? JSON.parse(dataLine.slice(5).trim()) : {}

      if (event === 'token') yield { type: 'token', delta: data.delta }
      else if (event === 'blocks') yield { type: 'blocks', blocks: data.blocks }
      else if (event === 'meta') yield { type: 'meta', answerId: data.answerId, grounded: data.grounded }
      else if (event === 'done') yield { type: 'done' }
    }
  }
}

export function streamChat(
  input: SendChatInput,
  signal?: AbortSignal,
): AsyncGenerator<ChatStreamEvent> {
  return USE_MOCK ? streamMockChat(input) : streamRealChat(input, signal)
}
