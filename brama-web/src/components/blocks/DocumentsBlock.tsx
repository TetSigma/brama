import { useId } from 'react'
import { FileCheck2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { BLOCK, BLOCK_TITLE } from './blockStyles'
import type { documentsBlockSchema } from '@/api/blocks'
import type { z } from 'zod'

type Props = z.infer<typeof documentsBlockSchema>

/** Interactive checklist — residents tick off what they have. */
export function DocumentsBlock({ title, items }: Props) {
  const { t } = useTranslation()
  const baseId = useId()
  const heading = title ?? t('chat.blocks.documents')

  return (
    <section className={BLOCK} aria-label={heading}>
      <p className={BLOCK_TITLE}>
        <FileCheck2 aria-hidden="true" size={16} /> {heading}
      </p>
      <ul className="flex flex-col gap-[var(--space-2)] m-0 p-0 list-none">
        {items.map((item, index) => {
          const id = `${baseId}-${index}`
          return (
            <li key={id} className="flex items-start gap-[var(--space-2)]">
              <input
                type="checkbox"
                id={id}
                className="mt-[0.2rem] w-[1.1rem] h-[1.1rem] accent-[var(--color-secondary)]"
              />
              <label htmlFor={id}>{item}</label>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
