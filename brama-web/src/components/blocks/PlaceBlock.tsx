import { useEffect, useState } from 'react'
import { MapPin, Navigation, Phone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UIButton } from '@/ui'
import { BLOCK, BLOCK_TITLE } from './blockStyles'
import type { placeBlockSchema } from '@/api/blocks'
import type { z } from 'zod'

type Props = z.infer<typeof placeBlockSchema>

const LABEL_KEY: Record<Props['kind'], string> = {
  submit: 'chat.blocks.placeSubmit',
  collect: 'chat.blocks.placeCollect',
}

export function PlaceBlock({ kind, address, phone, hours, lat, lng }: Props) {
  const { t } = useTranslation()
  const [origin, setOrigin] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState(false)

  const label = t(LABEL_KEY[kind])
  // Prefer a precise point from the response; otherwise geocode the address text.
  const destination = lat != null && lng != null ? `${lat},${lng}` : address

  const embedUrl = origin
    ? `https://maps.google.com/maps?saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(destination)}&output=embed`
    : `https://maps.google.com/maps?q=${encodeURIComponent(destination)}&z=16&output=embed`

  const mapsUrl = origin
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`

  function buildRoute() {
    setError(false)
    if (!navigator.geolocation) {
      setError(true)
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrigin(`${position.coords.latitude},${position.coords.longitude}`)
        setLocating(false)
      },
      () => {
        setError(true)
        setLocating(false)
      },
    )
  }

  // Build the route as soon as the card appears (state set only from async callbacks).
  useEffect(() => {
    if (!navigator.geolocation) return
    let cancelled = false
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!cancelled) setOrigin(`${position.coords.latitude},${position.coords.longitude}`)
      },
      () => {
        if (!cancelled) setError(true)
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className={BLOCK} aria-label={label}>
      <p className={BLOCK_TITLE}>
        <MapPin aria-hidden="true" size={16} /> {label}
      </p>
      <p className="m-0 font-medium">{address}</p>
      {hours ? (
        <p className="mt-[var(--space-1)] mb-0 text-[var(--color-text-muted)] text-[length:var(--font-size-sm)]">
          {hours}
        </p>
      ) : null}
      <iframe
        title={`${label}: ${address}`}
        className="block w-full h-[320px] mt-[var(--space-3)] rounded-[var(--radius-2)] border-0"
        src={embedUrl}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      {error ? (
        <p className="mt-[var(--space-2)] mb-0 text-[var(--color-danger)] text-[length:var(--font-size-sm)]">
          {t('chat.blocks.routeError')}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-[var(--space-2)] mt-[var(--space-3)]">
        <UIButton variant="quiet" size="sm" onClick={buildRoute} disabled={locating}>
          <Navigation aria-hidden="true" size={16} /> {t('chat.blocks.route')}
        </UIButton>
        <UIButton href={mapsUrl} variant="quiet" size="sm" target="_blank" rel="noopener noreferrer">
          <MapPin aria-hidden="true" size={16} /> {t('chat.blocks.map')}
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
