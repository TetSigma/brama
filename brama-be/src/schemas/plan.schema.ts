import { z } from 'zod'

export const lifeEventPlanSchema = z.object({
  message: z.string().trim().min(1),
  lang: z.string().trim().min(1).default('pl'),
  group: z.string().trim().min(1).optional(),
  eventId: z.string().trim().min(1).optional(),
})

export type LifeEventPlanRequest = z.infer<typeof lifeEventPlanSchema>
