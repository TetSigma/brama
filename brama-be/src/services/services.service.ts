import { readFileSync } from 'node:fs'
import path from 'node:path'
import { env } from '../config/env.js'

export type ServiceForm = { nazwa: string; url: string }

export type ServiceUpdate = {
  wersja?: string
  zmodyfikowano?: string
  utworzono?: string
}

export type ServiceCard = {
  numer_karty: string
  nazwa: string
  komorka: string
  url: string
  status: string
  // Section name → section body, both Polish prose (e.g. "Wymagane opłaty").
  sekcje: Record<string, string>
  wnioski_do_pobrania: ServiceForm[]
  aktualizacja: ServiceUpdate | null
}

// In-memory index of the parsed BIP service cards, keyed by card number
// (numer_karty). Loaded once from services.json at boot — no Qdrant, no DB,
// no embeddings. Lets the chat turn enrich the top retrieval hit with the
// structured sections needed to build content blocks.
export class ServicesService {
  private readonly byCardId = new Map<string, ServiceCard>()

  constructor() {
    try {
      const filePath = path.resolve(env.BIP_DATA_DIR, 'services.json')
      const raw = readFileSync(filePath, 'utf-8')
      const records = JSON.parse(raw) as ServiceCard[]
      for (const record of records) {
        if (record?.numer_karty) {
          this.byCardId.set(record.numer_karty, record)
        }
      }
      console.log(`Loaded ${this.byCardId.size} service cards for content blocks`)
    } catch (error) {
      // Blocks are an enrichment layer; tolerate a missing/unreadable file.
      console.error('services.json unavailable; content blocks disabled', error)
    }
  }

  getByCardId(cardId: string): ServiceCard | null {
    if (cardId.length === 0) {
      return null
    }
    return this.byCardId.get(cardId) ?? null
  }
}

export const servicesService = new ServicesService()
