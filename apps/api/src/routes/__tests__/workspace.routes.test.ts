import 'dotenv/config'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Fastify from 'fastify'
import fastifyJwt from '@fastify/jwt'
import fp from 'fastify-plugin'
import { workspaceMemberRepository } from '../../repositories/workspace-member.repository'
import { workspaceRepository } from '../../repositories/workspace.repository'
import { workspaceRoutes } from '../workspace'

vi.mock('../../repositories/workspace-member.repository', () => ({
  workspaceMemberRepository: {
    getMemberRole: vi.fn(),
  },
}))

vi.mock('../../repositories/workspace.repository', () => ({
  workspaceRepository: {
    findByMember: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

const JWT_SECRET = 'test-secret-not-for-production'
const TEST_WORKSPACE_ID = 'workspace-abc-123'
const TEST_USER_ID = 'user-xyz-456'

const STUB_WORKSPACE = {
  id: TEST_WORKSPACE_ID,
  name: 'Test Workspace',
  slug: 'test-workspace',
  logoUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

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

  app.register(workspaceRoutes, { prefix: '/api/v1' })

  await app.ready()
  return app
}

describe('workspace routes — permission enforcement', () => {
  let app: Awaited<ReturnType<typeof buildApp>>

  beforeEach(async () => {
    app = await buildApp()
    vi.mocked(workspaceMemberRepository.getMemberRole).mockReset()
    vi.mocked(workspaceRepository.findByMember).mockReset()
    vi.mocked(workspaceRepository.findById).mockReset()
    vi.mocked(workspaceRepository.update).mockReset()
    vi.mocked(workspaceRepository.delete).mockReset()
  })

  afterEach(async () => {
    await app.close()
  })

  // ── GET /api/v1/workspaces ─────────────────────────────────────────────────

  describe('GET /api/v1/workspaces', () => {
    it('returns 200 when authenticated', async () => {
      vi.mocked(workspaceRepository.findByMember).mockResolvedValue([])
      const token = makeToken(app)

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/workspaces',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
    })

    it('returns 401 when unauthenticated', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/workspaces',
      })

      expect(res.statusCode).toBe(401)
    })
  })

  // ── GET /api/v1/workspaces/:workspaceId ───────────────────────────────────

  describe('GET /api/v1/workspaces/:workspaceId', () => {
    it('returns 200 for VIEWER', async () => {
      vi.mocked(workspaceMemberRepository.getMemberRole).mockResolvedValue('VIEWER')
      vi.mocked(workspaceRepository.findById).mockResolvedValue(STUB_WORKSPACE)
      const token = makeToken(app)

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${TEST_WORKSPACE_ID}`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
    })

    it('returns 403 when user has no membership', async () => {
      vi.mocked(workspaceMemberRepository.getMemberRole).mockResolvedValue(null)
      const token = makeToken(app)

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${TEST_WORKSPACE_ID}`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(403)
    })
  })

  // ── PATCH /api/v1/workspaces/:workspaceId ─────────────────────────────────

  describe('PATCH /api/v1/workspaces/:workspaceId', () => {
    it('returns 200 for OWNER', async () => {
      vi.mocked(workspaceMemberRepository.getMemberRole).mockResolvedValue('OWNER')
      vi.mocked(workspaceRepository.update).mockResolvedValue(STUB_WORKSPACE)
      const token = makeToken(app)

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${TEST_WORKSPACE_ID}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Updated Name' },
      })

      expect(res.statusCode).toBe(200)
    })

    it('returns 200 for ADMIN', async () => {
      vi.mocked(workspaceMemberRepository.getMemberRole).mockResolvedValue('ADMIN')
      vi.mocked(workspaceRepository.update).mockResolvedValue(STUB_WORKSPACE)
      const token = makeToken(app)

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${TEST_WORKSPACE_ID}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Updated Name' },
      })

      expect(res.statusCode).toBe(200)
    })

    it('returns 403 for MEMBER', async () => {
      vi.mocked(workspaceMemberRepository.getMemberRole).mockResolvedValue('MEMBER')
      const token = makeToken(app)

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${TEST_WORKSPACE_ID}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Updated Name' },
      })

      expect(res.statusCode).toBe(403)
    })

    it('returns 403 for VIEWER', async () => {
      vi.mocked(workspaceMemberRepository.getMemberRole).mockResolvedValue('VIEWER')
      const token = makeToken(app)

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${TEST_WORKSPACE_ID}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Updated Name' },
      })

      expect(res.statusCode).toBe(403)
    })
  })

  // ── DELETE /api/v1/workspaces/:workspaceId ────────────────────────────────

  describe('DELETE /api/v1/workspaces/:workspaceId', () => {
    it('returns 204 for OWNER', async () => {
      vi.mocked(workspaceMemberRepository.getMemberRole).mockResolvedValue('OWNER')
      vi.mocked(workspaceRepository.delete).mockResolvedValue(undefined)
      const token = makeToken(app)

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/workspaces/${TEST_WORKSPACE_ID}`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(204)
    })

    it('returns 403 for ADMIN', async () => {
      vi.mocked(workspaceMemberRepository.getMemberRole).mockResolvedValue('ADMIN')
      const token = makeToken(app)

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/workspaces/${TEST_WORKSPACE_ID}`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(403)
    })

    it('returns 403 for MEMBER', async () => {
      vi.mocked(workspaceMemberRepository.getMemberRole).mockResolvedValue('MEMBER')
      const token = makeToken(app)

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/workspaces/${TEST_WORKSPACE_ID}`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(403)
    })

    it('returns 403 for VIEWER', async () => {
      vi.mocked(workspaceMemberRepository.getMemberRole).mockResolvedValue('VIEWER')
      const token = makeToken(app)

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/workspaces/${TEST_WORKSPACE_ID}`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(403)
    })
  })

  // ── POST /api/v1/workspaces/:workspaceId/members ──────────────────────────

  describe('POST /api/v1/workspaces/:workspaceId/members', () => {
    it('returns 200 for OWNER', async () => {
      vi.mocked(workspaceMemberRepository.getMemberRole).mockResolvedValue('OWNER')
      const token = makeToken(app)

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${TEST_WORKSPACE_ID}/members`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
    })

    it('returns 200 for ADMIN', async () => {
      vi.mocked(workspaceMemberRepository.getMemberRole).mockResolvedValue('ADMIN')
      const token = makeToken(app)

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${TEST_WORKSPACE_ID}/members`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
    })

    it('returns 403 for MEMBER', async () => {
      vi.mocked(workspaceMemberRepository.getMemberRole).mockResolvedValue('MEMBER')
      const token = makeToken(app)

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${TEST_WORKSPACE_ID}/members`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(403)
    })

    it('returns 403 for VIEWER', async () => {
      vi.mocked(workspaceMemberRepository.getMemberRole).mockResolvedValue('VIEWER')
      const token = makeToken(app)

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${TEST_WORKSPACE_ID}/members`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(403)
    })
  })
})
