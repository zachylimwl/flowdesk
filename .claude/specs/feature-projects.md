# Project Management — Feature Spec

## Overview

A project is the primary organisational container within a workspace, grouping related tasks under a single team or initiative. Projects are workspace-scoped — every project belongs to exactly one workspace — and carry their own membership layer (`ProjectMember`) that controls per-project visibility and role. Workspace Owners and Admins have workspace-level authority over all projects; regular Members and Viewers see only the projects they have been explicitly added to.

---

## User Stories

### Workspace Owner / Admin

- As a workspace Owner or Admin, I want to create a project with a name, slug, optional description, and optional colour so that work can be organised by team or initiative.
- As a workspace Owner or Admin, I want to see all projects in the workspace so that I have full visibility without needing to be a project member.
- As a workspace Owner or Admin, I want to add workspace members to a project and assign them a project role (Lead, Member, or Viewer) so that I can build the project team.
- As a workspace Owner or Admin, I want to update a project's name, slug, description, or colour so that project metadata stays accurate.
- As a workspace Owner or Admin, I want to delete a project so that abandoned work is no longer surfaced to the team.

### Workspace Member / Viewer

- As a workspace Member or Viewer, I want to see all projects I have been added to so that I can navigate to the work relevant to me.
- As a project member, I want to view project details and the project member list so that I understand the scope and team composition.

---

## Functional Requirements

### 1. Project Creation

- FR-1: Any workspace member with role `OWNER` or `ADMIN` may create a project.
- FR-2: Required fields: `name` and `slug`. Optional fields: `description`, `color`.
- FR-3: **Name:** 1–100 characters, any Unicode. Trimmed of leading/trailing whitespace before storage. Names are **not** required to be unique within a workspace — only slugs are unique.
- FR-4: **Slug:** lowercase alphanumeric characters and hyphens only (`^[a-z0-9-]{3,50}$`), 3–50 characters, must not start or end with a hyphen. Unique within the workspace among active (non-deleted) projects.
  - The `@@unique([workspaceId, slug])` constraint in the Prisma schema **must** be implemented as a partial unique index (`WHERE deleted_at IS NULL`) in the raw migration SQL, so that soft-deleted projects do not block slug reuse.
- FR-5: **Color:** optional, stored as a 7-character hex string (e.g. `"#3B82F6"`). Must match `^#[0-9A-Fa-f]{6}$`. Null if omitted.
- FR-6: **Description:** optional free text.
- FR-7: On successful creation, a `ProjectMember` record with role `LEAD` is automatically created for the creating user in the same transaction.
- FR-8: The API returns a `ProjectDetail` object (including the creator as a `LEAD` member) with HTTP `201`.

### 2. Project Visibility (Listing and Access)

- FR-9: Workspace `OWNER` and `ADMIN` can see **all** active projects in the workspace regardless of whether they are a `ProjectMember`.
- FR-10: Workspace `MEMBER` and `VIEWER` can only see projects where they have a corresponding `ProjectMember` record.
- FR-11: This visibility rule applies to `GET /workspaces/{workspaceId}/projects` (the listing endpoint) and to individual `GET /workspaces/{workspaceId}/projects/{projectId}` requests.
- FR-12: A workspace `MEMBER` or `VIEWER` attempting to fetch a project they are not a member of receives `404` (not `403`) — the project's existence is not revealed.

### 3. Project Listing

- FR-13: Returns all active projects visible to the caller according to the visibility rules in §2.
- FR-14: Each item in the response is a `ProjectSummary` object: `id`, `workspaceId`, `name`, `slug`, `description`, `color`, `taskCount` (count of active tasks, never `null` — zero if no tasks), and `createdAt`.
- FR-15: Results are sorted by `createdAt` ascending (oldest first) unless otherwise specified.
- FR-16: Pagination: see Open Questions §1 — the current API contract uses `page`/`pageSize`; the intended implementation is cursor-based.

### 4. Project Detail

- FR-17: Returns a `ProjectDetail` object, which extends `ProjectSummary` with `members` (array of `ProjectMember`) and `updatedAt`.
- FR-18: Any caller who can see the project (per §2 visibility rules) may fetch its detail and member list.

### 5. Project Update

