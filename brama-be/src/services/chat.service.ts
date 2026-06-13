import type { Response } from 'express'
import { env } from '../config/env.js'
import type { ChatMessage, ChatRequest } from '../schemas/chat.schema.js'
import { ChatHistoryService } from './chat-history.service.js'
import { DepartmentService, type Department } from './department.service.js'
import {
  DocumentService,
  documentService,
  type DocumentField,
  type DocumentRecord,
  type FillSession,
} from './document.service.js'
import { graphService, type GraphService, type ServiceGraph } from './graph.service.js'
import { OllamaService } from './ollama.service.js'
import { RetrievalService, type RetrievalHit } from './retrieval.service.js'
import {
  blocksService,
  type BlocksService,
  type Bundle,
  type ContextualTag,
} from './blocks.service.js'
import { buildTranslationPrompt, languageName } from '../lib/translation.js'
import { isCurrentOfficeholderQuestion } from './query-intent.js'

const systemPrompt =
  'Jestes asystentem Urzedu Miasta ' +
  'Lublin. Odpowiadaj po polsku, ' +
  'rzeczowo i uprzejmie. Jesli nie ' +
  'znasz odpowiedzi, powiedz to wprost.'

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

const refusalFallback =
  'I can only help with City of Lublin municipal services. ' +
  'For this matter, please contact the appropriate institution.'

const refusalMessages: Record<string, string> = {
  pl: 'Pomagam wylacznie w sprawach uslug Urzedu Miasta Lublin. W tej sprawie skontaktuj sie z odpowiednia instytucja.',
  en: refusalFallback,
  uk: 'Я допомагаю лише з питаннями послуг Люблінської міської ради. Зверніться, будь ласка, до відповідної установи.',
  ru: 'Я помогаю только по вопросам услуг администрации города Люблин. Пожалуйста, обратитесь в соответствующее учреждение.',
  de: 'Ich helfe nur bei Dienstleistungen der Stadtverwaltung Lublin. Bitte wenden Sie sich an die zustaendige Stelle.',
  fr: 'Je n’aide que pour les services de la mairie de Lublin. Veuillez contacter l’institution compétente.',
  es: 'Solo puedo ayudar con servicios del Ayuntamiento de Lublin. Contacte con la institución correspondiente.',
}

const officeholderUnsupportedMessages: Record<string, string> = {
  pl:
    'To pytanie dotyczy aktualnej osoby pełniącej funkcję, a nie procedury urzędowej. ' +
    'Nie mam tej informacji zweryfikowanej w lokalnej bazie usług. Mogę pomóc w sprawach ' +
    'Urzędu Miasta Lublin, np. gdzie złożyć wniosek, jakie dokumenty są potrzebne albo jaka jest opłata.',
  en:
    'That asks about the current person holding an office, not a municipal procedure. ' +
    'I do not have that fact verified in the local services database. I can help with City of Lublin services, ' +
    'such as where to submit an application, required documents, or fees.',
}

const generationFallbackMessages: Record<string, string> = {
  pl:
    'Nie udało mi się teraz wygenerować opisu odpowiedzi. Poniżej pokazuję jednak dane usługi z lokalnej bazy Urzędu Miasta Lublin.',
  en:
    'I could not generate the written answer right now. I am still showing the service details from the local City of Lublin database below.',
}

function refusalFor(lang: string): string {
  return refusalMessages[lang] ?? refusalFallback
}

// Appended to the system prompt when a document is attached: tell the model to
// explain the form (grounded in DOKUMENT + INFORMACJE) and offer guided fill.
const documentInstruction =
  '\n\nUzytkownik przeslal formularz (sekcja DOKUMENT ponizej). ' +
  'Wyjasnij krok po kroku, jak go wypelnic: co oznaczaja poszczegolne pola ' +
  'i co nalezy w nich wpisac. Jesli w sekcji INFORMACJE sa wymagane zalaczniki, ' +
  'oplaty, termin lub miejsce zlozenia - podaj je. Na koncu zaproponuj, ze mozesz ' +
  'pomoc wypelnic ten formularz krok po kroku.\n\nDOKUMENT:\n'

