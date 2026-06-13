import { useMutation } from '@tanstack/react-query'
import { createLifeEventPlan } from '@/api/planClient'

/** Owns the life-event plan request. UI calls `run({ eventId, lang, group })`. */
export function useLifeEventPlan() {
  const mutation = useMutation({ mutationFn: createLifeEventPlan })

  return {
    run: mutation.mutate,
    plan: mutation.data ?? null,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  }
}
