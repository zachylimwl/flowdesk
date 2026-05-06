import redis from './redis'

export interface SessionPayload {
  userId: string
  email: string
}

export const SESSION_TTL_SECONDS = 604800 // 7 days
export const SESSION_KEY_PREFIX = 'session:'

export function sessionKey(tokenId: string): string {
  return `${SESSION_KEY_PREFIX}${tokenId}`
}

export async function createSession(tokenId: string, payload: SessionPayload): Promise<void> {
  await redis.set(sessionKey(tokenId), JSON.stringify(payload), 'EX', SESSION_TTL_SECONDS)
}

export async function getSession(tokenId: string): Promise<SessionPayload | null> {
  const raw = await redis.get(sessionKey(tokenId))
  if (raw === null) return null
  try {
    return JSON.parse(raw) as SessionPayload
  } catch {
    return null
  }
}

export async function deleteSession(tokenId: string): Promise<void> {
  await redis.del(sessionKey(tokenId))
}

export async function rotateSession(
  oldTokenId: string,
  newTokenId: string,
  payload: SessionPayload,
): Promise<void> {
  await redis
    .pipeline()
    .del(sessionKey(oldTokenId))
    .set(sessionKey(newTokenId), JSON.stringify(payload), 'EX', SESSION_TTL_SECONDS)
    .exec()
}
