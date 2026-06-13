import { env } from '../config/env.js'

// Embeds text with the same Ollama endpoint + model as scripts/ingest.ts, so
// every vector (documents, queries, life-event descriptions) shares one space.
export async function embed(text: string): Promise<number[]> {
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

export function cosine(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length)
  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < length; i++) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    dot += x * y
    normA += x * x
    normB += y * y
  }

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}
