# Feature Spec: Task Management

## Overview

A task is the atomic unit of work within a project. Tasks live on a Kanban board organised into status columns and support rich metadata: priority, assignees, due dates, and free-text markdown descriptions. Tasks are workspace-scoped via their parent project — every task belongs to exactly one project, and therefore exactly one workspace.

---

## User Stories

### Workspace Owner / Admin

- As a workspace Owner or Admin, I want to create tasks in any project in my workspace so that I can capture work without needing a project-level role.
- As a workspace Owner or Admin, I want to delete any task so that stale or invalid work items can be removed.
- As a workspace Owner or Admin, I want to reassign or reprioritise any task so that I can keep the board current.

### Workspace Member

- As a workspace Member, I want to create tasks in projects I am a member of so that I can add work items to the board.
- As a workspace Member, I want to update task fields (title, description, priority, assignee, due date, status) so that the card reflects current reality.
- As a workspace Member, I want to drag tasks between columns and within a column to reorder them so that the board reflects the team's priority order.

### Workspace Viewer

- As a workspace Viewer, I want to view the Kanban board for any project I have access to so that I can follow progress without being able to modify tasks.

---

## Functional Requirements

### 1. Task Creation

- FR-1: Workspace Members, Admins, and Owners may create tasks in a project they can see. Workspace Viewers may not create tasks — a `403` is returned.
- FR-2: Required field: `title` — a non-empty string, maximum 255 characters, trimmed of leading/trailing whitespace before storage.
- FR-3: Optional fields at creation: `description` (markdown string), `status`, `priority`, `assigneeId`, `dueDate`.
- FR-4: `status` defaults to `BACKLOG` when omitted. Valid values are `BACKLOG`, `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `CANCELLED`.
- FR-5: `priority` defaults to `NONE` when omitted. Valid values are `URGENT`, `HIGH`, `MEDIUM`, `LOW`, `NONE`.
- FR-6: `position` is assigned the value `0` at creation (prepend to the column). The caller cannot set `position` directly at creation — it is controlled exclusively via the position endpoint (§5).
- FR-7: `assigneeId` refers to a single workspace member (`User.id`). When supplied, a `TaskAssignee` record is created in the same transaction as the `Task`. If the supplied `assigneeId` is not a member of the workspace, `404` is returned.
- FR-8: `createdById` is set from the authenticated session — it is never taken from the request body.
- FR-9: `workspaceId` is derived from the parent project's `workspaceId`. The caller cannot supply or override it — it is always resolved server-side.
- FR-10: The API returns the created `Task` with HTTP `201`. The response includes the `assignees` array (each entry containing `id`, `name`, `avatarUrl`).
- FR-11: Task creation and the associated `TaskAssignee` record (when `assigneeId` is provided) must be wrapped in a single database transaction.

### 2. Task Listing

- FR-12: `GET /workspaces/{workspaceId}/projects/{projectId}/tasks` returns all active (non-deleted) tasks in the project, subject to the caller's project visibility (same rules as project listing in the Projects spec §2).
- FR-13: The endpoint accepts optional query parameters: `status` (filter to one column), `assigneeId` (filter to one assignee), `limit` (max 100, default 20), `offset` (default 0).
- FR-14: Each item in the response is a `TaskSummary` including `assignees` (array of `{ id, name, avatarUrl }`).
- FR-15: Results within each status column are ordered by `position` ascending, then by `createdAt` ascending as a tiebreaker.
- FR-16: The response envelope includes `total` (total matching tasks before pagination) alongside the `tasks` array.

### 3. Task Detail

- FR-17: `GET /workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}` returns a `TaskDetail` object for a single active task.
- FR-18: `TaskDetail` extends `TaskSummary` with the full `description` field and `createdById`, `createdAt`, `updatedAt`.
- FR-19: If the task does not exist, is soft-deleted, or belongs to a different project/workspace, `404` is returned. The task's existence is not revealed through a `403`.

### 4. Task Update

- FR-20: `PATCH /workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}` accepts any combination of `title`, `description`, `status`, `priority`, `assigneeId`, `dueDate`. All fields are optional — only supplied fields are updated.
- FR-21: Workspace Members, Admins, and Owners may update tasks. Workspace Viewers may not — `403` is returned.
- FR-22: `status` changes via the update endpoint move the task to the target status column. `position` is not automatically recalculated — callers must follow up with a position update if ordering within the new column matters.
- FR-23: Assignee changes (`assigneeId`) are handled at the service layer, not directly on the `Task` row. Setting `assigneeId` to a user creates a new `TaskAssignee` record (replacing any prior single assignee) in a transaction. Setting `assigneeId` to `null` removes all `TaskAssignee` records for the task.
- FR-24: The API returns the updated `TaskDetail` on success with HTTP `200`.

### 5. Position Management

- FR-25: `PATCH /workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}/position` accepts `{ status: TaskStatus, position: number }`.
- FR-26: If `status` differs from the task's current status, the task's status is updated to the new value in the same operation. This is the canonical way to move a task between Kanban columns.
- FR-27: `position` is stored as a `Float`. Callers may supply fractional values to insert a task between two existing tasks without rewriting neighbor positions (midpoint insertion). Integer values are valid.
- FR-28: The endpoint does not reorder sibling tasks automatically. The client is responsible for computing the target `position` value using the neighbour positions available from the task list response.
- FR-29: The API returns the updated `Task` with HTTP `200`.
- FR-30: Concurrent position writes to the same task are last-write-wins at the database level. No optimistic locking is applied.

### 6. Task Deletion

- FR-31: Only workspace Admins and Owners may delete a task. Members and Viewers receive `403`.
- FR-32: Deletion is a soft delete: `deletedAt` is set to the current timestamp. The row is not removed.
- FR-33: All subsequent API requests to the deleted task return `404`. The soft-deleted state is not surfaced to callers.
- FR-34: Soft-deleting a task does not cascade to its `TaskAssignee`, `Comment`, `Attachment`, or `TaskLabel` records — those are retained for historical purposes and cleaned up only by a hard delete (e.g. workspace cascade).
- FR-35: When a project is soft-deleted, all its active tasks are soft-deleted in the same transaction at the service layer (inherited from the Projects spec, FR-32). The task repository must support bulk soft-delete by `projectId` for this purpose.

---

## Acceptance Criteria

### Happy Path

- AC-1: Given a workspace Member submits a valid title for an existing project, the task is created with `status: BACKLOG`, `priority: NONE`, `position: 0`, the caller set as `createdById`, and the API returns `201` with a `TaskDetail` that includes an `assignees` array (empty if no assignee was supplied).
- AC-2: Given `assigneeId` is supplied and is a valid workspace member, the `TaskAssignee` record is created in the same transaction as the task, and the response `assignees` array contains the assignee's `{ id, name, avatarUrl }`.
- AC-3: Given `GET /…/tasks?status=IN_PROGRESS`, only tasks with `status: IN_PROGRESS` and `deletedAt: null` are returned, ordered by `position` ascending.
- AC-4: Given a workspace Member updates a task's `priority` to `HIGH`, the API returns `200` with the updated `priority` field; all other fields are unchanged.
- AC-5: Given a `PATCH /…/position` request with `{ status: "IN_PROGRESS", position: 1.5 }` on a task currently in `TODO`, the task's `status` is updated to `IN_PROGRESS` and its `position` is set to `1.5`.
- AC-6: Given a workspace Admin soft-deletes a task, `deletedAt` is set and a subsequent `GET` to that task returns `404`.
- AC-7: Given a project is soft-deleted, all of its active tasks are soft-deleted in the same transaction and are no longer returned by the task listing endpoint.

### Error Cases

- AC-8: Workspace Viewer submits `POST /…/tasks`: `403` `{ error: "You do not have permission to perform this action." }`.
- AC-9: Workspace Member submits `DELETE /…/tasks/{taskId}`: `403` `{ error: "You do not have permission to perform this action." }`.
- AC-10: `title` is empty or whitespace-only after trimming: `422` with a field-level validation error on `title`.
- AC-11: `title` exceeds 255 characters: `422` with a field-level validation error on `title`.
- AC-12: `status` is not a valid `TaskStatus` value: `422` with a field-level validation error on `status`.
- AC-13: `priority` is not a valid `TaskPriority` value: `422` with a field-level validation error on `priority`.
- AC-14: `assigneeId` is supplied but the user is not a member of the workspace: `404` — the assignee's non-membership is not revealed through a different error shape.
- AC-15: `GET /…/tasks/{taskId}` where the task belongs to a different project or workspace: `404`.
- AC-16: Any request where the URL `workspaceId` does not match the caller's session workspace membership: `403`.

### Edge Cases

- AC-17: A task is updated to a new `status` via the update endpoint (not the position endpoint). Its `position` value is unchanged. Two tasks may now share the same `position` value within the new column — the sort order is stable (secondary sort by `createdAt`) but the caller should issue a position update to resolve the tie.
- AC-18: `assigneeId: null` is sent in a `PATCH` body — all `TaskAssignee` records for the task are removed and the `assignees` array in the response is empty.
- AC-19: A task in a soft-deleted project is requested via `GET /…/tasks/{taskId}`. The project's `deletedAt` is non-null, so the task's own `deletedAt` was set in the cascade. The response is `404` — the task's belonging to a deleted project is not surfaced.
- AC-20: Two clients concurrently submit `PATCH /…/position` with different `position` values for the same task. Both requests succeed. The task's final `position` is the value written by whichever request committed last. No `409` is returned.
- AC-21: A task with `position: 0` is created (the default). A second task is created shortly after, also with `position: 0`. Both tasks appear in the list with the earlier `createdAt` task sorted first (secondary sort tiebreaker).

---

## Constraints and Non-Negotiables

- `workspaceId` is never accepted from the request body. It is always resolved server-side from the parent project's `workspaceId`, which is itself verified against the caller's `WorkspaceMember` record.
- Every repository query on `Task` must include `workspaceId` and `deletedAt: null` filters. Omitting either is a multi-tenancy or data-integrity violation.
- `prisma.task.findUnique` is forbidden for workspace-scoped task lookups. Use `prisma.task.findFirst({ where: { id, workspaceId, deletedAt: null } })`.
- Task creation with an `assigneeId` must use `prisma.$transaction` — creating the `Task` and `TaskAssignee` rows outside a transaction risks a partial write.
- Project-level soft-delete cascade (task soft-deletion on project delete) must also be a transaction — it is not handled by the Prisma schema's `onDelete: Cascade`, which only fires on a hard delete.
- `position` is a `Float` in the database. Do not document or enforce it as an integer in the API contract — the Float type is intentional to support midpoint insertion without neighbour rewriting.
- No `any` types in TypeScript. `Task`, `TaskSummary`, `TaskDetail`, and `TaskAssignee` types are defined in `packages/shared` and shared between `apps/api` and `apps/web`.
- All MUI colour references in UI components must use theme semantic tokens — no hardcoded hex values.

---

## UI Acceptance Criteria

### 1. Kanban Board

**Layout**
- UAC-1: The project view renders a horizontal Kanban board with four visible columns in fixed order: `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`. Tasks with status `BACKLOG` or `CANCELLED` are not shown on the board view (see Open Questions §1).
- UAC-2: Each column header displays the human-readable status label ("To Do", "In Progress", "In Review", "Done") and the count of tasks currently in that column.
- UAC-3: Columns scroll independently on the vertical axis when a column's card list exceeds the viewport height. The board itself scrolls horizontally when all columns exceed the viewport width.

**Empty column state**
- UAC-4: A column with no tasks displays a dashed border placeholder with an "Add task" button centred within it. Clicking the button opens the task create Drawer pre-filled with the column's status.

**Drag and drop**
- UAC-5: Task cards are draggable within a column to reorder them (change `position`) and between columns (change `status` + `position`). Drag-and-drop triggers a `PATCH /…/position` request on drop.
- UAC-6: During a drag, the card being dragged shows a visual indicator (e.g. reduced opacity or a drag ghost). The destination drop zone highlights to indicate a valid drop target.
- UAC-7: If the position update request fails, the card snaps back to its original position and a MUI `Snackbar` toast appears with `severity="error"`.

### 2. Task Card

- UAC-8: Each card displays the task **title** as the primary text, truncated to 2 lines (`-webkit-line-clamp: 2`) if it overflows.
- UAC-9: A **priority chip** (MUI `Chip`) is shown when priority is not `NONE`. Chip colour uses theme semantic tokens mapped per priority level — `error` for `URGENT`, `warning` for `HIGH`, `info` for `MEDIUM`, `default` for `LOW`.
- UAC-10: The **assignee avatar** (MUI `Avatar`) is shown in the card footer when the task has at least one assignee. The avatar renders the user's `avatarUrl` if present, otherwise falls back to the user's initials. If there are multiple assignees, only the first is shown with no overflow indicator (see Open Questions §3).
- UAC-11: The **due date** is shown as a relative or short absolute date string. When `dueDate` is in the past and the task is not `DONE` or `CANCELLED`, the date is rendered in `error.main` (red). No due date is shown when `dueDate` is null.

### 3. Task Create Drawer

- UAC-12: Clicking "Add task" in an empty column or a global "+ New task" button opens a MUI `Drawer` anchored to the right (`anchor="right"`). The Kanban board remains fully visible and interactive behind the Drawer.
- UAC-13: The Drawer contains a form with the following fields: **Title** (required, MUI `TextField`), **Description** (optional, MUI `TextField` multiline for markdown input), **Status** (MUI `Select`, pre-filled from the triggering column), **Priority** (MUI `Select`, defaults to `NONE`), **Assignee** (MUI `Autocomplete` over workspace members), **Due date** (MUI `DatePicker`).
- UAC-14: Title field-level validation errors appear as MUI `FormHelperText` on blur. The submit button is disabled while the mutation is in flight.
- UAC-15: On success: the Drawer closes, the new task card appears optimistically in the correct column at the top (position 0), and a MUI `Snackbar` toast shows "Task created".
- UAC-16: On error: the Drawer remains open. A MUI `Alert` with `severity="error"` appears above the form with the API error message. Field values are preserved.

### 4. Task Detail Drawer

- UAC-17: Clicking a task card opens a full-height MUI `Drawer` anchored to the right. The Kanban board remains visible behind it.
- UAC-18: All fields (title, description, status, priority, assignee, due date) are editable inline within the Drawer. Changes are saved individually on blur or on explicit field submission — there is no global "Save" button.
- UAC-19: The description field renders a markdown editor. When not focused it displays the rendered markdown; when focused it switches to a plain-text editing mode.
- UAC-20: A **Delete** button is visible in the Drawer only when the current user's workspace role is `ADMIN` or `OWNER`. It triggers the delete confirmation flow (inline confirmation text or a MUI `Dialog`) before issuing the delete request.
- UAC-21: On task deletion: the Drawer closes, the card is removed from the board optimistically, and a MUI `Snackbar` toast shows "Task deleted". If the delete fails, the card is restored and an error toast is shown.

---

## Out of Scope

- **Subtasks.** The `parentId` column exists in the schema and the `Task` model supports a self-referential `parent`/`subtasks` relation, but rendering and managing subtasks in the UI is not part of this phase.
- **Comments and attachments.** The schema includes `Comment` and `Attachment` relations on `Task`. These are out of scope for this phase.
- **Task labels.** The `TaskLabel` relation exists in the schema but label management is not part of this phase.
- **Multiple assignees.** The `TaskAssignee` junction table supports multiple assignees per task. The Phase 3 UI and API expose only a single `assigneeId` field. Expanding to multi-assignee is a future phase.
- **Bulk task operations.** No bulk status change, bulk delete, or bulk assignment.
- **Task restore / un-delete.** Soft-deleted tasks cannot be recovered.
- **BACKLOG and CANCELLED columns on the Kanban board.** These statuses exist in the schema and can be set via the API but are not rendered as columns in the board view.
- **Task search and full-text filtering.** The listing endpoint supports `status` and `assigneeId` filters only.
- **Recurring tasks and task templates.**
- **Time tracking.**

---

## Open Questions

1. **BACKLOG and CANCELLED status handling in the UI.** The schema defines six statuses: `BACKLOG`, `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `CANCELLED`. The Kanban board shows four. Where do `BACKLOG` and `CANCELLED` tasks surface — a separate list view, a hidden column, or are they excluded entirely from the project board? This must be resolved before implementing the board's data-fetching layer.

