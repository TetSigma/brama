import type { CreatePlanInput, LifeEventPlan } from '@/@types/plan'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

/**
 * POST /api/life-event-plan. Returns null when the backend reports no matching
 * life event (404 + {fallback:"chat"}) so the caller can defer to plain chat.
 */
export async function createLifeEventPlan(input: CreatePlanInput): Promise<LifeEventPlan | null> {
  const response = await fetch(`${API_BASE}/api/life-event-plan`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Life-event plan request failed: ${response.status}`)
  }

  return (await response.json()) as LifeEventPlan
}
