import type { NextFunction, Request, Response } from 'express'
import type {
  ChatRequest,
  ConversationParams,
  ResetConversationRequest,
} from '../schemas/chat.schema.js'
import { chatService } from '../services/chat.service.js'

export const streamChat = async (
  request: Request<Record<string, never>, string, ChatRequest>,
  response: Response,
  next: NextFunction,
) => {
  try {
    await chatService.handleChat(request.body, response)
    response.end()
  } catch (error) {
    if (response.headersSent) {
      response.end()
      return
    }

    next(error)
  }
}

export const resetConversation = (
  request: Request<Record<string, never>, unknown, ResetConversationRequest>,
  response: Response,
) => {
  chatService.clearHistory(request.body.conversationId)
  response.json({ ok: true })
}

export const getConversationHistory = (
  request: Request<ConversationParams>,
  response: Response,
) => {
  response.json(chatService.getHistory(request.params.id))
}
