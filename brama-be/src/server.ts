import { createServer } from 'node:http'
import { createApp } from './app.js'
import { env } from './config/env.js'

const app = createApp()
const server = createServer(app)

server.listen(env.PORT, () => {
  console.log(`Brama API listening on http://localhost:${env.PORT}`)
})

const shutdown = (signal: NodeJS.Signals) => {
  console.log(`${signal} received. Closing HTTP server.`)

  server.close((error) => {
    if (error) {
      console.error('HTTP server shutdown failed', error)
      process.exit(1)
    }

    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
