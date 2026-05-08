import { describe, it, expect } from 'vitest'
import { canPerform, getRoleWeight, type Action } from '../rbac.js'

// ─── OWNER ────────────────────────────────────────────────────────────────────

describe('OWNER permissions', () => {
  it('can perform all actions on workspace', () => {
    expect(canPerform('OWNER', 'workspace', 'create')).toBe(true)
    expect(canPerform('OWNER', 'workspace', 'read')).toBe(true)
    expect(canPerform('OWNER', 'workspace', 'update')).toBe(true)
    expect(canPerform('OWNER', 'workspace', 'delete')).toBe(true)
    expect(canPerform('OWNER', 'workspace', 'manage')).toBe(true)
  })

  it('can perform all actions on project', () => {
    expect(canPerform('OWNER', 'project', 'create')).toBe(true)
    expect(canPerform('OWNER', 'project', 'read')).toBe(true)
    expect(canPerform('OWNER', 'project', 'update')).toBe(true)
    expect(canPerform('OWNER', 'project', 'delete')).toBe(true)
    expect(canPerform('OWNER', 'project', 'manage')).toBe(true)
  })

  it('can perform all actions on task', () => {
    expect(canPerform('OWNER', 'task', 'create')).toBe(true)
    expect(canPerform('OWNER', 'task', 'read')).toBe(true)
    expect(canPerform('OWNER', 'task', 'update')).toBe(true)
    expect(canPerform('OWNER', 'task', 'delete')).toBe(true)
    expect(canPerform('OWNER', 'task', 'manage')).toBe(true)
  })

  it('can perform all actions on member', () => {
    expect(canPerform('OWNER', 'member', 'create')).toBe(true)
    expect(canPerform('OWNER', 'member', 'read')).toBe(true)
    expect(canPerform('OWNER', 'member', 'update')).toBe(true)
    expect(canPerform('OWNER', 'member', 'delete')).toBe(true)
    expect(canPerform('OWNER', 'member', 'manage')).toBe(true)
  })

  it('can create/read/update/delete comment but not manage', () => {
    expect(canPerform('OWNER', 'comment', 'create')).toBe(true)
    expect(canPerform('OWNER', 'comment', 'read')).toBe(true)
    expect(canPerform('OWNER', 'comment', 'update')).toBe(true)
    expect(canPerform('OWNER', 'comment', 'delete')).toBe(true)
    expect(canPerform('OWNER', 'comment', 'manage')).toBe(false)
  })

  it('can create/read/delete apiToken but not update or manage', () => {
    expect(canPerform('OWNER', 'apiToken', 'create')).toBe(true)
    expect(canPerform('OWNER', 'apiToken', 'read')).toBe(true)
    expect(canPerform('OWNER', 'apiToken', 'update')).toBe(false)
    expect(canPerform('OWNER', 'apiToken', 'delete')).toBe(true)
    expect(canPerform('OWNER', 'apiToken', 'manage')).toBe(false)
  })
})

// ─── ADMIN ────────────────────────────────────────────────────────────────────

describe('ADMIN permissions', () => {
  it('can read/update workspace but not create, delete, or manage', () => {
    expect(canPerform('ADMIN', 'workspace', 'create')).toBe(false)
    expect(canPerform('ADMIN', 'workspace', 'read')).toBe(true)
    expect(canPerform('ADMIN', 'workspace', 'update')).toBe(true)
    expect(canPerform('ADMIN', 'workspace', 'delete')).toBe(false)
    expect(canPerform('ADMIN', 'workspace', 'manage')).toBe(false)
  })

  it('can create/read/update/delete project but not manage', () => {
    expect(canPerform('ADMIN', 'project', 'create')).toBe(true)
    expect(canPerform('ADMIN', 'project', 'read')).toBe(true)
    expect(canPerform('ADMIN', 'project', 'update')).toBe(true)
    expect(canPerform('ADMIN', 'project', 'delete')).toBe(true)
    expect(canPerform('ADMIN', 'project', 'manage')).toBe(false)
  })

  it('can create/read/update/delete task but not manage', () => {
    expect(canPerform('ADMIN', 'task', 'create')).toBe(true)
    expect(canPerform('ADMIN', 'task', 'read')).toBe(true)
    expect(canPerform('ADMIN', 'task', 'update')).toBe(true)
    expect(canPerform('ADMIN', 'task', 'delete')).toBe(true)
    expect(canPerform('ADMIN', 'task', 'manage')).toBe(false)
  })

  it('can create/read/update member but not delete or manage', () => {
    expect(canPerform('ADMIN', 'member', 'create')).toBe(true)
    expect(canPerform('ADMIN', 'member', 'read')).toBe(true)
    expect(canPerform('ADMIN', 'member', 'update')).toBe(true)
    expect(canPerform('ADMIN', 'member', 'delete')).toBe(false)
    expect(canPerform('ADMIN', 'member', 'manage')).toBe(false)
  })

  it('can create/read/update/delete comment but not manage', () => {
    expect(canPerform('ADMIN', 'comment', 'create')).toBe(true)
    expect(canPerform('ADMIN', 'comment', 'read')).toBe(true)
    expect(canPerform('ADMIN', 'comment', 'update')).toBe(true)
    expect(canPerform('ADMIN', 'comment', 'delete')).toBe(true)
    expect(canPerform('ADMIN', 'comment', 'manage')).toBe(false)
  })

  it('can create/read/delete apiToken but not update or manage', () => {
    expect(canPerform('ADMIN', 'apiToken', 'create')).toBe(true)
    expect(canPerform('ADMIN', 'apiToken', 'read')).toBe(true)
    expect(canPerform('ADMIN', 'apiToken', 'update')).toBe(false)
    expect(canPerform('ADMIN', 'apiToken', 'delete')).toBe(true)
    expect(canPerform('ADMIN', 'apiToken', 'manage')).toBe(false)
  })
})

