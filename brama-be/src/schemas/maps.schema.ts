import { z } from 'zod'

const latLng = z.object({ lat: z.number(), lng: z.number() })

export const routeRequestSchema = z
  .object({
    // Preferred path: the office already resolved by the chat bundle. Skips
    // retrieval, so the map matches exactly the office the chat named.
    symbol: z.string().trim().min(1).optional(),
    // Or pass the destination coords straight from the bundle's map block.
    dest: latLng.optional(),
    // Fallback path: the user's question, e.g. "gdzie zarejestrowac samochod" —
    // retrieval resolves it to the handling office, the same way chat does.
    query: z.string().trim().min(1).optional(),
    // Browser geolocation. Optional: without it we return a marker-only result.
    origin: latLng.optional(),
    travelMode: z.enum(['DRIVE', 'WALK', 'BICYCLE']).default('DRIVE'),
    // Optional retrieval filter by handling unit, mirrors the chat endpoint.
    komorka: z.string().trim().min(1).optional(),
  })
  .refine((value) => Boolean(value.symbol || value.dest || value.query), {
    message: 'One of symbol, dest or query is required',
  })

export type RouteRequest = z.infer<typeof routeRequestSchema>
