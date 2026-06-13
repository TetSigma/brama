import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Response } from 'express'
import type { ChatMessage, ChatRequest, ChatRole } from '../schemas/chat.schema.js'
import { ChatService } from './chat.service.js'
import type { BlocksService, Bundle } from './blocks.service.js'
import type { ChatHistoryService } from './chat-history.service.js'
import type { DepartmentService } from './department.service.js'
import type { DocumentService } from './document.service.js'
import type { GraphService } from './graph.service.js'
import type { OllamaService } from './ollama.service.js'
import type { RetrievalHit, RetrievalService } from './retrieval.service.js'

type CapturingResponse = Response & {
  body(): string
}

const serviceBundle: Bundle = {
  service: {
    cardId: 'KM-001',
    nazwa: 'Rejestracja pojazdu',
    komorka: 'Wydział Komunikacji',
    url: 'https://bip.lublin.eu/e-urzad/opisy-uslug/wydzial-komunikacji/rejestracja-pojazdu.html',
  },
  fee: { text: 'Opłata zgodna z kartą usługi.' },
}

const retrievalHit: RetrievalHit = {
  text: 'Usługa: Rejestracja pojazdu. Numer karty informacyjnej: KM-001.',
  cardId: 'KM-001',
  nazwa: 'Rejestracja pojazdu',
  komorka: 'Wydział Komunikacji',
  url: 'https://bip.lublin.eu/e-urzad/opisy-uslug/wydzial-komunikacji/rejestracja-pojazdu.html',
}

function createResponse(): CapturingResponse {
  const chunks: string[] = []
  const response = {
    setHeader: () => response,
    write: (chunk: unknown) => {
      chunks.push(String(chunk))
      return true
    },
    flushHeaders: () => undefined,
    flush: () => undefined,
    body: () => chunks.join(''),
  }

  return response as unknown as CapturingResponse
}

function createHistory(): ChatHistoryService {
  const messages: ChatMessage[] = []
  return {
    getHistory: () => [...messages],
    addMessage: (_conversationId: string, role: ChatRole, content: string) => {
      messages.push({ role, content })
    },
    clearHistory: () => undefined,
  } as unknown as ChatHistoryService
}

function createChatService(ollamaService: OllamaService): ChatService {
  return new ChatService(
    createHistory(),
    ollamaService,
    {
      retrieve: async () => ({ status: 'grounded', hits: [retrievalHit] }),
    } as unknown as RetrievalService,
    { getBySymbol: () => null } as unknown as DepartmentService,
    { getServiceGraph: async () => null } as unknown as GraphService,
    { getActiveSession: () => null } as unknown as DocumentService,
    {
      build: async () => serviceBundle,
      availableTags: () => [],
    } as unknown as BlocksService,
  )
}

const request: ChatRequest = {
  conversationId: 'generation-fallback',
  lang: 'pl',
  message: 'Gdzie mogę zarejestrować samochód w Lublinie?',
}

describe('ChatService generation fallback', () => {
  it('writes visible prose when generation fails after blocks are sent', async () => {
    const service = createChatService({
      streamChat: async () => {
        throw new Error('Ollama unavailable')
      },
    } as unknown as OllamaService)
    const response = createResponse()

    await service.handleChat(request, response)

    const body = response.body()
    assert.match(body, /^\{"blocks":/)
    assert.match(body, /\n--BRAMA--\n/)
    assert.match(body, /Nie udało mi się teraz wygenerować opisu odpowiedzi/)
  })

  it('writes visible prose when generation returns empty text', async () => {
    const service = createChatService({
      streamChat: async () => '',
    } as unknown as OllamaService)
    const response = createResponse()

    await service.handleChat(request, response)

    assert.match(response.body(), /Nie udało mi się teraz wygenerować opisu odpowiedzi/)
  })
})
