export type PlanOffice = {
  nazwa: string
  symbol: string | null
  adres: string | null
  telefon: string | null
  email: string | null
  godziny_pracy: string | null
  lat: number | null
  lng: number | null
}

export type PlanStep = {
  cardId: string
  title: string
  url: string
  office: PlanOffice | null
  prerequisites: { cardId: string; nazwa: string }[]
  externalOffices: { code: string; label: string }[]
}

export type DeadlineStatus = 'overdue' | 'due_today' | 'due_soon' | 'upcoming' | 'unknown'

export type DeadlineItem = {
  id: string
  title: string
  relatedServiceId?: string
  sourceType: 'neo4j' | 'qdrant' | 'uploaded_document' | 'user_input'
  sourceRef?: string
  date?: string
  time?: string
  relativeRule?: string
  anchorDate?: string
  status: DeadlineStatus
  urgencyScore: number
  explanation: string
  requiredAction: string
  consequence?: string
  officialLink?: string
}

export type LifeEventPlan = {
  lifeEvent: string
  title: string
  confidence: number
  plan: PlanStep[]
  externalInfo: { label: string; note: string }[]
  deadlines: DeadlineItem[]
  deadlineSummary: string
  missingInfo: string[]
  answer: string
}

export type UserContext = {
  movedDate?: string
  documentLostDate?: string
  childBirthDate?: string
  businessStartDate?: string
  appointmentDate?: string
}

export type CreatePlanInput = {
  message: string
  lang: string
  group?: string
  eventId?: string
  userContext?: UserContext
}
