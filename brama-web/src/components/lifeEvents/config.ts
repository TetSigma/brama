import { Briefcase, FileWarning, Home, type LucideIcon } from 'lucide-react'

type Localized = Record<string, string>

export type LifeEventDef = {
  id: string
  icon: LucideIcon
  /** When true, ask for citizenship status (drives the backend `group`). */
  citizenship?: boolean
  label: Localized
}

export const LIFE_EVENTS: LifeEventDef[] = [
  {
    id: 'moving_to_lublin',
    icon: Home,
    citizenship: true,
    label: { pl: 'Przeprowadzka do Lublina', en: 'Moving to Lublin', uk: 'Переїзд до Любліна' },
  },
  {
    id: 'lost_documents',
    icon: FileWarning,
    label: { pl: 'Utrata dokumentów', en: 'Lost documents', uk: 'Втрата документів' },
  },
  {
    id: 'starting_business',
    icon: Briefcase,
    label: { pl: 'Założenie działalności', en: 'Starting a business', uk: 'Відкриття бізнесу' },
  },
]

export const CITIZENSHIP_GROUPS: { value: string; label: Localized }[] = [
  { value: '', label: { pl: 'Obywatel/ka RP', en: 'Polish citizen', uk: 'Громадянин(ка) Польщі' } },
  {
    value: 'ukrainian_temp_protection',
    label: {
      pl: 'Ochrona czasowa (Ukraina)',
      en: 'Temporary protection (Ukraine)',
      uk: 'Тимчасовий захист (Україна)',
    },
  },
  { value: 'foreigner', label: { pl: 'Cudzoziemiec/ka', en: 'Foreigner', uk: 'Іноземець(ка)' } },
]

export const UI_LABELS: Record<string, Localized> = {
  heading: { pl: 'Sytuacje życiowe', en: 'Life situations', uk: 'Життєві ситуації' },
  intro: {
    pl: 'Wybierz sytuację — przygotujemy zweryfikowany plan działania.',
    en: 'Pick a situation — we will build a verified action plan.',
    uk: 'Оберіть ситуацію — ми складемо перевірений план дій.',
  },
  citizenship: { pl: 'Twój status', en: 'Your status', uk: 'Ваш статус' },
  build: { pl: 'Pokaż plan', en: 'Build plan', uk: 'Показати план' },
  loading: { pl: 'Buduję plan…', en: 'Building the plan…', uk: 'Складаю план…' },
  checklist: { pl: 'Lista kroków', en: 'Checklist', uk: 'Перелік кроків' },
  details: { pl: 'Szczegóły', en: 'Details', uk: 'Деталі' },
  requiresFirst: { pl: 'Najpierw załatw', en: 'Do this first', uk: 'Спершу зробіть' },
  external: { pl: 'Poza Urzędem Miasta', en: 'Outside City Hall', uk: 'Поза міською радою' },
  serviceCard: { pl: 'Karta usługi', en: 'Service card', uk: 'Картка послуги' },
  map: { pl: 'Mapa', en: 'Map', uk: 'Карта' },
  back: { pl: 'Inna sytuacja', en: 'Other situation', uk: 'Інша ситуація' },
  error: {
    pl: 'Nie udało się zbudować planu. Spróbuj ponownie.',
    en: 'Could not build the plan. Please try again.',
    uk: 'Не вдалося скласти план. Спробуйте ще раз.',
  },
}

export function pickLabel(map: Localized, lang: string): string {
  return map[lang] ?? map.en ?? Object.values(map)[0] ?? ''
}

export function uiLabel(key: keyof typeof UI_LABELS | string, lang: string): string {
  const entry = UI_LABELS[key]
  return entry ? pickLabel(entry, lang) : key
}
