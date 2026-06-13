// Deadline Guardian — pure helpers (no I/O, fully unit-testable).
//
// All date reasoning is done on calendar dates (YYYY-MM-DD) in the
// Europe/Warsaw timezone. We never compare raw Date timestamps across
// timezones; instead we resolve "today" once in Warsaw and diff calendar days.

import type {
  DeadlineCandidate,
  DeadlineItem,
  DeadlineStatus,
  DeadlineSourceType,
  UserContext,
  UserContextKey,
} from './deadlineGuardian.types.js'

const WARSAW_TZ = 'Europe/Warsaw'
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const MS_PER_DAY = 86_400_000

// Today's calendar date in Europe/Warsaw as YYYY-MM-DD. Accepting an explicit
// `now` keeps the function deterministic for tests.
export function todayInWarsaw(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD, which is exactly what we want.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: WARSAW_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && ISO_DATE.test(value) && !Number.isNaN(Date.parse(value))
}

// Whole calendar days from `from` to `to` (positive when `to` is later).
// Both inputs are YYYY-MM-DD; parsing as UTC midnight avoids DST drift.
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`)
  const b = Date.parse(`${to}T00:00:00Z`)
  return Math.round((b - a) / MS_PER_DAY)
}

// Adds a number of days to a YYYY-MM-DD date, returning YYYY-MM-DD.
export function addDays(date: string, days: number): string {
  const base = Date.parse(`${date}T00:00:00Z`)
  return new Date(base + days * MS_PER_DAY).toISOString().slice(0, 10)
}

export type UrgencyResult = {
  status: DeadlineStatus
  urgencyScore: number
  daysLeft?: number
}

// Maps an absolute due date to a status + 0-100 urgency score.
// `today` defaults to the current Warsaw date but is injectable for tests.
export function calculateUrgency(date?: string, today: string = todayInWarsaw()): UrgencyResult {
  if (!isIsoDate(date)) {
    return { status: 'unknown', urgencyScore: 0 }
  }

  const daysLeft = daysBetween(today, date)

  if (daysLeft < 0) {
    return { status: 'overdue', urgencyScore: 100, daysLeft }
  }
  if (daysLeft === 0) {
    return { status: 'due_today', urgencyScore: 95, daysLeft }
  }
  if (daysLeft <= 3) {
    return { status: 'due_soon', urgencyScore: 85, daysLeft }
  }
  if (daysLeft <= 7) {
    return { status: 'due_soon', urgencyScore: 70, daysLeft }
  }
  if (daysLeft <= 14) {
    return { status: 'upcoming', urgencyScore: 55, daysLeft }
  }
  return { status: 'upcoming', urgencyScore: 30, daysLeft }
}

// Extracts the day count from rules like "within 14 days after moving".
// Returns null for rules without an explicit day window (e.g. "as soon as
// possible", "before appointment", "no fixed deadline").
export function parseRelativeDays(relativeRule?: string): number | null {
  if (!relativeRule) {
    return null
  }
  const match = relativeRule.match(/within\s+(\d+)\s*(day|days|dni|dzien|dzień)/i)
  if (!match) {
    return null
  }
  const days = Number(match[1])
  return Number.isFinite(days) ? days : null
}

// Resolves a relative rule against an anchor date into an absolute YYYY-MM-DD,
// or null when the rule has no resolvable window or the anchor is missing.
// Handles two shapes:
//   - "within N days after <event>"  → anchor + N days
//   - "before <event>"               → the anchor date itself (the deadline is
//                                        to act before that date)
export function resolveRelativeDate(relativeRule?: string, anchorDate?: string): string | null {
  if (!isIsoDate(anchorDate)) {
    return null
  }
  const days = parseRelativeDays(relativeRule)
  if (days !== null) {
    return addDays(anchorDate, days)
  }
  if (relativeRule && /\bbefore\b|\bprzed\b/i.test(relativeRule)) {
    return anchorDate
  }
  return null
}

// Maps each life event to the user-context date that anchors its deadlines.
export const EVENT_PRIMARY_ANCHOR: Record<string, UserContextKey> = {
  moving_to_lublin: 'movedDate',
  lost_documents: 'documentLostDate',
  starting_business: 'businessStartDate',
}

// Builds the user context for a request: explicit values win, and any
// YYYY-MM-DD date mentioned in the message is mapped to the event's primary
// anchor when that field isn't already set. We never guess beyond this.
export function inferUserContext(
  message: string,
  eventId: string,
  explicit: UserContext = {},
): UserContext {
  const context: UserContext = { ...explicit }
  const anchor = EVENT_PRIMARY_ANCHOR[eventId]
  if (!anchor || context[anchor]) {
    return context
  }
  const match = message.match(/\d{4}-\d{2}-\d{2}/)
  if (match && isIsoDate(match[0])) {
    context[anchor] = match[0]
  }
  return context
}

// Source precedence for deduplication: Neo4j (structured graph) is the most
// authoritative, then Qdrant LLM extraction, then user/document derived.
const SOURCE_PRIORITY: Record<DeadlineSourceType, number> = {
  neo4j: 4,
  qdrant: 3,
  user_input: 2,
  uploaded_document: 1,
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Two titles are "similar" when one contains the other or they share a strong
// majority of their word sets. Deliberately conservative to avoid merging
// genuinely different deadlines.
export function titlesSimilar(a: string, b: string): boolean {
  const na = normalizeTitle(a)
  const nb = normalizeTitle(b)
  if (!na || !nb) {
    return false
  }
  if (na === nb || na.includes(nb) || nb.includes(na)) {
    return true
  }
  const wordsA = new Set(na.split(' '))
  const wordsB = new Set(nb.split(' '))
  let shared = 0
  for (const word of wordsA) {
    if (wordsB.has(word)) {
      shared += 1
    }
  }
  const smaller = Math.min(wordsA.size, wordsB.size)
  return smaller > 0 && shared / smaller >= 0.6
}

// Two candidates are duplicates when they target the same service AND agree on
// either the absolute date or the relative rule AND have similar titles.
function isDuplicate(a: DeadlineItem, b: DeadlineItem): boolean {
  if ((a.relatedServiceId ?? '') !== (b.relatedServiceId ?? '')) {
    return false
  }
  const sameDate = Boolean(a.date && b.date && a.date === b.date)
  const sameRule =
    Boolean(a.relativeRule && b.relativeRule) &&
    normalizeTitle(a.relativeRule ?? '') === normalizeTitle(b.relativeRule ?? '')
  if (!sameDate && !sameRule) {
    return false
  }
  return titlesSimilar(a.title, b.title)
}

// Picks the richer of two duplicate items, preferring the higher-priority
// source (Neo4j over Qdrant) and otherwise the one carrying more detail.
function preferred(a: DeadlineItem, b: DeadlineItem): DeadlineItem {
  const pa = SOURCE_PRIORITY[a.sourceType]
  const pb = SOURCE_PRIORITY[b.sourceType]
  if (pa !== pb) {
    return pa > pb ? a : b
  }
  const score = (item: DeadlineItem) =>
    (item.date ? 2 : 0) + (item.officialLink ? 1 : 0) + (item.consequence ? 1 : 0)
  return score(a) >= score(b) ? a : b
}

// Merges duplicate deadlines, keeping the preferred copy of each group.
export function dedupeDeadlines(items: DeadlineItem[]): DeadlineItem[] {
  const kept: DeadlineItem[] = []
  for (const item of items) {
    const index = kept.findIndex((existing) => isDuplicate(existing, item))
    if (index === -1) {
      kept.push(item)
    } else {
      kept[index] = preferred(kept[index]!, item)
    }
  }
  return kept
}

// Sorts by urgency (highest first); ties broken by soonest date then title so
// the order is stable and deterministic.
export function sortByUrgency(items: DeadlineItem[]): DeadlineItem[] {
  return [...items].sort((a, b) => {
    if (b.urgencyScore !== a.urgencyScore) {
      return b.urgencyScore - a.urgencyScore
    }
    if (a.date && b.date && a.date !== b.date) {
      return a.date < b.date ? -1 : 1
    }
    if (a.date && !b.date) return -1
    if (!a.date && b.date) return 1
    return a.title.localeCompare(b.title)
  })
}

// Stable id for a deadline, derived from service + date/rule + title so the
// same logical deadline keeps the same id across requests (no randomness).
export function deadlineId(candidate: DeadlineCandidate): string {
  const parts = [
    candidate.relatedServiceId ?? 'svc',
    candidate.date ?? candidate.relativeRule ?? 'na',
    normalizeTitle(candidate.title) || 'deadline',
  ]
  return parts
    .join('|')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
