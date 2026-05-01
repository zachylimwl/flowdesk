# FlowDesk — Database Schema Specification

This document is the authoritative schema reference for the FlowDesk database. It defines every
entity, every field, all relationships, and the index strategy. The Prisma schema in
`prisma/schema.prisma` must match this document; when they diverge, this document governs.

---

## Cross-Cutting Rules

These rules apply to every entity in this document unless explicitly overridden.

| Rule | Detail |
|---|---|
| Primary key | `id String @id` — no `@default`. UUID v7 is generated in application code via the `uuidv7` package and passed into every `create` call. |
| Created timestamp | `createdAt DateTime @default(now())` on all tables. |
| Updated timestamp | `updatedAt DateTime @updatedAt` on all tables **except** append-only tables (AuditLog) and pure junction tables (WorkspaceMember, ProjectMember, TaskAssignee, TaskLabel). |
| Soft delete | `deletedAt DateTime?` on entities that support deletion. Omit on AuditLog, and junction tables. All queries against soft-deletable tables must include `where: { deletedAt: null }` unless intentionally querying deleted records. |
| Tenant column | `workspaceId String` + `workspace Workspace @relation(...)` on every workspace-scoped entity. `workspaceId` is always sourced from the authenticated session — never from a client-supplied value. |
| Unique partial indexes | Unique constraints on columns belonging to soft-deletable tables (e.g., `slug`, `name`) use partial unique indexes defined in raw SQL migrations (`WHERE deleted_at IS NULL`), not in the Prisma schema DSL. |
| No integer IDs | Auto-increment integer IDs are forbidden. UUID v7 is the single ID strategy. |

---

## Enums

### WorkspaceRole
Used by `WorkspaceMember.role`.

| Value | Description |
|---|---|
| `OWNER` | Full control; can delete the workspace. Exactly one per workspace. |
| `ADMIN` | Can manage members, projects, and workspace settings. |
| `MEMBER` | Can create and update tasks and projects they are assigned to. |
| `VIEWER` | Read-only access to workspace content. |

### ProjectRole
Used by `ProjectMember.role`.

| Value | Description |
|---|---|
| `LEAD` | Can manage project settings and all tasks within the project. |
| `MEMBER` | Can create and update tasks within the project. |
| `VIEWER` | Read-only access to the project and its tasks. |

### TaskStatus
Used by `Task.status`.

| Value |
|---|
| `BACKLOG` |
| `TODO` |
| `IN_PROGRESS` |
| `IN_REVIEW` |
| `DONE` |
| `CANCELLED` |

### TaskPriority
Used by `Task.priority`.

| Value |
|---|
| `URGENT` |
| `HIGH` |
| `MEDIUM` |
| `LOW` |
| `NONE` |

---

## Entities

---

### User

Global entity. Not workspace-scoped. A User may belong to many workspaces via `WorkspaceMember`.

#### Fields

| Field | Type | Nullable | Unique | Default | Notes |
|---|---|---|---|---|---|
| `id` | String | No | Yes (PK) | — | UUID v7, generated in app |
| `email` | String | No | Yes | — | Lowercased on write; used for login and invitations |
| `passwordHash` | String | No | No | — | bcrypt hash; never returned in API responses |
| `name` | String | No | No | — | Display name |
| `avatarUrl` | String | Yes | No | `null` | External URL or storage path |
| `emailVerifiedAt` | DateTime | Yes | No | `null` | Null means email is unverified |
| `createdAt` | DateTime | No | No | `now()` | |
| `updatedAt` | DateTime | No | No | auto | |
| `deletedAt` | DateTime | Yes | No | `null` | Soft delete; deactivated accounts |

#### Relationships

| Relation | Type | Target | Cascade |
|---|---|---|---|
| `memberships` | 1:N | WorkspaceMember | Restricted (workspace deletion cascades; direct user delete blocked if memberships exist) |
| `projectMemberships` | 1:N | ProjectMember | Restricted |
| `taskAssignments` | 1:N | TaskAssignee | Restricted |
| `comments` | 1:N | Comment | Restricted |
| `attachments` | 1:N | Attachment | Restricted |
| `refreshTokens` | 1:N | RefreshToken | Cascade delete |
| `auditLogs` | 1:N | AuditLog (as actor) | Set null on delete |

