import ollama from 'ollama'
import type { Response } from 'express'
import type { ChatMessage } from '../schemas/chat.schema.js'

export class OllamaService {
  async complete(model: string, messages: ChatMessage[]) {
    const result = await ollama.chat({
      model,
      messages,
      stream: false,
    })

    return result.message.content
  }

  async streamChat(response: Response, model: string, messages: ChatMessage[]) {
    let fullResponse = ''
    const stream = await ollama.chat({
      model,
      messages,
      stream: true,
    })

    for await (const part of stream) {
      const token = part.message?.content ?? ''

      if (token.length > 0) {
        fullResponse += token
        response.write(token)
      }
    }

    return fullResponse
  }
}
