import { z } from 'zod'

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

// Known user-context dates the Deadline Guardian uses to resolve relative
// deadlines. All optional — clients send only what the user has provided.
export const userContextSchema = z
  .object({
    movedDate: isoDate.optional(),
    documentLostDate: isoDate.optional(),
    childBirthDate: isoDate.optional(),
    businessStartDate: isoDate.optional(),
    appointmentDate: isoDate.optional(),
  })
  .optional()

export const lifeEventPlanSchema = z.object({
  message: z.string().trim().min(1),
  lang: z.string().trim().min(1).default('pl'),
  group: z.string().trim().min(1).optional(),
  eventId: z.string().trim().min(1).optional(),
  userContext: userContextSchema,
})

export type LifeEventPlanRequest = z.infer<typeof lifeEventPlanSchema>
