import { z } from 'zod'

export const serviceCardParamsSchema = z.object({
  cardId: z.string().trim().min(1),
})

export type ServiceCardParams = z.infer<typeof serviceCardParamsSchema>
