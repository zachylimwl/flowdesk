import 'dotenv/config'
import Fastify from 'fastify'
import jwtPlugin from './plugins/jwt.plugin'
import authRoutes from './routes/auth'
import { connect as connectRedis, disconnect as disconnectRedis } from './lib/redis'

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    ...(process.env.NODE_ENV === 'development' && {
      transport: { target: 'pino-pretty', options: { colorize: true } },
    }),
  },
})

await server.register(import('@fastify/rate-limit'), {
  max: 100,
  timeWindow: '1 minute',
})

await server.register(jwtPlugin)

server.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

await server.register(authRoutes, { prefix: '/api/v1/auth' })

server.addHook('onClose', async () => {
  await disconnectRedis()
})

const start = async () => {
  try {
    const port = Number(process.env.PORT ?? 3001)
    const host = process.env.HOST ?? '0.0.0.0'
    await connectRedis()
    await server.listen({ port, host })
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

void start()
