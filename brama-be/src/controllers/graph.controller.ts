import type { Request, Response } from 'express'
import type { ServiceCardParams } from '../schemas/graph.schema.js'
import { graphService } from '../services/graph.service.js'

export const getServiceGraph = async (
  request: Request<ServiceCardParams>,
  response: Response,
) => {
  const graph = await graphService.getServiceGraph(request.params.cardId)

  if (!graph) {
    response.status(404).json({ error: { message: 'Service not found in graph' } })
    return
  }

  response.json(graph)
}
