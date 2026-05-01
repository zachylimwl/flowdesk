# ADR-001: Multi-Tenant Data Isolation Strategy

**Date:** 2026-05-01
**Status:** Accepted
**Deciders:** Engineering team

## Context

FlowDesk is a multi-tenant B2B SaaS platform where every resource — workspaces, projects, tasks, members — belongs to exactly one tenant. We needed to decide how to physically isolate tenant data in PostgreSQL before writing any schema or application code, because this decision affects every query, every migration, and every security boundary in the system.

The core constraint is the tech stack: we are using Prisma v5 as the ORM. Prisma operates against a single database connection and a single schema; it has no native support for switching schemas or databases per request. Any strategy that requires per-tenant schemas or per-tenant databases would need significant custom infrastructure built around Prisma's connection model, adding complexity before we have shipped anything.

The consequence of not deciding this upfront would be inconsistent isolation patterns across the codebase — some queries scoped by tenant, others not — which is both a correctness problem and a security problem that becomes progressively harder to audit as the codebase grows.

## Options Considered

### Option 1: Separate Database Per Tenant
Each workspace gets its own PostgreSQL database instance with its own connection string. The application maintains a routing table mapping workspace to connection and instantiates a Prisma client per database. This provides the strongest isolation boundary but requires managing a connection pool per tenant, running migrations against every database independently, and introduces fan-out complexity for any cross-tenant query (admin dashboards, billing). Operational cost scales linearly with tenant count.

### Option 2: Shared Database, Per-Tenant Schema
Each workspace gets its own PostgreSQL schema (e.g. `workspace_abc.projects`). Prisma would need dynamic `search_path` overrides per request, which breaks with connection poolers like PgBouncer and is unsupported in Prisma's standard connection model. PostgreSQL's own catalog performance degrades noticeably beyond ~1,000 schemas, which is a lower ceiling than the business problem we are solving for.

### Option 3: Shared Database, Shared Schema
All tenants share the same tables. Every workspace-scoped table carries a `workspaceId` foreign key column. Isolation is enforced at the application layer — every query against workspace-scoped data must include a `workspaceId` filter. This is the standard Prisma deployment model and requires no custom infrastructure. Migration to a partitioned or per-tenant model is possible later if warranted by scale, using PostgreSQL's declarative table partitioning without changing application query code.

## Decision

We use a shared database, shared schema, with a `workspaceId` column on every workspace-scoped table. This is the only option compatible with Prisma's native connection model, it is the industry-standard starting point for early-stage B2B SaaS, and it preserves a clean migration path to partitioned tables if tenant scale demands it.

## Consequences

**Positive:**
- Prisma Migrate works as designed — one migration run applies to all tenants simultaneously.
- Provisioning a new workspace is a single database insert with no infrastructure change.
- No connection pool explosion as tenant count grows.
- Operational tooling (backup, restore, monitoring) operates on one database with no per-tenant special cases.

**Negative / Trade-offs:**
- A missing `workspaceId` filter in any query is a silent multi-tenancy breach — no database-level boundary catches it.
- A single large tenant can cause index and buffer pool contention that degrades performance for all tenants.
- Per-tenant backup and point-in-time restore require extracting rows by `workspaceId`, which is operationally awkward.
- Cross-tenant admin queries (billing, analytics) share the same tables as tenant-scoped queries and must be carefully separated in the codebase to avoid the isolation model being silently bypassed.

**Mitigation:**
- Every repository method that touches workspace-scoped data takes `workspaceId` as an explicit parameter — it cannot be called without one. This is a coding convention enforced at code review and documented in `CLAUDE.md` and `apps/api/CLAUDE.md`.
- `findUnique` is banned on workspace-scoped records; `findFirst({ where: { id, workspaceId } })` is used instead, preventing the bypass that `findUnique` would allow.
- A Prisma Client Extension enforces `where: { deletedAt: null }` globally; a parallel extension for `workspaceId` filtering can be layered on top if convention-based enforcement proves insufficient.
- `workspaceId` is the leading column on every composite index for workspace-scoped tables, ensuring that large-tenant queries remain bounded to that tenant's pages and do not scan the full table.
- Admin and platform-scoped queries (intentionally unfiltered by `workspaceId`) are isolated to a separate repository layer with heightened code review requirements, so the intentional exceptions to the isolation model are structurally distinct from the accidental ones.
