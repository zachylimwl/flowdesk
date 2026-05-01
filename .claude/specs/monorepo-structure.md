# FlowDesk — Monorepo Structure Specification

This document is the authoritative navigation reference for the FlowDesk codebase.
When deciding where a new file belongs, consult the decision table at the end of this document first.

---

## Full Directory Tree

```
flowdesk/
├── .claude/
│   ├── settings.json
│   ├── settings.local.json
│   ├── specs/
│   │   └── workspace-management.md
│   └── skills/
├── apps/
│   ├── web/
│   │   ├── e2e/
│   │   │   ├── fixtures/
│   │   │   │   ├── auth.fixture.ts
│   │   │   │   └── workspace.fixture.ts
│   │   │   ├── auth.spec.ts
│   │   │   ├── workspaces.spec.ts
│   │   │   └── members.spec.ts
│   │   ├── public/
│   │   │   └── favicon.ico
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── __root.tsx
│   │   │   │   ├── index.tsx
│   │   │   │   ├── _auth.tsx
│   │   │   │   ├── _auth/
│   │   │   │   │   ├── login.tsx
│   │   │   │   │   ├── register.tsx
│   │   │   │   │   └── invitations.$token.tsx
│   │   │   │   ├── _app.tsx
│   │   │   │   └── _app/
│   │   │   │       ├── workspaces.tsx
│   │   │   │       └── workspaces.$workspaceId/
│   │   │   │           ├── index.tsx
│   │   │   │           ├── settings.tsx
│   │   │   │           ├── members.tsx
│   │   │   │           └── projects/
│   │   │   │               ├── index.tsx
│   │   │   │               └── $projectId.tsx
│   │   │   ├── pages/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── RegisterPage.tsx
│   │   │   │   ├── AcceptInvitationPage.tsx
│   │   │   │   ├── WorkspaceListPage.tsx
│   │   │   │   ├── WorkspacePage.tsx
│   │   │   │   ├── WorkspaceSettingsPage.tsx
│   │   │   │   ├── MembersPage.tsx
│   │   │   │   ├── ProjectListPage.tsx
│   │   │   │   └── ProjectPage.tsx
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── LoginForm.tsx
│   │   │   │   │   │   └── RegisterForm.tsx
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   └── useAuthMutations.ts
│   │   │   │   │   └── queries.ts
│   │   │   │   ├── workspaces/
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── WorkspaceCard.tsx
│   │   │   │   │   │   ├── WorkspaceList.tsx
│   │   │   │   │   │   ├── CreateWorkspaceModal.tsx
│   │   │   │   │   │   ├── WorkspaceNameForm.tsx
│   │   │   │   │   │   ├── WorkspaceSlugForm.tsx
│   │   │   │   │   │   └── DeleteWorkspaceDialog.tsx
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   └── useWorkspaceMutations.ts
│   │   │   │   │   └── queries.ts
│   │   │   │   ├── members/
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── MemberList.tsx
│   │   │   │   │   │   ├── MemberRow.tsx
│   │   │   │   │   │   ├── RoleSelect.tsx
│   │   │   │   │   │   ├── InviteMemberForm.tsx
│   │   │   │   │   │   ├── PendingInvitationList.tsx
│   │   │   │   │   │   └── PendingInvitationRow.tsx
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   └── useMemberMutations.ts
│   │   │   │   │   └── queries.ts
│   │   │   │   ├── projects/
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── ProjectList.tsx
│   │   │   │   │   │   ├── ProjectCard.tsx
│   │   │   │   │   │   └── CreateProjectForm.tsx
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   └── useProjectMutations.ts
│   │   │   │   │   └── queries.ts
│   │   │   │   └── tasks/
│   │   │   │       ├── components/
│   │   │   │       │   ├── TaskList.tsx
│   │   │   │       │   ├── TaskCard.tsx
│   │   │   │       │   ├── TaskDetailPanel.tsx
│   │   │   │       │   ├── TaskStatusBadge.tsx
│   │   │   │       │   └── CreateTaskForm.tsx
│   │   │   │       ├── hooks/
│   │   │   │       │   └── useTaskMutations.ts
│   │   │   │       └── queries.ts
│   │   │   ├── components/
│   │   │   │   ├── AppShell.tsx
│   │   │   │   ├── WorkspaceSidebar.tsx
│   │   │   │   ├── UserMenu.tsx
│   │   │   │   ├── ConfirmDialog.tsx
│   │   │   │   ├── EmptyState.tsx
│   │   │   │   ├── ErrorBoundary.tsx
│   │   │   │   └── PageSpinner.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useCurrentUser.ts
│   │   │   │   └── useCurrentWorkspace.ts
│   │   │   ├── lib/
│   │   │   │   ├── api.ts
│   │   │   │   ├── queryClient.ts
│   │   │   │   ├── queryKeys.ts
│   │   │   │   └── constants.ts
│   │   │   ├── theme/
│   │   │   │   ├── index.ts
│   │   │   │   ├── palette.ts
│   │   │   │   └── typography.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   ├── routeTree.gen.ts
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── tsconfig.node.json
│   │   ├── playwright.config.ts
│   │   ├── CLAUDE.md
│   │   └── package.json
│   │
│   └── api/
│       ├── src/
│       │   ├── routes/
│       │   │   ├── __tests__/
│       │   │   │   ├── auth.test.ts
│       │   │   │   ├── workspaces.test.ts
│       │   │   │   ├── members.test.ts
│       │   │   │   ├── invitations.test.ts
│       │   │   │   └── projects.test.ts
│       │   │   ├── auth.ts
│       │   │   ├── workspaces.ts
│       │   │   ├── members.ts
│       │   │   ├── invitations.ts
│       │   │   ├── projects.ts
│       │   │   └── tasks.ts
│       │   ├── services/
│       │   │   ├── auth.service.ts
│       │   │   ├── auth.service.test.ts
│       │   │   ├── workspace.service.ts
│       │   │   ├── workspace.service.test.ts
│       │   │   ├── member.service.ts
│       │   │   ├── member.service.test.ts
│       │   │   ├── invitation.service.ts
│       │   │   ├── invitation.service.test.ts
│       │   │   ├── project.service.ts
│       │   │   ├── project.service.test.ts
│       │   │   ├── task.service.ts
│       │   │   └── task.service.test.ts
│       │   ├── repositories/
│       │   │   ├── user.repository.ts
│       │   │   ├── workspace.repository.ts
│       │   │   ├── member.repository.ts
│       │   │   ├── invitation.repository.ts
│       │   │   ├── project.repository.ts
│       │   │   └── task.repository.ts
│       │   ├── middleware/
│       │   │   ├── authenticate.ts
│       │   │   ├── verifyWorkspaceMember.ts
│       │   │   └── requestLogger.ts
│       │   ├── plugins/
│       │   │   ├── cors.ts
│       │   │   ├── errorHandler.ts
│       │   │   ├── helmet.ts
│       │   │   ├── rateLimit.ts
│       │   │   └── sensible.ts
│       │   ├── lib/
│       │   │   ├── prisma.ts
│       │   │   ├── redis.ts
│       │   │   ├── jwt.ts
│       │   │   ├── token.ts
│       │   │   └── errors.ts
│       │   ├── types/
│       │   │   ├── fastify.d.ts
│       │   │   └── index.ts
│       │   ├── openapi.ts
│       │   └── app.ts
│       ├── CLAUDE.md
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       └── package.json
│
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── types/
│       │   │   ├── user.ts
│       │   │   ├── workspace.ts
│       │   │   ├── member.ts
│       │   │   ├── invitation.ts
│       │   │   ├── project.ts
│       │   │   └── task.ts
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
│
├── prisma/
│   ├── migrations/
│   │   └── 20260501000000_init/
│   │       └── migration.sql
│   ├── schema.prisma
│   └── seed.ts
│
├── docs/
│   └── adr/
│       ├── ADR-template.md
│       ├── ADR-001-multi-tenant-data-isolation.md
│       └── ADR-002-authentication-token-strategy.md
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── docker-compose.yml
├── .env.example
├── .gitignore
├── CLAUDE.md
├── package.json
└── pnpm-workspace.yaml
```

