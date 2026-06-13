import { Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UIBadge } from '@/ui'
import { FACT, FACT_LABEL } from './blockStyles'
import type { deadlineBlockSchema } from '@/api/blocks'
import type { z } from 'zod'

type Props = z.infer<typeof deadlineBlockSchema>

const LABEL_KEY: Record<Props['kind'], string> = {
  resolution: 'chat.blocks.deadlineResolution',
  submission: 'chat.blocks.deadlineSubmission',
}

export function DeadlineBlock({ kind, value }: Props) {
  const { t } = useTranslation()
  const label = t(LABEL_KEY[kind])
  return (
    <section className={FACT} aria-label={label}>
      <span className={FACT_LABEL}>
        <Clock aria-hidden="true" size={16} /> {label}
      </span>
      <UIBadge tone="neutral">{value}</UIBadge>
    </section>
  )
}
