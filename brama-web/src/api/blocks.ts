import { z } from 'zod'

/**
 * Answer-block contract (FE <-> BE). One variant per row in docs/content_blocks.md.
 * Validated at the trust boundary; unknown variants render a safe fallback.
 */

const linkSchema = z.object({
  label: z.string(),
  url: z.string().url(),
})

export const serviceHeaderBlockSchema = z.object({
  type: z.literal('serviceHeader'),
  name: z.string(),
  cardNumber: z.string(),
  department: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
})

export const documentsBlockSchema = z.object({
  type: z.literal('documents'),
  title: z.string().optional(),
  items: z.array(z.string()).min(1),
})

export const downloadFormBlockSchema = z.object({
  type: z.literal('downloadForm'),
  forms: z
    .array(z.object({ name: z.string(), url: z.string().url() }))
    .min(1),
})

export const feeBlockSchema = z.object({
  type: z.literal('fee'),
  amount: z.string(), // e.g. "82 zł" or "bezpłatne"
  note: z.string().optional(),
})

export const deadlineBlockSchema = z.object({
  type: z.literal('deadline'),
  kind: z.enum(['resolution', 'submission']).default('resolution'),
  value: z.string(), // e.g. "do 30 dni"
})

export const placeBlockSchema = z.object({
  type: z.literal('place'),
  kind: z.enum(['submit', 'collect']).default('submit'),
  address: z.string(),
  phone: z.string().optional(),
  hours: z.string().optional(),
  /** Optional precise point; falls back to geocoding the address. */
  lat: z.number().optional(),
  lng: z.number().optional(),
})

export const collapsibleBlockSchema = z.object({
  type: z.literal('collapsible'),
  variant: z.enum(['appeal', 'legalBasis', 'gdpr', 'additionalInfo']),
  title: z.string(),
  body: z.string(), // markdown
})

export const relatedServicesBlockSchema = z.object({
  type: z.literal('relatedServices'),
  services: z.array(z.object({ label: z.string(), query: z.string() })).min(1),
})

export const citationsBlockSchema = z.object({
  type: z.literal('citations'),
  sources: z.array(linkSchema).min(1),
  updatedAt: z.string().optional(),
})

export const feedbackPromptBlockSchema = z.object({
  type: z.literal('feedbackPrompt'),
  answerId: z.string(),
})

export const answerBlockSchema = z.discriminatedUnion('type', [
  serviceHeaderBlockSchema,
  documentsBlockSchema,
  downloadFormBlockSchema,
  feeBlockSchema,
  deadlineBlockSchema,
  placeBlockSchema,
  collapsibleBlockSchema,
  relatedServicesBlockSchema,
  citationsBlockSchema,
  feedbackPromptBlockSchema,
])

export const answerBlocksSchema = z.array(answerBlockSchema)

export type AnswerBlock = z.infer<typeof answerBlockSchema>
export type AnswerBlockType = AnswerBlock['type']

/** Parse unknown block data defensively: drop variants that fail validation. */
export function parseBlocks(data: unknown): AnswerBlock[] {
  if (!Array.isArray(data)) {
    return []
  }

  return data.flatMap((item) => {
    const result = answerBlockSchema.safeParse(item)
    return result.success ? [result.data] : []
  })
}
