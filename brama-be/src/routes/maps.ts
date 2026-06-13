import { Router } from 'express'
import { computeMapRoute } from '../controllers/maps.controller.js'
import { routeRequestSchema } from '../schemas/maps.schema.js'
import { validateRequest } from '../validators/validate-request.js'

export const mapsRouter = Router()

mapsRouter.post('/route', validateRequest('body', routeRequestSchema), computeMapRoute)
