import { z } from 'zod'

export const chatRoleSchema = z.enum(['user', 'assistant', 'system'])

export const chatMessageSchema = z.object({
  role: chatRoleSchema,
  content: z.string(),
})

export const chatRequestSchema = z.object({
  conversationId: z.string().trim().min(1).default('default'),
  lang: z.string().trim().min(1).default('pl'),
  message: z.string().default(''),
  komorka: z.string().trim().min(1).optional(),
})

export const resetConversationSchema = z.object({
  conversationId: z.string().trim().min(1).default('default'),
})

export const conversationParamsSchema = z.object({
  id: z.string().trim().min(1),
})

export type ChatRole = z.infer<typeof chatRoleSchema>
export type ChatMessage = z.infer<typeof chatMessageSchema>
export type ChatRequest = z.infer<typeof chatRequestSchema>
export type ResetConversationRequest = z.infer<typeof resetConversationSchema>
export type ConversationParams = z.infer<typeof conversationParamsSchema>
