import { Router } from 'express'
import { createLifeEventPlan } from '../controllers/plan.controller.js'
import { lifeEventPlanSchema } from '../schemas/plan.schema.js'
import { validateRequest } from '../validators/validate-request.js'

export const planRouter = Router()

planRouter.post('/', validateRequest('body', lifeEventPlanSchema), createLifeEventPlan)