2. **Position reorder algorithm.** The `position` field is a `Float` to support midpoint insertion (e.g. inserting between positions `1.0` and `2.0` yields `1.5`). Over time, positions converge toward zero precision. What is the threshold for a position normalisation pass, and should normalisation be triggered client-side (after a threshold of drag operations) or server-side (as a background job)?

3. **Multi-assignee display on task cards.** The schema and repository return the full `assignees` array. The card spec currently shows only the first assignee. Should there be a `+N` overflow avatar for tasks with more than one assignee, even though the create/edit UI only supports setting one?

4. **Default status on task creation via the API.** The repository currently defaults `status` to `BACKLOG`, but tasks created from the Kanban board will typically target `TODO` (or the column the user clicked). The API default of `BACKLOG` and the UI default of the triggering column's status are inconsistent. Should the API default be changed to `TODO`, or should the client always supply an explicit `status`?

5. **Position on status change via PATCH /tasks/:taskId.** When a task's `status` is changed through the general update endpoint (not the position endpoint), its `position` value is unchanged. Two tasks in the new column may now share the same `position`. Should the update endpoint automatically append the moved task to the end of the new column (highest `position` + 1), or leave ordering to a subsequent position call?

---

## References

### Prisma Models

- [`Task`](../../apps/api/prisma/schema.prisma) — workspace-scoped; soft-deleted (`deletedAt`); fields: `id`, `workspaceId`, `projectId`, `parentId`, `title`, `description`, `status` (enum), `priority` (enum), `position` (Float), `dueDate`, `createdById`, `createdAt`, `updatedAt`, `deletedAt`. Composite indexes on `(workspaceId, projectId, deletedAt)`, `(workspaceId, projectId, status)`, and `(workspaceId, projectId, position)`.
- [`TaskAssignee`](../../apps/api/prisma/schema.prisma) — junction between `Task` and `User`; carries `workspaceId` (denormalised) and `assignedById`. Compound unique on `(taskId, userId)`. Index on `(workspaceId, userId)`.

