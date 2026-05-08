import 'dotenv/config'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Fastify from 'fastify'
import fastifyJwt from '@fastify/jwt'
import fp from 'fastify-plugin'
import { requireAuth } from '../auth.middleware'
import { requirePermission, requireMinimumRole } from '../rbac.middleware'
import { workspaceMemberRepository } from '../../repositories/workspace-member.repository'

vi.mock('../../repositories/workspace-member.repository', () => ({
  workspaceMemberRepository: {
    getMemberRole: vi.fn(),
  },
}))

const JWT_SECRET = 'test-secret-not-for-production'
const TEST_WORKSPACE_ID = 'workspace-abc-123'
const TEST_USER_ID = 'user-xyz-456'

function makeToken(fastify: ReturnType<typeof Fastify>) {
  return fastify.jwt.sign({ sub: TEST_USER_ID, email: 'test@example.com' })
}

async function buildApp() {
  const app = Fastify({ logger: false })

  await app.register(
    fp(async (instance) => {
      await instance.register(fastifyJwt, { secret: JWT_SECRET })
    }),
  )

  // Route 1: requirePermission('workspace', 'read')
  app.get(
    '/test/workspaces/:workspaceId',
    { preHandler: [requireAuth, requirePermission('workspace', 'read')] },
    async (_req, reply) => reply.code(200).send({ ok: true }),
  )

  // Route 2: requirePermission('workspace', 'update')
  app.get(
    '/test/workspaces/:workspaceId/update',
    { preHandler: [requireAuth, requirePermission('workspace', 'update')] },
    async (_req, reply) => reply.code(200).send({ ok: true }),
  )

  // Route 3: requirePermission('workspace', 'delete')
  app.get(
    '/test/workspaces/:workspaceId/delete',
    { preHandler: [requireAuth, requirePermission('workspace', 'delete')] },
    async (_req, reply) => reply.code(200).send({ ok: true }),
  )

  // Route 4: requireMinimumRole('ADMIN') — requires :workspaceId
  app.get(
    '/test/workspaces/:workspaceId/admin-only',
    { preHandler: [requireAuth, requireMinimumRole('ADMIN')] },
    async (_req, reply) => reply.code(200).send({ ok: true }),
  )

  // Route 5: misconfigured — no :workspaceId param
  app.get(
    '/test/no-workspace-id',
    { preHandler: [requireAuth, requirePermission('workspace', 'read')] },
    async (_req, reply) => reply.code(200).send({ ok: true }),
  )

  await app.ready()
  return app
}

