# Feature Spec: Role-Based Access Control (RBAC)

## 1. Overview
RBAC controls what authenticated users are permitted to do within a workspace. Authorization is always workspace-scoped — the same user may have different roles in different workspaces. Role resolution reads from `WorkspaceMember.role`. There is no global admin concept in v1.

## 2. User Stories
- As an OWNER, I can manage all workspace settings, projects, tasks, and members including promoting other users to admin
- As an ADMIN, I can manage projects, tasks, and members but cannot delete the workspace or transfer ownership
- As a MEMBER, I can create projects, manage my own tasks, and view all workspace content
- As a VIEWER, I can read all workspace content but cannot create, update, or delete anything
- As any role, I cannot access resources belonging to a workspace I am not a member of

## 3. Functional Requirements
- F1: Every API route that accesses workspace-scoped data must resolve the caller's role before processing
- F2: The permission check must happen AFTER authentication (requireAuth) and BEFORE business logic
- F3: Role resolution must query WorkspaceMember using both userId (from JWT) and workspaceId (from request params or body)
- F4: If the user has no WorkspaceMember row for the workspace, treat as 403 — not 401
- F5: All four roles must map to explicit, enumerated action sets — no implicit "higher role inherits lower role" logic at runtime (permissions are declared, not computed from hierarchy)
- F6: Multi-tenant guard: workspaceId used for permission resolution must come from the JWT session or validated request params — never from the request body alone

## 4. Permission Matrix

### Resources and Actions
Resources: `workspace`, `project`, `task`, `member`, `comment`, `apiToken`
Actions: `create`, `read`, `update`, `delete`, `manage` (manage = ability to change ownership, transfer, or bulk-operate)

### OWNER permissions
- workspace: create, read, update, delete, manage
- project: create, read, update, delete, manage
- task: create, read, update, delete, manage
- member: create, read, update, delete, manage
- comment: create, read, update, delete
- apiToken: create, read, delete

### ADMIN permissions
- workspace: read, update (cannot delete or manage)
- project: create, read, update, delete
- task: create, read, update, delete
- member: create, read, update (cannot delete members or manage ownership)
- comment: create, read, update, delete
- apiToken: create, read, delete

### MEMBER permissions
- workspace: read
- project: create, read, update (cannot delete projects)
- task: create, read, update, delete (all tasks in workspace, not just own)
- member: read
- comment: create, read, update, delete
- apiToken: create, read, delete (own tokens only — enforced at service layer)

### VIEWER permissions
- workspace: read
- project: read
- task: read
- member: read
- comment: read
- apiToken: read (own tokens only)

## 5. Acceptance Criteria

### Happy Path
- AC-1: OWNER can DELETE /api/v1/workspaces/:workspaceId and receives 200
- AC-2: ADMIN sends DELETE /api/v1/workspaces/:workspaceId and receives 403
- AC-3: MEMBER sends POST /api/v1/workspaces/:workspaceId/projects and receives 201
- AC-4: VIEWER sends POST /api/v1/workspaces/:workspaceId/projects and receives 403
- AC-5: OWNER in workspace A cannot access workspace B's resources (403, not 404)

### Error Cases
- AC-6: User with no WorkspaceMember row receives 403 (not 404, not 401)
- AC-7: User sends workspaceId in body that does not match their session — request is rejected 403
- AC-8: Expired JWT results in 401 before RBAC check runs (auth middleware fires first)

### Edge Cases
- AC-9: Workspace deletion by OWNER also terminates all active sessions for workspace members (out of scope for v1 — log the requirement as a known gap)
- AC-10: A user promoted from MEMBER to ADMIN sees new permissions on their next request (no caching of role lookups)

## 6. Constraints
- C1: Role resolution must be a database read (WorkspaceMember) — do not cache roles in JWT payload
- C2: Permission checks must not be bypassable by sending workspaceId in the request body; always resolve workspaceId from route params
- C3: The permission matrix is the single source of truth — no ad-hoc `if (role === 'OWNER')` checks scattered across route handlers
- C4: RBAC failure responses: always 403 with `{ "error": "Forbidden", "message": "<reason>" }` — never leak which resource does or does not exist

## 7. Out of Scope (v1)
- Field-level permissions (e.g., MEMBER can see task title but not internal notes)
- Resource ownership (e.g., MEMBER can only edit their own tasks)
- Time-limited roles or expiring invitations
- Audit logging of permission denials (covered in Module 20)
- Cross-workspace collaboration

## 8. Open Questions
- Should ADMIN be able to remove OWNER from a workspace? (Decision: No — only OWNER can remove OWNER)
- Should the permission matrix be stored in the database for runtime configuration? (Decision: No for v1 — compiled into the application; change requires a deploy)