const fillCompleteMessages: Record<string, string> = {
  pl: 'Gotowe! Wypelnilem formularz na podstawie Twoich odpowiedzi. Sprawdz go przed zlozeniem i pobierz ponizej.',
  en: 'Done! I filled in the form from your answers. Please review it before submitting and download it below.',
  uk: 'Готово! Я заповнив форму на основі ваших відповідей. Перевірте її перед поданням і завантажте нижче.',
  ru: 'Готово! Я заполнил форму на основе ваших ответов. Проверьте её перед подачей и скачайте ниже.',
  de: 'Fertig! Ich habe das Formular anhand Ihrer Antworten ausgefuellt. Bitte pruefen Sie es vor dem Einreichen und laden Sie es unten herunter.',
  fr: 'Terminé ! J’ai rempli le formulaire à partir de vos réponses. Veuillez le vérifier avant de le soumettre et le télécharger ci-dessous.',
  es: '¡Listo! He rellenado el formulario con tus respuestas. Revísalo antes de enviarlo y descárgalo abajo.',
}

const fillCancelledMessages: Record<string, string> = {
  pl: 'Przerwalem wypelnianie formularza. Mozesz zaczac od nowa, kiedy chcesz.',
  en: 'I stopped filling in the form. You can start again whenever you like.',
  uk: 'Я зупинив заповнення форми. Ви можете почати знову, коли захочете.',
  ru: 'Я остановил заполнение формы. Вы можете начать заново в любой момент.',
  de: 'Ich habe das Ausfuellen des Formulars gestoppt. Sie koennen jederzeit neu beginnen.',
  fr: 'J’ai arrêté de remplir le formulaire. Vous pouvez recommencer quand vous voulez.',
  es: 'He detenido el rellenado del formulario. Puedes empezar de nuevo cuando quieras.',
}

const fillNoFieldsMessages: Record<string, string> = {
  pl: 'Ten dokument nie zawiera pol formularza, ktore moglbym automatycznie wypelnic. Moge natomiast wyjasnic, jak go wypelnic recznie.',
  en: 'This document has no form fields I can fill automatically. I can still explain how to complete it by hand.',
  uk: 'У цьому документі немає полів форми, які я міг би заповнити автоматично. Я можу пояснити, як заповнити його вручну.',
  ru: 'В этом документе нет полей формы, которые я мог бы заполнить автоматически. Я могу объяснить, как заполнить его вручную.',
  de: 'Dieses Dokument hat keine Formularfelder, die ich automatisch ausfuellen kann. Ich kann aber erklaeren, wie man es von Hand ausfuellt.',
  fr: 'Ce document ne contient aucun champ de formulaire que je puisse remplir automatiquement. Je peux toutefois expliquer comment le remplir à la main.',
  es: 'Este documento no tiene campos de formulario que pueda rellenar automáticamente. Aun así, puedo explicar cómo completarlo a mano.',
}

function localized(map: Record<string, string>, lang: string): string {
  return map[lang] ?? map.en ?? map.pl ?? ''
}

// Separates the leading blocks-bundle JSON line from the streamed prose. The
// frontend splits the response on the first occurrence of this delimiter.
const BLOCKS_DELIMITER = '\n--BRAMA--\n'

// Polish descriptions of the contextual tags the model may place inline.
const TAG_DESCRIPTIONS: Record<ContextualTag, string> = {
  map: 'lokalizacja urzedu i trasa dojazdu',
  fee: 'wysokosc oplaty',
  deadline: 'termin zalatwienia sprawy',
  docs: 'lista wymaganych dokumentow',
  form: 'formularz do pobrania',
}

const CACHE_TTL_MS = 60 * 60 * 1000
const CACHE_MAX_ENTRIES = 500

type CachedAnswer = {
  userPolish: string
  answerPolish: string
  output: string
  // The blocks-bundle line + delimiter, replayed verbatim ahead of the prose.
  envelope: string
  expiresAt: number
}

