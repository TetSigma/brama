import neo4j, { type Driver } from 'neo4j-driver'
import { env } from '../config/env.js'

export type ServiceNode = {
  card_id: string
  nazwa: string
  komorka: string
  url: string
  // Deadline metadata consumed by the Deadline Guardian feature. Both optional:
  // `deadline` is an exact YYYY-MM-DD date, `deadlineRule` a relative rule
  // (e.g. "within 14 days after moving"). Absent on most service nodes.
  deadline?: string | null
  deadlineRule?: string | null
}

export type OfficeNode = {
  symbol: string
  nazwa: string
  adres: string | null
  telefon: string | null
  email: string | null
  departament: string | null
  hours: string | null
}

export type Prerequisite = ServiceNode & { document: string | null }

export type ExternalOffice = { code: string; label: string }

export type ServiceGraph = {
  service: ServiceNode
  office: OfficeNode | null
  prerequisites: Prerequisite[]
  externalOffices: ExternalOffice[]
}

const serviceGraphQuery = `
  MATCH (s:Service {card_id: $cardId})
  OPTIONAL MATCH (s)-[:HANDLED_BY]->(o:Office)
  OPTIONAL MATCH (s)-[:REQUIRES_EXTERNAL]->(x:ExternalOffice)
  WITH s, o, collect(DISTINCT { code: x.code, label: x.label }) AS externals
  OPTIONAL MATCH (s)-[rp:REQUIRES_PRIOR]->(p:Service)
  RETURN s { .card_id, .nazwa, .komorka, .url, .deadline, .deadlineRule } AS service,
         o { .symbol, .nazwa, .adres, .telefon, .email, .departament, .hours } AS office,
         externals AS externals,
         collect(DISTINCT p { .card_id, .nazwa, .komorka, document: rp.document }) AS prerequisites
`

export class GraphService {
  private readonly driver: Driver | null

  constructor() {
    this.driver = env.GRAPH_ENABLED
      ? neo4j.driver(env.NEO4J_URI, neo4j.auth.basic(env.NEO4J_USER, env.NEO4J_PASSWORD))
      : null
  }

  async getServiceGraph(cardId: string): Promise<ServiceGraph | null> {
    if (!this.driver) {
      return null
    }

    const session = this.driver.session()

    try {
      const result = await session.run(serviceGraphQuery, { cardId })
      const record = result.records[0]
      if (!record) {
        return null
      }

      const service = record.get('service') as ServiceNode | null
      if (!service) {
        return null
      }

      const prerequisites = (record.get('prerequisites') as Prerequisite[]).filter(
        (entry) => entry.card_id,
      )
      const externalOffices = (record.get('externals') as ExternalOffice[]).filter(
        (entry) => entry.code,
      )

      return {
        service,
        office: record.get('office') as OfficeNode | null,
        prerequisites,
        externalOffices,
      }
    } catch (error) {
      // The graph is an enrichment layer; never let it break a request.
      console.error('Graph query failed', error)
      return null
    } finally {
      await session.close()
    }
  }

  async close(): Promise<void> {
    await this.driver?.close()
  }
}

export const graphService = new GraphService()
