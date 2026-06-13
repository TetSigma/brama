import type { Response } from 'express'
import { env } from '../config/env.js'
import type { ChatMessage, ChatRequest } from '../schemas/chat.schema.js'
import { ChatHistoryService } from './chat-history.service.js'
import { OllamaService } from './ollama.service.js'
import { RetrievalService } from './retrieval.service.js'

const systemPrompt =
  'Jestes asystentem Urzedu Miasta ' +
  'Lublin. Odpowiadaj po polsku, ' +
  'rzeczowo i uprzejmie. Jesli nie ' +
  'znasz odpowiedzi, powiedz to wprost.'

const languageNames: Record<string, string> = {
  en: 'English',
  fr: 'French',
  es: 'Spanish',
  cs: 'Czech',
  uk: 'Ukrainian',
  ru: 'Russian',
  de: 'German',
}

const translationSystemPrefix =
  'You are a professional translator ' +
  'for a government office. ' +
  "Translate the user's text into "

const translationSystemSuffix =
  '. Preserve official terminology, ' +
  'names and meaning exactly. ' +
  'Do not add, omit, explain or ' +
  'answer anything - ' +
  'output only the translation.'

const ragInstruction =
  '\n\nOdpowiadaj wylacznie na podstawie ' +
  'ponizszych informacji o uslugach Urzedu ' +
  'Miasta Lublin. Podawaj numer karty oraz ' +
  'dane kontaktowe wlasciwej komorki, gdy sa ' +
  'dostepne. Jesli w informacjach brakuje ' +
  'odpowiedzi, powiedz, ze nie wiesz i odeslij ' +
  'do wlasciwego urzedu.\n\nINFORMACJE:\n'

export class ChatService {
  constructor(
    private readonly historyService: ChatHistoryService,
    private readonly ollamaService: OllamaService,
    private readonly retrievalService: RetrievalService,
  ) {}

  getHistory(conversationId: string) {
    return this.historyService.getHistory(conversationId)
  }

  clearHistory(conversationId: string) {
    this.historyService.clearHistory(conversationId)
  }

  async handleChat(request: ChatRequest, response: Response) {
    const userPolish =
      request.lang === 'pl' ? request.message : await this.translate(request.message, 'Polish')

    this.historyService.addMessage(request.conversationId, 'user', userPolish)

    const context = await this.retrievalService.retrieve(userPolish, {
      kind: request.kind,
      departament: request.departament,
    })

    const bielikMessages: ChatMessage[] = [
      { role: 'system', content: this.buildSystemPrompt(context) },
      ...this.historyService.getHistory(request.conversationId),
    ]

    if (request.lang === 'pl') {
      this.prepareStreamingResponse(response)
      const answer = await this.ollamaService.streamChat(
        response,
        env.OLLAMA_CHAT_MODEL,
        bielikMessages,
      )

      this.historyService.addMessage(request.conversationId, 'assistant', answer)
      return
    }

    const answerPolish = await this.ollamaService.complete(env.OLLAMA_CHAT_MODEL, bielikMessages)
    this.historyService.addMessage(request.conversationId, 'assistant', answerPolish)

    const targetLanguage = languageNames[request.lang] ?? request.lang
    this.prepareStreamingResponse(response)
    await this.ollamaService.streamChat(response, env.OLLAMA_TRANSLATION_MODEL, [
      { role: 'system', content: this.buildTranslationPrompt(targetLanguage) },
      { role: 'user', content: answerPolish },
    ])
  }

  private async translate(text: string, targetLanguage: string) {
    return this.ollamaService.complete(env.OLLAMA_TRANSLATION_MODEL, [
      { role: 'system', content: this.buildTranslationPrompt(targetLanguage) },
      { role: 'user', content: text },
    ])
  }

  private buildTranslationPrompt(targetLanguage: string) {
    return translationSystemPrefix + targetLanguage + translationSystemSuffix
  }

  private buildSystemPrompt(context: string) {
    if (context.length === 0) {
      return systemPrompt
    }

    return systemPrompt + ragInstruction + context
  }

  private prepareStreamingResponse(response: Response) {
    response.setHeader('Content-Type', 'text/plain; charset=utf-8')
  }
}

export const chatService = new ChatService(
  new ChatHistoryService(env.CHAT_DATABASE_PATH),
  new OllamaService(),
  new RetrievalService(),
)
