import { Building2 } from 'lucide-react'
import { UIBadge, UIHeading } from '@/ui'
import type { serviceHeaderBlockSchema } from '@/api/blocks'
import type { z } from 'zod'

type Props = z.infer<typeof serviceHeaderBlockSchema>

export function ServiceHeaderBlock({ name, cardNumber, department, status }: Props) {
  return (
    <header className="chat-block chat-block--header">
      <UIHeading level={3} size="sm">
        {name}
      </UIHeading>
      <div className="chat-block__meta">
        <UIBadge tone="neutral">{cardNumber}</UIBadge>
        {department ? (
          <span className="chat-block__dept">
            <Building2 aria-hidden="true" size={14} /> {department}
          </span>
        ) : null}
        {status === 'inactive' ? <UIBadge tone="warning">Nieobowiązująca</UIBadge> : null}
      </div>
    </header>
  )
}
