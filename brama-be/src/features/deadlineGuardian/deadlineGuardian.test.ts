import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DeadlineGuardianService, parseLlmDeadlines } from './deadlineGuardian.service.js'
import type { DeadlineCandidate } from './deadlineGuardian.types.js'
import {
  calculateUrgency,
  dedupeDeadlines,
  inferUserContext,
  resolveRelativeDate,
  sortByUrgency,
} from './deadlineGuardian.utils.js'

const TODAY = '2026-06-13'

// Build deadlines without touching Ollama (useLlm omitted → no LLM call).
async function build(candidates: DeadlineCandidate[], userContext = {}) {
  const service = new DeadlineGuardianService()
  return service.build({ structuredCandidates: candidates, userContext, today: TODAY })
}

describe('calculateUrgency', () => {
  it('returns unknown with score 0 when no date is given', () => {
    const result = calculateUrgency(undefined, TODAY)
    assert.equal(result.status, 'unknown')
    assert.equal(result.urgencyScore, 0)
    assert.equal(result.daysLeft, undefined)
  })

  it('flags a past date as overdue with score 100', () => {
    const result = calculateUrgency('2026-06-01', TODAY)
    assert.equal(result.status, 'overdue')
    assert.equal(result.urgencyScore, 100)
    assert.equal(result.daysLeft, -12)
  })

  it('flags today as due_today with score 95', () => {
    const result = calculateUrgency(TODAY, TODAY)
    assert.equal(result.status, 'due_today')
    assert.equal(result.urgencyScore, 95)
    assert.equal(result.daysLeft, 0)
  })

  it('scores the 3-day, 7-day and 14-day windows', () => {
    assert.equal(calculateUrgency('2026-06-15', TODAY).urgencyScore, 85) // +2d
    assert.equal(calculateUrgency('2026-06-19', TODAY).urgencyScore, 70) // +6d
    assert.equal(calculateUrgency('2026-06-25', TODAY).urgencyScore, 55) // +12d
    assert.equal(calculateUrgency('2026-08-01', TODAY).urgencyScore, 30) // far out
  })
})

describe('resolveRelativeDate', () => {
  it('adds the day window of a "within N days" rule to the anchor', () => {
    assert.equal(resolveRelativeDate('within 14 days after moving', '2026-06-10'), '2026-06-24')
    assert.equal(resolveRelativeDate('within 30 days after moving', '2026-06-10'), '2026-07-10')
  })

  it('resolves a "before" rule to the anchor date itself', () => {
    assert.equal(resolveRelativeDate('before starting business activity', '2026-07-01'), '2026-07-01')
  })

  it('returns null when the anchor date is missing', () => {
    assert.equal(resolveRelativeDate('within 14 days after moving', undefined), null)
  })
})

describe('inferUserContext', () => {
  it('maps a date in the message to the event primary anchor', () => {
    const context = inferUserContext('I moved to Lublin on 2026-06-10', 'moving_to_lublin')
    assert.equal(context.movedDate, '2026-06-10')
  })

  it('does not invent a date when none is present', () => {
    const context = inferUserContext('I moved to Lublin', 'moving_to_lublin')
    assert.equal(context.movedDate, undefined)
  })

  it('keeps explicit values over message parsing', () => {
    const context = inferUserContext('moved 2026-06-10', 'moving_to_lublin', {
      movedDate: '2026-01-01',
    })
    assert.equal(context.movedDate, '2026-01-01')
  })
})

describe('DeadlineGuardianService.build', () => {
  it('scores an exact-date deadline', async () => {
    const result = await build([
      {
        title: 'Termin rozprawy',
        relatedServiceId: 'SA-001',
        sourceType: 'neo4j',
        date: '2026-06-20',
      },
    ])
    assert.equal(result.deadlines.length, 1)
    assert.equal(result.deadlines[0]?.date, '2026-06-20')
    assert.equal(result.deadlines[0]?.status, 'due_soon')
    assert.equal(result.missingInfo.length, 0)
  })

  it('resolves a relative deadline when the anchor date is present', async () => {
    const result = await build(
      [
        {
          title: 'Deklaracja śmieciowa',
          shortLabel: 'waste declaration',
          relatedServiceId: 'OŚ-033',
          sourceType: 'neo4j',
          relativeRule: 'within 14 days after moving',
          anchorField: 'movedDate',
        },
      ],
      { movedDate: '2026-06-10' },
    )
    // Acceptance: moved 2026-06-10 + 14 days → 2026-06-24.
    assert.equal(result.deadlines[0]?.date, '2026-06-24')
    assert.equal(result.deadlines[0]?.anchorDate, '2026-06-10')
    assert.equal(result.missingInfo.length, 0)
  })

  it('asks for the anchor when a relative deadline cannot be resolved', async () => {
    const result = await build([
      {
        title: 'Deklaracja śmieciowa',
        shortLabel: 'waste declaration',
        relatedServiceId: 'OŚ-033',
        sourceType: 'neo4j',
        relativeRule: 'within 14 days after moving',
        anchorField: 'movedDate',
      },
    ])
    assert.equal(result.deadlines[0]?.status, 'unknown')
    assert.equal(result.deadlines[0]?.date, undefined)
    assert.deepEqual(result.missingInfo, [
      'movedDate is required to calculate the waste declaration deadline',
    ])
  })

  it('marks a past deadline as overdue', async () => {
    const result = await build([
      { title: 'Spóźniony termin', relatedServiceId: 'SA-002', sourceType: 'neo4j', date: '2026-05-01' },
    ])
    assert.equal(result.deadlines[0]?.status, 'overdue')
    assert.equal(result.deadlines[0]?.urgencyScore, 100)
  })

  it('marks a deadline due today', async () => {
    const result = await build([
      { title: 'Dziś', relatedServiceId: 'SA-003', sourceType: 'neo4j', date: TODAY },
    ])
    assert.equal(result.deadlines[0]?.status, 'due_today')
  })
})

