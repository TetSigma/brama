import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { UIButton } from '@/ui'
import { useFeedback } from '@/hooks/useFeedback'
import { BLOCK_DASHED } from './blockStyles'
import type { feedbackPromptBlockSchema } from '@/api/blocks'
import type { z } from 'zod'

type Props = z.infer<typeof feedbackPromptBlockSchema>

const FEEDBACK = `${BLOCK_DASHED} flex flex-wrap items-center gap-[var(--space-3)]`

/** D12 — per-answer thumbs feedback. */
export function FeedbackBlock({ answerId }: Props) {
  const { t } = useTranslation()
  const feedback = useFeedback()
  const [submitted, setSubmitted] = useState<'up' | 'down' | null>(null)

  function vote(value: 'up' | 'down') {
    if (submitted) return
    setSubmitted(value)
    feedback.mutate({ answerId, vote: value })
  }

  if (submitted) {
    return (
      <p className={`${FEEDBACK} text-[var(--color-success)]`} role="status">
        {t('chat.feedback.thanks')}
      </p>
    )
  }

  return (
    <section className={FEEDBACK} aria-label={t('chat.feedback.label')}>
      <span className="font-semibold">{t('chat.feedback.question')}</span>
      <div className="flex gap-[var(--space-2)]">
        <UIButton variant="quiet" size="sm" aria-label={t('chat.feedback.helpful')} onClick={() => vote('up')}>
          <ThumbsUp aria-hidden="true" size={16} /> {t('chat.feedback.yes')}
        </UIButton>
        <UIButton variant="quiet" size="sm" aria-label={t('chat.feedback.notHelpful')} onClick={() => vote('down')}>
          <ThumbsDown aria-hidden="true" size={16} /> {t('chat.feedback.no')}
        </UIButton>
      </div>
    </section>
  )
}
