import { randomBytes } from 'crypto'
import { redis } from './redis.js'

const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7

export function generateRefreshToken(): string {
  return randomBytes(40).toString('hex')
}

export async function storeRefreshToken(userId: string, token: string): Promise<void> {
  await redis.set(`refresh:${token}`, userId, 'EX', REFRESH_TOKEN_TTL_SECONDS)
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await redis.del(`refresh:${token}`)
}

export async function resolveRefreshToken(token: string): Promise<string | null> {
  return redis.get(`refresh:${token}`)
}
