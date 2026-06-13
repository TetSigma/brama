import { Coins } from 'lucide-react'
import { UIBadge } from '../../../../../ui'
import type { feeBlockSchema } from '../../schema/blocks'
import type { z } from 'zod'

type Props = z.infer<typeof feeBlockSchema>

export function FeeBlock({ amount, note }: Props) {
  return (
    <section className="chat-block chat-block--fact" aria-label="Opłata">
      <span className="chat-fact__label">
        <Coins aria-hidden="true" size={16} /> Opłata
      </span>
      <UIBadge tone="info">{amount}</UIBadge>
      {note ? <span className="chat-fact__note">{note}</span> : null}
    </section>
  )
}
