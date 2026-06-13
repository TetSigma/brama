import { MapPin, Phone } from 'lucide-react'
import { UIButton } from '../../../../../ui'
import type { placeBlockSchema } from '../../schema/blocks'
import type { z } from 'zod'

type Props = z.infer<typeof placeBlockSchema>

const LABELS: Record<Props['kind'], string> = {
  submit: 'Gdzie złożyć',
  collect: 'Gdzie odebrać',
}

export function PlaceBlock({ kind, address, phone, hours }: Props) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

  return (
    <section className="chat-block chat-block--place" aria-label={LABELS[kind]}>
      <p className="chat-block__title">
        <MapPin aria-hidden="true" size={16} /> {LABELS[kind]}
      </p>
      <p className="chat-place__address">{address}</p>
      {hours ? <p className="chat-place__hours">{hours}</p> : null}
      <div className="chat-place__actions">
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
