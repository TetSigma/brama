import type { AnswerBlock } from '@/api/blocks'

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

/** Control signal for the conversational document-fill flow. */
export type ChatAction = 'fill:start' | 'fill:cancel'

export type SendChatInput = {
  conversationId: string
  message: string
  role: RoleMode
  lang: string
  /** Set when a PDF is attached — switches the backend into explain/fill mode. */
  documentId?: string
  action?: ChatAction
}

/** A PDF the user attached to the current conversation. */
export type AttachedDocument = {
  id: string
  filename: string
  hasFormFields: boolean
}
