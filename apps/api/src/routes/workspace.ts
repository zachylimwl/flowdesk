import type { FastifyPluginAsync } from 'fastify'
import { requireAuth } from '../middleware/auth.middleware'
import { requirePermission } from '../middleware/rbac.middleware'
import { workspaceRepository } from '../repositories/workspace.repository'
import { UpdateWorkspaceSchema } from '../schemas/workspace.schemas'

const workspaceRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/workspaces', { preHandler: [requireAuth] }, async (request, reply) => {
    const workspaces = await workspaceRepository.findByMember(request.user.sub)
    return reply.code(200).send(workspaces)
  })

  fastify.get(
    '/workspaces/:workspaceId',
    { preHandler: [requireAuth, requirePermission('workspace', 'read')] },
    async (request, reply) => {
      const { workspaceId } = request.params as { workspaceId: string }
      const workspace = await workspaceRepository.findById(workspaceId)
      if (!workspace) {
        return reply.code(404).send({ error: 'Not Found' })
      }
      return reply.code(200).send(workspace)
    },
  )

  fastify.patch(
    '/workspaces/:workspaceId',
    { preHandler: [requireAuth, requirePermission('workspace', 'update')] },
    async (request, reply) => {
      const { workspaceId } = request.params as { workspaceId: string }
      const result = UpdateWorkspaceSchema.safeParse(request.body)
      if (!result.success) {
        return reply.code(400).send({ error: 'Validation failed', details: result.error.flatten().fieldErrors })
      }
      try {
        const workspace = await workspaceRepository.update(workspaceId, result.data)
        return reply.code(200).send(workspace)
      } catch (error) {
        fastify.log.error(error)
        return reply.code(500).send({ error: 'Internal server error' })
      }
    },
  )

  fastify.delete(
    '/workspaces/:workspaceId',
    { preHandler: [requireAuth, requirePermission('workspace', 'delete')] },
    async (request, reply) => {
      const { workspaceId } = request.params as { workspaceId: string }
      try {
        await workspaceRepository.delete(workspaceId)
        return reply.code(204).send()
      } catch (error) {
        fastify.log.error(error)
        return reply.code(500).send({ error: 'Internal server error' })
      }
    },
  )

  fastify.post(
    '/workspaces/:workspaceId/members',
    { preHandler: [requireAuth, requirePermission('member', 'create')] },
    async (_request, reply) => {
      return reply.code(200).send({ message: 'Member management coming in a future module' })
    },
  )
}

export { workspaceRoutes }
