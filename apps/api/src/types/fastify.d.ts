import type { WorkspaceRole } from '../generated/prisma/index.js'

declare module 'fastify' {
  interface FastifyRequest {
    user: { userId: string }
    member: { id: string; workspaceId: string; userId: string; role: WorkspaceRole }
  }
}