#### Business Rules

- `email` must be unique across all non-deleted users. Enforce as a partial unique index (`WHERE deleted_at IS NULL`).
- A deleted user's `email` must not block re-registration.

---

### Workspace

Top-level tenant container. Hard deleted — no `deletedAt`. When a Workspace is deleted, all child
records cascade.

#### Fields

| Field | Type | Nullable | Unique | Default | Notes |
|---|---|---|---|---|---|
| `id` | String | No | Yes (PK) | — | UUID v7 |
| `name` | String | No | No | — | Human-readable display name |
| `slug` | String | No | Yes | — | URL-safe identifier; globally unique |
| `logoUrl` | String | Yes | No | `null` | External URL or storage path |
| `createdAt` | DateTime | No | No | `now()` | |
| `updatedAt` | DateTime | No | No | auto | |

#### Relationships

| Relation | Type | Target | Cascade |
|---|---|---|---|
| `members` | 1:N | WorkspaceMember | Cascade delete |
| `invitations` | 1:N | WorkspaceInvite | Cascade delete |
| `projects` | 1:N | Project | Cascade delete |
| `labels` | 1:N | Label | Cascade delete |
| `apiTokens` | 1:N | ApiToken | Cascade delete |
| `webhooks` | 1:N | Webhook | Cascade delete |
| `auditLogs` | 1:N | AuditLog | Restrict |

#### Business Rules

- `slug` is globally unique, immutable after creation (changing it would break all existing URLs).
- Workspace deletion is hard — the row is removed and all cascades fire.

---

### WorkspaceMember

Junction table linking User to Workspace. Carries the user's role within that workspace.

#### Fields

| Field | Type | Nullable | Unique | Default | Notes |
|---|---|---|---|---|---|
| `id` | String | No | Yes (PK) | — | UUID v7 |
| `workspaceId` | String | No | No | — | FK → Workspace |
| `userId` | String | No | No | — | FK → User |
| `role` | WorkspaceRole | No | No | — | |
| `createdAt` | DateTime | No | No | `now()` | |
| `updatedAt` | DateTime | No | No | auto | |

#### Relationships

| Relation | Type | Target | Cascade |
|---|---|---|---|
| `workspace` | N:1 | Workspace | Cascade delete |
| `user` | N:1 | User | Restricted |

#### Business Rules

- Compound unique constraint on `(workspaceId, userId)` — a user has exactly one membership record per workspace.
- There must always be exactly one member with `role = OWNER` per workspace. This invariant is enforced at the service layer, not the database layer.
- The `verifyWorkspaceMember` preHandler resolves and decorates `request.member` from this table on every workspace-scoped request. Role is never encoded in the JWT.

---

### WorkspaceInvite

A pending invitation for a (possibly new) user to join a workspace.

#### Fields

| Field | Type | Nullable | Unique | Default | Notes |
|---|---|---|---|---|---|
| `id` | String | No | Yes (PK) | — | UUID v7 |
| `workspaceId` | String | No | No | — | FK → Workspace |
| `email` | String | No | No | — | Invitee's email address |
| `role` | WorkspaceRole | No | No | — | Role granted on acceptance |
| `token` | String | No | Yes | — | Secure random token; included in invite link |
| `invitedById` | String | No | No | — | FK → User; the member who sent the invite |
| `expiresAt` | DateTime | No | No | — | Invitations expire after 7 days |
| `acceptedAt` | DateTime | Yes | No | `null` | Set on acceptance; null means pending |
| `createdAt` | DateTime | No | No | `now()` | |
| `updatedAt` | DateTime | No | No | auto | |

#### Relationships

| Relation | Type | Target | Cascade |
|---|---|---|---|
| `workspace` | N:1 | Workspace | Cascade delete |
| `invitedBy` | N:1 | User | Restricted |

#### Business Rules

- A user may not have more than one pending (unaccepted, unexpired) invitation per workspace. Enforced at the service layer.
- `token` is a cryptographically random value; it is not derived from any user identifier.

