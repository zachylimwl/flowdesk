import type { FastifyPluginAsync } from 'fastify'
import type { ProjectStatus } from '../generated/prisma'
import { requireAuth } from '../middleware/auth.middleware'
import { requirePermission } from '../middleware/rbac.middleware'
import { projectRepository } from '../repositories/project.repository'
import { CreateProjectSchema, ListProjectsQuerySchema, UpdateProjectSchema } from '../schemas/project.schemas'

function isPrismaUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002'
}

const projectRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/workspaces/:workspaceId/projects',
    { preHandler: [requireAuth, requirePermission('project', 'read')] },
    async (request, reply) => {
      const { workspaceId } = request.params as { workspaceId: string }

      const queryResult = ListProjectsQuerySchema.safeParse(request.query)
      if (!queryResult.success) {
        return reply.code(400).send({ error: 'Validation failed', details: queryResult.error.flatten().fieldErrors })
      }

      const { page, limit } = queryResult.data
      const offset = (page - 1) * limit
      const { projects, total } = await projectRepository.findByWorkspace(workspaceId, { limit, offset })

      return reply.code(200).send({
        data: projects,
        meta: { page, limit, total },
      })
    },
  )

  fastify.post(
    '/workspaces/:workspaceId/projects',
    { preHandler: [requireAuth, requirePermission('project', 'create')] },
    async (request, reply) => {
      const { workspaceId } = request.params as { workspaceId: string }

      const result = CreateProjectSchema.safeParse(request.body)
      if (!result.success) {
        return reply.code(422).send({ error: 'Validation failed', details: result.error.flatten().fieldErrors })
      }

      const { name, slug, description, color, status } = result.data

      try {
        const project = await projectRepository.create({
          name,
          slug,
          workspaceId,
          ownerId: request.user.sub,
          ...(description !== undefined && { description }),
          ...(color !== undefined && { color }),
          ...(status !== undefined && { status: status as ProjectStatus }),
        })
        return reply.code(201).send({ data: project })
      } catch (error) {
        if (isPrismaUniqueConstraintError(error)) {
          return reply.code(409).send({ error: 'A project with that slug already exists in this workspace.' })
        }
        fastify.log.error({ err: error }, 'Failed to create project')
        return reply.code(500).send({ error: 'Internal server error' })
      }
    },
  )

  fastify.get(
    '/workspaces/:workspaceId/projects/:id',
    { preHandler: [requireAuth, requirePermission('project', 'read')] },
    async (request, reply) => {
      const { workspaceId, id } = request.params as { workspaceId: string; id: string }

      const project = await projectRepository.findById(id, workspaceId)
      if (!project) {
        return reply.code(404).send({ error: 'Not Found' })
      }

      return reply.code(200).send({ data: project })
    },
  )

  fastify.patch(
    '/workspaces/:workspaceId/projects/:id',
    { preHandler: [requireAuth, requirePermission('project', 'update')] },
    async (request, reply) => {
      const { workspaceId, id } = request.params as { workspaceId: string; id: string }

      const existing = await projectRepository.findById(id, workspaceId)
      if (!existing) {
        return reply.code(404).send({ error: 'Not Found' })
      }

      const result = UpdateProjectSchema.safeParse(request.body)
      if (!result.success) {
        return reply.code(422).send({ error: 'Validation failed', details: result.error.flatten().fieldErrors })
      }

      const { name, description, status } = result.data
      const updateData = {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status: status as ProjectStatus }),
      }

      try {
        const project = await projectRepository.update(id, workspaceId, updateData)
        return reply.code(200).send({ data: project })
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to update project')
        return reply.code(500).send({ error: 'Internal server error' })
      }
    },
  )

  fastify.delete(
    '/workspaces/:workspaceId/projects/:id',
    { preHandler: [requireAuth, requirePermission('project', 'delete')] },
    async (request, reply) => {
      const { workspaceId, id } = request.params as { workspaceId: string; id: string }

      const existing = await projectRepository.findById(id, workspaceId)
      if (!existing) {
        return reply.code(404).send({ error: 'Not Found' })
      }

      try {
        await projectRepository.softDelete(id, workspaceId)
        return reply.code(200).send({ message: 'Project deleted' })
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to delete project')
        return reply.code(500).send({ error: 'Internal server error' })
      }
    },
  )
}

export { projectRoutes }
