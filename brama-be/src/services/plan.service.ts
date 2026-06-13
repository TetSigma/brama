import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { env } from '../config/env.js'
import {
  DeadlineGuardianService,
  type EvidenceChunk,
} from '../features/deadlineGuardian/deadlineGuardian.service.js'
import type {
  DeadlineCandidate,
  DeadlineItem,
  UserContext,
  UserContextKey,
} from '../features/deadlineGuardian/deadlineGuardian.types.js'
import {
  EVENT_PRIMARY_ANCHOR,
  inferUserContext,
} from '../features/deadlineGuardian/deadlineGuardian.utils.js'
import { withTimeout } from '../lib/timeout.js'
import { buildTranslationPrompt, languageName } from '../lib/translation.js'
import { DepartmentService, type Department } from './department.service.js'
import {
  graphService,
  type GraphService,
  type ServiceGraph,
  type ServiceNode,
} from './graph.service.js'
import {
  lifeEventService,
  type ExternalInfo,
  type LifeEventConfig,
  type LifeEventService,
} from './life-event.service.js'
import { OllamaService } from './ollama.service.js'
import { RetrievalService, type RetrievalHit } from './retrieval.service.js'
import {
  servicesService,
  type ServiceCard,
  type ServicesService,
} from './services.service.js'

const MAX_CARD_TEXT = 1500

// Seed deadlines per life event (stand-in for structured Neo4j deadline data).
type SeedDeadline = {
  relatedServiceId: string
  title: string
  shortLabel?: string
  date?: string
  relativeRule?: string
  anchorField?: UserContextKey
  requiredAction?: string
  consequence?: string
}

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

type EnrichedStep = { step: PlanStep; text: string; service: ServiceNode | null }

export type LifeEventPlan = {
  lifeEvent: string
  title: string
  confidence: number
  plan: PlanStep[]
  externalInfo: ExternalInfo[]
  deadlines: DeadlineItem[]
  deadlineSummary: string
  missingInfo: string[]
  answer: string
}

export class PlanService {
  private readonly deadlineGuardian: DeadlineGuardianService
  private readonly deadlineSeed: Record<string, SeedDeadline[]>

  constructor(
    private readonly retrievalService: RetrievalService,
    private readonly servicesService: ServicesService,
    private readonly departmentService: DepartmentService,
    private readonly graphService: GraphService,
    private readonly lifeEventService: LifeEventService,
    private readonly ollamaService: OllamaService,
  ) {
    this.deadlineGuardian = new DeadlineGuardianService(ollamaService)
    this.deadlineSeed = this.loadDeadlineSeed()
  }

  // Returns null when the message isn't a recognised life event — the caller
  // then falls back to the normal single-service chat flow.
  async buildPlan(
    message: string,
    lang: string,
    group?: string,
    eventId?: string,
    userContext?: UserContext,
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
    const answerPolish = await this.buildAnswerPolish(event, enriched, evidence, message)
    const answer = lang === 'pl' ? answerPolish : await this.translateAnswer(answerPolish, lang)

    // Deadline Guardian: detect deadlines, resolve dates, score urgency.
    const guardian = await this.deadlineGuardian.build({
      structuredCandidates: this.buildDeadlineCandidates(event.id, enriched),
      evidenceChunks: this.buildEvidenceChunks(enriched),
      userContext: inferUserContext(message, event.id, userContext ?? {}),
      lang,
      useLlm: env.DEADLINE_LLM_ENABLED,
      llmTimeoutMs: env.DEADLINE_LLM_TIMEOUT_MS,
    })

    const baseMissing = event.groups && !group ? ['citizenship_status'] : []

    return {
      lifeEvent: event.id,
      title: event.title[lang] ?? event.title.pl ?? event.id,
      confidence: classification.score,
      plan: enriched.map((entry) => entry.step),
      externalInfo: event.externalInfo ?? [],
      deadlines: guardian.deadlines,
      deadlineSummary: guardian.summary,
      missingInfo: [...new Set([...baseMissing, ...guardian.missingInfo])],
      answer,
    }
  }