---

### Project

A project groups tasks within a workspace. Workspace-scoped. Soft deleted.

#### Fields

| Field | Type | Nullable | Unique | Default | Notes |
|---|---|---|---|---|---|
| `id` | String | No | Yes (PK) | — | UUID v7 |
| `workspaceId` | String | No | No | — | FK → Workspace |
| `name` | String | No | No | — | Human-readable project name |
| `slug` | String | No | No | — | URL-safe identifier; unique within workspace |
| `description` | String | Yes | No | `null` | Optional project description |
| `createdById` | String | No | No | — | FK → User; project creator |
| `createdAt` | DateTime | No | No | `now()` | |
| `updatedAt` | DateTime | No | No | auto | |
| `deletedAt` | DateTime | Yes | No | `null` | Soft delete |

#### Relationships

| Relation | Type | Target | Cascade |
|---|---|---|---|
| `workspace` | N:1 | Workspace | Cascade delete |
| `createdBy` | N:1 | User | Restricted |
| `members` | 1:N | ProjectMember | Cascade delete |
| `tasks` | 1:N | Task | Cascade delete (soft) |

#### Business Rules

- `(workspaceId, slug)` must be unique among non-deleted projects. Enforce as a partial unique index (`WHERE deleted_at IS NULL`).

---

### ProjectMember

Junction table linking User to Project. Carries the user's role within that project.

#### Fields

| Field | Type | Nullable | Unique | Default | Notes |
|---|---|---|---|---|---|
| `id` | String | No | Yes (PK) | — | UUID v7 |
| `projectId` | String | No | No | — | FK → Project |
| `userId` | String | No | No | — | FK → User |
| `workspaceId` | String | No | No | — | FK → Workspace; denormalised for tenant isolation |
| `role` | ProjectRole | No | No | — | |
| `createdAt` | DateTime | No | No | `now()` | |
| `updatedAt` | DateTime | No | No | auto | |

#### Relationships

| Relation | Type | Target | Cascade |
|---|---|---|---|
| `project` | N:1 | Project | Cascade delete |
| `user` | N:1 | User | Restricted |
| `workspace` | N:1 | Workspace | Cascade delete |

#### Business Rules

- Compound unique constraint on `(projectId, userId)` — a user has at most one role per project.
- `workspaceId` is denormalised here to allow all workspace-level Prisma queries to include a `workspaceId` filter without a join to Project.

---

### Task

A unit of work within a project. Workspace-scoped. Supports sub-tasks via self-reference. Soft deleted.

#### Fields

| Field | Type | Nullable | Unique | Default | Notes |
|---|---|---|---|---|---|
| `id` | String | No | Yes (PK) | — | UUID v7 |
| `workspaceId` | String | No | No | — | FK → Workspace |
| `projectId` | String | No | No | — | FK → Project |
| `parentId` | String | Yes | No | `null` | FK → Task (self-referential); null = top-level task |
| `title` | String | No | No | — | |
| `description` | String | Yes | No | `null` | Rich text or Markdown |
| `status` | TaskStatus | No | No | `BACKLOG` | |
| `priority` | TaskPriority | No | No | `NONE` | |
| `position` | Float | No | No | — | Fractional indexing for drag-and-drop ordering within a project+status bucket |
| `dueDate` | DateTime | Yes | No | `null` | |
| `createdById` | String | No | No | — | FK → User |
| `createdAt` | DateTime | No | No | `now()` | |
| `updatedAt` | DateTime | No | No | auto | |
| `deletedAt` | DateTime | Yes | No | `null` | Soft delete |

#### Relationships

| Relation | Type | Target | Cascade |
|---|---|---|---|
| `workspace` | N:1 | Workspace | Cascade delete |
| `project` | N:1 | Project | Cascade delete |
| `parent` | N:1 | Task (self) | Set null on delete |
| `subtasks` | 1:N | Task (self) | Cascade soft delete |
| `assignees` | 1:N | TaskAssignee | Cascade delete |
| `comments` | 1:N | Comment | Cascade soft delete |
| `attachments` | 1:N | Attachment | Cascade soft delete |
| `labels` | 1:N | TaskLabel | Cascade delete |
| `createdBy` | N:1 | User | Restricted |

