import { useState } from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { UIButton } from '../../../../../ui'
import { useFeedback } from '../../hooks/useFeedback'
import type { feedbackPromptBlockSchema } from '../../schema/blocks'
import type { z } from 'zod'

type Props = z.infer<typeof feedbackPromptBlockSchema>

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
      <p className="chat-block chat-feedback chat-feedback--done" role="status">
        Dziękujemy za opinię!
      </p>
    )
  }

  return (
    <section className="chat-block chat-feedback" aria-label="Oceń odpowiedź">
      <span className="chat-feedback__label">Czy to pomogło?</span>
      <div className="chat-feedback__buttons">
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