// Cap each retrieved card so the prompt leaves generation headroom inside the
// model's context window (full BIP cards carry long boilerplate).
const MAX_CARD_TEXT = 1400

function clampCard(text: string): string {
  return text.length > MAX_CARD_TEXT ? text.slice(0, MAX_CARD_TEXT) : text
}

export class ChatService {
  constructor(
    private readonly historyService: ChatHistoryService,
    private readonly ollamaService: OllamaService,
    private readonly retrievalService: RetrievalService,
    private readonly departmentService: DepartmentService,
    private readonly graphService: GraphService,
    private readonly documentService: DocumentService,
    private readonly blocksService: BlocksService,
  ) {}

  private readonly responseCache = new Map<string, CachedAnswer>()

  getHistory(conversationId: string) {
    return this.historyService.getHistory(conversationId)
  }

  clearHistory(conversationId: string) {
    this.historyService.clearHistory(conversationId)
  }

  // Routes a turn to the right mode. Order matters: explicit fill actions win,
  // then an in-flight questionnaire, then a freshly attached document, then
  // ordinary RAG chat.
  async handleChat(request: ChatRequest, response: Response) {
    if (request.action === 'fill:cancel') {
      return this.handleFillCancel(request, response)
    }
    if (request.action === 'fill:start' && request.documentId) {
      return this.handleFillStart(request, response, request.documentId)
    }

    const activeSession = this.documentService.getActiveSession(request.conversationId)
    if (activeSession) {
      return this.handleFillAnswer(request, response, activeSession)
    }

    if (request.documentId) {
      return this.handleDocumentExplain(request, response, request.documentId)
    }

    return this.handleNormalChat(request, response)
  }

  // --- Ordinary RAG chat (unchanged behavior: cache + scope-guard refusal) ---

  private async handleNormalChat(request: ChatRequest, response: Response) {
    // Captured before adding the current turn, so a cold off-topic question
    // can be refused while follow-ups in an active chat are let through.
    const hadHistory = this.historyService.getHistory(request.conversationId).length > 0
    const cacheKey =
      !hadHistory && request.message.trim().length > 0 ? this.cacheKey(request) : null

    // Fast path: an identical cold question already answered — replay it and
    // skip translation, retrieval and generation entirely.
    if (cacheKey) {
      const cached = this.getCached(cacheKey)
      if (cached) {
        this.historyService.addMessage(request.conversationId, 'user', cached.userPolish)
        this.prepareStreamingResponse(response)
        response.write(cached.envelope)
        response.write(cached.output)
        this.historyService.addMessage(request.conversationId, 'assistant', cached.answerPolish)
        return
      }
    }

    if (!hadHistory && isCurrentOfficeholderQuestion(request.message)) {
      const message = localized(officeholderUnsupportedMessages, request.lang)
      this.historyService.addMessage(request.conversationId, 'user', request.message)
      this.prepareStreamingResponse(response)
      response.write(this.envelope({}))
      response.write(message)
      this.historyService.addMessage(request.conversationId, 'assistant', message)
      return
    }

    const userPolish =
      request.lang === 'pl' ? request.message : await this.translate(request.message, 'Polish')

    this.historyService.addMessage(request.conversationId, 'user', userPolish)

    const retrieval = await this.retrievalService.retrieve(userPolish, {
      komorka: request.komorka,
    })

    // Scope guard: a cold question that matches nothing in the knowledge base
    // is off-topic — refuse deterministically instead of letting Bielik answer
    // from its own knowledge.
    if (retrieval.status === 'no_match' && !hadHistory) {
      const refusal = refusalFor(request.lang)
      this.prepareStreamingResponse(response)
      // Emit an empty bundle so the frontend parser is uniform across turns.
      response.write(this.envelope({}))
      response.write(refusal)
      this.historyService.addMessage(request.conversationId, 'assistant', refusal)
      return
    }

    // Build the content-block bundle from the primary (top) hit, and learn
    // which contextual [[tags]] the model is allowed to place this turn.
    const bundle = retrieval.hits[0]
      ? await this.blocksService.build(retrieval.hits[0].cardId)
      : {}
    const tags = this.blocksService.availableTags(bundle)
    const envelope = this.envelope(bundle)

    const context = await this.buildContext(retrieval.hits)
    const { answerPolish, output } = await this.streamAnswer(
      request,
      response,
      this.buildSystemPrompt(context, tags),
      envelope,
    )

    if (cacheKey && retrieval.status === 'grounded') {
      this.setCached(cacheKey, { userPolish, answerPolish, output, envelope })
    }
  }

