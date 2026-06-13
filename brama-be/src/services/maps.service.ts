import { env } from '../config/env.js'
import type { RouteRequest } from '../schemas/maps.schema.js'
import { DepartmentService } from './department.service.js'
import { RetrievalService } from './retrieval.service.js'

const ROUTES_ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes'

const ROUTES_FIELD_MASK = [
  'routes.polyline.encodedPolyline',
  'routes.distanceMeters',
  'routes.duration',
  'routes.viewport',
].join(',')

type LatLng = { lat: number; lng: number }

type Viewport = {
  low: { latitude: number; longitude: number }
  high: { latitude: number; longitude: number }
}

export type RouteDestination = {
  symbol: string
  nazwa: string
  adres: string | null
  lat: number
  lng: number
}

export type RouteResult = {
  dest: RouteDestination
  // Encoded polyline + metrics are present only when an origin was supplied and
  // Google returned a route; otherwise the destination is returned marker-only.
  polyline: string | null
  distanceMeters: number | null
  duration: string | null
  viewport: Viewport | null
}

export type MapsOutcome =
  | { kind: 'disabled' }
  | { kind: 'not_found' }
  | { kind: 'ok'; data: RouteResult }

type ComputedRoute = {
  polyline: string
  distanceMeters: number | null
  duration: string | null
  viewport: Viewport | null
}

export class MapsService {
  constructor(
    private readonly retrievalService: RetrievalService,
    private readonly departmentService: DepartmentService,
  ) {}

  async getRoute(request: RouteRequest): Promise<MapsOutcome> {
    if (!env.MAPS_ENABLED || !env.GOOGLE_MAPS_API_KEY) {
      return { kind: 'disabled' }
    }

    // Resolve the office the same way chat does: retrieve the top service, then
    // map its card-number prefix to a department row.
    const retrieval = await this.retrievalService.retrieve(request.query, {
      komorka: request.komorka,
    })
    const top = retrieval.hits[0]
    if (retrieval.status !== 'grounded' || !top) {
      return { kind: 'not_found' }
    }

    const symbol = top.cardId.split('-')[0] ?? ''
    const department = symbol.length > 0 ? this.departmentService.getBySymbol(symbol) : null
    if (!department || department.lat == null || department.lng == null) {
      // No office, or it was never geocoded (run `npm run geocode`). 404 — no map.
      return { kind: 'not_found' }
    }

    const dest: RouteDestination = {
      symbol,
      nazwa: department.nazwa,
      adres: department.adres,
      lat: department.lat,
      lng: department.lng,
    }

    if (!request.origin) {
      return {
        kind: 'ok',
        data: { dest, polyline: null, distanceMeters: null, duration: null, viewport: null },
      }
    }

    // Route compute is best-effort: a Google failure degrades to marker-only so
    // the map always renders something.
    const route = await this.computeRoute(request.origin, dest, request.travelMode)

    return {
      kind: 'ok',
      data: {
        dest,
        polyline: route?.polyline ?? null,
        distanceMeters: route?.distanceMeters ?? null,
        duration: route?.duration ?? null,
        viewport: route?.viewport ?? null,
      },
    }
  }

  private async computeRoute(
    origin: LatLng,
    dest: LatLng,
    travelMode: RouteRequest['travelMode'],
  ): Promise<ComputedRoute | null> {
    const body: Record<string, unknown> = {
      origin: this.toWaypoint(origin),
      destination: this.toWaypoint(dest),
      travelMode,
    }

    // TRAFFIC_AWARE is only valid for motorised modes; setting it for WALK/BICYCLE
    // is rejected by the Routes API.
    if (travelMode === 'DRIVE') {
      body.routingPreference = 'TRAFFIC_AWARE'
    }

    try {
      const response = await fetch(ROUTES_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': env.GOOGLE_MAPS_API_KEY!,
          'X-Goog-FieldMask': ROUTES_FIELD_MASK,
        },
        body: JSON.stringify(body),
      })

      const json = (await response.json()) as {
        routes?: {
          polyline?: { encodedPolyline?: string }
          distanceMeters?: number
          duration?: string
          viewport?: Viewport
        }[]
        error?: { message?: string }
      }

      const route = json.routes?.[0]
      if (!response.ok || !route?.polyline?.encodedPolyline) {
        console.error('Routes API returned no route', response.status, json.error?.message)
        return null
      }

      return {
        polyline: route.polyline.encodedPolyline,
        distanceMeters: route.distanceMeters ?? null,
        duration: route.duration ?? null,
        viewport: route.viewport ?? null,
      }
    } catch (error) {
      console.error('Routes API request failed', error)
      return null
    }
  }

  private toWaypoint(point: LatLng) {
    return { location: { latLng: { latitude: point.lat, longitude: point.lng } } }
  }
}

export const mapsService = new MapsService(new RetrievalService(), new DepartmentService())