- FR-19: Workspace `OWNER`, `ADMIN`, or project `LEAD` may update any combination of `name`, `slug`, `description`, and `color`.
- FR-20: Slug changes follow the same format and uniqueness rules as creation. Old slug URLs break immediately; no redirect is provided.
- FR-21: Name changes take effect immediately with no confirmation required.
- FR-22: The API returns the updated `ProjectDetail` on success.

### 6. Project Members — Adding

- FR-23: Workspace `OWNER`, `ADMIN`, or project `LEAD` may add a workspace member to a project and assign them a `ProjectRole` (`LEAD`, `MEMBER`, or `VIEWER`). Defaults to `MEMBER` if no role is specified.
- FR-24: The user being added must already be a workspace member (`WorkspaceMember` record must exist). Adding a user who is not a workspace member returns `404`.
- FR-25: Adding a user who is already a project member returns `409`.

### 7. Project Members — Role Changes

- FR-26: Workspace `OWNER`, `ADMIN`, or project `LEAD` may change an existing project member's role to any `ProjectRole`.
- FR-27: Role changes take effect immediately.

### 8. Project Members — Removal

- FR-28: Workspace `OWNER`, `ADMIN`, or project `LEAD` may remove any project member.
- FR-29: Removal is immediate. The removed member loses project visibility (if they are a workspace `MEMBER` or `VIEWER`) on their next request.

### 9. Project Deletion

- FR-30: Workspace `OWNER` or `ADMIN` may delete a project.
- FR-31: Deletion is a **soft delete**: `deletedAt` is set to the current timestamp. The project row is not removed.
- FR-32: All active tasks belonging to the project are also soft-deleted in the same transaction (`deletedAt` set). This cascade is handled at the service layer — the Prisma schema's `Task → Project` `onDelete: Cascade` only fires on a hard delete and does not cover soft deletion.
- FR-33: All subsequent API requests to the deleted project — via `GET`, `PATCH`, or `DELETE` — return `404`. The soft-deleted state is not surfaced to callers.
- FR-34: `ProjectMember` records are **not** deleted on project soft-deletion; they are retained so that if a project is later hard-deleted (via workspace cascade) the membership history is available.

---

## Acceptance Criteria

### Happy Path

**Project Creation**
- AC-1: Given a workspace `OWNER` or `ADMIN` submits a valid name and unique slug, the project is created, the creator is automatically added as project `LEAD`, and the API returns `201` with a `ProjectDetail` that includes the creator in the `members` array with role `LEAD`.
- AC-2: The created project immediately appears in the workspace Owner's and Admin's project list.

**Project Listing — Owner/Admin**
- AC-3: Given a workspace `OWNER` requests `GET /workspaces/{workspaceId}/projects`, all active projects in the workspace are returned regardless of whether the caller is a `ProjectMember` of each.

**Project Listing — Member/Viewer**
- AC-4: Given a workspace `MEMBER` requests the project list, only projects where they have a `ProjectMember` record are returned. Projects they are not a member of do not appear.

**Project Detail**
- AC-5: Given a project member requests `GET /workspaces/{workspaceId}/projects/{projectId}`, the response includes `ProjectDetail` with the full member list and `taskCount` reflecting the count of active (non-deleted) tasks.

**Project with Zero Tasks**
- AC-6: A project with no tasks returns `taskCount: 0` in both `ProjectSummary` and `ProjectDetail`. The field is never `null`.

**Project Update**
- AC-7: Given a workspace `ADMIN` updates the project name, the change takes effect immediately and the API returns `200` with the updated `ProjectDetail`.

**Add Project Member**
- AC-8: Given a workspace `OWNER` adds a workspace member with role `VIEWER`, the `ProjectMember` record is created and the API returns `201` with the new `ProjectMember` object.

**Project Deletion**
- AC-9: Given a workspace `OWNER` deletes a project, `deletedAt` is set on the project and all its active tasks in a single transaction. Subsequent requests to the project return `404`.

---

### Error Cases

**Project Creation**
- AC-10: Slug already taken by an active project in the workspace: `409` `{ error: "A project with that slug already exists in this workspace." }`
- AC-11: Slug fails format validation (uppercase, spaces, leading/trailing hyphens, too short/long, etc.): `422` with a field-level validation error describing the `^[a-z0-9-]{3,50}$` pattern requirement.
- AC-12: Color fails format validation (missing `#`, wrong length, non-hex characters): `422` with a field-level validation error.
- AC-13: Workspace `MEMBER` or `VIEWER` attempts to create a project: `403` `{ error: "You do not have permission to perform this action." }`
- AC-14: Name exceeds 100 characters or is empty after trimming: `422` with a field-level validation error.

