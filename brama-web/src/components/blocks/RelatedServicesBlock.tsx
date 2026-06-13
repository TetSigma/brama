import { ArrowRight } from 'lucide-react'
import { UIButton } from '@/ui'
import { BLOCK, BLOCK_TITLE } from './blockStyles'
import type { relatedServicesBlockSchema } from '@/api/blocks'
import type { z } from 'zod'

type Props = z.infer<typeof relatedServicesBlockSchema> & {
  onAsk?: (query: string) => void
}

export function RelatedServicesBlock({ services, onAsk }: Props) {
  return (
    <section className={BLOCK} aria-label="Sprawy powiązane">
      <p className={BLOCK_TITLE}>Powiązane sprawy</p>
      <div className="flex flex-wrap gap-[var(--space-2)]">
        {services.map((service) => (
          <UIButton
            key={service.query}
            variant="quiet"
            size="sm"
            onClick={() => onAsk?.(service.query)}
          >
            {service.label} <ArrowRight aria-hidden="true" size={14} />
          </UIButton>
        ))}
      </div>
    </section>
  )
}