// ─── MEMBER ───────────────────────────────────────────────────────────────────

describe('MEMBER permissions', () => {
  it('can only read workspace', () => {
    expect(canPerform('MEMBER', 'workspace', 'create')).toBe(false)
    expect(canPerform('MEMBER', 'workspace', 'read')).toBe(true)
    expect(canPerform('MEMBER', 'workspace', 'update')).toBe(false)
    expect(canPerform('MEMBER', 'workspace', 'delete')).toBe(false)
    expect(canPerform('MEMBER', 'workspace', 'manage')).toBe(false)
  })

  it('can create/read/update project but not delete or manage', () => {
    expect(canPerform('MEMBER', 'project', 'create')).toBe(true)
    expect(canPerform('MEMBER', 'project', 'read')).toBe(true)
    expect(canPerform('MEMBER', 'project', 'update')).toBe(true)
    expect(canPerform('MEMBER', 'project', 'delete')).toBe(false)
    expect(canPerform('MEMBER', 'project', 'manage')).toBe(false)
  })

  it('can create/read/update/delete task but not manage', () => {
    expect(canPerform('MEMBER', 'task', 'create')).toBe(true)
    expect(canPerform('MEMBER', 'task', 'read')).toBe(true)
    expect(canPerform('MEMBER', 'task', 'update')).toBe(true)
    expect(canPerform('MEMBER', 'task', 'delete')).toBe(true)
    expect(canPerform('MEMBER', 'task', 'manage')).toBe(false)
  })

  it('can only read member', () => {
    expect(canPerform('MEMBER', 'member', 'create')).toBe(false)
    expect(canPerform('MEMBER', 'member', 'read')).toBe(true)
    expect(canPerform('MEMBER', 'member', 'update')).toBe(false)
    expect(canPerform('MEMBER', 'member', 'delete')).toBe(false)
    expect(canPerform('MEMBER', 'member', 'manage')).toBe(false)
  })

  it('can create/read/update/delete comment but not manage', () => {
    expect(canPerform('MEMBER', 'comment', 'create')).toBe(true)
    expect(canPerform('MEMBER', 'comment', 'read')).toBe(true)
    expect(canPerform('MEMBER', 'comment', 'update')).toBe(true)
    expect(canPerform('MEMBER', 'comment', 'delete')).toBe(true)
    expect(canPerform('MEMBER', 'comment', 'manage')).toBe(false)
  })

  it('can create/read/delete apiToken but not update or manage', () => {
    expect(canPerform('MEMBER', 'apiToken', 'create')).toBe(true)
    expect(canPerform('MEMBER', 'apiToken', 'read')).toBe(true)
    expect(canPerform('MEMBER', 'apiToken', 'update')).toBe(false)
    expect(canPerform('MEMBER', 'apiToken', 'delete')).toBe(true)
    expect(canPerform('MEMBER', 'apiToken', 'manage')).toBe(false)
  })
})

// ─── VIEWER ───────────────────────────────────────────────────────────────────