  // Shared generation: writes the block envelope, then streams Bielik for Polish
  // or generates in Polish and streams the translation. Appends the assistant
  // turn to history; returns the Polish answer + the streamed output.
  private async streamAnswer(
    request: ChatRequest,
    response: Response,
    systemContent: string,
    envelope: string,
  ): Promise<{ answerPolish: string; output: string }> {
    const messages: ChatMessage[] = [
      { role: 'system', content: systemContent },
      ...this.historyService.getHistory(request.conversationId),
    ]

    if (request.lang === 'pl') {
      this.prepareStreamingResponse(response)
      response.write(envelope)
      const answer = await this.streamGeneratedText(
        request,
        response,
        env.OLLAMA_CHAT_MODEL,
        messages,
      )
      this.historyService.addMessage(request.conversationId, 'assistant', answer)
      return { answerPolish: answer, output: answer }
    }

    const answerPolish = await this.ollamaService.complete(env.OLLAMA_CHAT_MODEL, messages)
    this.historyService.addMessage(request.conversationId, 'assistant', answerPolish)

    const targetLanguage = languageName(request.lang)
    this.prepareStreamingResponse(response)
    response.write(envelope)
    const output = await this.streamGeneratedText(
      request,
      response,
      env.OLLAMA_TRANSLATION_MODEL,
      [
        { role: 'system', content: buildTranslationPrompt(targetLanguage) },
        { role: 'user', content: answerPolish },
      ],
    )
    return { answerPolish, output }
  }

  // --- Document explain ----------------------------------------------------

  private async handleDocumentExplain(
    request: ChatRequest,
    response: Response,
    documentId: string,
  ) {
    const record = this.documentService.getById(documentId)
    if (!record) {
      // Document expired / unknown — fall back to ordinary chat.
      return this.handleNormalChat(request, response)
    }

    const userPolish =
      request.lang === 'pl' ? request.message : await this.translate(request.message, 'Polish')
    this.historyService.addMessage(request.conversationId, 'user', userPolish)

    // RAG still enriches the answer (fees, office, attachments) but never gates:
    // the attached document is itself the in-scope context.
    const retrieval = await this.retrievalService.retrieve(userPolish, {
      komorka: request.komorka,
    })
    const ragContext = await this.buildContext(retrieval.hits)

    await this.streamAnswer(
      request,
      response,
      this.buildDocumentPrompt(ragContext, record),
      this.envelope({}),
    )
  }

  private buildDocumentPrompt(ragContext: string, record: DocumentRecord): string {
    let prompt = systemPrompt
    if (ragContext.length > 0) {
      prompt += ragInstruction + ragContext
    }
    return prompt + documentInstruction + this.buildDocumentSection(record)
  }

  private buildDocumentSection(record: DocumentRecord): string {
    let section = record.text.slice(0, env.DOCUMENT_CONTEXT_CHARS)
    if (record.fields.length > 0) {
      const fieldList = record.fields
        .map((field) => `- ${this.humanizeField(field.name)} (${field.type})`)
        .join('\n')
      section += `\n\nPOLA FORMULARZA:\n${fieldList}`
    }
    return section
  }

  // --- Conversational fill (deterministic state machine) -------------------

  private async handleFillStart(
    request: ChatRequest,
    response: Response,
    documentId: string,
  ) {
    const record = this.documentService.getById(documentId)
    const firstField = record?.fields[0]
    if (!record || !firstField) {
      return this.writeMessage(request, response, localized(fillNoFieldsMessages, request.lang))
    }

    this.documentService.startSession(request.conversationId, documentId)
    const question = await this.fieldQuestion(firstField, request.lang)
    this.writeMessage(request, response, question)
  }

