import { DepartmentService } from './department.service.js'
import { graphService, type GraphService } from './graph.service.js'
import {
  servicesService,
  ServicesService,
  type ServiceCard,
  type ServiceForm,
} from './services.service.js'

// Exact section names as they appear in services.json `sekcje`.
const SEKCJA = {
  fee: 'Wymagane opłaty',
  deadline: 'Termin załatwienia sprawy',
  submission: 'Termin złożenia',
  applications: 'Wymagane wnioski',
  attachments: 'Wymagane załączniki',
  toView: 'Dokumenty do wglądu',
  pickup: 'Sposób i miejsce odbioru dokumentów',
  appeal: 'Tryb odwoławczy',
  legalBasis: 'Podstawa prawna',
  gdpr: 'Klauzula informacyjna dotycząca ochrony danych osobowych',
  additional: 'Informacje dodatkowe',
} as const

// The contextual blocks the LLM places inline as [[tags]]. Everything else in
// the bundle is rendered automatically by the frontend (header, contact,
// pickup, related, legal accordions, rating).
export const CONTEXTUAL_TAGS = ['map', 'fee', 'deadline', 'docs', 'form'] as const
export type ContextualTag = (typeof CONTEXTUAL_TAGS)[number]

export type MapBlock = {
  symbol: string
  nazwa: string
  adres: string | null
  lat: number
  lng: number
}

export type Bundle = {
  service?: {
    cardId: string
    nazwa: string
    komorka: string
    url: string
    status?: string
    aktualizacja?: ServiceCard['aktualizacja']
  }
  map?: MapBlock
  fee?: { text: string }
  deadline?: { text?: string; submission?: string }
  docs?: { required?: string; attachments?: string; toView?: string }
  form?: ServiceForm[]
  contact?: { telefon?: string; email?: string; godziny?: string }
  pickup?: { text: string }
  related?: { cardId: string; nazwa: string }[]
  legal?: { appeal?: string; basis?: string; gdpr?: string; additional?: string }
}

export class BlocksService {
  constructor(
    private readonly servicesService: ServicesService,
    private readonly departmentService: DepartmentService,
    private readonly graphService: GraphService,
  ) {}

  // Builds the content-block bundle for the primary (top) retrieval hit. Each
  // key is present only when the underlying data exists, so the frontend and
  // the prompt's tag list can key off mere presence.
  async build(cardId: string): Promise<Bundle> {
    const bundle: Bundle = {}
    if (cardId.length === 0) {
      return bundle
    }

    const card = this.servicesService.getByCardId(cardId)
    if (card) {
      bundle.service = {
        cardId: card.numer_karty,
        nazwa: card.nazwa,
        komorka: card.komorka,
        url: card.url,
        status: card.status || undefined,
        aktualizacja: card.aktualizacja ?? undefined,
      }

      const sekcje = card.sekcje ?? {}
      const fee = sekcje[SEKCJA.fee]
      if (fee) bundle.fee = { text: fee }

      const deadline = sekcje[SEKCJA.deadline]
      const submission = sekcje[SEKCJA.submission]
      if (deadline || submission) {
        bundle.deadline = { text: deadline || undefined, submission: submission || undefined }
      }

      const required = sekcje[SEKCJA.applications]
      const attachments = sekcje[SEKCJA.attachments]
      const toView = sekcje[SEKCJA.toView]
      if (required || attachments || toView) {
        bundle.docs = {
          required: required || undefined,
          attachments: attachments || undefined,
          toView: toView || undefined,
        }
      }

      if (card.wnioski_do_pobrania?.length) {
        bundle.form = card.wnioski_do_pobrania
      }

      const pickup = sekcje[SEKCJA.pickup]
      if (pickup) bundle.pickup = { text: pickup }

      const legal = {
        appeal: sekcje[SEKCJA.appeal] || undefined,
        basis: sekcje[SEKCJA.legalBasis] || undefined,
        gdpr: sekcje[SEKCJA.gdpr] || undefined,
        additional: sekcje[SEKCJA.additional] || undefined,
      }
      if (legal.appeal || legal.basis || legal.gdpr || legal.additional) {
        bundle.legal = legal
      }
    }

    // Office: card-number prefix = department symbol → SQLite row (with the
    // geocoded coords). map block requires coords; contact does not.
    const symbol = cardId.split('-')[0] ?? ''
    const department = symbol.length > 0 ? this.departmentService.getBySymbol(symbol) : null
    if (department) {
      if (department.lat != null && department.lng != null) {
        bundle.map = {
          symbol,
          nazwa: department.nazwa,
          adres: department.adres,
          lat: department.lat,
          lng: department.lng,
        }
      }
      if (department.telefon || department.email || department.godziny_pracy) {
        bundle.contact = {
          telefon: department.telefon ?? undefined,
          email: department.email ?? undefined,
          godziny: department.godziny_pracy ?? undefined,
        }
      }
    }

    // Related services: prerequisite chain from the graph (structured), better
    // than the free-text "Czynności powiązane" section.
    const graph = await this.graphService.getServiceGraph(cardId)
    const related = (graph?.prerequisites ?? [])
      .filter((prerequisite) => prerequisite.card_id)
      .map((prerequisite) => ({ cardId: prerequisite.card_id, nazwa: prerequisite.nazwa }))
    if (related.length > 0) {
      bundle.related = related
    }

    return bundle
  }

  // The contextual tags whose data is present this turn — fed to the prompt so
  // the model can only emit tags that resolve to real blocks.
  availableTags(bundle: Bundle): ContextualTag[] {
    return CONTEXTUAL_TAGS.filter((tag) => bundle[tag] !== undefined)
  }
}

export const blocksService = new BlocksService(
  servicesService,
  new DepartmentService(),
  graphService,
)