#### Business Rules

- Sub-tasks (`parentId IS NOT NULL`) may not themselves have sub-tasks — maximum nesting depth of 1. Enforced at the service layer.
- `position` is a Float to support fractional indexing (inserting between two items without renumbering). The application generates new positions in the gap between adjacent items.
- Soft-deleting a parent task must cascade a soft delete to all its subtasks. Enforced at the service layer in a transaction.

---

### TaskAssignee

Junction table linking User to Task. Represents who is assigned to a task.

#### Fields

| Field | Type | Nullable | Unique | Default | Notes |
|---|---|---|---|---|---|
| `id` | String | No | Yes (PK) | — | UUID v7 |
| `taskId` | String | No | No | — | FK → Task |
| `userId` | String | No | No | — | FK → User |
| `workspaceId` | String | No | No | — | FK → Workspace; denormalised for tenant isolation |
| `assignedById` | String | No | No | — | FK → User; who performed the assignment |
| `createdAt` | DateTime | No | No | `now()` | |

#### Relationships

| Relation | Type | Target | Cascade |
|---|---|---|---|
| `task` | N:1 | Task | Cascade delete |
| `user` | N:1 | User | Cascade delete |
| `workspace` | N:1 | Workspace | Cascade delete |
| `assignedBy` | N:1 | User | Restricted |

#### Business Rules

- Compound unique constraint on `(taskId, userId)` — a user may only be assigned to a task once.

---

### Comment

A comment on a task. Workspace-scoped. Soft deleted.

#### Fields

| Field | Type | Nullable | Unique | Default | Notes |
|---|---|---|---|---|---|
| `id` | String | No | Yes (PK) | — | UUID v7 |
| `workspaceId` | String | No | No | — | FK → Workspace |
| `taskId` | String | No | No | — | FK → Task |
| `authorId` | String | No | No | — | FK → User |
| `body` | String | No | No | — | Comment text; Markdown supported |
| `createdAt` | DateTime | No | No | `now()` | |
| `updatedAt` | DateTime | No | No | auto | |
| `deletedAt` | DateTime | Yes | No | `null` | Soft delete; deleted comments may show a "deleted" placeholder |

#### Relationships

| Relation | Type | Target | Cascade |
|---|---|---|---|
| `workspace` | N:1 | Workspace | Cascade delete |
| `task` | N:1 | Task | Cascade delete |
| `author` | N:1 | User | Restricted |
| `attachments` | 1:N | Attachment | Cascade soft delete |

---

### Attachment

A file attached to either a Task or a Comment. Workspace-scoped. Soft deleted.

#### Fields

| Field | Type | Nullable | Unique | Default | Notes |
|---|---|---|---|---|---|
| `id` | String | No | Yes (PK) | — | UUID v7 |
| `workspaceId` | String | No | No | — | FK → Workspace |
| `taskId` | String | Yes | No | `null` | FK → Task; null when attached to a Comment |
| `commentId` | String | Yes | No | `null` | FK → Comment; null when attached to a Task |
| `uploadedById` | String | No | No | — | FK → User |
| `filename` | String | No | No | — | Original filename |
| `mimeType` | String | No | No | — | e.g., `image/png`, `application/pdf` |
| `size` | Int | No | No | — | File size in bytes |
| `url` | String | No | No | — | Storage URL (object storage key or CDN URL) |
| `createdAt` | DateTime | No | No | `now()` | |
| `updatedAt` | DateTime | No | No | auto | |
| `deletedAt` | DateTime | Yes | No | `null` | Soft delete |

#### Relationships

| Relation | Type | Target | Cascade |
|---|---|---|---|
| `workspace` | N:1 | Workspace | Cascade delete |
| `task` | N:1 (optional) | Task | Cascade delete |
| `comment` | N:1 (optional) | Comment | Cascade delete |
| `uploadedBy` | N:1 | User | Restricted |

#### Business Rules