---

## Directory Descriptions

### Root

| Directory / File | What belongs here | What does not |
|---|---|---|
| `CLAUDE.md` | Project-wide conventions, tech stack, architectural decisions, non-negotiables | App-specific or layer-specific conventions (those live in per-app CLAUDE.md files) |
| `docker-compose.yml` | PostgreSQL and Redis service definitions for local development | Application code, secrets, production infrastructure |
| `.env.example` | Every environment variable the app requires, with placeholder values | Real secrets or credentials (use `.env.local`, gitignored) |
| `prisma/` | Prisma schema, migration history, and seed script | Application code, business logic, or query functions |
| `docs/adr/` | Architecture Decision Records following the ADR template | Implementation guides, API docs, or changelogs |
| `packages/shared/` | TypeScript types and pure utilities needed by both `apps/web` and `apps/api` | Framework-specific code, React components, or Fastify types |

---

### apps/web/src/

| Directory | What belongs here | What does not |
|---|---|---|
| `routes/` | TanStack Router file-based route definitions — `createFileRoute` calls, loaders, and search param declarations | JSX markup, business logic, or data fetching logic (those belong in `pages/` or `features/`) |
| `pages/` | Full page-level React components that route files render — own their layout, compose feature components | Route configuration, loaders, or TanStack Router API calls |
| `features/<name>/components/` | React components used exclusively by one feature | Components reused across two or more features (promote to `src/components/`) |
| `features/<name>/hooks/` | Custom React hooks scoped to one feature | Hooks used by more than one feature (promote to `src/hooks/`) |
| `features/<name>/queries.ts` | `queryOptions()` definitions for this feature — query keys, query functions, stale times | Mutation logic (put in feature hooks), shared query keys (put in `lib/queryKeys.ts`) |
| `components/` | Shared UI components used by two or more features | Feature-specific components or page-level layout wrappers |
| `hooks/` | Shared custom hooks used by two or more features | Single-feature hooks or hooks that contain API call logic directly |
| `lib/api.ts` | Axios instance configuration and typed request helper functions | TanStack Query hook definitions or component code |
| `lib/queryClient.ts` | TanStack Query client instance and global default configuration | Query key definitions or query functions |
| `lib/queryKeys.ts` | The single query key factory for the entire frontend — all keys live here | Query functions or any React component/hook code |
| `theme/` | MUI `createTheme()` configuration — palette, typography, component overrides | Styling applied at the component level via `sx` props |
| `types/` | Frontend-only TypeScript interfaces and type aliases not shared with the backend | Types that the API layer also uses (those belong in `packages/shared/`) |
| `routeTree.gen.ts` | Auto-generated by TanStack Router's Vite plugin | Nothing — never edit by hand |

