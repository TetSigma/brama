import { Building2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UIBadge, UIHeading } from '@/ui'
import { BLOCK } from './blockStyles'
import type { serviceHeaderBlockSchema } from '@/api/blocks'
import type { z } from 'zod'

type Props = z.infer<typeof serviceHeaderBlockSchema>

export function ServiceHeaderBlock({ name, cardNumber, department, status }: Props) {
  const { t } = useTranslation()
  return (
    <header
      className={`${BLOCK} border-l-[0.35rem] border-l-[var(--color-primary)]`}
    >
      <UIHeading level={3} size="sm">
        {name}
      </UIHeading>
      <div className="flex flex-wrap items-center gap-[var(--space-2)] mt-[var(--space-2)]">
        <UIBadge tone="neutral">{cardNumber}</UIBadge>
        {department ? (
          <span className="inline-flex items-center gap-[var(--space-1)] text-[var(--color-text-muted)] text-[length:var(--font-size-sm)]">
            <Building2 aria-hidden="true" size={14} /> {department}
          </span>
        ) : null}
        {status === 'inactive' ? <UIBadge tone="warning">{t('chat.blocks.inactive')}</UIBadge> : null}
      </div>
    </header>
  )
}
