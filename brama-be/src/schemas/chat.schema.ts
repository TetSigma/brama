import { z } from 'zod'

export const chatRoleSchema = z.enum(['user', 'assistant', 'system'])

export const chatMessageSchema = z.object({
  role: chatRoleSchema,
  content: z.string(),
})

export const chatActionSchema = z.enum(['fill:start', 'fill:cancel'])

export const chatRequestSchema = z.object({
  conversationId: z.string().trim().min(1).default('default'),
  lang: z.string().trim().min(1).default('pl'),
  message: z.string().default(''),
  komorka: z.string().trim().min(1).optional(),
  // Set when the user attached a PDF to this turn — switches the turn into
  // document-explain / guided-fill mode (see chat.service).
  documentId: z.string().trim().min(1).optional(),
  // Control signal for the conversational fill flow (no user-visible message).
  action: chatActionSchema.optional(),
})

export const resetConversationSchema = z.object({
  conversationId: z.string().trim().min(1).default('default'),
})

export const conversationParamsSchema = z.object({
  id: z.string().trim().min(1),
})

export type ChatRole = z.infer<typeof chatRoleSchema>
export type ChatMessage = z.infer<typeof chatMessageSchema>
export type ChatAction = z.infer<typeof chatActionSchema>
export type ChatRequest = z.infer<typeof chatRequestSchema>
export type ResetConversationRequest = z.infer<typeof resetConversationSchema>
export type ConversationParams = z.infer<typeof conversationParamsSchema>
