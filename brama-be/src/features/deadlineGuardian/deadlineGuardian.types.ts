// Deadline Guardian — types shared across the feature.
//
// A DeadlineItem is the fully-resolved, UI-ready representation of a single
// deadline attached to a life-event plan. Candidates are first collected from
// several sources (Neo4j service nodes, Qdrant evidence, user-supplied dates),
// then merged, scored and sorted into DeadlineItem[] by the service.

export type DeadlineStatus = 'overdue' | 'due_today' | 'due_soon' | 'upcoming' | 'unknown'

export type DeadlineSourceType = 'neo4j' | 'qdrant' | 'uploaded_document' | 'user_input'

export type DeadlineItem = {
  id: string
  title: string
  relatedServiceId?: string
  sourceType: DeadlineSourceType
  sourceRef?: string

  date?: string // YYYY-MM-DD
  time?: string // HH:mm
  relativeRule?: string // e.g. "within 14 days after moving"
  anchorDate?: string // YYYY-MM-DD

  status: DeadlineStatus

  urgencyScore: number // 0-100
  explanation: string
  requiredAction: string
  consequence?: string
  officialLink?: string
}

export type DeadlineGuardianResult = {
  summary: string
  deadlines: DeadlineItem[]
  missingInfo: string[]
}

// Known user-context date fields the guardian can use to resolve relative
// deadlines. All values are YYYY-MM-DD strings.
export type UserContext = {
  movedDate?: string
  documentLostDate?: string
  childBirthDate?: string
  businessStartDate?: string
  appointmentDate?: string
}

export type UserContextKey = keyof UserContext

// A raw, not-yet-scored deadline candidate produced by one of the sources.
// `anchorField` names the UserContext key needed to resolve a relative rule;
// the service uses it to build a precise missingInfo message when absent.
export type DeadlineCandidate = {
  title: string
  // Short, human-friendly label used in missingInfo messages
  // (e.g. "waste declaration"). Falls back to `title` when absent.
  shortLabel?: string
  relatedServiceId?: string
  sourceType: DeadlineSourceType
  sourceRef?: string
  date?: string
  time?: string
  relativeRule?: string
  anchorField?: UserContextKey
  requiredAction?: string
  explanation?: string
  consequence?: string
  officialLink?: string
}

// Shape the LLM is asked to emit when extracting deadlines from Qdrant chunks.
export type LlmDeadline = {
  title?: string
  relatedServiceId?: string
  relativeRule?: string
  date?: string
  explanation?: string
  requiredAction?: string
  sourceRef?: string
}

export type LlmDeadlineResponse = {
  deadlines: LlmDeadline[]
}