- Exactly one of `taskId` or `commentId` must be non-null. This is a check constraint enforced in the migration SQL: `CHECK (("task_id" IS NOT NULL AND "comment_id" IS NULL) OR ("task_id" IS NULL AND "comment_id" IS NOT NULL))`.

---

### Label

A reusable, workspace-scoped tag applied to tasks. Soft deleted.

#### Fields

| Field | Type | Nullable | Unique | Default | Notes |
|---|---|---|---|---|---|
| `id` | String | No | Yes (PK) | — | UUID v7 |
| `workspaceId` | String | No | No | — | FK → Workspace |
| `name` | String | No | No | — | Display name (e.g., "bug", "feature") |
| `color` | String | No | No | — | Hex colour code (e.g., `#EF4444`) |
| `createdAt` | DateTime | No | No | `now()` | |
| `updatedAt` | DateTime | No | No | auto | |
| `deletedAt` | DateTime | Yes | No | `null` | Soft delete |

#### Relationships

| Relation | Type | Target | Cascade |
|---|---|---|---|
| `workspace` | N:1 | Workspace | Cascade delete |
| `taskLabels` | 1:N | TaskLabel | Cascade delete |

#### Business Rules

- `(workspaceId, name)` must be unique among non-deleted labels. Enforce as a partial unique index (`WHERE deleted_at IS NULL`).

---

### TaskLabel

Junction table linking Task to Label.

#### Fields

| Field | Type | Nullable | Unique | Default | Notes |
|---|---|---|---|---|---|
| `id` | String | No | Yes (PK) | — | UUID v7 |
| `taskId` | String | No | No | — | FK → Task |
| `labelId` | String | No | No | — | FK → Label |
| `workspaceId` | String | No | No | — | FK → Workspace; denormalised for tenant isolation |
| `createdAt` | DateTime | No | No | `now()` | |

#### Relationships

| Relation | Type | Target | Cascade |
|---|---|---|---|
| `task` | N:1 | Task | Cascade delete |
| `label` | N:1 | Label | Cascade delete |
| `workspace` | N:1 | Workspace | Cascade delete |

#### Business Rules

- Compound unique constraint on `(taskId, labelId)` — a label may only be applied to a task once.

---

### RefreshToken

Persisted refresh token record. Not workspace-scoped. The authoritative revocation store is Redis;
this table provides durability across Redis restarts and an audit trail for session management.

#### Fields

| Field | Type | Nullable | Unique | Default | Notes |
|---|---|---|---|---|---|
| `id` | String | No | Yes (PK) | — | UUID v7 |
| `userId` | String | No | No | — | FK → User |
| `tokenHash` | String | No | Yes | — | SHA-256 hash of the raw token; the plaintext is stored in Redis only |
| `expiresAt` | DateTime | No | No | — | 7 days from issuance |
| `revokedAt` | DateTime | Yes | No | `null` | Set on logout or forced revocation |
| `createdAt` | DateTime | No | No | `now()` | |
| `updatedAt` | DateTime | No | No | auto | |

#### Relationships

| Relation | Type | Target | Cascade |
|---|---|---|---|
| `user` | N:1 | User | Cascade delete |

#### Business Rules

- A token is considered valid if `revokedAt IS NULL` and `expiresAt > NOW()`.
- On logout, both the Redis key and `revokedAt` in this table are set.

---

### ApiToken

Long-lived token used by external integrations to authenticate against the workspace API.
Workspace-scoped. Soft deleted.

#### Fields

| Field | Type | Nullable | Unique | Default | Notes |
|---|---|---|---|---|---|
| `id` | String | No | Yes (PK) | — | UUID v7 |
| `workspaceId` | String | No | No | — | FK → Workspace |
| `name` | String | No | No | — | Human-readable label (e.g., "CI Bot") |
| `tokenHash` | String | No | Yes | — | SHA-256 hash of the raw token; plaintext shown once at creation |
| `createdById` | String | No | No | — | FK → User |
| `lastUsedAt` | DateTime | Yes | No | `null` | Updated on every authenticated request using this token |
| `expiresAt` | DateTime | Yes | No | `null` | Null = no expiry |
| `revokedAt` | DateTime | Yes | No | `null` | Set on explicit revocation |
| `createdAt` | DateTime | No | No | `now()` | |
| `updatedAt` | DateTime | No | No | auto | |
| `deletedAt` | DateTime | Yes | No | `null` | Soft delete |

