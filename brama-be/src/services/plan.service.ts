import { env } from '../config/env.js'
import { buildTranslationPrompt, languageName } from '../lib/translation.js'
import { DepartmentService, type Department } from './department.service.js'
import { graphService, type GraphService } from './graph.service.js'
import { lifeEventService, type ExternalInfo, type LifeEventService } from './life-event.service.js'
import { OllamaService } from './ollama.service.js'
import { RetrievalService } from './retrieval.service.js'

const MAX_CARD_TEXT = 1500

const planSystemPrompt =
  'Jestes asystentem Urzedu Miasta Lublin. Na podstawie WYLACZNIE ponizszych ' +
  'danych przygotuj plan dzialania dla mieszkanca. Nie wymyslaj uslug, oplat, ' +
  'adresow, terminow ani przepisow. Zachowaj polskie nazwy urzedow, ulic i ' +
  'numery kart bez zmian. Odpowiadaj po polsku. Uzyj struktury:\n' +
  '1. Krotkie podsumowanie sytuacji.\n' +
  '2. Checklista krokow w kolejnosci.\n' +
  '3. Szczegoly kazdego kroku: wymagane dokumenty, oplaty, termin, gdzie ' +
  'zalatwic (komorka, adres, godziny).\n' +
  '4. Czego brakuje lub o co dopytac mieszkanca.\n' +
  '5. Oficjalne zrodla: numery kart i linki.\n' +
  'Jesli dane nie zawieraja odpowiedzi, napisz, ze nie wiesz i odeslij do ' +
  'wlasciwego urzedu.\n\nDANE:\n'

export type PlanStep = {
  cardId: string
  title: string
  url: string
  office: Department | null
  prerequisites: { cardId: string; nazwa: string }[]
  externalOffices: { code: string; label: string }[]
}

type EnrichedStep = { step: PlanStep; text: string }

export type LifeEventPlan = {
  lifeEvent: string
  title: string
  confidence: number
  plan: PlanStep[]
  externalInfo: ExternalInfo[]
  missingInfo: string[]
  answer: string
}

export class PlanService {
  constructor(
    private readonly retrievalService: RetrievalService,
    private readonly departmentService: DepartmentService,
    private readonly graphService: GraphService,
    private readonly lifeEventService: LifeEventService,
    private readonly ollamaService: OllamaService,
  ) {}

  // Returns null when the message isn't a recognised life event — the caller
  // then falls back to the normal single-service chat flow.
  async buildPlan(
    message: string,
    lang: string,
    group?: string,
    eventId?: string,
  ): Promise<LifeEventPlan | null> {
    const classification = eventId
      ? { eventId, score: 1 }
      : await this.lifeEventService.classify(message)
    if (!classification) {
      return null
    }

    const event = this.lifeEventService.getEvent(classification.eventId)
    if (!event) {
      return null
    }

    const cards = this.lifeEventService.resolveServices(event, group)
    const enriched = await this.collectSteps(cards)
    if (enriched.length === 0) {
      return null
    }

    const evidence = this.buildEvidence(event.externalInfo ?? [], enriched)
    const answerPolish = await this.ollamaService.complete(env.OLLAMA_CHAT_MODEL, [
      { role: 'system', content: planSystemPrompt + evidence },
      { role: 'user', content: message },
    ])

    const answer = lang === 'pl' ? answerPolish : await this.translate(answerPolish, lang)

    return {
      lifeEvent: event.id,
      title: event.title[lang] ?? event.title.pl ?? event.id,
      confidence: classification.score,
      plan: enriched.map((entry) => entry.step),
      externalInfo: event.externalInfo ?? [],
      missingInfo: event.groups && !group ? ['citizenship_status'] : [],
      answer,
    }
  }

  private async collectSteps(cards: string[]): Promise<EnrichedStep[]> {
    const steps: EnrichedStep[] = []

    for (const cardId of cards) {
      const hit = await this.retrievalService.getByCardId(cardId)
      if (!hit) {
        continue
      }

      const symbol = cardId.split('-')[0] ?? ''
      const graph = await this.graphService.getServiceGraph(cardId)

      steps.push({
        text: hit.text,
        step: {
          cardId,
          title: hit.nazwa,
          url: hit.url,
          office: this.departmentService.getBySymbol(symbol),
          prerequisites: (graph?.prerequisites ?? []).map((entry) => ({
            cardId: entry.card_id,
            nazwa: entry.nazwa,
          })),
          externalOffices: graph?.externalOffices ?? [],
        },
      })
    }

    return steps
  }

  private buildEvidence(externalInfo: ExternalInfo[], enriched: EnrichedStep[]): string {
    const blocks = enriched.map(({ step, text }) => {
      const lines = [`[${step.cardId}] ${step.title}`, this.clamp(text)]

      if (step.office) {
        const office = [`Komorka: ${step.office.nazwa}.`]
        if (step.office.adres) office.push(`Adres: ${step.office.adres}.`)
        if (step.office.telefon) office.push(`Telefon: ${step.office.telefon}.`)
        if (step.office.godziny_pracy) office.push(`Godziny pracy: ${step.office.godziny_pracy}.`)
        lines.push(office.join(' '))
      }

      for (const prerequisite of step.prerequisites) {
        lines.push(`Wymaga wczesniej: ${prerequisite.nazwa} [karta ${prerequisite.cardId}].`)
      }
      for (const external of step.externalOffices) {
        lines.push(`Wymaga dokumentu z: ${external.label} [${external.code}].`)
      }
      if (step.url) {
        lines.push(`Zrodlo: ${step.url}`)
      }

      return lines.join('\n')
    })

    if (externalInfo.length > 0) {
      const info = externalInfo.map((entry) => `${entry.label}: ${entry.note}`).join('\n')
      blocks.push(`POZA URZEDEM MIASTA:\n${info}`)
    }

    return blocks.join('\n\n---\n\n')
  }

  private clamp(text: string): string {
    return text.length > MAX_CARD_TEXT ? text.slice(0, MAX_CARD_TEXT) : text
  }

  private async translate(text: string, lang: string): Promise<string> {
    return this.ollamaService.complete(env.OLLAMA_TRANSLATION_MODEL, [
      { role: 'system', content: buildTranslationPrompt(languageName(lang)) },
      { role: 'user', content: text },
    ])
  }
}

export const planService = new PlanService(
  new RetrievalService(),
  new DepartmentService(),
  graphService,
  lifeEventService,
  new OllamaService(),
)