  private async handleFillAnswer(
    request: ChatRequest,
    response: Response,
    session: FillSession,
  ) {
    const record = this.documentService.getById(session.documentId)
    if (!record) {
      this.documentService.closeSession(session.id, 'cancelled')
      return this.handleNormalChat(request, response)
    }

    const fields = record.fields
    const currentField = fields[session.currentIndex]
    const answer = request.message.trim()

    // Values come only from the user — the LLM never fabricates field content (D14).
    if (currentField && answer.length > 0) {
      session.answers[currentField.name] = answer
      this.historyService.addMessage(request.conversationId, 'user', answer)
    }
    session.currentIndex += 1

    const nextField = fields[session.currentIndex]
    if (nextField) {
      this.documentService.saveSessionProgress(session)
      const question = await this.fieldQuestion(nextField, request.lang)
      this.writeMessage(request, response, question)
      return
    }

    // Every field collected → fill the AcroForm and hand back a download link.
    this.documentService.saveSessionProgress(session)
    await this.documentService.fillPdf(session.documentId, session.answers)
    this.documentService.closeSession(session.id, 'done')

    const confirmation = localized(fillCompleteMessages, request.lang)
    const downloadBlock = {
      type: 'downloadForm',
      forms: [{ name: record.filename, url: this.downloadUrl(response, record.id) }],
    }

    this.prepareSseResponse(response)
    this.writeSse(response, 'token', { delta: confirmation })
    this.writeSse(response, 'blocks', { blocks: [downloadBlock] })
    this.writeSse(response, 'done')
    this.historyService.addMessage(request.conversationId, 'assistant', confirmation)
  }

  private handleFillCancel(request: ChatRequest, response: Response) {
    const session = this.documentService.getActiveSession(request.conversationId)
    if (session) {
      this.documentService.closeSession(session.id, 'cancelled')
    }
    this.writeMessage(request, response, localized(fillCancelledMessages, request.lang))
  }

  // Builds the next question for a field, translated into the user's language.
  private async fieldQuestion(field: DocumentField, lang: string): Promise<string> {
    const label = this.humanizeField(field.name)
    let polish: string
    if (field.type === 'checkbox') {
      polish = `Czy zaznaczyc pole "${label}"? Odpowiedz: tak lub nie.`
    } else if (field.options && field.options.length > 0) {
      polish = `Podaj: ${label}. Dostepne opcje: ${field.options.join(', ')}.`
    } else {
      polish = `Podaj: ${label}.`
    }
    return lang === 'pl' ? polish : this.translate(polish, languageName(lang))
  }

