import * as Collapsible from '@radix-ui/react-collapsible'
import { ChevronDown } from 'lucide-react'
import { Markdown } from '@/components/Markdown'
import { BLOCK_SURFACE } from './blockStyles'
import type { collapsibleBlockSchema } from '@/api/blocks'
import type { z } from 'zod'

type Props = z.infer<typeof collapsibleBlockSchema>

/** Formalities (legal basis / RODO / appeal) — collapsed by default. */
export function CollapsibleBlock({ title, body }: Props) {
  return (
    <Collapsible.Root className={BLOCK_SURFACE}>
      <Collapsible.Trigger className="flex items-center justify-between w-full px-[var(--space-4)] py-[var(--space-3)] border-0 bg-transparent text-[var(--color-text)] font-semibold cursor-pointer">
        <span>{title}</span>
        <ChevronDown
          aria-hidden="true"
          size={16}
          className="transition-transform duration-[180ms] ease-[cubic-bezier(0.2,0,0,1)] [[data-state=open]_&]:rotate-180"
        />
      </Collapsible.Trigger>
      <Collapsible.Content className="px-[var(--space-4)] pb-[var(--space-3)] text-[var(--color-text-muted)] text-[length:var(--font-size-sm)]">
        <Markdown>{body}</Markdown>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}
