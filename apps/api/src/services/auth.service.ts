import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { userRepository } from '../repositories/user.repository'
import { createSession, getSession, rotateSession, deleteSession } from '../lib/session'
import type { RegisterInput, LoginInput, RefreshInput, LogoutInput } from '../schemas/auth.schemas'

const BCRYPT_ROUNDS = 12

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface PublicUser {
  id: string
  name: string
  email: string
  createdAt: Date
}

function makeAuthError(message: string, code: string): Error {
  const err = new Error(message) as Error & { code: string }
  err.code = code
  return err
}

export async function register(
  input: RegisterInput,
  sign: (payload: object) => string,
): Promise<{ tokens: AuthTokens; user: PublicUser }> {
  const taken = await userRepository.existsByEmail(input.email)
  if (taken) {
    throw makeAuthError('Email already in use', 'EMAIL_TAKEN')
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)
  const user = await userRepository.create({ name: input.name, email: input.email, passwordHash })

  const tokenId = randomBytes(32).toString('hex')
  const accessToken = sign({ sub: user.id, email: user.email })
  await createSession(tokenId, { userId: user.id, email: user.email })

  return {
    tokens: { accessToken, refreshToken: tokenId },
    user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
  }
}

export async function login(
  input: LoginInput,
  sign: (payload: object) => string,
): Promise<{ tokens: AuthTokens; user: PublicUser }> {
  const user = await userRepository.findByEmail(input.email)
  if (!user) {
    throw makeAuthError('Invalid credentials', 'INVALID_CREDENTIALS')
  }

  const match = await bcrypt.compare(input.password, user.passwordHash)
  if (!match) {
    throw makeAuthError('Invalid credentials', 'INVALID_CREDENTIALS')
  }

  const tokenId = randomBytes(32).toString('hex')
  const accessToken = sign({ sub: user.id, email: user.email })
  await createSession(tokenId, { userId: user.id, email: user.email })

  return {
    tokens: { accessToken, refreshToken: tokenId },
    user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
  }
}

export async function refresh(
  input: RefreshInput,
  sign: (payload: object) => string,
): Promise<AuthTokens> {
  const session = await getSession(input.refreshToken)
  if (!session) {
    throw makeAuthError('Invalid or expired refresh token', 'INVALID_TOKEN')
  }

  const user = await userRepository.findById(session.userId)
  if (!user) {
    throw makeAuthError('Invalid or expired refresh token', 'INVALID_TOKEN')
  }

  const newTokenId = randomBytes(32).toString('hex')
  await rotateSession(input.refreshToken, newTokenId, { userId: user.id, email: user.email })
  const accessToken = sign({ sub: user.id, email: user.email })

  return { accessToken, refreshToken: newTokenId }
}

export async function logout(input: LogoutInput): Promise<void> {
  await deleteSession(input.refreshToken)
}
