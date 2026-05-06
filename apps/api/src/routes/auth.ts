import type { FastifyPluginAsync } from 'fastify'
import { register, login, refresh, logout } from '../services/auth.service'
import {
  RegisterSchema,
  LoginSchema,
  RefreshSchema,
  LogoutSchema,
} from '../schemas/auth.schemas'

const ACCESS_EXPIRES_IN = process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m'

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const signFn = (payload: object) => fastify.jwt.sign(payload as any, { expiresIn: ACCESS_EXPIRES_IN })

  fastify.post('/register', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (request, reply) => {
    const result = RegisterSchema.safeParse(request.body)
    if (!result.success) {
      return reply.code(400).send({ error: 'Validation failed', details: result.error.flatten().fieldErrors })
    }
    try {
      const { tokens, user } = await register(result.data, signFn)
      return reply.code(201).send({ ...tokens, user })
    } catch (error) {
      const err = error as { code?: string; message?: string }
      if (err.code === 'EMAIL_TAKEN') return reply.code(409).send({ error: err.message })
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  fastify.post('/login', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const result = LoginSchema.safeParse(request.body)
    if (!result.success) {
      return reply.code(400).send({ error: 'Validation failed', details: result.error.flatten().fieldErrors })
    }
    try {
      const { tokens, user } = await login(result.data, signFn)
      return reply.code(200).send({ ...tokens, user })
    } catch (error) {
      const err = error as { code?: string; message?: string }
      if (err.code === 'INVALID_CREDENTIALS') return reply.code(401).send({ error: err.message })
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  fastify.post('/refresh', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (request, reply) => {
    const result = RefreshSchema.safeParse(request.body)
    if (!result.success) {
      return reply.code(400).send({ error: 'Validation failed', details: result.error.flatten().fieldErrors })
    }
    try {
      const tokens = await refresh(result.data, signFn)
      return reply.code(200).send(tokens)
    } catch (error) {
      const err = error as { code?: string; message?: string }
      if (err.code === 'INVALID_TOKEN') return reply.code(401).send({ error: err.message })
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  fastify.post('/logout', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (request, reply) => {
    const result = LogoutSchema.safeParse(request.body)
    if (!result.success) {
      return reply.code(400).send({ error: 'Validation failed', details: result.error.flatten().fieldErrors })
    }
    try {
      await logout(result.data)
      return reply.code(204).send()
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })
}

export default authRoutes