---

### apps/api/src/

| Directory | What belongs here | What does not |
|---|---|---|
| `routes/` | Fastify plugin exports containing route definitions and their Zod request schemas | Business logic, Prisma calls, or Redis access — call a service instead |
| `routes/__tests__/` | Integration tests that mount the Fastify app and make HTTP requests against it | Unit tests for services or repositories (those live next to their source file) |
| `services/` | Business logic: permission checks, orchestration of repository calls, Redis reads/writes | Prisma client calls (use repositories), HTTP request/response concerns |
| `repositories/` | Prisma query functions, one file per model | Business logic, conditional branching beyond query construction, or Redis access |
| `middleware/` | Fastify `preHandler` hooks registered selectively on route groups (`authenticate`, `verifyWorkspaceMember`) | Plugins registered globally at startup (those belong in `plugins/`) |
| `plugins/` | Fastify plugins registered once at startup that decorate the instance or add cross-cutting behaviour (cors, helmet, errorHandler) | Per-request logic or route definitions |
| `lib/prisma.ts` | Prisma client singleton and the soft-delete Client Extension | Query functions (those belong in repositories) |
| `lib/redis.ts` | Redis client singleton and typed helper wrappers | Business logic that uses Redis — that belongs in services |
| `lib/jwt.ts` | JWT sign and verify utility functions | Token storage or session management (that belongs in `lib/token.ts`) |
| `lib/token.ts` | Refresh token generation, Redis storage, and revocation helpers | Access token logic (that belongs in `lib/jwt.ts`) |
| `lib/errors.ts` | `AppError` base class and all typed subclasses (`NotFoundError`, `ForbiddenError`, etc.) | Error formatting or HTTP response logic (that belongs in `plugins/errorHandler.ts`) |
| `types/fastify.d.ts` | Module augmentation that extends `FastifyRequest` with `user` and `member` decorators | Runtime code or Zod schemas |
| `types/index.ts` | API-layer TypeScript types not shared with the frontend | Types needed by the frontend (those belong in `packages/shared/`) |
| `openapi.ts` | The OpenAPI contract definition for the entire API | Route handler implementations |

