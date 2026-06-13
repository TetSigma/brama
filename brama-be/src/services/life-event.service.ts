import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { env } from '../config/env.js'
import { cosine, embed } from '../lib/embed.js'

export type ExternalInfo = { label: string; note: string }

export type LifeEventConfig = {
  id: string
  title: Record<string, string>
  keywords?: string
  services: string[]
  groups?: Record<string, string[]>
  externalInfo?: ExternalInfo[]
}

export type Classification = { eventId: string; score: number }

export class LifeEventService {
  private readonly events: LifeEventConfig[]
  private readonly vectors: { id: string; vector: number[] }[] = []
  private readonly ready: Promise<void>

  constructor() {
    this.events = this.load()
    this.ready = this.buildVectors()
  }

  private load(): LifeEventConfig[] {
    try {
      const path = resolve(process.cwd(), env.LIFE_EVENTS_PATH)
      return JSON.parse(readFileSync(path, 'utf8')) as LifeEventConfig[]
    } catch (error) {
      console.error('life_events.json unavailable; life-event plans disabled', error)
      return []
    }
  }

  // Pre-embed each event (titles + keywords) once at startup for classification.
  private async buildVectors(): Promise<void> {
    for (const event of this.events) {
      try {
        const text = `${Object.values(event.title).join(' ')} ${event.keywords ?? ''}`
        this.vectors.push({ id: event.id, vector: await embed(text) })
      } catch (error) {
        console.error(`Failed to embed life event ${event.id}`, error)
      }
    }
  }

  getEvent(id: string): LifeEventConfig | null {
    return this.events.find((event) => event.id === id) ?? null
  }

  resolveServices(event: LifeEventConfig, group?: string): string[] {
    const override = group ? event.groups?.[group] : undefined
    return override ?? event.services
  }

  // Returns the best-matching life event by embedding similarity, or null when
  // nothing clears the threshold (caller then falls back to normal chat).
  async classify(query: string): Promise<Classification | null> {
    await this.ready

    if (this.vectors.length === 0 || query.trim().length === 0) {
      return null
    }

    let queryVector: number[]
    try {
      queryVector = await embed(query)
    } catch {
      return null
    }

    let best: Classification | null = null
    for (const entry of this.vectors) {
      const score = cosine(queryVector, entry.vector)
      if (!best || score > best.score) {
        best = { eventId: entry.id, score }
      }
    }

    return best && best.score >= env.LIFE_EVENT_THRESHOLD ? best : null
  }
}

export const lifeEventService = new LifeEventService()
