import type { NextFunction, Request, Response } from 'express'
import type { LifeEventPlanRequest } from '../schemas/plan.schema.js'
import { planService } from '../services/plan.service.js'

export const createLifeEventPlan = async (
  request: Request<Record<string, never>, unknown, LifeEventPlanRequest>,
  response: Response,
  next: NextFunction,
) => {
  try {
    const { message, lang, group, eventId, userContext } = request.body
    const plan = await planService.buildPlan(message, lang, group, eventId, userContext)

    if (!plan) {
      // Not a recognised life event — tell the client to use /api/chat instead.
      response.status(404).json({ error: { message: 'No matching life event', fallback: 'chat' } })
      return
    }

    response.json(plan)
  } catch (error) {
    next(error)
  }
}
