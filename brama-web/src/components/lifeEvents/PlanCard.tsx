import { useState } from 'react'
import { Check, ChevronDown, Clock, ExternalLink, MapPin, Phone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { LifeEventPlan, PlanStep } from '@/@types/plan'
import { Markdown } from '@/components/Markdown'
import { UIBadge, UIButton, UICard, UIHeading, UIText } from '@/ui'

type Props = {
  plan: LifeEventPlan
}

function mapsUrl(step: PlanStep): string | null {
  const office = step.office
  if (!office) return null
  const query =
    office.lat != null && office.lng != null
      ? `${office.lat},${office.lng}`
      : (office.adres ?? office.nazwa)
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

function StepRow({ step, index }: { step: PlanStep; index: number }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(index === 0)
  const [done, setDone] = useState(false)
  const office = step.office
  const maps = mapsUrl(step)

  return (
    <li className="border border-[var(--color-border)] rounded-[var(--radius-2)] bg-[var(--color-surface)] overflow-hidden">
      <div className="flex items-center gap-[var(--space-3)] px-[var(--space-3)] py-[var(--space-3)]">
        <button
          type="button"
          aria-pressed={done}
          onClick={() => setDone((value) => !value)}
          className={[
            'shrink-0 grid place-items-center w-[1.5rem] h-[1.5rem] rounded-[var(--radius-1)] border transition-colors',
            done
              ? 'bg-[var(--color-success)] border-[var(--color-success)] text-white'
              : 'border-[var(--color-border)] text-transparent',
          ].join(' ')}
        >
          <Check size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex-1 flex items-center justify-between gap-[var(--space-2)] text-left bg-transparent border-0 cursor-pointer p-0"
        >
          <span className={done ? 'line-through text-[var(--color-text-muted)]' : ''}>
            <span className="font-semibold">{`${index + 1}. ${step.title}`}</span>{' '}
            <UIBadge>{step.cardId}</UIBadge>
          </span>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={open ? 'rotate-180 transition-transform' : 'transition-transform'}
          />
        </button>
      </div>

      {open ? (
        <div className="px-[var(--space-4)] pb-[var(--space-4)] pt-[var(--space-1)] flex flex-col gap-[var(--space-2)]">
          {office ? (
            <div className="text-[length:var(--font-size-sm)] flex flex-col gap-[var(--space-1)]">
              <span className="inline-flex items-center gap-[var(--space-2)] font-medium">
                <MapPin size={15} aria-hidden="true" /> {office.nazwa}
              </span>
              {office.adres ? <span>{office.adres}</span> : null}
              {office.godziny_pracy ? (
                <span className="inline-flex items-center gap-[var(--space-2)] text-[var(--color-text-muted)]">
                  <Clock size={15} aria-hidden="true" /> {office.godziny_pracy}
                </span>
              ) : null}
            </div>
          ) : null}

          {step.prerequisites.length > 0 ? (
            <UIText size="sm" tone="muted">
              {t('lifeEvents.requiresFirst')}:{' '}
              {step.prerequisites.map((p) => `${p.nazwa} (${p.cardId})`).join(', ')}
            </UIText>
          ) : null}

          <div className="flex flex-wrap gap-[var(--space-2)] mt-[var(--space-1)]">
            {step.url ? (
              <UIButton href={step.url} variant="quiet" size="sm" target="_blank" rel="noopener noreferrer">
                <ExternalLink size={15} aria-hidden="true" /> {t('lifeEvents.serviceCard')}
              </UIButton>
            ) : null}
            {maps ? (
              <UIButton href={maps} variant="quiet" size="sm" target="_blank" rel="noopener noreferrer">
                <MapPin size={15} aria-hidden="true" /> {t('lifeEvents.map')}
              </UIButton>
            ) : null}
            {office?.telefon ? (
              <UIButton href={`tel:${office.telefon.replace(/\s/g, '')}`} variant="quiet" size="sm">
                <Phone size={15} aria-hidden="true" /> {office.telefon}
              </UIButton>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  )
}

export function PlanCard({ plan }: Props) {
  const { t } = useTranslation()

  return (
    <UICard accent="primary" as="section" className="flex flex-col gap-[var(--space-4)]">
      <UIHeading level={2} size="md">
        {plan.title}
      </UIHeading>

      <Markdown>{plan.answer}</Markdown>

      <div>
        <UIText weight="semibold" className="mb-[var(--space-2)]">
          {t('lifeEvents.checklist')}
        </UIText>
        <ol className="list-none p-0 m-0 flex flex-col gap-[var(--space-2)]">
          {plan.plan.map((step, index) => (
            <StepRow key={step.cardId} step={step} index={index} />
          ))}
        </ol>
      </div>

      {plan.externalInfo.length > 0 ? (
        <div>
          <UIText weight="semibold" className="mb-[var(--space-2)]">
            {t('lifeEvents.external')}
          </UIText>
          <ul className="list-disc pl-[var(--space-5)] m-0 flex flex-col gap-[var(--space-1)]">
            {plan.externalInfo.map((info) => (
              <li key={info.label}>
                <span className="font-medium">{info.label}</span> — {info.note}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </UICard>
  )
}
