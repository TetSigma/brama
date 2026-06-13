import { useId } from 'react'
import { FileCheck2 } from 'lucide-react'
import type { documentsBlockSchema } from '@/api/blocks'
import type { z } from 'zod'

type Props = z.infer<typeof documentsBlockSchema>

/** Interactive checklist — residents tick off what they have. */
export function DocumentsBlock({ title, items }: Props) {
  const baseId = useId()

  return (
    <section className="chat-block chat-block--documents" aria-label={title ?? 'Wymagane dokumenty'}>
      <p className="chat-block__title">
        <FileCheck2 aria-hidden="true" size={16} /> {title ?? 'Wymagane dokumenty'}
      </p>
      <ul className="chat-checklist">
        {items.map((item, index) => {
          const id = `${baseId}-${index}`
          return (
            <li key={id}>
              <input type="checkbox" id={id} className="chat-checklist__box" />
              <label htmlFor={id}>{item}</label>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
