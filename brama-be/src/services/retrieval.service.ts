import { QdrantClient } from '@qdrant/js-client-rest'
import ollama from 'ollama'
import { env } from '../config/env.js'

export type RetrievalFilter = {
  kind?: string
  departament?: string
}

type FieldCondition = {
  key: string
  match: { value: string }
}

export class RetrievalService {
  private readonly client: QdrantClient

  constructor() {
    this.client = new QdrantClient({ url: env.QDRANT_URL })
  }

  async retrieve(query: string, filter: RetrievalFilter = {}): Promise<string> {
    if (!env.RAG_ENABLED || query.trim().length === 0) {
      return ''
    }

    try {
      const vector = await this.embed(query)
      const conditions = this.buildConditions(filter)

      const results = await this.client.search(env.QDRANT_COLLECTION, {
        vector,
        limit: env.RAG_TOP_K,
        with_payload: true,
        filter: conditions.length > 0 ? { must: conditions } : undefined,
      })

      return results
        .map((hit) => this.extractText(hit.payload))
        .filter((text) => text.length > 0)
        .join('\n\n---\n\n')
    } catch (error) {
      // Degrade gracefully: a retrieval outage must not break chat.
      console.error('Retrieval failed; answering without context', error)
      return ''
    }
  }

  private async embed(text: string): Promise<number[]> {
    const result = await ollama.embeddings({
      model: env.OLLAMA_EMBED_MODEL,
      prompt: text,
    })

    return result.embedding
  }

  private buildConditions(filter: RetrievalFilter): FieldCondition[] {
    const conditions: FieldCondition[] = []

    if (filter.kind) {
      conditions.push({ key: 'kind', match: { value: filter.kind } })
    }

    if (filter.departament) {
      conditions.push({ key: 'departament', match: { value: filter.departament } })
    }

    return conditions
  }

  private extractText(payload: Record<string, unknown> | null | undefined): string {
    const text = payload?.text
    return typeof text === 'string' ? text : ''
  }
}
