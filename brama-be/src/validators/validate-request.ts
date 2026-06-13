import type { RequestHandler } from 'express'
import type { ZodType } from 'zod'
import { z } from 'zod'

type RequestPart = 'body' | 'params' | 'query'

export const validateRequest =
  (part: RequestPart, schema: ZodType): RequestHandler =>
  (request, response, next) => {
    const result = schema.safeParse(request[part])

    if (!result.success) {
      response.status(400).json({
        error: {
          message: 'Invalid request',
          details: z.treeifyError(result.error),
        },
      })
      return
    }

    request[part] = result.data
    next()
  }
