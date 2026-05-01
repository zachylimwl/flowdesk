# FlowDesk — Project Spec for Claude Code

## What This Is

FlowDesk is a multi-tenant B2B SaaS project management platform. This is the project repository
for the Claude Code Mastery course. We are building FlowDesk from scratch to production.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite + TanStack Router + TanStack Query + TanStack Form + Material UI v6 |
| Backend | Node.js + Fastify v4 + Prisma v7 + PostgreSQL 15 + Redis 7 |
| Auth | JWT (access tokens, 15 min) + refresh tokens (7 days) + Redis session store |
| Testing | Vitest + Playwright + Testing Library |
| Observability | Pino structured logging + OpenTelemetry |
| CI/CD | GitHub Actions + Docker + Railway |

## Repository Structure

> For the full annotated structure — per-directory descriptions, naming conventions, import rules,
> and a file-placement decision table — see `.claude/specs/monorepo-structure.md`.

```
flowdesk/
├── apps/
│   ├── web/                    # React 19 frontend (Vite)
│   │   └── src/
│   └── api/                    # Fastify backend
│       └── src/
├── packages/
│   └── shared/                 # TypeScript types and utilities shared between apps
├── prisma/                     # Prisma schema and migration history
├── docs/
│   └── adr/                    # Architecture Decision Records
├── .claude/
│   ├── settings.json           # Claude Code configuration (committed)
│   ├── settings.local.json     # Personal overrides (gitignored)
│   └── specs/                  # Feature and structure specifications
├── docker-compose.yml          # PostgreSQL + Redis for local development
├── .env.example
├── package.json                # pnpm workspace root
└── pnpm-workspace.yaml
```

## Architectural Decisions

Before writing any new ADR, read `docs/adr/ADR-template.md` and follow its structure exactly.

### 1. Multi-Tenancy Strategy

Shared database, shared schema. Every table that belongs to a workspace has a `workspaceId` column. Workspace isolation is enforced at the application layer — specifically at the repository layer — not at the database layer.

- `workspaceId` is always sourced from the authenticated session. It is never taken from the request body or a URL parameter supplied by the client.
- Every Prisma query that touches workspace-scoped data must include a `workspaceId` filter. A query that returns workspace data without this filter is a multi-tenancy breach, not a bug.
- Every workspace-scoped table must have a composite index with `workspaceId` as the leading column.

### 2. API Design Approach

REST-first. The backend exposes a versioned REST API mounted at `/api/v1/`. OpenAPI is the authoritative contract, defined in `apps/api/src/openapi.ts` and kept in sync with route implementations.

- WebSocket endpoints are prefixed `/ws/` and added only for features that require real-time server push (e.g. task status updates, presence). They are not a general-purpose alternative to REST.
- All REST responses follow the existing error shape: `{ error: string, code?: string }`.

### 3. Authentication Pattern

JWT access tokens (15-minute expiry) combined with refresh tokens (7-day expiry, stored in Redis). Server sessions are stateless — the access token carries all claims needed to authorise a request.

- Token refresh is handled transparently by the frontend API client. Components and query hooks are unaware of the refresh cycle.
- Refresh tokens are stored in Redis and can be individually revoked (e.g. on logout or member removal).

### 4. Frontend Data Fetching

TanStack Query is the single source of truth for all server state.

- No direct `fetch()` calls in components. All server interactions go through the centralised API client in `apps/web/src/lib/api.ts`, invoked from TanStack Query hooks.
- Mutations use TanStack Query's `useMutation`. Interactive elements (task completion, role changes) use optimistic updates to keep the UI responsive.
- Query keys are defined centrally in `apps/web/src/lib/queryKeys.ts` — no inline string keys.

### 5. Data Model — Tenant Isolation Column

Every table that stores workspace-scoped data carries a `workspaceId` foreign key column. This is the physical enforcement point for the shared-schema multi-tenancy strategy in Decision 1.

- `workspaceId` is the leading column on every composite index for workspace-scoped tables.
- Prisma's `findUnique` must not be used on workspace-scoped records — use `findFirst({ where: { id, workspaceId } })` so the tenant filter is never bypassed.

### 6. Data Model — User and Membership

`User` is workspace-independent. A user's role in a workspace is stored in a `WorkspaceMember` join table, not on the `User` record.

