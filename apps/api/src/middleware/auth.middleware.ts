import type { preHandlerHookHandler } from 'fastify'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      sub: string
      email: string
      iat: number
      exp: number
    }
  }
}

export const requireAuth: preHandlerHookHandler = async (request, reply) => {
  try {
    await request.jwtVerify()
  } catch {
    return reply.code(401).send({ error: 'Unauthorized' })
  }
}
