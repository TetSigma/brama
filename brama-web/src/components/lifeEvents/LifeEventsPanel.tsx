import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLifeEventPlan } from '@/hooks/useLifeEventPlan'
import { UIButton, UIHeading, UIText } from '@/ui'
import { LifeEventLauncher } from './LifeEventLauncher'
import { PlanCard } from './PlanCard'

export function LifeEventsPanel() {
  const { i18n, t } = useTranslation()
  const lang = i18n.resolvedLanguage ?? 'pl'
  const { run, plan, isPending, error, reset } = useLifeEventPlan()

  return (
    <section
      className="w-full flex flex-col gap-[var(--space-3)] mt-[var(--space-6)]"
      aria-label={t('lifeEvents.heading')}
    >
      {!plan && !isPending ? (
        <>
          <UIHeading level={2} size="sm">
            {t('lifeEvents.heading')}
          </UIHeading>
          <UIText tone="muted">{t('lifeEvents.intro')}</UIText>
          <LifeEventLauncher
            disabled={isPending}
            onRun={({ eventId, group, message }) => run({ eventId, group, message, lang })}
          />
          {error ? (
            <UIText tone="danger" role="alert">
              {t('lifeEvents.error')}
            </UIText>
          ) : null}
        </>
      ) : null}

      {isPending ? (
        <UIText
          tone="muted"
          role="status"
          className="inline-flex items-center gap-[var(--space-2)]"
        >
          <Loader2 size={18} className="animate-spin" aria-hidden="true" /> {t('lifeEvents.loading')}
        </UIText>
      ) : null}

      {plan && !isPending ? (
        <>
          <PlanCard plan={plan} />
          <UIButton variant="quiet" size="sm" className="self-start" onClick={() => reset()}>
            {t('lifeEvents.back')}
          </UIButton>
        </>
      ) : null}
    </section>
  )
}
