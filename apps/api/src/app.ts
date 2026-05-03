import Fastify from 'fastify'

export async function buildApp() {
  const app = Fastify({ logger: true })

  app.get('/healthz', async () => ({ status: 'ok' }))

  return app
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const app = await buildApp()
  await app.listen({ port: 3000, host: '0.0.0.0' })
}
