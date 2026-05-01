# FlowDesk API — Backend Conventions

This file covers backend-specific conventions for `apps/api/`. The root `CLAUDE.md` governs
the tech stack, multi-tenancy rules, and cross-cutting non-negotiables. Read it first.

---

## Project Structure

```
apps/api/src/
├── routes/             # Fastify route handlers — one file per resource
├── services/           # Business logic — one file per domain
├── repositories/       # Data access — one file per Prisma model
├── plugins/            # Fastify plugins (registered on the app instance)
│   ├── auth.ts         # JWT verification decorator + preHandler hook
│   ├── errorHandler.ts # Global error-to-response formatter
│   └── sensible.ts     # fastify-sensible (HTTP helpers)
├── middleware/         # Reusable preHandler/onRequest hooks (not full plugins)
├── lib/
│   ├── prisma.ts       # Prisma client singleton
│   ├── redis.ts        # Redis client singleton and typed helpers
│   ├── jwt.ts          # JWT sign/verify utilities
│   └── errors.ts       # Typed AppError classes
└── types/
    ├── fastify.d.ts    # Module augmentation for fastify decorators
    └── index.ts        # Backend-only TypeScript types
```

---

## Route Handler Pattern

Route files live in `src/routes/`, one file per resource (e.g. `workspaces.ts`, `members.ts`).
Each file exports a single Fastify plugin using the plugin pattern:

```ts
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

const workspacesRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.post('/', { schema: { body: CreateWorkspaceSchema } }, async (request, reply) => {
    const workspace = await workspaceService.create(
      request.user.userId,
      request.body,
    )
    return reply.code(201).send(workspace)
  })
}

export default workspacesRoutes
```

Register all route plugins in `src/app.ts` with a versioned prefix:
`fastify.register(workspacesRoutes, { prefix: '/api/v1/workspaces' })`

### What a route handler owns

- Parsing and validating the request (via Zod schema — see below).
- Extracting identity from `request.user` (set by the auth plugin).
- Calling exactly one service method.
- Sending the response with the correct HTTP status code.

### What a route handler does not own

- Business logic of any kind.
- Direct Prisma or Redis calls.
- Constructing error messages — throw from the service, let the error handler format it.
- Any conditional logic beyond "did the service throw?"

### Request Validation

Define all Zod schemas at the top of the route file, above the plugin. Never inline schema
definitions inside the handler. Use `fastify-type-provider-zod` so that `request.body`,
`request.params`, and `request.query` are fully typed from the schema.

```ts
const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(50),
})
```

---

## Repository Pattern

Repositories live in `src/repositories/`, one file per Prisma model (e.g.
`workspace.repository.ts`, `member.repository.ts`).

### Responsibilities

A repository method contains exactly one thing: a Prisma query or a set of queries that
must be atomic. No conditional logic, no business rules, no Redis calls.

### Signature rules

- Every method that touches workspace-scoped data takes `workspaceId: string` as an explicit
  parameter — never derived inside the repository.
- Methods that accept a Prisma transaction client take it as an optional last parameter typed
  as `Prisma.TransactionClient`.

```ts
export async function findWorkspaceById(
  id: string,
  workspaceId: string,
  tx?: Prisma.TransactionClient,
): Promise<Workspace | null> {
  const client = tx ?? prisma
  return client.workspace.findFirst({ where: { id, workspaceId } })
}
```

### Method naming

| Operation | Naming convention |
|---|---|
| Fetch one, may not exist | `findById`, `findBySlug`, `findByEmail` |
| Fetch one, must exist | `getById`, `getBySlug` (throws if null) |
| Fetch many | `findManyByWorkspace`, `findPendingInvitations` |
| Create | `createWorkspace`, `createMember` |
| Update | `updateWorkspace`, `updateMemberRole` |
| Delete | `deleteWorkspace`, `deleteMember` |

`get*` methods throw a `NotFoundError` (from `lib/errors.ts`) when the record does not
exist. `find*` methods return `null`. Choose based on whether absence is an error or an
expected state in the calling service.

---

## Service Pattern

Services live in `src/services/`, one file per domain (e.g. `workspace.service.ts`,
`invitation.service.ts`). A service is the only layer allowed to contain business logic.

### Responsibilities

- Enforce business rules (role checks, sole-Owner constraint, slug uniqueness logic).
- Orchestrate repository calls, including wrapping multi-step mutations in transactions.
- Read from and write to Redis for session and cache operations.
- Throw typed `AppError` instances when a rule is violated.

### Accessing dependencies

Inject `prisma`, `redis`, and repository functions via import — do not instantiate clients
inside service methods. Services access repositories through their exported functions, never
through `prisma` directly.

```ts
import { findWorkspaceById, updateWorkspace } from '../repositories/workspace.repository'
import { redis } from '../lib/redis'

export async function renameWorkspace(
  workspaceId: string,
  actorId: string,
  name: string,
): Promise<Workspace> {
  const member = await getMemberOrThrow(actorId, workspaceId)
  assertCanEditName(member.role)
  return updateWorkspace(workspaceId, { name: name.trim() })
}
```

### Throwing errors

Always throw instances of the typed error classes from `lib/errors.ts`. Never throw plain
`Error` or strings from a service. The global error handler maps these to HTTP responses:

```ts
// lib/errors.ts shapes
throw new NotFoundError('Workspace not found.')
throw new ForbiddenError('Only the workspace Owner can change the slug.')
throw new ConflictError('This slug is already taken. Please choose a different one.')
throw new ValidationError('Name cannot be empty.')
```

Each `AppError` subclass has a fixed HTTP status. Add `code` string overrides only when the
frontend needs to branch on the error type programmatically (not just for display).