#### Relationships

| Relation | Type | Target | Cascade |
|---|---|---|---|
| `workspace` | N:1 | Workspace | Cascade delete |
| `createdBy` | N:1 | User | Restricted |

#### Business Rules

- A token is considered valid if `revokedAt IS NULL`, `deletedAt IS NULL`, and either `expiresAt IS NULL` or `expiresAt > NOW()`.

---

### Webhook

An outbound webhook that the platform calls when specific events occur in the workspace.
Workspace-scoped. Soft deleted.

#### Fields

| Field | Type | Nullable | Unique | Default | Notes |
|---|---|---|---|---|---|
| `id` | String | No | Yes (PK) | — | UUID v7 |
| `workspaceId` | String | No | No | — | FK → Workspace |
| `name` | String | No | No | — | Human-readable label |
| `url` | String | No | No | — | HTTPS endpoint the platform will POST to |
| `secret` | String | No | No | — | HMAC-SHA256 signing secret; stored encrypted at rest |
| `events` | String[] | No | No | — | Array of subscribed event names (e.g., `["task.created", "task.updated"]`) |
| `isActive` | Boolean | No | No | `true` | Disabled webhooks are skipped at dispatch time |
| `createdById` | String | No | No | — | FK → User |
| `lastTriggeredAt` | DateTime | Yes | No | `null` | Updated after each successful dispatch attempt |
| `createdAt` | DateTime | No | No | `now()` | |
| `updatedAt` | DateTime | No | No | auto | |
| `deletedAt` | DateTime | Yes | No | `null` | Soft delete |

#### Relationships

| Relation | Type | Target | Cascade |
|---|---|---|---|
| `workspace` | N:1 | Workspace | Cascade delete |
| `createdBy` | N:1 | User | Restricted |

---

### AuditLog

Append-only record of significant actions taken within a workspace. No `updatedAt`, no `deletedAt`.
Records are never mutated or deleted.

#### Fields

| Field | Type | Nullable | Unique | Default | Notes |
|---|---|---|---|---|---|
| `id` | String | No | Yes (PK) | — | UUID v7 |
| `workspaceId` | String | No | No | — | FK → Workspace |
| `actorId` | String | Yes | No | — | FK → User; null for system-generated events |
| `action` | String | No | No | — | Dot-namespaced event name (e.g., `task.status.changed`, `member.role.updated`) |
| `resourceType` | String | No | No | — | Prisma model name of the affected record (e.g., `Task`, `WorkspaceMember`) |
| `resourceId` | String | No | No | — | ID of the affected record |
| `metadata` | Json | No | No | — | Arbitrary event context (e.g., `{ "from": "TODO", "to": "DONE" }`) |
| `createdAt` | DateTime | No | No | `now()` | |

#### Relationships

| Relation | Type | Target | Cascade |
|---|---|---|---|
| `workspace` | N:1 | Workspace | Restrict |
| `actor` | N:1 (optional) | User | Set null on delete |

#### Business Rules

- The `workspace` relation uses `onDelete: Restrict`. A workspace cannot be deleted while audit log records exist — this protects compliance records from silent destruction. Archive or explicitly purge audit logs before deleting the workspace.
- Rows are insert-only. No update or delete operations are permitted at the repository layer.
- `actorId` is nullable to accommodate system-initiated actions (e.g., expiry jobs, webhook dispatch failures).

---

## Index Strategy

This section lists all `@@index` declarations required beyond those already implied by primary keys
and unique constraints.

### User

| Columns | Rationale |
|---|---|
| `(email, deletedAt)` | Partial unique index (`WHERE deleted_at IS NULL`) covering email uniqueness for active accounts. |

### WorkspaceMember

