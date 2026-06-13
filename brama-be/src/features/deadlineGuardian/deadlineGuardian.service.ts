// Deadline Guardian — orchestration service.
//
// Collects deadline candidates from structured sources (Neo4j service nodes +
// seed data) and from Qdrant evidence (via the LLM), resolves relative rules
// against the user's context dates, scores urgency, deduplicates, and sorts.
// It never invents a deadline: a relative rule with no anchor date is returned
// with status "unknown" and a precise missingInfo entry instead.

import { env } from '../../config/env.js'
import { withTimeout } from '../../lib/timeout.js'
import type { OllamaService } from '../../services/ollama.service.js'
import {
  buildDeadlineEvidence,
  deadlineExtractionSystemPrompt,
} from './deadlineGuardian.prompt.js'
import type {
  DeadlineCandidate,
  DeadlineGuardianResult,
  DeadlineItem,
  LlmDeadline,
  LlmDeadlineResponse,
  UserContext,
} from './deadlineGuardian.types.js'
import {
  calculateUrgency,
  deadlineId,
  dedupeDeadlines,
  isIsoDate,
  resolveRelativeDate,
  sortByUrgency,
} from './deadlineGuardian.utils.js'

export type EvidenceChunk = {
  serviceId: string
  title: string
  text: string
  sourceRef?: string
}

export type BuildDeadlinesInput = {
  // Authoritative deadlines from Neo4j service nodes + seed (sourceType set).
  structuredCandidates: DeadlineCandidate[]
  // Raw evidence chunks for LLM extraction (Qdrant). Optional.
  evidenceChunks?: EvidenceChunk[]
  // Known user dates used to resolve relative rules.
  userContext: UserContext
  lang?: string
  // Allow disabling the LLM pass (tests / no-Ollama environments).
  useLlm?: boolean
  // Caps optional extraction so deadlines never block the whole response.
  llmTimeoutMs?: number
  // Injectable "today" (YYYY-MM-DD) for deterministic scoring/tests.
  today?: string
}

export class DeadlineGuardianService {
  constructor(private readonly ollamaService?: OllamaService) {}

  async build(input: BuildDeadlinesInput): Promise<DeadlineGuardianResult> {
    const candidates = [...input.structuredCandidates]

    if (input.useLlm && input.evidenceChunks && input.evidenceChunks.length > 0) {
      const extracted = await this.extractFromQdrant(
        input.evidenceChunks,
        input.llmTimeoutMs ?? env.DEADLINE_LLM_TIMEOUT_MS,
      )
      candidates.push(...extracted)
    }

    const missingInfo: string[] = []
    const items: DeadlineItem[] = candidates.map((candidate) =>
      this.resolveCandidate(candidate, input.userContext, missingInfo, input.today),
    )

    const deduped = sortByUrgency(dedupeDeadlines(items))
    const uniqueMissing = [...new Set(missingInfo)]

    return {
      summary: this.buildSummary(deduped, uniqueMissing, input.lang ?? 'pl'),
      deadlines: deduped,
      missingInfo: uniqueMissing,
    }
  }

  // Turns one candidate into a fully-scored DeadlineItem, recording a
  // missingInfo entry when a relative rule cannot be resolved.
  private resolveCandidate(
    candidate: DeadlineCandidate,
    userContext: UserContext,
    missingInfo: string[],
    today?: string,
  ): DeadlineItem {
    const anchorDate = candidate.anchorField ? userContext[candidate.anchorField] : undefined

    // Prefer an explicit absolute date; otherwise resolve the relative rule.
    let date: string | undefined = isIsoDate(candidate.date) ? candidate.date : undefined
    if (!date && candidate.relativeRule) {
      date = resolveRelativeDate(candidate.relativeRule, anchorDate) ?? undefined
    }

    // Relative rule that needs an anchor we don't have → ask, don't guess.
    const needsAnchor =
      !date && Boolean(candidate.relativeRule) && Boolean(candidate.anchorField) && !anchorDate
    if (needsAnchor && candidate.anchorField) {
      const label = candidate.shortLabel ?? candidate.title
      missingInfo.push(
        `${candidate.anchorField} is required to calculate the ${label} deadline`,
      )
    }

    const urgency = calculateUrgency(date, today)

    return {
      id: deadlineId(candidate),
      title: candidate.title,
      relatedServiceId: candidate.relatedServiceId,
      sourceType: candidate.sourceType,
      sourceRef: candidate.sourceRef,
      date,
      time: candidate.time,
      relativeRule: candidate.relativeRule,
      anchorDate,
      status: urgency.status,
      urgencyScore: urgency.urgencyScore,
      explanation: candidate.explanation ?? this.defaultExplanation(candidate, date),
      requiredAction: candidate.requiredAction ?? candidate.title,
      consequence: candidate.consequence,
      officialLink: candidate.officialLink ?? candidate.sourceRef,
    }
  }