**Project Update**
- AC-15: Updated slug conflicts with an existing active project in the workspace: `409` `{ error: "A project with that slug already exists in this workspace." }`
- AC-16: Caller is a workspace `MEMBER` or `VIEWER` (not project `LEAD`): `403`.

**Add Project Member**
- AC-17: Target user is not a workspace member: `404`.
- AC-18: Target user is already a project member: `409` `{ error: "This user is already a member of the project." }`
- AC-19: Caller lacks permission (workspace `MEMBER` or `VIEWER` who is not project `LEAD`): `403`.

**Project Deletion**
- AC-20: Caller is workspace `MEMBER` or `VIEWER`: `403`.
- AC-21: Project does not exist or is already soft-deleted: `404`.

---

### Edge Cases

**Workspace Admin with no ProjectMember record**
- AC-22: A workspace `ADMIN` who has never been added as a `ProjectMember` can still `GET` the project and its member list. Workspace-level role (`ADMIN`) overrides the project-level visibility restriction that applies to `MEMBER` and `VIEWER`.

**Slug reuse after soft delete**
- AC-23: A project is soft-deleted. A new project is created with the same slug. This succeeds because the unique index on `(workspaceId, slug)` is a partial index (`WHERE deleted_at IS NULL`), so the deleted record does not block the new one.

**Concurrent slug creation race condition**
- AC-24: Two workspace Admins simultaneously submit `POST /workspaces/{workspaceId}/projects` with the same slug. The database partial unique index rejects the second write. The API returns `409` to the losing request. No partial state is written.

**taskCount on listing vs. detail**
- AC-25: `taskCount` in `ProjectSummary` (returned by the listing endpoint) and in `ProjectDetail` both reflect only active (non-deleted) tasks. Soft-deleted tasks are excluded from the count.

**Project deleted while a member is mid-session**
- AC-26: A project member's current access token remains valid. Their next request to any project-scoped endpoint returns `404` because the project is soft-deleted. No forced session invalidation is required.

**Creator added to a project they then leave**
- AC-27: The creator of a project is a `ProjectMember` with role `LEAD`. If they are subsequently removed from the project (by an `OWNER` or `ADMIN`), they lose project-level access. A workspace `OWNER` or `ADMIN` can still see the project; a workspace `MEMBER` or `VIEWER` who was the creator cannot.

---

## Constraints and Non-Negotiables

- The `workspaceId` in the URL path (`/workspaces/{workspaceId}/projects`) must be verified server-side against the caller's `WorkspaceMember` records. The URL path value is **not** trusted on its own — it must be cross-checked against the session to prevent horizontal privilege escalation between workspaces.
- All project repository queries must include a `workspaceId` filter sourced from the verified session membership. `prisma.project.findFirst({ where: { id, workspaceId } })` is the required pattern; `prisma.project.findUnique({ where: { id } })` bypasses tenant isolation and is forbidden.
- Project names are not required to be unique within a workspace. Only the `slug` is unique (among active projects per the partial index).
- The `(workspaceId, slug)` unique constraint **must** be a partial unique index in the raw migration SQL (`WHERE deleted_at IS NULL`). The Prisma DSL `@@unique([workspaceId, slug])` is a placeholder only.
- Workspace `OWNER` and `ADMIN` have authority over all projects in their workspace without needing a `ProjectMember` record. Access control checks must query `WorkspaceMember` first; `ProjectMember` is checked only for workspace `MEMBER` and `VIEWER` callers.
- All database-mutating operations spanning multiple tables (project creation + ProjectMember record; project deletion + task cascade) must be wrapped in a single transaction.
- No `any` types in TypeScript. `Project`, `ProjectMember`, `ProjectSummary`, and `ProjectDetail` types must be defined in `packages/shared` and shared between `apps/api` and `apps/web`.

---

## Out of Scope (Phase 3)

