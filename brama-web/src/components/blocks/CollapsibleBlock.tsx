import * as Collapsible from '@radix-ui/react-collapsible'
import { ChevronDown } from 'lucide-react'
import { Markdown } from '@/components/Markdown'
import type { collapsibleBlockSchema } from '@/api/blocks'
import type { z } from 'zod'

type Props = z.infer<typeof collapsibleBlockSchema>

/** Formalities (legal basis / RODO / appeal) — collapsed by default. */
export function CollapsibleBlock({ title, body }: Props) {
  return (
    <Collapsible.Root className="chat-block chat-collapsible">
      <Collapsible.Trigger className="chat-collapsible__trigger">
        <span>{title}</span>
        <ChevronDown aria-hidden="true" size={16} className="chat-collapsible__chevron" />
      </Collapsible.Trigger>
      <Collapsible.Content className="chat-collapsible__content">
        <Markdown>{body}</Markdown>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}