- `WorkspaceMember` has a compound unique constraint on `(workspaceId, userId)`.
- A covering index on `(workspaceId, userId)` is required — this index is hit on every authenticated workspace request.
- Role is never encoded in the JWT. A `verifyWorkspaceMember` preHandler resolves the caller's current role from `WorkspaceMember` on every workspace-scoped request and decorates `request.member`.

### 7. Data Model — Soft Delete

Workspace-scoped resource tables (projects, tasks, and future entities) use soft delete via a `deletedAt` nullable timestamp column. All queries against these tables must include a `where: { deletedAt: null }` filter unless explicitly querying deleted records.

- `Workspace` itself is **hard deleted** — the record is removed, cascading to all child records including `WorkspaceMember`, `WorkspaceInvitation`, and all workspace-scoped resources. Soft delete does not apply to the `Workspace` model.
- Unique-constrained columns on soft-deletable tables must use partial unique indexes (`WHERE deleted_at IS NULL`) defined in raw SQL migrations, not in the Prisma schema DSL.
- A Prisma Client Extension must enforce the `deletedAt: null` filter globally so it cannot be accidentally omitted at the repository layer.

### 8. Data Model — Primary Keys

All tables use UUID v7 primary keys generated in application code (Node.js `uuidv7` package). UUID v7 is time-ordered, which preserves B-tree index locality on insert and avoids the page-split fragmentation of random UUID v4.

- IDs are generated in the application layer (not by the database) using the `uuidv7` package, then passed into the Prisma `create` call. Prisma models declare `id String @id` with no `@default`.
- Foreign keys referencing these IDs are typed `String` in Prisma.
- No auto-increment integer IDs anywhere. UUID v7 is the single ID strategy across all tables.

---

## Coding Conventions

### TypeScript
- Strict mode enabled everywhere
- No `any` types — use `unknown` and narrow, or define proper types
- All async functions return explicit Promise types
- Prefer `interface` over `type` for object shapes; use `type` for unions and aliases

### Backend (Fastify / API)
- All routes are in `apps/api/src/routes/`, one file per resource (e.g., `auth.ts`, `projects.ts`)
- Routes are registered via the Fastify plugin pattern — each route file exports a Fastify plugin
- Business logic lives in `apps/api/src/services/`, not in route handlers
- Database access lives in `apps/api/src/repositories/`, not in services directly
- All request bodies are validated with Zod schemas defined at the top of each route file
- Error responses always follow the shape: `{ error: string, code?: string }`
- Never expose internal error messages to the client — log the full error, return a safe message

### Frontend (React / Vite)
- Components live in `apps/web/src/components/`
- One component per file; file name matches component name (PascalCase)
- All API calls go through the centralised API client in `apps/web/src/lib/api.ts`
- Server state is managed with TanStack Query — no manual `useEffect` + `fetch` patterns
- Form state is managed with TanStack Form — no uncontrolled form patterns
- All MUI components use the theme defined in `apps/web/src/lib/theme.ts`

### Database / Prisma
- All Prisma queries go through repositories in `apps/api/src/repositories/`
- No raw SQL unless performance profiling shows it is necessary
- All models include `createdAt` and `updatedAt` timestamps
- Multi-tenancy is enforced at the repository layer — every query touching tenant data
  must include a `workspaceId` filter

### Testing
- Unit tests live next to the code they test: `auth.service.test.ts` next to `auth.service.ts`
- Integration tests live in `apps/api/src/routes/__tests__/`
- E2E tests live in `apps/web/e2e/`
- Every new API endpoint requires at minimum: success case, validation failure, unauthorised access
- Test data is managed with a factory pattern — no hardcoded IDs or magic strings in tests

## Non-Negotiables

- Never commit secrets, API keys, or credentials — use environment variables
- Never skip input validation on API endpoints
- Never trust client-supplied `workspaceId` — always derive from the authenticated session
- All database-mutating operations touching multiple tables must be wrapped in transactions

## Claude Code Configuration

Everything inside `.claude/` is committed to git and treated as team configuration, with one exception: `settings.local.json` is gitignored because it holds personal overrides (model preference, personal allow rules, editor integration settings) that should not be imposed on other developers.

Committed `.claude/` contents:
- `settings.json` — shared allow/deny rules and project-level Claude Code configuration
- `specs/` — feature and structure specifications loaded as context
- `skills/` — reusable slash commands available to the whole team

New files added to `.claude/` — specs, skills, hooks, or commands — go through PR review. They are team configuration, not personal tooling.