---

## Naming Conventions

### API Route Files (`apps/api/src/routes/`)
- Named after the resource in lowercase plural: `workspaces.ts`, `members.ts`, `invitations.ts`, `tasks.ts`
- One file per top-level resource. Nested resources that only make sense in the context of a parent live in the parent's file (e.g., workspace member routes live in `members.ts`, not a separate `workspace-members.ts`)

### Service Files (`apps/api/src/services/`)
- `{resource}.service.ts` — singular, lowercase, dot-separated: `workspace.service.ts`, `invitation.service.ts`
- Unit test co-located: `{resource}.service.test.ts`

### Repository Files (`apps/api/src/repositories/`)
- `{model}.repository.ts` — matches the Prisma model name, singular, lowercase: `workspace.repository.ts`, `member.repository.ts`
- No test files in repositories — repository behaviour is covered by service integration tests

### React Components (`apps/web/src/`)
- PascalCase, one component per file, file name matches the exported component name exactly: `WorkspaceCard.tsx`, `DeleteWorkspaceDialog.tsx`
- Page components are suffixed `Page`: `WorkspaceSettingsPage.tsx`
- Modal components are suffixed `Modal`: `CreateWorkspaceModal.tsx`
- Dialog components (confirmation, destructive actions) are suffixed `Dialog`: `DeleteWorkspaceDialog.tsx`
- Form components are suffixed `Form`: `InviteMemberForm.tsx`

### Custom Hooks (`apps/web/src/`)
- camelCase, prefixed with `use`, file name matches the exported hook: `useWorkspaceMutations.ts`, `useCurrentUser.ts`
- Mutation hooks are suffixed `Mutations`: `useWorkspaceMutations.ts`, `useMemberMutations.ts`

### TanStack Router Route Files (`apps/web/src/routes/`)
- Root layout: `__root.tsx`
- Pathless layout groups (no URL segment): `_auth.tsx`, `_app.tsx`
- Index routes: `index.tsx`
- Dynamic segments: `$paramName.tsx` — e.g., `$workspaceId.tsx`, `$projectId.tsx`
- Directories for nested routes match the parent segment name: `_app/workspaces.$workspaceId/`

### Feature Module Directories (`apps/web/src/features/`)
- Lowercase, no hyphens, matches the domain noun: `workspaces/`, `members/`, `tasks/`
- Always contain three subdirectories: `components/`, `hooks/`, and a `queries.ts` file

---

## Import Rules

### Backend (`apps/api/`)

```
routes → services → repositories → lib/prisma
                  → lib/redis
                  → lib/errors
routes → lib/errors (for error classes in schemas)
plugins → lib/errors
middleware → lib/jwt
middleware → repositories (verifyWorkspaceMember reads WorkspaceMember)
All layers → packages/shared (types only)
```

- Route handlers import services. They do not import repositories or `lib/prisma` directly.
- Services import repositories and `lib/` utilities. They do not import from `routes/` or `plugins/`.
- Repositories import `lib/prisma` only. They do not import services, other repositories, or Redis.
- Services do not import other services. Shared logic belongs in a repository method or a `lib/` utility.
- Middleware imports `lib/` utilities and, where necessary, specific repository functions. It does not import services.

### Frontend (`apps/web/`)

