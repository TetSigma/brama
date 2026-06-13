import type { AnswerBlock } from './schema/blocks'

export type RoleMode = 'young' | 'senior' | 'worker'

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  /** Streamed prose (markdown). Grows during streaming. */
  text: string
  /** Structured answer blocks, attached once the `blocks` event arrives. */
  blocks: AnswerBlock[]
  citationsGrounded?: boolean
  /** True while tokens are still streaming in. */
  streaming?: boolean
}

/** Server-sent events emitted by the chat stream (real or mock). */
export type ChatStreamEvent =
  | { type: 'token'; delta: string }
  | { type: 'blocks'; blocks: unknown }
  | { type: 'meta'; answerId: string; grounded: boolean }
  | { type: 'done' }

export type SendChatInput = {
  sessionId: string
  message: string
  role: RoleMode
  lang: string
}
