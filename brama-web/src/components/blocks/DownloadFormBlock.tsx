import { Download } from 'lucide-react'
import { UIButton } from '@/ui'
import { BLOCK } from './blockStyles'
import type { downloadFormBlockSchema } from '@/api/blocks'
import type { z } from 'zod'

type Props = z.infer<typeof downloadFormBlockSchema>

export function DownloadFormBlock({ forms }: Props) {
  return (
    <section
      className={`${BLOCK} flex flex-wrap gap-[var(--space-2)]`}
      aria-label="Formularze do pobrania"
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
