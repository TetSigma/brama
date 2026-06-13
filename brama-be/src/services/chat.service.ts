import type { Response } from 'express'
import { env } from '../config/env.js'
import type { ChatMessage, ChatRequest } from '../schemas/chat.schema.js'
import { ChatHistoryService } from './chat-history.service.js'
import { DepartmentService, type Department } from './department.service.js'
import { graphService, type GraphService, type ServiceGraph } from './graph.service.js'
import { OllamaService } from './ollama.service.js'
import { RetrievalService, type RetrievalHit } from './retrieval.service.js'

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
  'dostepne. Jesli podano sekcje ZALEZNOSCI, ' +
  'poinformuj o wymaganych wczesniejszych ' +
  'uslugach (z numerem karty) oraz o dokumentach ' +
  'z innych instytucji. Jesli w informacjach ' +
  'brakuje odpowiedzi, powiedz, ze nie wiesz i ' +
  'odeslij do wlasciwego urzedu.\n\nINFORMACJE:\n'

export class ChatService {
  constructor(
    private readonly historyService: ChatHistoryService,
    private readonly ollamaService: OllamaService,
    private readonly retrievalService: RetrievalService,
    private readonly departmentService: DepartmentService,
    private readonly graphService: GraphService,
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

    const hits = await this.retrievalService.retrieve(userPolish, {
      komorka: request.komorka,
    })
    const context = await this.buildContext(hits)

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

  // Joins the retrieved service texts, appends contact details for the handling
  // offices (SQLite lookup by card-number prefix = symbol), and the dependency
  // chain for the top service (Neo4j lookup by card_id).
  private async buildContext(hits: RetrievalHit[]): Promise<string> {
    if (hits.length === 0) {
      return ''
    }

    const services = hits.map((hit) => hit.text).join('\n\n---\n\n')
    const offices = this.collectOffices(hits)
    const dependencies = await this.collectDependencies(hits)

    let context = services
    if (offices.length > 0) {
      context += `\n\nKOMORKI:\n${offices.join('\n\n')}`
    }
    if (dependencies.length > 0) {
      context += `\n\nZALEZNOSCI:\n${dependencies}`
    }

    return context
  }

  // Pulls the dependency chain for the most relevant (top) hit only, to keep
  // the prompt focused. Graph failures degrade to no dependencies.
  private async collectDependencies(hits: RetrievalHit[]): Promise<string> {
    const topCardId = hits[0]?.cardId ?? ''
    if (topCardId.length === 0) {
      return ''
    }

    const graph = await this.graphService.getServiceGraph(topCardId)
    if (!graph) {
      return ''
    }

    return this.formatDependencies(graph)
  }

  private formatDependencies(graph: ServiceGraph): string {
    const lines: string[] = []

    for (const prerequisite of graph.prerequisites) {
      const document = prerequisite.document ? ` (dokument: ${prerequisite.document})` : ''
      lines.push(
        `Wymaga wczesniejszej uslugi: ${prerequisite.nazwa} [karta ${prerequisite.card_id}]${document}.`,
      )
    }

    for (const office of graph.externalOffices) {
      lines.push(`Wymaga dokumentu z instytucji zewnetrznej: ${office.label} [${office.code}].`)
    }

    return lines.join('\n')
  }

  private collectOffices(hits: RetrievalHit[]): string[] {
    const seen = new Set<string>()
    const offices: string[] = []

    for (const hit of hits) {
      const symbol = hit.cardId.split('-')[0] ?? ''
      if (symbol.length === 0 || seen.has(symbol)) {
        continue
      }
      seen.add(symbol)

      const department = this.departmentService.getBySymbol(symbol)
      if (department) {
        offices.push(this.formatOffice(department))
      }
    }

    return offices
  }

  private formatOffice(department: Department): string {
    const parts = [`${department.nazwa}.`]
    if (department.adres) parts.push(`Adres: ${department.adres}.`)
    if (department.telefon) parts.push(`Telefon: ${department.telefon}.`)
    if (department.email) parts.push(`E-mail: ${department.email}.`)
    if (department.godziny_pracy) parts.push(`Godziny pracy: ${department.godziny_pracy}.`)
    return parts.join(' ')
  }

  private prepareStreamingResponse(response: Response) {
    response.setHeader('Content-Type', 'text/plain; charset=utf-8')
  }
}

export const chatService = new ChatService(
  new ChatHistoryService(env.CHAT_DATABASE_PATH),
  new OllamaService(),
  new RetrievalService(),
  new DepartmentService(),
  graphService,
)
