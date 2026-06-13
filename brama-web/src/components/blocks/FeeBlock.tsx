import { Coins } from 'lucide-react'
import { UIBadge } from '@/ui'
import { FACT, FACT_LABEL } from './blockStyles'
import type { feeBlockSchema } from '@/api/blocks'
import type { z } from 'zod'

type Props = z.infer<typeof feeBlockSchema>

export function FeeBlock({ amount, note }: Props) {
  return (
    <section className={FACT} aria-label="Opłata">
      <span className={FACT_LABEL}>
        <Coins aria-hidden="true" size={16} /> Opłata
      </span>
      <UIBadge tone="info">{amount}</UIBadge>
      {note ? (
        <span className="basis-full text-[var(--color-text-muted)] text-[length:var(--font-size-sm)]">
          {note}
        </span>
      ) : null}
    </section>
  )
}
