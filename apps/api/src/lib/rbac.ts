import type { WorkspaceRole as Role } from '../generated/prisma/index.js'

export type { Role }

export type Resource = 'workspace' | 'project' | 'task' | 'member' | 'comment' | 'apiToken'
export type Action = 'create' | 'read' | 'update' | 'delete' | 'manage'
export type PermissionMatrix = Readonly<
  Record<Role, Partial<Record<Resource, ReadonlyArray<Action>>>>
>

const PERMISSION_MATRIX = {
  OWNER: {
    workspace: ['create', 'read', 'update', 'delete', 'manage'],
    project:   ['create', 'read', 'update', 'delete', 'manage'],
    task:      ['create', 'read', 'update', 'delete', 'manage'],
    member:    ['create', 'read', 'update', 'delete', 'manage'],
    comment:   ['create', 'read', 'update', 'delete'],
    apiToken:  ['create', 'read', 'delete'],
  },
  ADMIN: {
    workspace: ['read', 'update'],
    project:   ['create', 'read', 'update', 'delete'],
    task:      ['create', 'read', 'update', 'delete'],
    member:    ['create', 'read', 'update'],
    comment:   ['create', 'read', 'update', 'delete'],
    apiToken:  ['create', 'read', 'delete'],
  },
  MEMBER: {
    workspace: ['read'],
    project:   ['create', 'read', 'update'],
    task:      ['create', 'read', 'update', 'delete'],
    member:    ['read'],
    comment:   ['create', 'read', 'update', 'delete'],
    apiToken:  ['create', 'read', 'delete'],
  },
  VIEWER: {
    workspace: ['read'],
    project:   ['read'],
    task:      ['read'],
    member:    ['read'],
    comment:   ['read'],
    apiToken:  ['read'],
  },
} as const satisfies PermissionMatrix

export { PERMISSION_MATRIX }

export function canPerform(role: Role, resource: Resource, action: Action): boolean {
  const actions = PERMISSION_MATRIX[role][resource]
  if (actions === undefined) return false
  return (actions as ReadonlyArray<Action>).includes(action)
}

const ROLE_WEIGHTS: Readonly<Record<Role, number>> = {
  OWNER: 4,
  ADMIN: 3,
  MEMBER: 2,
  VIEWER: 1,
} as const

export function getRoleWeight(role: Role): number {
  return ROLE_WEIGHTS[role]
}
