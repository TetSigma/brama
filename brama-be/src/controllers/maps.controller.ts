import type { Request, Response } from 'express'
import type { RouteRequest } from '../schemas/maps.schema.js'
import { mapsService } from '../services/maps.service.js'

export const computeMapRoute = async (
  request: Request<Record<string, never>, unknown, RouteRequest>,
  response: Response,
) => {
  const outcome = await mapsService.getRoute(request.body)

  if (outcome.kind === 'disabled') {
    response.status(503).json({ error: { message: 'Maps feature is disabled' } })
    return
  }

  if (outcome.kind === 'not_found') {
    response.status(404).json({ error: { message: 'No mappable office found for this query' } })
    return
  }

  response.json(outcome.data)
}
