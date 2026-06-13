import { AlertTriangle, CalendarClock, ExternalLink, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DeadlineItem, DeadlineStatus } from '@/@types/plan'
import { UIBadge, UICard, UIHeading, UIText } from '@/ui'

type UIBadgeTone = 'neutral' | 'primary' | 'success' | 'info' | 'warning' | 'danger'

type Localized = Record<string, string>

type Props = {
  deadlines: DeadlineItem[]
  missingInfo: string[]
  /** Optional one-line summary from the backend (already localized). */
  summary?: string
}

// Status → badge label (localized) and badge tone.
const STATUS_LABEL: Record<DeadlineStatus, Localized> = {
  overdue: { pl: 'Po terminie', en: 'Overdue', uk: 'Прострочено' },
  due_today: { pl: 'Dziś', en: 'Due today', uk: 'Сьогодні' },
  due_soon: { pl: 'Wkrótce', en: 'Due soon', uk: 'Скоро' },
  upcoming: { pl: 'Nadchodzące', en: 'Upcoming', uk: 'Майбутні' },
  unknown: { pl: 'Potrzebne dane', en: 'Need more info', uk: 'Потрібні дані' },
}

const STATUS_TONE: Record<DeadlineStatus, UIBadgeTone> = {
  overdue: 'danger',
  due_today: 'warning',
  due_soon: 'warning',
  upcoming: 'info',
  unknown: 'neutral',
}

const LABELS: Record<string, Localized> = {
  heading: { pl: 'Terminy', en: 'Deadlines', uk: 'Терміни' },
  requiredAction: { pl: 'Co zrobić', en: 'What to do', uk: 'Що зробити' },
  source: { pl: 'Źródło', en: 'Official source', uk: 'Джерело' },
  missingHeading: {
    pl: 'Potrzebujemy jeszcze jednego szczegółu, aby obliczyć terminy',
    en: 'We need one more detail to calculate your deadlines',
    uk: 'Нам потрібна ще одна деталь, щоб обчислити терміни',
  },
}

function pick(map: Localized, lang: string): string {
  return map[lang] ?? map.en ?? Object.values(map)[0] ?? ''
}

// The due-date line: an exact date when known, otherwise the relative rule.
function dueLabel(deadline: DeadlineItem): string | null {
  if (deadline.date) {
    return deadline.relativeRule ? `${deadline.date} · ${deadline.relativeRule}` : deadline.date
  }
  return deadline.relativeRule ?? null
}

function DeadlineRow({ deadline, lang }: { deadline: DeadlineItem; lang: string }) {
  const tone = STATUS_TONE[deadline.status]
  const due = dueLabel(deadline)

  return (
    <li className="border border-[var(--color-border)] rounded-[var(--radius-2)] bg-[var(--color-surface)] p-[var(--space-3)] flex flex-col gap-[var(--space-2)]">
      <div className="flex items-start justify-between gap-[var(--space-2)]">
        <span className="font-semibold inline-flex items-center gap-[var(--space-2)]">
          <CalendarClock size={16} aria-hidden="true" className="text-[var(--color-primary)] shrink-0" />
          {deadline.title}
        </span>
        <UIBadge tone={tone}>{pick(STATUS_LABEL[deadline.status], lang)}</UIBadge>
      </div>

      {due ? (
        <UIText size="sm" tone="muted">
          {due}
        </UIText>
      ) : null}

      {deadline.requiredAction ? (
        <UIText size="sm">
          <span className="font-medium">{pick(LABELS.requiredAction!, lang)}:</span>{' '}
          {deadline.requiredAction}
        </UIText>
      ) : null}

      {deadline.consequence ? (
        <UIText size="sm" tone="danger" className="inline-flex items-start gap-[var(--space-1)]">
          <AlertTriangle size={14} aria-hidden="true" className="mt-[0.15rem] shrink-0" />
          {deadline.consequence}
        </UIText>
      ) : null}

      {deadline.officialLink ? (
        <a
          href={deadline.officialLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-[var(--space-1)] text-[length:var(--font-size-sm)] text-[var(--color-primary)] no-underline hover:underline w-fit"
        >
          <ExternalLink size={14} aria-hidden="true" /> {pick(LABELS.source!, lang)}
          {deadline.relatedServiceId ? ` (${deadline.relatedServiceId})` : ''}
        </a>
      ) : null}
    </li>
  )
}

/**
 * Deadline Guardian — renders the deadlines attached to a life-event plan,
 * sorted by urgency (highest first), plus a "need more info" card when the
 * backend could not resolve a relative deadline.
 */
export function DeadlineGuardian({ deadlines, missingInfo, summary }: Props) {
  const { i18n } = useTranslation()
  const lang = i18n.resolvedLanguage ?? 'pl'
  const hasDeadlines = deadlines.length > 0
  if (!hasDeadlines && missingInfo.length === 0) {
    return null
  }

  const sorted = [...deadlines].sort((a, b) => b.urgencyScore - a.urgencyScore)

  return (
    <section className="flex flex-col gap-[var(--space-3)]" aria-label={pick(LABELS.heading!, lang)}>
      {hasDeadlines ? (
        <UICard accent="info" as="section" className="flex flex-col gap-[var(--space-3)]">
          <div className="flex items-center justify-between gap-[var(--space-2)]">
            <UIHeading level={3} size="sm">
              {pick(LABELS.heading!, lang)}
            </UIHeading>
            {summary ? (
              <UIText size="sm" tone="muted">
                {summary}
              </UIText>
            ) : null}
          </div>
          <ol className="list-none p-0 m-0 flex flex-col gap-[var(--space-2)]">
            {sorted.map((deadline) => (
              <DeadlineRow key={deadline.id} deadline={deadline} lang={lang} />
            ))}
          </ol>
        </UICard>
      ) : null}

      {missingInfo.length > 0 ? (
        <UICard accent="primary" as="section" className="flex flex-col gap-[var(--space-2)]">
          <UIText weight="semibold" className="inline-flex items-center gap-[var(--space-2)]">
            <Info size={16} aria-hidden="true" className="text-[var(--color-primary)] shrink-0" />
            {pick(LABELS.missingHeading!, lang)}
          </UIText>
          <ul className="list-disc pl-[var(--space-5)] m-0 flex flex-col gap-[var(--space-1)]">
            {missingInfo.map((item) => (
              <li key={item}>
                <UIText size="sm" tone="muted" as="span">
                  {item}
                </UIText>
              </li>
            ))}
          </ul>
        </UICard>
      ) : null}
    </section>
  )
}
