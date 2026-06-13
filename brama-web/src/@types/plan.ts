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

export type LifeEventPlan = {
  lifeEvent: string
  title: string
  confidence: number
  plan: PlanStep[]
  externalInfo: { label: string; note: string }[]
  missingInfo: string[]
  answer: string
}

export type CreatePlanInput = {
  message: string
  lang: string
  group?: string
  eventId?: string
}
