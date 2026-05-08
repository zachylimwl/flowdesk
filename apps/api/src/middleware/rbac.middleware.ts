import type { preHandlerHookHandler } from 'fastify'
import { canPerform, getRoleWeight } from '../lib/rbac'
import type { Action, Resource, Role } from '../lib/rbac'
import { workspaceMemberRepository } from '../repositories/workspace-member.repository'

declare module 'fastify' {
  interface FastifyRequest {
    workspaceRole?: Role
  }
}

export function requirePermission(resource: Resource, action: Action): preHandlerHookHandler {
  return async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId?: string }
    if (!workspaceId) {
      return reply.code(400).send({ error: 'Bad Request', message: 'workspaceId is required in route params' })
    }

    const userId = request.user.sub

    const role = await workspaceMemberRepository.getMemberRole(userId, workspaceId)
    if (role === null) {
      return reply.code(403).send({ error: 'Forbidden', message: 'You are not a member of this workspace' })
    }

    if (!canPerform(role, resource, action)) {
      return reply.code(403).send({ error: 'Forbidden', message: `Role ${role} cannot perform ${action} on ${resource}` })
    }

    request.workspaceRole = role
  }
}

export function requireMinimumRole(minimumRole: Role): preHandlerHookHandler {
  return async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId?: string }
    if (!workspaceId) {
      return reply.code(400).send({ error: 'Bad Request', message: 'workspaceId is required in route params' })
    }

    const userId = request.user.sub

    const role = await workspaceMemberRepository.getMemberRole(userId, workspaceId)
    if (role === null) {
      return reply.code(403).send({ error: 'Forbidden', message: 'You are not a member of this workspace' })
    }

    if (getRoleWeight(role) < getRoleWeight(minimumRole)) {
      return reply.code(403).send({ error: 'Forbidden', message: `Role ${role} does not meet the minimum required role of ${minimumRole}` })
    }

    request.workspaceRole = role
  }
}
