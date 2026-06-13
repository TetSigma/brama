import { ArrowRight } from 'lucide-react'
import { UIButton } from '@/ui'
import type { relatedServicesBlockSchema } from '@/api/blocks'
import type { z } from 'zod'

type Props = z.infer<typeof relatedServicesBlockSchema> & {
  onAsk?: (query: string) => void
}

export function RelatedServicesBlock({ services, onAsk }: Props) {
  return (
    <section className="chat-block chat-block--related" aria-label="Sprawy powiązane">
      <p className="chat-block__title">Powiązane sprawy</p>
      <div className="chat-related__chips">
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