describe('rbac middleware', () => {
  let app: Awaited<ReturnType<typeof buildApp>>

  beforeEach(async () => {
    app = await buildApp()
    vi.mocked(workspaceMemberRepository.getMemberRole).mockReset()
  })

  afterEach(async () => {
    await app.close()
  })

  // ── requirePermission ──────────────────────────────────────────────────────

  describe('requirePermission', () => {
    it('returns 401 when Authorization header is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/test/workspaces/${TEST_WORKSPACE_ID}`,
      })
      expect(res.statusCode).toBe(401)
      expect(vi.mocked(workspaceMemberRepository.getMemberRole)).not.toHaveBeenCalled()
    })

    it('returns 403 with membership message when user has no WorkspaceMember row', async () => {
      vi.mocked(workspaceMemberRepository.getMemberRole).mockResolvedValue(null)
      const token = makeToken(app)

      const res = await app.inject({
        method: 'GET',
        url: `/test/workspaces/${TEST_WORKSPACE_ID}`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(403)
      expect(res.json()).toMatchObject({ message: 'You are not a member of this workspace' })
    })

    it('returns 200 when VIEWER reads workspace', async () => {
      vi.mocked(workspaceMemberRepository.getMemberRole).mockResolvedValue('VIEWER')
      const token = makeToken(app)

      const res = await app.inject({
        method: 'GET',
        url: `/test/workspaces/${TEST_WORKSPACE_ID}`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
    })

    it('returns 403 when VIEWER tries to update workspace', async () => {
      vi.mocked(workspaceMemberRepository.getMemberRole).mockResolvedValue('VIEWER')
      const token = makeToken(app)

      const res = await app.inject({
        method: 'GET',
        url: `/test/workspaces/${TEST_WORKSPACE_ID}/update`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(403)
      expect(res.json()).toMatchObject({ error: 'Forbidden' })
    })

    it('returns 200 when MEMBER reads workspace', async () => {
      vi.mocked(workspaceMemberRepository.getMemberRole).mockResolvedValue('MEMBER')
      const token = makeToken(app)

      const res = await app.inject({
        method: 'GET',
        url: `/test/workspaces/${TEST_WORKSPACE_ID}`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
    })

    it('returns 200 when ADMIN reads workspace', async () => {
      vi.mocked(workspaceMemberRepository.getMemberRole).mockResolvedValue('ADMIN')
      const token = makeToken(app)

      const res = await app.inject({
        method: 'GET',
        url: `/test/workspaces/${TEST_WORKSPACE_ID}`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
    })

    it('returns 200 when OWNER deletes workspace', async () => {
      vi.mocked(workspaceMemberRepository.getMemberRole).mockResolvedValue('OWNER')
      const token = makeToken(app)

      const res = await app.inject({
        method: 'GET',
        url: `/test/workspaces/${TEST_WORKSPACE_ID}/delete`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
    })

    it('returns 403 when ADMIN tries to delete workspace', async () => {
      vi.mocked(workspaceMemberRepository.getMemberRole).mockResolvedValue('ADMIN')
      const token = makeToken(app)

      const res = await app.inject({
        method: 'GET',
        url: `/test/workspaces/${TEST_WORKSPACE_ID}/delete`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(403)
      expect(res.json()).toMatchObject({ error: 'Forbidden' })
    })

    it('returns 400 when route has no :workspaceId param', async () => {
      const token = makeToken(app)

      const res = await app.inject({
        method: 'GET',
        url: '/test/no-workspace-id',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(400)
      expect(res.json()).toMatchObject({ message: 'workspaceId is required in route params' })
      expect(vi.mocked(workspaceMemberRepository.getMemberRole)).not.toHaveBeenCalled()
    })
  })

  // ── requireMinimumRole ─────────────────────────────────────────────────────

  describe('requireMinimumRole', () => {
    it('returns 403 when user has no WorkspaceMember row', async () => {
      vi.mocked(workspaceMemberRepository.getMemberRole).mockResolvedValue(null)
      const token = makeToken(app)

      const res = await app.inject({
        method: 'GET',
        url: `/test/workspaces/${TEST_WORKSPACE_ID}/admin-only`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(403)
      expect(res.json()).toMatchObject({ message: 'You are not a member of this workspace' })
    })

    it('returns 403 when VIEWER does not meet minimum role of ADMIN', async () => {
      vi.mocked(workspaceMemberRepository.getMemberRole).mockResolvedValue('VIEWER')
      const token = makeToken(app)

      const res = await app.inject({
        method: 'GET',
        url: `/test/workspaces/${TEST_WORKSPACE_ID}/admin-only`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(403)
      expect(res.json()).toMatchObject({ error: 'Forbidden' })
    })

    it('returns 403 when MEMBER does not meet minimum role of ADMIN', async () => {
      vi.mocked(workspaceMemberRepository.getMemberRole).mockResolvedValue('MEMBER')
      const token = makeToken(app)

      const res = await app.inject({
        method: 'GET',
        url: `/test/workspaces/${TEST_WORKSPACE_ID}/admin-only`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(403)
    })

    it('returns 200 when ADMIN meets minimum role of ADMIN', async () => {
      vi.mocked(workspaceMemberRepository.getMemberRole).mockResolvedValue('ADMIN')
      const token = makeToken(app)

      const res = await app.inject({
        method: 'GET',
        url: `/test/workspaces/${TEST_WORKSPACE_ID}/admin-only`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
    })

    it('returns 200 when OWNER exceeds minimum role of ADMIN', async () => {
      vi.mocked(workspaceMemberRepository.getMemberRole).mockResolvedValue('OWNER')
      const token = makeToken(app)

      const res = await app.inject({
        method: 'GET',
        url: `/test/workspaces/${TEST_WORKSPACE_ID}/admin-only`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
    })
  })
})
