import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { QdrantClient } from '@qdrant/js-client-rest'
import ollama from 'ollama'

const QDRANT_URL = process.env.QDRANT_URL ?? 'http://localhost:6333'
const COLLECTION = process.env.QDRANT_COLLECTION ?? 'bip_services'
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL ?? 'bge-m3'
const DATA_DIR = resolve(process.cwd(), process.env.BIP_DATA_DIR ?? '../docs/bip_db')

const VECTOR_SIZE = 1024 // bge-m3
const MAX_TEXT_LENGTH = 5000
const UPSERT_BATCH = 64

type Section = Record<string, string>

type ServiceRecord = {
  numer_karty?: string
  nazwa?: string
  url?: string
  sekcje?: Section
  wnioski_do_pobrania?: Array<{ nazwa?: string }>
}

type DepartmentRecord = {
  nazwa?: string
  symbol?: string
  departament?: string
  is_departament?: boolean
  adres?: string
  telefon?: string
  email?: string
  kierownik?: string
  sekcje?: Section
}

type ChunkPayload = {
  kind: 'service' | 'unit'
  ref: string
  title: string
  text: string
  komorka: string
  departament: string
}

type Point = { id: number; vector: number[]; payload: ChunkPayload }

const client = new QdrantClient({ url: QDRANT_URL })

const readJson = <T>(name: string): T =>
  JSON.parse(readFileSync(resolve(DATA_DIR, name), 'utf8')) as T

const sectionByPrefix = (sections: Section | undefined, prefix: string): string => {
  for (const key of Object.keys(sections ?? {})) {
    if (key.startsWith(prefix)) {
      return sections?.[key] ?? ''
    }
  }
  return ''
}

const contactLines = (unit: DepartmentRecord): string[] => {
  const lines: string[] = []
  if (unit.departament) lines.push(`Departament: ${unit.departament}.`)
  if (unit.adres) lines.push(`Adres: ${unit.adres}.`)
  if (unit.telefon) lines.push(`Telefon: ${unit.telefon}.`)
  if (unit.email) lines.push(`E-mail: ${unit.email}.`)
  if (unit.kierownik) lines.push(`Kierownik: ${unit.kierownik}.`)
  const hours = sectionByPrefix(unit.sekcje, 'Godziny')
  if (hours) lines.push(`Godziny pracy: ${hours}`)
  return lines
}

const clamp = (text: string): string =>
  text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text

const buildServiceText = (service: ServiceRecord, unit: DepartmentRecord | undefined): string => {
  const head = [`Usluga: ${service.nazwa ?? ''}.`]
  if (service.numer_karty) head.push(`Numer karty: ${service.numer_karty}.`)

  const sections = service.sekcje ?? {}
  const body: string[] = []
  for (const key of Object.keys(sections)) {
    if (key.startsWith('Klauzula')) continue // skip RODO boilerplate
    const value = sections[key]
    if (value) body.push(`${key}: ${value}`)
  }

  const forms = (service.wnioski_do_pobrania ?? [])
    .map((form) => form.nazwa ?? '')
    .filter((name) => name.length > 0)
    .join(', ')
  if (forms) body.push(`Wnioski do pobrania: ${forms}.`)

  const segments = [head.join('\n'), clamp(body.join('\n'))]
  if (unit) {
    segments.push([`Komorka zalatwiajaca: ${unit.nazwa ?? ''}.`, ...contactLines(unit)].join(' '))
  }
  if (service.url) segments.push(`Zrodlo: ${service.url}`)

  return segments.filter((segment) => segment.length > 0).join('\n\n')
}

const buildUnitText = (unit: DepartmentRecord): string => {
  const lines = [`Komorka: ${unit.nazwa ?? ''}.`]
  if (unit.symbol) lines.push(`Symbol: ${unit.symbol}.`)
  lines.push(...contactLines(unit))
  const scope = sectionByPrefix(unit.sekcje, 'Zakres')
  if (scope) lines.push(`Zakres dzialania: ${scope}`)
  return clamp(lines.join('\n'))
}

const embed = async (text: string): Promise<number[]> => {
  const result = await ollama.embeddings({ model: EMBED_MODEL, prompt: text })
  return result.embedding
}

const recreateCollection = async (): Promise<void> => {
  const { collections } = await client.getCollections()
  if (collections.some((collection) => collection.name === COLLECTION)) {
    await client.deleteCollection(COLLECTION)
  }
  await client.createCollection(COLLECTION, {
    vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
  })
  console.log(`collection ready: ${COLLECTION}`)
}

const upsertAll = async (points: Point[]): Promise<void> => {
  for (let index = 0; index < points.length; index += UPSERT_BATCH) {
    await client.upsert(COLLECTION, { wait: true, points: points.slice(index, index + UPSERT_BATCH) })
  }
}

const main = async (): Promise<void> => {
  const services = readJson<ServiceRecord[]>('services.json')
  const departments = readJson<DepartmentRecord[]>('departments.json')

  const unitsBySymbol = new Map<string, DepartmentRecord>()
  for (const dept of departments) {
    if (!dept.is_departament && dept.symbol) {
      unitsBySymbol.set(dept.symbol, dept)
    }
  }

  await recreateCollection()

  const points: Point[] = []

  for (const service of services) {
    const symbol = (service.numer_karty ?? '').split('-')[0] ?? ''
    const unit = unitsBySymbol.get(symbol)
    const text = buildServiceText(service, unit)
    points.push({
      id: points.length,
      vector: await embed(text),
      payload: {
        kind: 'service',
        ref: service.numer_karty ?? '',
        title: service.nazwa ?? '',
        text,
        komorka: unit?.nazwa ?? '',
        departament: unit?.departament ?? '',
      },
    })
    if (points.length % 25 === 0) console.log(`embedded ${points.length}`)
  }

  const serviceCount = points.length

  for (const dept of departments) {
    if (dept.is_departament) continue
    const text = buildUnitText(dept)
    points.push({
      id: points.length,
      vector: await embed(text),
      payload: {
        kind: 'unit',
        ref: dept.symbol ?? '',
        title: dept.nazwa ?? '',
        text,
        komorka: dept.nazwa ?? '',
        departament: dept.departament ?? '',
      },
    })
  }

  await upsertAll(points)
  console.log(`DONE total: ${points.length} (services: ${serviceCount}, units: ${points.length - serviceCount})`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