### Enums

| Enum | Values |
|---|---|
| `TaskStatus` | `BACKLOG`, `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `CANCELLED` |
| `TaskPriority` | `URGENT`, `HIGH`, `MEDIUM`, `LOW`, `NONE` |

### Repository

- [`apps/api/src/repositories/task.repository.ts`](../../apps/api/src/repositories/task.repository.ts) — `findById`, `findByProject`, `findByAssignee`, `create`, `update`, `softDelete`, `updatePosition`.

### API Paths (`docs/api/openapi.yaml`)

| Method | Path | Operation |
|---|---|---|
| `GET` | `/workspaces/{workspaceId}/projects/{projectId}/tasks` | `listTasks` |
| `POST` | `/workspaces/{workspaceId}/projects/{projectId}/tasks` | `createTask` |
| `GET` | `/workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}` | `getTask` |
| `PATCH` | `/workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}` | `updateTask` |
| `DELETE` | `/workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}` | `deleteTask` |
| `PATCH` | `/workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}/position` | `updateTaskPosition` |

### ADRs

- [`docs/adr/ADR-001-multi-tenant-data-isolation.md`](../../docs/adr/ADR-001-multi-tenant-data-isolation.md) — `workspaceId` scoping rules and the prohibition on `findUnique` for workspace-scoped records.