describe('deduplication', () => {
  it('merges duplicate deadlines and prefers the Neo4j source', () => {
    const merged = dedupeDeadlines([
      {
        id: 'a',
        title: 'Deklaracja śmieciowa',
        relatedServiceId: 'OŚ-033',
        sourceType: 'qdrant',
        date: '2026-06-24',
        status: 'upcoming',
        urgencyScore: 55,
        explanation: 'x',
        requiredAction: 'x',
      },
      {
        id: 'b',
        title: 'Deklaracja śmieciowa (odpady)',
        relatedServiceId: 'OŚ-033',
        sourceType: 'neo4j',
        date: '2026-06-24',
        status: 'upcoming',
        urgencyScore: 55,
        explanation: 'y',
        requiredAction: 'y',
        officialLink: 'https://lublin.eu',
      },
    ])
    assert.equal(merged.length, 1)
    assert.equal(merged[0]?.sourceType, 'neo4j')
  })

  it('keeps deadlines for different services', () => {
    const merged = dedupeDeadlines([
      {
        id: 'a',
        title: 'Deklaracja',
        relatedServiceId: 'OŚ-033',
        sourceType: 'neo4j',
        date: '2026-06-24',
        status: 'upcoming',
        urgencyScore: 55,
        explanation: '',
        requiredAction: '',
      },
      {
        id: 'b',
        title: 'Zameldowanie',
        relatedServiceId: 'SA-007',
        sourceType: 'neo4j',
        date: '2026-07-10',
        status: 'upcoming',
        urgencyScore: 30,
        explanation: '',
        requiredAction: '',
      },
    ])
    assert.equal(merged.length, 2)
  })
})

describe('sorting by urgency', () => {
  it('orders deadlines by urgencyScore descending', () => {
    const sorted = sortByUrgency([
      { id: 'low', title: 'Low', sourceType: 'neo4j', status: 'upcoming', urgencyScore: 30, explanation: '', requiredAction: '' },
      { id: 'high', title: 'High', sourceType: 'neo4j', status: 'overdue', urgencyScore: 100, explanation: '', requiredAction: '' },
      { id: 'mid', title: 'Mid', sourceType: 'neo4j', status: 'due_soon', urgencyScore: 70, explanation: '', requiredAction: '' },
    ])
    assert.deepEqual(
      sorted.map((item) => item.id),
      ['high', 'mid', 'low'],
    )
  })

  it('build() returns deadlines already sorted by urgency', async () => {
    const result = await build([
      { title: 'Later', relatedServiceId: 'SA-100', sourceType: 'neo4j', date: '2026-08-01' },
      { title: 'Overdue', relatedServiceId: 'SA-101', sourceType: 'neo4j', date: '2026-05-01' },
      { title: 'Soon', relatedServiceId: 'SA-102', sourceType: 'neo4j', date: '2026-06-15' },
    ])
    assert.deepEqual(
      result.deadlines.map((item) => item.title),
      ['Overdue', 'Soon', 'Later'],
    )
  })
})

describe('parseLlmDeadlines', () => {
  it('parses a fenced JSON object and tags candidates as qdrant', () => {
    const candidates = parseLlmDeadlines(
      '```json\n{"deadlines":[{"title":"Wpis do CEIDG","relativeRule":"before starting business activity","sourceRef":"SA-090"}]}\n```',
    )
    assert.equal(candidates.length, 1)
    assert.equal(candidates[0]?.sourceType, 'qdrant')
    assert.equal(candidates[0]?.relativeRule, 'before starting business activity')
  })

  it('returns no candidates for an empty result or garbage', () => {
    assert.deepEqual(parseLlmDeadlines('{"deadlines":[]}'), [])
    assert.deepEqual(parseLlmDeadlines('the model refused to answer'), [])
  })
})
