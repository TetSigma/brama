import { Router } from 'express'
import { getServiceGraph } from '../controllers/graph.controller.js'
import { serviceCardParamsSchema } from '../schemas/graph.schema.js'
import { validateRequest } from '../validators/validate-request.js'

export const graphRouter = Router()

graphRouter.get(
  '/:cardId',
  validateRequest('params', serviceCardParamsSchema),
  getServiceGraph,
)
