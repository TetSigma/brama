import { Briefcase, FileWarning, Home, type LucideIcon } from 'lucide-react'

export type LifeEventDef = {
  id: string
  icon: LucideIcon
  /** When true, ask for citizenship status (drives the backend `group`). */
  citizenship?: boolean
}

export const LIFE_EVENTS: LifeEventDef[] = [
  { id: 'moving_to_lublin', icon: Home, citizenship: true },
  { id: 'lost_documents', icon: FileWarning },
  { id: 'starting_business', icon: Briefcase },
]

/** `value` is the backend group; `labelKey` resolves under `lifeEvents.citizenshipGroups`. */
export const CITIZENSHIP_GROUPS: { value: string; labelKey: string }[] = [
  { value: '', labelKey: 'polish' },
  { value: 'ukrainian_temp_protection', labelKey: 'ukrainian_temp_protection' },
  { value: 'foreigner', labelKey: 'foreigner' },
]