---

## Prisma Conventions

### Transactions

Wrap every operation that writes to more than one table in `prisma.$transaction()`.
Do not make multiple sequential `await prisma.x.create()` calls without a transaction —
a failure between them leaves the database in a partial state.

```ts
await prisma.$transaction(async (tx) => {
  const workspace = await createWorkspace({ name, slug }, tx)
  await createMember({ workspaceId: workspace.id, userId, role: 'OWNER' }, tx)
})
```

Pass the transaction client through to repository methods as the last argument (see
Repository Pattern above).

### Eager Loading

Define which relations to include at the repository call site using `include` or `select`.
Never add an `include` inside a loop — this produces N+1 queries.

If a service method needs a workspace with its members, define a dedicated repository
method that fetches both in one query:

```ts
// Correct — one query
export async function getWorkspaceWithMembers(id: string) {
  return prisma.workspace.findUniqueOrThrow({
    where: { id },
    include: { members: { include: { user: true } } },
  })
}

// Wrong — N+1
const workspace = await getWorkspaceById(id)
const members = await Promise.all(
  workspace.memberIds.map((mid) => getMemberById(mid)),
)
```

Use `select` to limit returned fields when the caller only needs a subset of columns and
the table has large or sensitive fields (e.g. password hashes, blobs).

### Avoiding Raw SQL

Use raw SQL (`$queryRaw`, `$executeRaw`) only when Prisma's query builder cannot express
the required query and you have confirmed this with a profiling result. Every raw SQL call
must have a comment explaining why Prisma cannot handle it. Raw SQL still requires a
`workspaceId` filter where applicable.

---

## Error Handling

### Error Classes (`src/lib/errors.ts`)

Define one `AppError` base class and one subclass per HTTP status used:

| Class | HTTP Status |
|---|---|
| `NotFoundError` | 404 |
| `ForbiddenError` | 403 |
| `ConflictError` | 409 |
| `ValidationError` | 422 |
| `GoneError` | 410 |
| `BadRequestError` | 400 |
| `UnauthorizedError` | 401 |

### Global Error Handler (`src/plugins/errorHandler.ts`)

The error handler plugin catches all errors and formats them:

- If the error is an `AppError` instance: respond with its `statusCode`, `message` as
  `error`, and `code` if present.
- If the error is a Zod validation error (from the type provider): respond `422` with
  field-level messages.
- If the error is a Prisma `P2002` (unique constraint): respond `409` with a safe message.
- All other errors: log the full error at `error` level, respond `500` with
  `{ error: "An unexpected error occurred." }`. Never surface Prisma errors, stack traces,
  or internal messages to the client.

Never catch-and-rethrow errors in route handlers. Let all errors propagate to the global
handler. The only exception is when you need to add context before re-throwing:

```ts
try {
  await dangerousOp()
} catch (err) {
  fastify.log.error({ err, workspaceId }, 'dangerousOp failed')
  throw err  // re-throw, do not swallow
}
```

---

## Pino Logging Conventions

### Required Fields Per Log Entry

Every request log emitted by the auth preHandler or route handler must include:

| Field | Source |
|---|---|
| `requestId` | `request.id` (set by Fastify automatically) |
| `userId` | `request.user.userId` (after auth) |
| `workspaceId` | Route param or session-derived value, if applicable |
| `method` | `request.method` |
| `url` | `request.url` |

Fastify's built-in request/response logging covers `method`, `url`, `statusCode`, and
`responseTime` automatically. Do not re-log these manually; add only the fields above
that Fastify does not include by default.

### Log Level Guidance

| Level | When to use |
|---|---|
| `error` | Unexpected exceptions; Prisma errors; unhandled promise rejections |
| `warn` | Business rule violations that are notable but expected (e.g. expired token presented, rate limit would apply) |
| `info` | Significant state changes: workspace created, member removed, invitation accepted |
| `debug` | Branching decisions inside services, cache hit/miss, query parameter values — only useful during active debugging |

Do not log at `info` for every request — Fastify's access log handles that. Reserve `info`
for domain events that have business significance independent of HTTP traffic.

Never log credentials, tokens, raw password values, or PII beyond what is needed to
correlate a log entry to a user session (`userId` is acceptable; email is not).

---

## DO NOT

**Layering**
- Never make a Prisma or Redis call directly inside a route handler. Route handlers call services only.
- Never put business logic in a repository. Repositories contain Prisma queries only.
- Never call one service from another service to avoid circular dependencies — extract the shared logic into a repository method or a utility in `lib/`.

**Multi-tenancy**
- Never read `workspaceId` from `request.body` or `request.query`. Always derive it from `request.user` (session) or a validated URL path parameter that is then checked against the session's membership.
- Never write a repository method that queries workspace-scoped data without a `workspaceId` parameter.

**Database**
- Never use raw SQL without a comment explaining why Prisma cannot handle it.
- Never make multiple Prisma writes across tables outside of a `$transaction`.
- Never call a repository method inside a loop. Use a `findMany` with an `in` filter, or a batch operation.

**Errors**
- Never expose Prisma error messages, stack traces, or internal error details to the client.
- Never throw a plain `new Error()` from a service — use the typed `AppError` subclasses.
- Never swallow an error with an empty `catch` block.

**TypeScript**
- Never use `any`. Use `unknown` with narrowing, or define the correct type.
- Never use non-null assertions (`!`) without a comment explaining the invariant.
- Never use `as SomeType` to silence a type error — fix the type.

**Validation**
- Never skip Zod schema validation on a route that accepts user input.
- Never validate request data manually with `if` checks in a route handler — the Zod schema is the validation layer.
