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

const serviceUpdateSchema = z.object({
  wersja: z.string().optional(),
  zmodyfikowano: z.string().optional(),
  utworzono: z.string().optional(),
})

const backendBundleSchema = z.object({
  service: z
    .object({
      cardId: z.string(),
      nazwa: z.string(),
      komorka: z.string(),
      url: z.string().url(),
      status: z.string().optional(),
      aktualizacja: serviceUpdateSchema.nullish(),
    })
    .optional(),
  map: z
    .object({
      symbol: z.string().optional(),
      nazwa: z.string(),
      adres: z.string().nullable().optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
    })
    .optional(),
  fee: z.object({ text: z.string() }).optional(),
  deadline: z
    .object({
      text: z.string().optional(),
      submission: z.string().optional(),
    })
    .optional(),
  docs: z
    .object({
      required: z.string().optional(),
      attachments: z.string().optional(),
      toView: z.string().optional(),
    })
    .optional(),
  form: z.array(z.object({ nazwa: z.string(), url: z.string().url() })).optional(),
  contact: z
    .object({
      telefon: z.string().optional(),
      email: z.string().optional(),
      godziny: z.string().optional(),
    })
    .optional(),
  pickup: z.object({ text: z.string() }).optional(),
  related: z.array(z.object({ cardId: z.string(), nazwa: z.string() })).optional(),
  legal: z
    .object({
      appeal: z.string().optional(),
      basis: z.string().optional(),
      gdpr: z.string().optional(),
      additional: z.string().optional(),
    })
    .optional(),
})

const backendEnvelopeSchema = z.object({
  blocks: backendBundleSchema,
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
type BackendBundle = z.infer<typeof backendBundleSchema>

const LIST_SPLIT_PATTERN =
  /(?:\r?\n|;\s+|,\s+(?=(?:[a-ząćęłńóśźż]|[A-ZĄĆĘŁŃÓŚŹŻ])[^,]{8,}))/u

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function truncate(value: string, maxLength: number): string {
  const text = cleanText(value)
  if (text.length <= maxLength) {
    return text
  }
  return `${text.slice(0, maxLength - 1).trim()}…`
}

function listItems(value: string | undefined): string[] {
  if (!value) {
    return []
  }

  const items = value
    .split(LIST_SPLIT_PATTERN)
    .map((item) => cleanText(item).replace(/^[-•*\d.)\s]+/u, '').trim())
    .filter((item) => item.length > 0)

  return items.length > 0 ? items : [cleanText(value)]
}

function feeAmount(text: string): string {
  if (/\b(?:bezpłat|bez opłat|nie podlega opłacie)\w*/iu.test(text)) {
    return 'bezpłatne'
  }

  const amounts = [...text.matchAll(/\d+(?:[,.]\d{2})?\s*zł/giu)]
    .map((match) => match[0])
    .slice(0, 2)

  return amounts.length > 0 ? amounts.join(' / ') : truncate(text, 80)
}

function updatedAt(bundle: BackendBundle): string | undefined {
  return (
    bundle.service?.aktualizacja?.zmodyfikowano ??
    bundle.service?.aktualizacja?.utworzono ??
    bundle.service?.aktualizacja?.wersja
  )
}

function bundleToBlocks(bundle: BackendBundle): AnswerBlock[] {
  const blocks: AnswerBlock[] = []

  if (bundle.service) {
    blocks.push({
      type: 'serviceHeader',
      name: bundle.service.nazwa,
      cardNumber: bundle.service.cardId,
      department: bundle.service.komorka,
      status: bundle.service.status === 'inactive' ? 'inactive' : 'active',
    })
  }

  const required = listItems(bundle.docs?.required)
  const attachments = listItems(bundle.docs?.attachments)
  const toView = listItems(bundle.docs?.toView)
  if (required.length > 0) {
    blocks.push({ type: 'documents', title: 'Wymagane wnioski', items: required })
  }
  if (attachments.length > 0) {
    blocks.push({ type: 'documents', title: 'Wymagane załączniki', items: attachments })
  }
  if (toView.length > 0) {
    blocks.push({ type: 'documents', title: 'Dokumenty do wglądu', items: toView })
  }

  if (bundle.form?.length) {
    blocks.push({
      type: 'downloadForm',
      forms: bundle.form.map((form) => ({ name: form.nazwa, url: form.url })),
    })
  }

  if (bundle.fee?.text) {
    blocks.push({
      type: 'fee',
      amount: feeAmount(bundle.fee.text),
      note: truncate(bundle.fee.text, 360),
    })
  }

  if (bundle.deadline?.text) {
    blocks.push({
      type: 'deadline',
      kind: 'resolution',
      value: truncate(bundle.deadline.text, 140),
    })
  }
  if (bundle.deadline?.submission) {
    blocks.push({
      type: 'deadline',
      kind: 'submission',
      value: truncate(bundle.deadline.submission, 140),
    })
  }

  if (bundle.map) {
    blocks.push({
      type: 'place',
      kind: 'submit',
      address: bundle.map.adres ?? bundle.map.nazwa,
      phone: bundle.contact?.telefon,
      hours: bundle.contact?.godziny,
      lat: bundle.map.lat,
      lng: bundle.map.lng,
    })
  }

  if (bundle.pickup?.text) {
    blocks.push({
      type: 'collapsible',
      variant: 'additionalInfo',
      title: 'Odbiór dokumentów',
      body: bundle.pickup.text,
    })
  }

  if (bundle.legal?.additional) {
    blocks.push({
      type: 'collapsible',
      variant: 'additionalInfo',
      title: 'Informacje dodatkowe',
      body: bundle.legal.additional,
    })
  }
  if (bundle.legal?.appeal) {
    blocks.push({
      type: 'collapsible',
      variant: 'appeal',
      title: 'Tryb odwoławczy',
      body: bundle.legal.appeal,
    })
  }
  if (bundle.legal?.basis) {
    blocks.push({
      type: 'collapsible',
      variant: 'legalBasis',
      title: 'Podstawa prawna',
      body: bundle.legal.basis,
    })
  }
  if (bundle.legal?.gdpr) {
    blocks.push({
      type: 'collapsible',
      variant: 'gdpr',
      title: 'RODO i dane osobowe',
      body: bundle.legal.gdpr,
    })
  }

  if (bundle.related?.length) {
    blocks.push({
      type: 'relatedServices',
      services: bundle.related.map((service) => ({
        label: `${service.cardId} — ${service.nazwa}`,
        query: `Pokaż usługę ${service.cardId}: ${service.nazwa}`,
      })),
    })
  }

  if (bundle.service) {
    blocks.push({
      type: 'citations',
      sources: [
        {
          label: `BIP Lublin — ${bundle.service.nazwa} (${bundle.service.cardId})`,
          url: bundle.service.url,
        },
      ],
      updatedAt: updatedAt(bundle),
    })
  }

  return answerBlocksSchema.parse(blocks)
}

/** Parse unknown block data defensively: drop variants that fail validation. */
export function parseBlocks(data: unknown): AnswerBlock[] {
  if (!Array.isArray(data)) {
    if (typeof data === 'object' && data !== null && 'blocks' in data) {
      const envelopeResult = backendEnvelopeSchema.safeParse(data)
      return envelopeResult.success ? bundleToBlocks(envelopeResult.data.blocks) : []
    }

    const bundleResult = backendBundleSchema.safeParse(data)
    return bundleResult.success ? bundleToBlocks(bundleResult.data) : []
  }

  return data.flatMap((item) => {
    const result = answerBlockSchema.safeParse(item)
    return result.success ? [result.data] : []
  })
}
