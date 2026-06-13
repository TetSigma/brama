import compression from 'compression'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import { errorHandler } from './middleware/error-handler.js'
import { notFoundHandler } from './middleware/not-found-handler.js'
import { chatRouter } from './routes/chat.js'
import { documentsRouter } from './routes/documents.js'
import { graphRouter } from './routes/graph.js'
import { healthRouter } from './routes/health.js'
import { mapsRouter } from './routes/maps.js'
import { planRouter } from './routes/plan.js'

export const createApp = () => {
  const app = express()

  app.disable('x-powered-by')

  app.use(helmet())
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  )
  app.use(
    compression({
      filter: (request, response) => {
        if (request.path === '/api/chat') {
          return false
        }

        return compression.filter(request, response)
      },
    }),
  )
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))

  app.use('/api', chatRouter)
  app.use('/api/graph', graphRouter)
  app.use('/api/maps', mapsRouter)
  app.use('/api/documents', documentsRouter)
  app.use('/api/life-event-plan', planRouter)
  app.use('/health', healthRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
