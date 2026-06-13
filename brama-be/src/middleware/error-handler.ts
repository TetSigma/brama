import type { ErrorRequestHandler } from 'express'
import { env } from '../config/env.js'

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const statusCode = typeof error.statusCode === 'number' ? error.statusCode : 500
  const message = statusCode === 500 ? 'Internal server error' : String(error.message)

  if (statusCode === 500) {
    console.error(error)
  }

  response.status(statusCode).json({
    error: {
      message,
      ...(env.NODE_ENV === 'development' ? { details: String(error.stack ?? error) } : {}),
    },
  })
}