- **Project archiving.** A separate archived state distinct from deletion — projects can only be deleted (soft delete), not archived.
- **Project templates.** No ability to create a project from a predefined structure.
- **Project-level settings.** No custom task statuses, custom fields, or per-project workflow configuration.
- **Bulk project operations.** No bulk create, bulk delete, or bulk member assignment.
- **Project transfer.** Moving a project from one workspace to another.
- **Project-level notification settings.** Per-project notification preferences are out of scope.
- **Project restore / un-delete.** Soft-deleted projects cannot be recovered. Deletion is final from the user's perspective.

---

## Open Questions

1. **Cursor-based vs. page/pageSize pagination.** The functional requirements specify cursor-based pagination for project listing, but the current OpenAPI contract for `GET /workspaces/{workspaceId}/projects` uses `page` and `pageSize` with a `PaginationMeta` response envelope. These are incompatible. Which approach should Phase 3 implement? The answer affects the API contract, the frontend query hook design (TanStack Query's `useInfiniteQuery` vs. `useQuery`), and the repository query pattern. This must be resolved before implementation begins.

2. **Project LEAD auto-assignment on creation.** The creator is automatically added as project `LEAD`. If the creator is a workspace `OWNER` or `ADMIN`, they already have workspace-level authority over the project. Should the `ProjectMember` record still be created for `OWNER`/`ADMIN` creators, or only for `MEMBER`/`VIEWER` creators who would otherwise lose visibility after creation? Keeping the record for all creators is simpler and more consistent; skipping it for `OWNER`/`ADMIN` avoids redundancy but adds branching logic.

3. **Member removal when the sole project LEAD is removed.** The spec does not restrict removing a project's last `LEAD`. If the sole `LEAD` is removed, no project `LEAD` remains — subsequent `LEAD`-required actions (updating the project from a project-level role) can only be performed by workspace `OWNER` or `ADMIN`. Is this acceptable, or should the API block removing the last `LEAD` (similar to the workspace sole-OWNER constraint)?

4. **Project visibility for workspace MEMBER/VIEWER after workspace role upgrade.** If a workspace `VIEWER` is promoted to `ADMIN`, should they immediately gain visibility into all projects (including those they were not a `ProjectMember` of)? The answer should be yes given the visibility rules in §2, but the implementation must ensure the visibility check re-evaluates the current `WorkspaceMember.role` on each request rather than caching it.

---

## References

### Prisma Models

- [`Project`](../../prisma/schema.prisma) — workspace-scoped; soft deleted (`deletedAt`); fields: `id`, `workspaceId`, `name`, `slug`, `description`, `color`, `createdById`, `createdAt`, `updatedAt`, `deletedAt`. Composite index `@@index([workspaceId, deletedAt])`. Slug unique constraint `@@unique([workspaceId, slug])` must become a partial index in the raw migration.
- [`ProjectMember`](../../prisma/schema.prisma) — junction between `User` and `Project`; carries `ProjectRole` (`LEAD`, `MEMBER`, `VIEWER`); `workspaceId` is denormalised for tenant-scoped queries. Compound unique on `(projectId, userId)`. Index on `(workspaceId, userId)`.

### API Paths (`docs/api/openapi.yaml`)

| Method | Path | Operation |
|--------|------|-----------|
| `GET` | `/workspaces/{workspaceId}/projects` | `listProjects` |
| `POST` | `/workspaces/{workspaceId}/projects` | `createProject` |
| `GET` | `/workspaces/{workspaceId}/projects/{projectId}` | `getProject` |
| `PATCH` | `/workspaces/{workspaceId}/projects/{projectId}` | `updateProject` |
| `DELETE` | `/workspaces/{workspaceId}/projects/{projectId}` | `deleteProject` |
| `GET` | `/workspaces/{workspaceId}/projects/{projectId}/members` | `listProjectMembers` |
| `POST` | `/workspaces/{workspaceId}/projects/{projectId}/members` | `addProjectMember` |
| `PATCH` | `/workspaces/{workspaceId}/projects/{projectId}/members/{userId}` | `updateProjectMember` |
| `DELETE` | `/workspaces/{workspaceId}/projects/{projectId}/members/{userId}` | `removeProjectMember` |

### ADRs

- [`docs/adr/ADR-001-multi-tenant-data-isolation.md`](../../docs/adr/ADR-001-multi-tenant-data-isolation.md) — `workspaceId` scoping rules, repository-layer enforcement, and the prohibition on `findUnique` for workspace-scoped records.
