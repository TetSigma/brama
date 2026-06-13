import { QdrantClient } from '@qdrant/js-client-rest'
import { env } from '../config/env.js'

export type RetrievalFilter = {
  komorka?: string
}

export type RetrievalHit = {
  text: string
  cardId: string
  nazwa: string
  komorka: string
  url: string
}

export class RetrievalService {
  private readonly client: QdrantClient

  constructor() {
    this.client = new QdrantClient({ url: env.QDRANT_URL })
  }

  async retrieve(query: string, filter: RetrievalFilter = {}): Promise<RetrievalHit[]> {
    if (!env.RAG_ENABLED || query.trim().length === 0) {
      return []
    }

    try {
      const vector = await this.embed(query)

      const results = await this.client.search(env.QDRANT_COLLECTION, {
        vector,
        limit: env.RAG_TOP_K,
        with_payload: true,
        filter: filter.komorka
          ? { must: [{ key: 'komorka', match: { value: filter.komorka } }] }
          : undefined,
      })

      return results
        .map((hit) => this.toHit(hit.payload))
        .filter((hit): hit is RetrievalHit => hit !== null)
    } catch (error) {
      // Degrade gracefully: a retrieval outage must not break chat.
      console.error('Retrieval failed; answering without context', error)
      return []
    }
  }

  // Embeds via the same Ollama endpoint and model as scripts/ingest.ts, so
  // query vectors and stored document vectors live in the same space.
  private async embed(text: string): Promise<number[]> {
    const response = await fetch(`${env.OLLAMA_BASE_URL}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: env.OLLAMA_EMBED_MODEL, input: text }),
    })

    if (!response.ok) {
      throw new Error(`Ollama embed failed: ${response.status}`)
    }

    const data = (await response.json()) as { embeddings: number[][] }
    const vector = data.embeddings[0]

    if (!vector) {
      throw new Error('Empty embedding returned')
    }

    return vector
  }

  private toHit(payload: Record<string, unknown> | null | undefined): RetrievalHit | null {
    const text = this.asString(payload?.text)
    if (!text) {
      return null
    }

    return {
      text,
      cardId: this.asString(payload?.card_id),
      nazwa: this.asString(payload?.nazwa),
      komorka: this.asString(payload?.komorka),
      url: this.asString(payload?.url),
    }
  }

  private asString(value: unknown): string {
    return typeof value === 'string' ? value : ''
  }
}
