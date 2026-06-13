import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UIButton, UIField, UISelect } from '@/ui'
import { CITIZENSHIP_GROUPS, LIFE_EVENTS, pickLabel, uiLabel } from './config'

type RunInput = { eventId: string; group?: string; message: string }

type Props = {
  onRun: (input: RunInput) => void
  disabled?: boolean
}

const CARD =
  'border border-[var(--color-border)] rounded-[var(--radius-3)] bg-[var(--color-surface)] ' +
  'transition-[border-color] duration-[180ms] ease-[cubic-bezier(0.2,0,0,1)]'

export function LifeEventLauncher({ onRun, disabled }: Props) {
  const { i18n } = useTranslation()
  const lang = i18n.resolvedLanguage ?? 'pl'
  const [group, setGroup] = useState('')

  return (
    <div className="grid gap-[var(--space-3)] sm:grid-cols-2">
      {LIFE_EVENTS.map((event) => {
        const Icon = event.icon
        const label = pickLabel(event.label, lang)

        if (!event.citizenship) {
          return (
            <button
              key={event.id}
              type="button"
              disabled={disabled}
              onClick={() => onRun({ eventId: event.id, message: label })}
              className={`${CARD} flex items-center gap-[var(--space-3)] text-left p-[var(--space-4)] cursor-pointer hover:border-[var(--color-primary)] disabled:cursor-not-allowed`}
            >
              <Icon size={22} aria-hidden="true" className="text-[var(--color-primary)] shrink-0" />
              <span className="font-semibold">{label}</span>
            </button>
          )
        }

        return (
          <div
            key={event.id}
            className={`${CARD} flex flex-col gap-[var(--space-3)] p-[var(--space-4)] sm:col-span-2`}
          >
            <div className="flex items-center gap-[var(--space-3)]">
              <Icon size={22} aria-hidden="true" className="text-[var(--color-primary)] shrink-0" />
              <span className="font-semibold">{label}</span>
            </div>
            <div className="flex flex-wrap items-end gap-[var(--space-3)]">
              <UIField label={uiLabel('citizenship', lang)} htmlFor="le-group" className="min-w-[16rem]">
                <UISelect
                  id="le-group"
                  value={group}
                  onChange={(eventChange) => setGroup(eventChange.target.value)}
                >
                  {CITIZENSHIP_GROUPS.map((option) => (
                    <option key={option.value || 'base'} value={option.value}>
                      {pickLabel(option.label, lang)}
                    </option>
                  ))}
                </UISelect>
              </UIField>
              <UIButton
                disabled={disabled}
                onClick={() => onRun({ eventId: event.id, group: group || undefined, message: label })}
              >
                {uiLabel('build', lang)}
              </UIButton>
            </div>
          </div>
        )
      })}
    </div>
  )
}
