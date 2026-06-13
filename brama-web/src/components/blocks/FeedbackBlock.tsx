import { useState } from 'react'
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
        Dziękujemy za opinię!
      </p>
    )
  }

  return (
    <section className={FEEDBACK} aria-label="Oceń odpowiedź">
      <span className="font-semibold">Czy to pomogło?</span>
      <div className="flex gap-[var(--space-2)]">
        <UIButton variant="quiet" size="sm" aria-label="Pomocne" onClick={() => vote('up')}>
          <ThumbsUp aria-hidden="true" size={16} /> Tak
        </UIButton>
        <UIButton variant="quiet" size="sm" aria-label="Niepomocne" onClick={() => vote('down')}>
          <ThumbsDown aria-hidden="true" size={16} /> Nie
        </UIButton>
      </div>
    </section>
  )
}