| Columns | Rationale |
|---|---|
| `(workspaceId, userId)` | Covering index on the compound unique constraint; hit on every authenticated workspace request. Leading column is `workspaceId` per ADR-001. |
| `(userId)` | Reverse lookup — finding all workspaces a user belongs to (workspace switcher). |

### WorkspaceInvite

| Columns | Rationale |
|---|---|
| `(workspaceId, email)` | Checking whether a pending invitation already exists for this email in the workspace. |
| `(expiresAt)` | Cleanup job that expires stale invitations. |

### Project

| Columns | Rationale |
|---|---|
| `(workspaceId, deletedAt)` | Listing all active projects in a workspace. Leading column is `workspaceId`. |
| `(workspaceId, slug)` | Partial unique index (`WHERE deleted_at IS NULL`) for slug uniqueness within a workspace. |

### ProjectMember

| Columns | Rationale |
|---|---|
| `(workspaceId, userId)` | Finding all projects a user belongs to within a workspace. |
| `(projectId, userId)` | Covering index on the compound unique constraint. |

### Task

| Columns | Rationale |
|---|---|
| `(workspaceId, projectId, deletedAt)` | Primary listing query: all active tasks in a project. `workspaceId` leads to satisfy the tenant filter. |
| `(workspaceId, projectId, status)` | Filtered task lists by status (Kanban board column view). |
| `(workspaceId, projectId, position)` | Ordered task listing for drag-and-drop views. |
| `(workspaceId, status)` | Cross-project status queries — aggregating tasks by status across all projects in a workspace (admin views, background workers). |
| `(projectId)` | Reverse FK traversal — used by Prisma for cascade operations when a project is deleted. |
| `(status)` | Global status scan — used by background jobs that process tasks by status without a workspace constraint (e.g., scheduled archival jobs). |
| `(parentId)` | Fetching all subtasks of a given parent. |

### TaskAssignee

| Columns | Rationale |
|---|---|
| `(workspaceId, userId)` | Finding all tasks assigned to a user within a workspace (My Tasks view). |
| `(taskId, userId)` | Covering index on the compound unique constraint. |

### Comment

| Columns | Rationale |
|---|---|
| `(workspaceId, taskId, deletedAt)` | Fetching active comments for a task. |
| `(taskId)` | Reverse FK traversal — used by Prisma for cascade operations when a task is deleted. |

### Attachment

| Columns | Rationale |
|---|---|
| `(workspaceId, taskId)` | Fetching attachments for a task. |
| `(workspaceId, commentId)` | Fetching attachments for a comment. |
| `(taskId)` | Reverse FK traversal — used by Prisma for cascade operations when a task is deleted. |

### Label

| Columns | Rationale |
|---|---|
| `(workspaceId, deletedAt)` | Listing all active labels in a workspace. |
| `(workspaceId, name)` | Partial unique index (`WHERE deleted_at IS NULL`) for name uniqueness within a workspace. |

### TaskLabel

| Columns | Rationale |
|---|---|
| `(workspaceId, labelId)` | Finding all tasks that have a given label applied (label filter view). |
| `(taskId, labelId)` | Covering index on the compound unique constraint. |

### RefreshToken

| Columns | Rationale |
|---|---|
| `(userId)` | Revoking all tokens for a user on logout-all or account deletion. |
| `(expiresAt)` | Periodic cleanup of expired tokens. |

### ApiToken

| Columns | Rationale |
|---|---|
| `(workspaceId, deletedAt)` | Listing active API tokens for a workspace in the settings UI. |

### Webhook

| Columns | Rationale |
|---|---|
| `(workspaceId, isActive, deletedAt)` | Fetching active webhooks at dispatch time — must be fast as it runs on every event. |

### AuditLog

| Columns | Rationale |
|---|---|
| `(workspaceId, createdAt DESC)` | Chronological audit log browsing — the most common query pattern. |
| `(workspaceId, actorId)` | Filtering audit log by actor. |
| `(workspaceId, resourceType, resourceId)` | Fetching the full audit history for a specific resource (e.g., all events for task `abc-123`). |
| `(resourceType, resourceId)` | Cross-workspace resource lookup — used by internal admin tooling and migration scripts that query audit events for a specific resource without workspace scope. |
