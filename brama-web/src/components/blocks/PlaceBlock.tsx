import { MapPin, Phone } from 'lucide-react'
import { UIButton } from '@/ui'
import { BLOCK, BLOCK_TITLE } from './blockStyles'
import type { placeBlockSchema } from '@/api/blocks'
import type { z } from 'zod'

type Props = z.infer<typeof placeBlockSchema>

const LABELS: Record<Props['kind'], string> = {
  submit: 'Gdzie złożyć',
  collect: 'Gdzie odebrać',
}

export function PlaceBlock({ kind, address, phone, hours }: Props) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

  return (
    <section className={BLOCK} aria-label={LABELS[kind]}>
      <p className={BLOCK_TITLE}>
        <MapPin aria-hidden="true" size={16} /> {LABELS[kind]}
      </p>
      <p className="m-0 font-medium">{address}</p>
      {hours ? (
        <p className="mt-[var(--space-1)] mb-0 text-[var(--color-text-muted)] text-[length:var(--font-size-sm)]">
          {hours}
        </p>
      ) : null}
      <div className="flex gap-[var(--space-2)] mt-[var(--space-3)]">
        <UIButton href={mapsUrl} variant="quiet" size="sm" target="_blank" rel="noopener noreferrer">
          <MapPin aria-hidden="true" size={16} /> Mapa
        </UIButton>
        {phone ? (
          <UIButton href={`tel:${phone.replace(/\s/g, '')}`} variant="quiet" size="sm">
            <Phone aria-hidden="true" size={16} /> {phone}
          </UIButton>
        ) : null}
      </div>
    </section>
  )
}
