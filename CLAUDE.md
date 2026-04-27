# FlowDesk — Project Spec for Claude Code

## What This Is

FlowDesk is a multi-tenant B2B SaaS project management platform. This is the project repository
for the Claude Code Mastery course. We are building FlowDesk from scratch to production.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite + TanStack Router + TanStack Query + TanStack Form + Material UI v6 |
| Backend | Node.js + Fastify v4 + Prisma v5 + PostgreSQL 15 + Redis 7 |
| Auth | JWT (access tokens, 15 min) + refresh tokens (7 days) + Redis session store |
| Testing | Vitest + Playwright + Testing Library |
| Observability | Pino structured logging + OpenTelemetry |
| CI/CD | GitHub Actions + Docker + Railway |

## Repository Structure

flowdesk/
├── apps/
│   ├── web/                    # React 19 frontend (Vite)
│   │   └── src/
│   │       ├── routes/         # TanStack Router route files
│   │       ├── components/     # Shared UI components (MUI-based)
│   │       ├── hooks/          # Custom React hooks
│   │       ├── lib/            # Utilities, API client, query keys
│   │       └── types/          # Shared frontend TypeScript types
│   └── api/                    # Fastify backend
│       └── src/
│           ├── routes/         # Fastify route handlers
│           ├── services/       # Business logic layer
│           ├── repositories/   # Data access layer (Prisma)
│           ├── middleware/      # Auth, error handling, logging
│           ├── lib/            # Shared utilities (Redis, JWT, etc.)
│           └── types/          # Shared backend TypeScript types
├── packages/
│   └── shared/                 # Types and utilities shared between apps
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Migration history
├── .claude/
│   ├── settings.json           # Claude Code configuration (committed)
│   ├── settings.local.json     # Personal overrides (gitignored)
│   └── skills/                 # Reusable Claude Code skills
└── docker-compose.yml          # Local development services

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