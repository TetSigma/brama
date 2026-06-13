import { z } from 'zod'

export const routeRequestSchema = z.object({
  // The user's question, e.g. "gdzie zarejestrowac samochod". Retrieval resolves
  // it to the handling office, the same way chat does.
  query: z.string().trim().min(1),
  // Browser geolocation. Optional: without it we return a marker-only result.
  origin: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  travelMode: z.enum(['DRIVE', 'WALK', 'BICYCLE']).default('DRIVE'),
  // Optional retrieval filter by handling unit, mirrors the chat endpoint.
  komorka: z.string().trim().min(1).optional(),
})

export type RouteRequest = z.infer<typeof routeRequestSchema>
