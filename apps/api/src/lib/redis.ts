import { Redis } from 'ioredis'

const redisUrl = process.env['REDIS_URL']
if (!redisUrl) {
  throw new Error('REDIS_URL environment variable is required but not set.')
}

const client = new Redis(redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
})

client.on('error', (err: Error) => {
  console.error('[Redis] connection error:', err.message)
})

export default client

export async function connect(): Promise<void> {
  await client.connect()
  console.log('[Redis] connected')
}

export async function disconnect(): Promise<void> {
  await client.quit()
  console.log('[Redis] disconnected')
}