  // Turns a raw AcroForm field name (often nested/cryptic) into a readable label.
  private humanizeField(name: string): string {
    const leaf = name.split(/[.\]]/).filter(Boolean).pop() ?? name
    const cleaned = leaf
      .replace(/\[\d+\]/g, '')
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim()
    if (cleaned.length === 0) {
      return name
    }
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }

  private downloadUrl(response: Response, documentId: string): string {
    const request = response.req
    const host = request.get('host') ?? `localhost:${env.PORT}`
    return `${request.protocol}://${host}/api/documents/${documentId}/download`
  }

  // Writes a non-streamed assistant message as plain text and records it in history.
  private writeMessage(request: ChatRequest, response: Response, message: string) {
    this.prepareStreamingResponse(response)
    response.write(message)
    this.historyService.addMessage(request.conversationId, 'assistant', message)
  }

  private prepareSseResponse(response: Response) {
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    response.setHeader('Cache-Control', 'no-cache, no-transform')
    response.setHeader('Connection', 'keep-alive')
  }

  private writeSse(response: Response, event: string, data?: unknown) {
    response.write(`event: ${event}\n`)
    if (data !== undefined) {
      response.write(`data: ${JSON.stringify(data)}\n`)
    }
    response.write('\n')
  }

  private envelope(bundle: Bundle): string {
    return JSON.stringify({ blocks: bundle }) + BLOCKS_DELIMITER
  }

  // Lists only the contextual tags backed by real data this turn, so the model
  // can place them but cannot emit a tag that resolves to nothing.
  private buildTagInstruction(tags: ContextualTag[]): string {
    if (tags.length === 0) {
      return ''
    }
    const list = tags.map((tag) => `[[${tag}]] (${TAG_DESCRIPTIONS[tag]})`).join(', ')
    return (
      '\n\nZNACZNIKI: Mozesz wstawic w tekscie znaczniki w formacie [[nazwa]], ' +
      'ktore aplikacja zamieni na interaktywne elementy. Wstaw znacznik dokladnie ' +
      'tam, gdzie naturalnie wspominasz o danej informacji. Nie podawaj samej ' +
      'wartosci przy znaczniku - element pokaze ja sam. Uzywaj wylacznie tych ' +
      'znacznikow: ' +
      list +
      '.'
    )
  }

  private async translate(text: string, targetLanguage: string) {
    return this.ollamaService.complete(env.OLLAMA_TRANSLATION_MODEL, [
      { role: 'system', content: buildTranslationPrompt(targetLanguage) },
      { role: 'user', content: text },
    ])
  }

  private async streamGeneratedText(
    request: ChatRequest,
    response: Response,
    model: string,
    messages: ChatMessage[],
  ): Promise<string> {
    try {
      const output = await this.ollamaService.streamChat(response, model, messages)
      if (output.trim().length > 0) {
        return output
      }

      console.error(`Ollama ${model} returned an empty chat response`)
    } catch (error) {
      console.error(`Ollama ${model} stream failed`, error)
    }

    const fallback = localized(generationFallbackMessages, request.lang)
    response.write(fallback)
    response.flush?.()
    return fallback
  }

  private buildSystemPrompt(context: string, tags: ContextualTag[]) {
    const base = context.length === 0 ? systemPrompt : systemPrompt + ragInstruction + context
    return base + this.buildTagInstruction(tags)
  }

  // Joins the retrieved service texts, appends contact details for the handling
  // offices (SQLite lookup by card-number prefix = symbol), and the dependency
  // chain for the top service (Neo4j lookup by card_id).
  private async buildContext(hits: RetrievalHit[]): Promise<string> {
    if (hits.length === 0) {
      return ''
    }

    const services = hits.map((hit) => clampCard(hit.text)).join('\n\n---\n\n')
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

  private cacheKey(request: ChatRequest): string {
    const message = request.message.trim().toLowerCase().replace(/\s+/g, ' ')
    return `${request.lang}|${request.komorka ?? ''}|${message}`
  }

  private getCached(key: string): CachedAnswer | null {
    const entry = this.responseCache.get(key)
    if (!entry) {
      return null
    }
    if (entry.expiresAt < Date.now()) {
      this.responseCache.delete(key)
      return null
    }
    return entry
  }

  private setCached(key: string, value: Omit<CachedAnswer, 'expiresAt'>): void {
    if (this.responseCache.size >= CACHE_MAX_ENTRIES) {
      const oldest = this.responseCache.keys().next().value
      if (oldest !== undefined) {
        this.responseCache.delete(oldest)
      }
    }
    this.responseCache.set(key, { ...value, expiresAt: Date.now() + CACHE_TTL_MS })
  }

  private prepareStreamingResponse(response: Response) {
    response.setHeader('Content-Type', 'text/plain; charset=utf-8')
    response.setHeader('Cache-Control', 'no-cache, no-transform')
    response.setHeader('Connection', 'keep-alive')
    response.setHeader('X-Accel-Buffering', 'no')
    response.flushHeaders()
  }
}

export const chatService = new ChatService(
  new ChatHistoryService(env.CHAT_DATABASE_PATH),
  new OllamaService(),
  new RetrievalService(),
  new DepartmentService(),
  graphService,
  documentService,
  blocksService,
)
