import { Clock } from 'lucide-react'
import { UIBadge } from '@/ui'
import type { deadlineBlockSchema } from '@/api/blocks'
import type { z } from 'zod'

type Props = z.infer<typeof deadlineBlockSchema>

const LABELS: Record<Props['kind'], string> = {
  resolution: 'Termin załatwienia',
  submission: 'Termin złożenia',
}

export function DeadlineBlock({ kind, value }: Props) {
  return (
    <section className="chat-block chat-block--fact" aria-label={LABELS[kind]}>
      <span className="chat-fact__label">
        <Clock aria-hidden="true" size={16} /> {LABELS[kind]}
      </span>
      <UIBadge tone="neutral">{value}</UIBadge>
    </section>
  )
}