  private async collectSteps(cards: string[]): Promise<EnrichedStep[]> {
    const steps: EnrichedStep[] = []

    for (const cardId of cards) {
      const hit = await this.getPlanHit(cardId)
      if (!hit) {
        continue
      }

      const symbol = cardId.split('-')[0] ?? ''
      const graph = await this.getGraph(cardId)

      steps.push({
        text: hit.text,
        service: graph?.service ?? null,
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

  private async getPlanHit(cardId: string): Promise<RetrievalHit | null> {
    const localCard = this.servicesService.getByCardId(cardId)
    if (localCard) {
      return this.cardToHit(localCard)
    }

    try {
      return await withTimeout(
        this.retrievalService.getByCardId(cardId),
        env.LIFE_EVENT_CARD_LOOKUP_TIMEOUT_MS,
        `Life-event card lookup ${cardId}`,
      )
    } catch (error) {
      console.error(`Life-event card lookup failed for ${cardId}`, error)
      return null
    }
  }

  private cardToHit(card: ServiceCard): RetrievalHit {
    return {
      text: this.cardToText(card),
      cardId: card.numer_karty,
      nazwa: card.nazwa,
      komorka: card.komorka,
      url: card.url,
    }
  }

  private cardToText(card: ServiceCard): string {
    const sections = Object.entries(card.sekcje ?? {})
      .filter(([, value]) => value.trim().length > 0)
      .map(([title, value]) => `${title}: ${value}`)
    const forms = card.wnioski_do_pobrania
      .map((form) => `${form.nazwa}: ${form.url}`)
      .join('; ')

    return [
      `Usluga: ${card.nazwa}.`,
      `Numer karty informacyjnej: ${card.numer_karty}.`,
      `Komorka zalatwiajaca sprawe: ${card.komorka}.`,
      `Zrodlo: ${card.url}`,
      forms ? `Wnioski do pobrania: ${forms}` : '',
      ...sections,
    ]
      .filter(Boolean)
      .join('\n')
  }

  private async getGraph(cardId: string): Promise<ServiceGraph | null> {
    try {
      return await withTimeout(
        this.graphService.getServiceGraph(cardId),
        env.GRAPH_QUERY_TIMEOUT_MS,
        `Graph lookup ${cardId}`,
      )
    } catch (error) {
      console.error(`Graph lookup skipped for ${cardId}`, error)
      return null
    }
  }

  private async buildAnswerPolish(
    event: LifeEventConfig,
    enriched: EnrichedStep[],
    evidence: string,
    message: string,
  ): Promise<string> {
    const fallback = this.buildFallbackAnswer(event, enriched)

    try {
      const answer = await withTimeout(
        this.ollamaService.complete(env.OLLAMA_CHAT_MODEL, [
          { role: 'system', content: planSystemPrompt + evidence },
          { role: 'user', content: message },
        ]),
        env.LIFE_EVENT_ANSWER_TIMEOUT_MS,
        'Life-event plan answer',
      )

      return answer.trim().length > 0 ? answer : fallback
    } catch (error) {
      console.error('Life-event plan LLM answer unavailable; using deterministic plan', error)
      return fallback
    }
  }

  private buildFallbackAnswer(event: LifeEventConfig, enriched: EnrichedStep[]): string {
    const lines = [
      `## ${event.title.pl ?? event.id}`,
      'Plan przygotowany na podstawie kart informacyjnych Urzedu Miasta Lublin.',
      '',
      '### Kroki',
    ]

    for (const [index, entry] of enriched.entries()) {
      const step = entry.step
      lines.push(`${index + 1}. **${step.title}** (${step.cardId})`)

      if (step.office) {
        const office = [step.office.nazwa]
        if (step.office.adres) office.push(step.office.adres)
        if (step.office.godziny_pracy) office.push(`godziny: ${step.office.godziny_pracy}`)
        lines.push(`   - Miejsce: ${office.join(', ')}`)
      }
      if (step.prerequisites.length > 0) {
        const prerequisites = step.prerequisites
          .map((item) => `${item.nazwa} (${item.cardId})`)
          .join(', ')
        lines.push(`   - Najpierw zalatw: ${prerequisites}`)
      }
      if (step.externalOffices.length > 0) {
        const offices = step.externalOffices.map((office) => office.label).join(', ')
        lines.push(`   - Dokumenty spoza urzedu: ${offices}`)
      }
      if (step.url) {
        lines.push(`   - Zrodlo: ${step.url}`)
      }
    }

    if ((event.externalInfo ?? []).length > 0) {
      lines.push('', '### Poza Urzedem Miasta')
      for (const info of event.externalInfo ?? []) {
        lines.push(`- **${info.label}**: ${info.note}`)
      }
    }

    lines.push(
      '',
      'Jesli termin zalezy od daty zdarzenia, podaj te date w formacie RRRR-MM-DD, a plan obliczy dokladne terminy.',
    )

    return lines.join('\n')
  }

  // Builds the authoritative (Neo4j + seed) deadline candidates for an event.
  private buildDeadlineCandidates(eventId: string, enriched: EnrichedStep[]): DeadlineCandidate[] {
    const byCard = new Map(enriched.map((entry) => [entry.step.cardId, entry]))
    const anchor = EVENT_PRIMARY_ANCHOR[eventId]
    const candidates: DeadlineCandidate[] = []

    // 1) Deadlines stored directly on Neo4j service nodes.
    for (const entry of enriched) {
      const service = entry.service
      if (!service || (!service.deadline && !service.deadlineRule)) {
        continue
      }
      candidates.push({
        title: entry.step.title,
        relatedServiceId: entry.step.cardId,
        sourceType: 'neo4j',
        sourceRef: entry.step.url || undefined,
        officialLink: entry.step.url || undefined,
        date: service.deadline ?? undefined,
        relativeRule: service.deadlineRule ?? undefined,
        anchorField: service.deadlineRule ? anchor : undefined,
      })
    }

    // 2) Seed deadlines (structured demo data) enriched with the service URL.
    for (const seed of this.deadlineSeed[eventId] ?? []) {
      const entry = byCard.get(seed.relatedServiceId)
      candidates.push({
        title: seed.title,
        shortLabel: seed.shortLabel,
        relatedServiceId: seed.relatedServiceId,
        sourceType: 'neo4j',
        sourceRef: entry?.step.url || undefined,
        officialLink: entry?.step.url || undefined,
        date: seed.date,
        relativeRule: seed.relativeRule,
        anchorField: seed.anchorField,
        requiredAction: seed.requiredAction,
        consequence: seed.consequence,
      })
    }

    return candidates
  }

  // Maps enriched steps to Qdrant evidence chunks for LLM deadline extraction.
  private buildEvidenceChunks(enriched: EnrichedStep[]): EvidenceChunk[] {
    return enriched.map((entry) => ({
      serviceId: entry.step.cardId,
      title: entry.step.title,
      text: this.clamp(entry.text),
      sourceRef: entry.step.url || undefined,
    }))
  }

  private loadDeadlineSeed(): Record<string, SeedDeadline[]> {
    try {
      const path = resolve(process.cwd(), env.DEADLINES_SEED_PATH)
      return JSON.parse(readFileSync(path, 'utf8')) as Record<string, SeedDeadline[]>
    } catch (error) {
      console.error('life_event_deadlines.json unavailable; seed deadlines disabled', error)
      return {}
    }
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

  private async translateAnswer(text: string, lang: string): Promise<string> {
    try {
      const translated = await withTimeout(
        this.translate(text, lang),
        env.LIFE_EVENT_TRANSLATION_TIMEOUT_MS,
        'Life-event plan translation',
      )
      return translated.trim().length > 0 ? translated : text
    } catch (error) {
      console.error('Life-event plan translation unavailable; returning Polish answer', error)
      return text
    }
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
  servicesService,
  new DepartmentService(),
  graphService,
  lifeEventService,
  new OllamaService(),
)