  private defaultExplanation(candidate: DeadlineCandidate, date?: string): string {
    if (date) {
      return `Termin: ${date}.`
    }
    if (candidate.relativeRule) {
      return candidate.relativeRule
    }
    return 'Brak ustalonego terminu.'
  }

  // Calls Bielik/Qwen to extract deadline candidates from Qdrant chunks.
  // Resilient by design: any failure yields no candidates (never invents).
  private async extractFromQdrant(
    chunks: EvidenceChunk[],
    timeoutMs: number,
  ): Promise<DeadlineCandidate[]> {
    if (!this.ollamaService) {
      return []
    }

    try {
      const raw = await withTimeout(
        this.ollamaService.complete(env.OLLAMA_CHAT_MODEL, [
          { role: 'system', content: deadlineExtractionSystemPrompt },
          { role: 'user', content: buildDeadlineEvidence(chunks) },
        ]),
        timeoutMs,
        'Deadline LLM extraction',
      )
      return parseLlmDeadlines(raw)
    } catch (error) {
      console.error('Deadline LLM extraction failed; skipping Qdrant deadlines', error)
      return []
    }
  }

  private buildSummary(items: DeadlineItem[], missingInfo: string[], lang: string): string {
    const messages = SUMMARY[lang] ?? SUMMARY.pl!
    if (items.length === 0) {
      return missingInfo.length > 0 ? messages.needInfo : messages.none
    }
    const overdue = items.filter((item) => item.status === 'overdue').length
    const urgent = items.filter(
      (item) => item.status === 'due_today' || item.status === 'due_soon',
    ).length
    const parts = [messages.count(items.length)]
    if (overdue > 0) parts.push(messages.overdue(overdue))
    if (urgent > 0) parts.push(messages.urgent(urgent))
    return parts.join(' ')
  }
}

type SummaryMessages = {
  none: string
  needInfo: string
  count: (n: number) => string
  overdue: (n: number) => string
  urgent: (n: number) => string
}

const SUMMARY: Record<string, SummaryMessages> = {
  pl: {
    none: 'Nie znaleziono terminów dla tej sytuacji.',
    needInfo: 'Aby obliczyć terminy, potrzebujemy jeszcze kilku informacji.',
    count: (n) => `Znaleziono ${n} ${n === 1 ? 'termin' : 'terminy/-ów'}.`,
    overdue: (n) => `${n} po terminie.`,
    urgent: (n) => `${n} wymaga pilnej uwagi.`,
  },
  en: {
    none: 'No deadlines found for this situation.',
    needInfo: 'We need a few more details to calculate your deadlines.',
    count: (n) => `Found ${n} deadline${n === 1 ? '' : 's'}.`,
    overdue: (n) => `${n} overdue.`,
    urgent: (n) => `${n} need${n === 1 ? 's' : ''} urgent attention.`,
  },
  uk: {
    none: 'Для цієї ситуації термінів не знайдено.',
    needInfo: 'Щоб обчислити терміни, потрібно ще кілька деталей.',
    count: (n) => `Знайдено термінів: ${n}.`,
    overdue: (n) => `${n} прострочено.`,
    urgent: (n) => `${n} потребує термінової уваги.`,
  },
}

// Extracts and validates the LLM JSON. Tolerates code fences and surrounding
// prose; returns [] on any structural problem so we never surface garbage.
export function parseLlmDeadlines(raw: string): DeadlineCandidate[] {
  const json = extractJsonObject(raw)
  if (!json) {
    return []
  }

  let parsed: LlmDeadlineResponse
  try {
    parsed = JSON.parse(json) as LlmDeadlineResponse
  } catch {
    return []
  }

  if (!parsed || !Array.isArray(parsed.deadlines)) {
    return []
  }

  return parsed.deadlines
    .filter((entry): entry is LlmDeadline => Boolean(entry) && typeof entry.title === 'string')
    .map((entry) => ({
      title: entry.title as string,
      relatedServiceId: optionalString(entry.relatedServiceId),
      sourceType: 'qdrant' as const,
      sourceRef: optionalString(entry.sourceRef),
      date: isIsoDate(entry.date) ? entry.date : undefined,
      relativeRule: optionalString(entry.relativeRule),
      requiredAction: optionalString(entry.requiredAction),
      explanation: optionalString(entry.explanation),
    }))
    // Drop empty candidates that carry neither a date nor a rule.
    .filter((candidate) => Boolean(candidate.date || candidate.relativeRule))
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function extractJsonObject(raw: string): string | null {
  if (!raw) {
    return null
  }
  const fenced = raw.replace(/```json/gi, '').replace(/```/g, '')
  const start = fenced.indexOf('{')
  const end = fenced.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    return null
  }
  return fenced.slice(start, end + 1)
}

export const deadlineGuardianService = new DeadlineGuardianService()
