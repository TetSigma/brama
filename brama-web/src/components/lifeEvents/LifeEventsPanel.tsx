import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLifeEventPlan } from '@/hooks/useLifeEventPlan'
import { UIButton, UIHeading, UIText } from '@/ui'
import { LifeEventLauncher } from './LifeEventLauncher'
import { PlanCard } from './PlanCard'
import { uiLabel } from './config'

export function LifeEventsPanel() {
  const { i18n } = useTranslation()
  const lang = i18n.resolvedLanguage ?? 'pl'
  const { run, plan, isPending, error, reset } = useLifeEventPlan()

  return (
    <section
      className="w-full flex flex-col gap-[var(--space-3)] mt-[var(--space-6)]"
      aria-label={uiLabel('heading', lang)}
    >
      {!plan && !isPending ? (
        <>
          <UIHeading level={2} size="sm">
            {uiLabel('heading', lang)}
          </UIHeading>
          <UIText tone="muted">{uiLabel('intro', lang)}</UIText>
          <LifeEventLauncher
            disabled={isPending}
            onRun={({ eventId, group, message }) => run({ eventId, group, message, lang })}
          />
          {error ? <UIText tone="danger">{uiLabel('error', lang)}</UIText> : null}
        </>
      ) : null}

      {isPending ? (
        <UIText tone="muted" className="inline-flex items-center gap-[var(--space-2)]">
          <Loader2 size={18} className="animate-spin" aria-hidden="true" /> {uiLabel('loading', lang)}
        </UIText>
      ) : null}

      {plan && !isPending ? (
        <>
          <PlanCard plan={plan} lang={lang} />
          <UIButton variant="quiet" size="sm" className="self-start" onClick={() => reset()}>
            {uiLabel('back', lang)}
          </UIButton>
        </>
      ) : null}
    </section>
  )
}