```
routes → pages
routes → lib/queryClient (for loaders)
pages → features/{name}/components
pages → components (shared)
pages → features/{name}/hooks
pages → hooks (shared)
features/{name}/* → features/{name}/* (within same feature only)
features/{name}/* → components (shared)
features/{name}/* → hooks (shared)
features/{name}/* → lib/
features/{name}/queries.ts → lib/queryKeys
All frontend → packages/shared (types only)
```

- A feature module may not import from another feature module's directory. If a component or hook is needed by two features, it must be promoted to `src/components/` or `src/hooks/` first.
- No frontend code imports from `apps/api/`. The only shared code between apps is in `packages/shared/`.
- Route files do not import feature components directly — they import page components, which compose feature components.

### Cross-Package

- `apps/web` and `apps/api` may both import from `packages/shared`.
- `packages/shared` does not import from `apps/web` or `apps/api`.
- `apps/web` does not import from `apps/api` and vice versa.

---

## What Goes Where — Decision Table

| Artefact | Location |
|---|---|
| TypeScript type used by both frontend and backend | `packages/shared/src/types/{domain}.ts` |
| TypeScript type used only by the API layer | `apps/api/src/types/index.ts` |
| TypeScript type used only by the frontend | `apps/web/src/types/index.ts` |
| Zod schema for an API request body | Top of `apps/api/src/routes/{resource}.ts`, above the plugin export |
| Fastify request decorator type (`request.user`, `request.member`) | `apps/api/src/types/fastify.d.ts` |
| Prisma query function | `apps/api/src/repositories/{model}.repository.ts` |
| Business rule or permission check | `apps/api/src/services/{resource}.service.ts` |
| Typed error class (e.g., `ForbiddenError`) | `apps/api/src/lib/errors.ts` |
| Redis read/write in a business flow | `apps/api/src/services/{resource}.service.ts` (via `lib/redis`) |
| Redis client singleton | `apps/api/src/lib/redis.ts` |
| JWT sign/verify helper | `apps/api/src/lib/jwt.ts` |
| Refresh token generation and revocation | `apps/api/src/lib/token.ts` |
| Per-request auth hook | `apps/api/src/middleware/authenticate.ts` |
| Fastify plugin registered at startup | `apps/api/src/plugins/{name}.ts` |
| Global HTTP error-to-response mapping | `apps/api/src/plugins/errorHandler.ts` |
| OpenAPI contract | `apps/api/src/openapi.ts` |
| API integration test | `apps/api/src/routes/__tests__/{resource}.test.ts` |
| Service unit test | Next to the service file: `{resource}.service.test.ts` |
| TanStack Query key | `apps/web/src/lib/queryKeys.ts` — never inline |
| TanStack Query options definition (`queryOptions()`) | `apps/web/src/features/{feature}/queries.ts` |
| Axios instance and request helpers | `apps/web/src/lib/api.ts` |
| TanStack Query client instance | `apps/web/src/lib/queryClient.ts` |
| React component used by exactly one feature | `apps/web/src/features/{feature}/components/{ComponentName}.tsx` |
| React component used by two or more features | `apps/web/src/components/{ComponentName}.tsx` |
| Custom hook used by exactly one feature | `apps/web/src/features/{feature}/hooks/{useHookName}.ts` |
| Custom hook used by two or more features | `apps/web/src/hooks/{useHookName}.ts` |
| Full page-level React component | `apps/web/src/pages/{Name}Page.tsx` |
| TanStack Router route definition | `apps/web/src/routes/{path}.tsx` |
| MUI theme token or component override | `apps/web/src/theme/index.ts` |
| Playwright E2E test | `apps/web/e2e/{feature}.spec.ts` |
| Playwright fixture | `apps/web/e2e/fixtures/{name}.fixture.ts` |
| Prisma schema | `prisma/schema.prisma` |
| Database migration | `prisma/migrations/` (generated by `prisma migrate dev`) |
| Database seed script | `prisma/seed.ts` |
| Architecture Decision Record | `docs/adr/ADR-{NNN}-{slug}.md` — use `ADR-template.md` |
| Environment variable declaration | `.env.example` (placeholder values only, committed) |
| Local environment overrides | `.env` or `.env.local` (gitignored, never committed) |
