import { ExternalLink, ShieldCheck } from 'lucide-react'
import type { citationsBlockSchema } from '../../schema/blocks'
import type { z } from 'zod'

type Props = z.infer<typeof citationsBlockSchema>

export function CitationsBlock({ sources, updatedAt }: Props) {
  return (
    <footer className="chat-block chat-block--citations">
      <p className="chat-citations__grounded">
        <ShieldCheck aria-hidden="true" size={14} /> Odpowiedź oparta na oficjalnych źródłach
      </p>
      <ul className="chat-citations__list">
        {sources.map((source) => (
          <li key={source.url}>
            <a href={source.url} target="_blank" rel="noopener noreferrer">
              {source.label} <ExternalLink aria-hidden="true" size={12} />
            </a>
          </li>
        ))}
      </ul>
      {updatedAt ? <p className="chat-citations__date">Aktualne na: {updatedAt}</p> : null}
    </footer>
  )
}
