import { ExternalLink, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { BLOCK_DASHED } from './blockStyles'
import type { citationsBlockSchema } from '@/api/blocks'
import type { z } from 'zod'

type Props = z.infer<typeof citationsBlockSchema>

export function CitationsBlock({ sources, updatedAt }: Props) {
  const { t } = useTranslation()
  return (
    <footer className={BLOCK_DASHED}>
      <p className="inline-flex items-center gap-[var(--space-2)] mt-0 mb-[var(--space-2)] text-[var(--color-success)] text-[length:var(--font-size-sm)] font-semibold">
        <ShieldCheck aria-hidden="true" size={14} /> {t('chat.blocks.grounded')}
      </p>
      <ul className="m-0 pl-[var(--space-4)] text-[length:var(--font-size-sm)]">
        {sources.map((source) => (
          <li key={source.url}>
            <a href={source.url} target="_blank" rel="noopener noreferrer">
              {source.label} <ExternalLink aria-hidden="true" size={12} />
            </a>
          </li>
        ))}
      </ul>
      {updatedAt ? (
        <p className="mt-[var(--space-2)] mb-0 text-[var(--color-text-subtle)] text-[length:var(--font-size-xs)]">
          {t('chat.blocks.updatedAt')} {updatedAt}
        </p>
      ) : null}
    </footer>
  )
}