describe('VIEWER permissions', () => {
  it('can only read workspace', () => {
    expect(canPerform('VIEWER', 'workspace', 'create')).toBe(false)
    expect(canPerform('VIEWER', 'workspace', 'read')).toBe(true)
    expect(canPerform('VIEWER', 'workspace', 'update')).toBe(false)
    expect(canPerform('VIEWER', 'workspace', 'delete')).toBe(false)
    expect(canPerform('VIEWER', 'workspace', 'manage')).toBe(false)
  })

  it('can only read project', () => {
    expect(canPerform('VIEWER', 'project', 'create')).toBe(false)
    expect(canPerform('VIEWER', 'project', 'read')).toBe(true)
    expect(canPerform('VIEWER', 'project', 'update')).toBe(false)
    expect(canPerform('VIEWER', 'project', 'delete')).toBe(false)
    expect(canPerform('VIEWER', 'project', 'manage')).toBe(false)
  })

  it('can only read task', () => {
    expect(canPerform('VIEWER', 'task', 'create')).toBe(false)
    expect(canPerform('VIEWER', 'task', 'read')).toBe(true)
    expect(canPerform('VIEWER', 'task', 'update')).toBe(false)
    expect(canPerform('VIEWER', 'task', 'delete')).toBe(false)
    expect(canPerform('VIEWER', 'task', 'manage')).toBe(false)
  })

  it('can only read member', () => {
    expect(canPerform('VIEWER', 'member', 'create')).toBe(false)
    expect(canPerform('VIEWER', 'member', 'read')).toBe(true)
    expect(canPerform('VIEWER', 'member', 'update')).toBe(false)
    expect(canPerform('VIEWER', 'member', 'delete')).toBe(false)
    expect(canPerform('VIEWER', 'member', 'manage')).toBe(false)
  })

  it('can only read comment', () => {
    expect(canPerform('VIEWER', 'comment', 'create')).toBe(false)
    expect(canPerform('VIEWER', 'comment', 'read')).toBe(true)
    expect(canPerform('VIEWER', 'comment', 'update')).toBe(false)
    expect(canPerform('VIEWER', 'comment', 'delete')).toBe(false)
    expect(canPerform('VIEWER', 'comment', 'manage')).toBe(false)
  })

  it('can only read apiToken', () => {
    expect(canPerform('VIEWER', 'apiToken', 'create')).toBe(false)
    expect(canPerform('VIEWER', 'apiToken', 'read')).toBe(true)
    expect(canPerform('VIEWER', 'apiToken', 'update')).toBe(false)
    expect(canPerform('VIEWER', 'apiToken', 'delete')).toBe(false)
    expect(canPerform('VIEWER', 'apiToken', 'manage')).toBe(false)
  })
})

// ─── getRoleWeight ────────────────────────────────────────────────────────────

describe('getRoleWeight', () => {
  it('returns the correct weight for each role', () => {
    expect(getRoleWeight('OWNER')).toBe(4)
    expect(getRoleWeight('ADMIN')).toBe(3)
    expect(getRoleWeight('MEMBER')).toBe(2)
    expect(getRoleWeight('VIEWER')).toBe(1)
  })

  it('preserves the correct relative ordering', () => {
    expect(getRoleWeight('OWNER')).toBeGreaterThan(getRoleWeight('ADMIN'))
    expect(getRoleWeight('ADMIN')).toBeGreaterThan(getRoleWeight('MEMBER'))
    expect(getRoleWeight('MEMBER')).toBeGreaterThan(getRoleWeight('VIEWER'))
  })
})

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('canPerform edge cases', () => {
  it('returns false for an action not in any role\'s list for that resource', () => {
    // 'manage' is absent from all roles for comment and apiToken
    expect(canPerform('OWNER', 'comment', 'manage')).toBe(false)
    expect(canPerform('ADMIN', 'comment', 'manage')).toBe(false)
    expect(canPerform('MEMBER', 'comment', 'manage')).toBe(false)
    expect(canPerform('VIEWER', 'comment', 'manage')).toBe(false)
    expect(canPerform('OWNER', 'apiToken', 'manage')).toBe(false)
    expect(canPerform('ADMIN', 'apiToken', 'manage')).toBe(false)
    expect(canPerform('MEMBER', 'apiToken', 'manage')).toBe(false)
    expect(canPerform('VIEWER', 'apiToken', 'manage')).toBe(false)
  })

  it('returns false for an unknown action string without throwing', () => {
    expect(() => canPerform('OWNER', 'workspace', 'publish' as Action)).not.toThrow()
    expect(canPerform('OWNER', 'workspace', 'publish' as Action)).toBe(false)
    expect(() => canPerform('VIEWER', 'task', 'archive' as Action)).not.toThrow()
    expect(canPerform('VIEWER', 'task', 'archive' as Action)).toBe(false)
  })
})
