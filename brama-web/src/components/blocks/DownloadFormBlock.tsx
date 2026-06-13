import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UIButton } from '@/ui'
import { BLOCK } from './blockStyles'
import type { downloadFormBlockSchema } from '@/api/blocks'
import type { z } from 'zod'

type Props = z.infer<typeof downloadFormBlockSchema>

export function DownloadFormBlock({ forms }: Props) {
  const { t } = useTranslation()
  return (
    <section
      className={`${BLOCK} flex flex-wrap gap-[var(--space-2)]`}
      aria-label={t('chat.blocks.forms')}
    >
      {forms.map((form) => (
        <UIButton
          key={form.url}
          href={form.url}
          variant="secondary"
          size="sm"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Download aria-hidden="true" size={16} /> {form.name}
        </UIButton>
      ))}
    </section>
  )
}
