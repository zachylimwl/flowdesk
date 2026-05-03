# Workspace Management — Feature Spec

## Overview

A workspace is the top-level organizational boundary in FlowDesk, representing a single company or organization. Every resource in the platform — projects, tasks, members — belongs to exactly one workspace, enforcing strict multi-tenant isolation. Any authenticated user can create a workspace and becomes its sole Owner; users may belong to multiple workspaces simultaneously and navigate between them freely.

---

## User Stories

### Owner

- As an Owner, I want to create a workspace with a name and URL slug so my company has its own isolated environment in FlowDesk.
- As an Owner, I want to edit both the workspace name and the slug so I can correct or rebrand our workspace identity.
- As an Owner, I want to invite users by email and assign them a role (Admin, Member, or Viewer) so I can build out my team.
- As an Owner, I want to remove any member regardless of their role so I have final authority over workspace access.
- As an Owner, I want to delete the workspace — confirmed by typing the workspace name — so I can permanently shut it down when it's no longer needed.
- As an Owner, I want to see a list of all workspaces I belong to so I can navigate between my company environments.
- As an Owner, I want to be blocked from leaving or deleting my account while I am the sole Owner of any workspace, with a clear error telling me which workspaces are affected, so I cannot accidentally orphan a workspace.

### Admin

- As an Admin, I want to edit the workspace name so I can keep it current without requiring Owner involvement for routine changes.
- As an Admin, I want to invite users by email and assign them roles up to Admin so I can grow the team within my authority level.
- As an Admin, I want to remove Members and Viewers so I can revoke access for people who should no longer be in the workspace.
- As an Admin, I want to voluntarily leave a workspace so I can exit when my involvement ends.
- As an Admin, I want to view the full member list so I understand the team composition and can manage it effectively.

### Member

- As a Member, I want to see all workspaces I belong to so I can navigate to the one I need.
- As a Member, I want to view the workspace member list so I know who else is in the workspace.
- As a Member, I want to voluntarily leave a workspace so I can remove myself when I no longer need access.

### Viewer

- As a Viewer, I want to see the workspace name so I know which company environment I am in.
- As a Viewer, I want to view the member list (names and roles only, read-only) so I can understand who is part of the workspace.
- As a Viewer, I want to voluntarily leave a workspace so I can exit when my access is no longer needed.

---

## Functional Requirements

### 1. Workspace Creation

- FR-1: Any authenticated user may create a workspace via a single form requiring two fields: workspace name and URL slug.
- FR-2: On successful creation, a `WorkspaceMember` record with role `OWNER` is automatically created for the creating user in the same transaction. No additional confirmation step is required.
- FR-3: **Name:** 1–100 characters, any Unicode. Trimmed of leading/trailing whitespace before storage.
- FR-4: **Slug:** lowercase alphanumeric characters and hyphens only (`^[a-z0-9-]{3,50}$`), 3–50 characters, must not start or end with a hyphen. Globally unique across all workspaces (not just per-user).
- FR-5: Slug uniqueness is enforced at the database level (unique index) and validated at the API level before write.
- FR-6: On success, the API returns the created workspace object and the frontend navigates the user into the new workspace.

### 2. Workspace Settings — Name

- FR-7: Owners and Admins may update the workspace name.
- FR-8: Same validation rules as creation (1–100 chars, trimmed).
- FR-9: Change takes effect immediately with no confirmation step required.
- FR-10: API returns the updated workspace object on success.

### 3. Workspace Settings — Slug

- FR-11: Owners only may update the workspace slug.
- FR-12: Same validation rules as creation.
- FR-13: The frontend must display a blocking confirmation warning before submitting the change: *"Changing the slug will break any existing links to this workspace. This cannot be undone."* The user must explicitly confirm to proceed.
- FR-14: The warning is enforced in the UI; the API does not require a confirmation token — the warning requirement is a frontend spec item.
- FR-15: On success, old slug links break immediately with no redirect. The API returns the updated workspace object.

### 4. Member Invitation

- FR-16: Owners and Admins may invite a user by email address and assign a role at invitation time.
- FR-17: Owners may assign any role: Admin, Member, Viewer.
- FR-18: Admins may assign only: Admin, Member, Viewer. (Admins cannot create Owners via invitation.)
- FR-19: The system sends an invitation email containing a unique token link valid for 7 days from the time of sending.
- FR-20: If the invited email belongs to an existing FlowDesk account, the link routes to an accept-or-decline screen and, on acceptance, immediately adds them to the workspace with the assigned role.
- FR-21: If the invited email has no FlowDesk account, the link routes to the signup flow. On successful registration with the invited email, the invitation is automatically accepted and the user is added to the workspace with the assigned role. Invitation is matched by email address.
- FR-22: If the invited email is already a member of the workspace (any role), the API returns `409` with `{ error: "This user is already a member of this workspace." }` No invitation is sent.
- FR-23: Each invitation generates a unique, single-use opaque random token stored in the database. Resending invalidates the previous token for that email.

### 5. Pending Invitation Management

- FR-24: Owners and Admins can view a list of all pending (not yet accepted, not expired) invitations for the workspace, showing: invitee email, assigned role, sent date, expiry date.
- FR-25: Any Owner or Admin may cancel a pending invitation. Cancellation deletes the invitation record; the token immediately becomes invalid.
- FR-26: Any Owner or Admin may resend a pending invitation to the same email. Resending resets the expiry to 7 days from the moment of resend and invalidates the previous token.
- FR-27: Resend is only available on pending invitations, not on expired ones. Expired invitations are visible in the list (with an "Expired" status) but the only action available is to send a new invitation.

### 6. Role Changes on Existing Members

- FR-28: A workspace must always have exactly one OWNER at all times. Ownership is transferred by an OWNER calling `PATCH /workspaces/{workspaceId}/members/{userId}` with `role: OWNER` — this atomically promotes the target member to OWNER and demotes the caller to ADMIN in a single transaction. Directly changing an OWNER's role to a lower role (without first transferring ownership) is rejected with `422` (`CANNOT_CHANGE_OWNER_ROLE`).
- FR-29: Owners may change any member's role to Admin, Member, or Viewer.
- FR-30: Owners may not demote themselves from Owner if they are the sole Owner in the workspace.
- FR-31: Admins may change the role of Members and Viewers only, to any role except Owner.
- FR-32: Admins may not change the role of other Admins.
- FR-33: Admins may not change their own role (self-promotion/demotion via this path is blocked; they can only leave).
- FR-34: Role changes take effect immediately.

### 7. Member Removal

- FR-35: Owners may remove any member regardless of role.
- FR-36: Admins may remove Members and Viewers. Admins may not remove other Admins or the Owner.
- FR-37: Self-removal (leaving) uses the same `DELETE /workspaces/{workspaceId}/members/{userId}` endpoint with the caller's own `userId`. See §8 for leave-specific business rules (sole-Owner block, etc.).
- FR-38: On removal, the member immediately loses all access to the workspace and its resources.
- FR-39: If the removed user is currently authenticated, their session remains valid but any request to a workspace-scoped resource returns `403`.

### 8. Leaving a Workspace

- FR-40: Any member at any role (Owner, Admin, Member, Viewer) may voluntarily leave a workspace using `DELETE /workspaces/{workspaceId}/members/{userId}` with their own `userId`.
- FR-41: If the leaving user is the sole Owner of the workspace, the action is blocked. The API returns `422` (`CANNOT_REMOVE_SOLE_OWNER`). The Owner must transfer ownership or delete the workspace before leaving.
- FR-42: An Owner may leave after first transferring ownership to another member via `PATCH /workspaces/{workspaceId}/members/{userId}` with `role: OWNER`; the new Owner retains full control.
- FR-43: On a successful leave, the user loses all access to the workspace immediately.

### 9. Account Deletion (Owner Constraint)

- FR-44: If a user attempts to delete their FlowDesk account while they are the sole Owner of one or more workspaces, the action is blocked.
- FR-45: The API returns `409` listing which workspaces are affected: `{ error: "You are the sole Owner of the following workspaces: [names]. Transfer ownership or delete these workspaces before deleting your account." }`
- FR-46: Account deletion is only unblocked when the user is no longer the sole Owner of any workspace (either they deleted those workspaces or transferred ownership).

### 10. Workspace Deletion

- FR-47: Owner-only action.
- FR-48: The frontend must require the Owner to type the exact workspace name into a confirmation input before the delete button becomes active.
- FR-49: On confirmation, the API performs a hard delete in a single transaction: (1) purge all `AuditLog` records for the workspace (required because the `AuditLog → Workspace` FK uses `onDelete: Restrict`), then (2) delete the workspace row, which cascades to all remaining child records (members, invitations, projects, tasks, and all other workspace-scoped data).
- FR-50: No soft delete, no grace period, no recovery path. `Workspace` has no `deletedAt` field; the row is removed from the database.
- FR-51: On success, the Owner is redirected to their workspace list. If they have no remaining workspaces, they are shown the empty state with a prompt to create a new one.
- FR-52: As the data model grows (comments, activity logs, file attachments, notifications), each addition must include a documented cascade or orphan-handling strategy for workspace deletion. Omitting this from a future PR is a spec violation.

### 11. Workspace Listing

- FR-53: Any authenticated user can retrieve a list of all workspaces they are a member of, regardless of role.
- FR-54: Each list item includes: workspace name, slug, the user's role in that workspace.
- FR-55: The list is sorted by workspace creation date, oldest first, unless the frontend applies its own sort.
- FR-56: No pagination required for v1.

### 12. Member List

- FR-57: Owners, Admins, Members, and Viewers may all view the member list for a workspace.
- FR-58: The member list shows: display name, email, role, and date joined.
- FR-59: Pending invitations are shown separately from confirmed members (see §5).
- FR-60: Viewers see the same member list data as Members — read-only, no actions.

### 13. Soft Delete Behavior (Workspace-Scoped Resources)

- FR-61: Workspace-scoped resources that support soft delete (projects, tasks, comments, labels, attachments) set `deletedAt` on deletion rather than removing the row.
- FR-62: All subsequent API requests to a soft-deleted resource — whether by ID or other lookup — return `404`. The deleted state is never surfaced to callers.
- FR-63: Soft-deleted records are invisible to all members regardless of role; there is no "trash" or "archived" view in Phase 3.

---

## Acceptance Criteria

### Happy Path

**Workspace Creation**
- AC-1: Given an authenticated user submits a valid name and unique slug, a workspace is created, the user is recorded as Owner, and the frontend navigates them into the new workspace.
- AC-2: The created workspace appears immediately in the user's workspace list.

**Settings — Name**
- AC-3: Given an Owner or Admin submits a valid updated name, the workspace name updates immediately and the API returns the updated workspace object.

**Settings — Slug**
- AC-4: Given an Owner acknowledges the confirmation warning and submits a valid, unique slug, the slug updates immediately. The old slug returns no result; only the new slug resolves the workspace.

**Invitation — Existing User**
- AC-5: Given an Owner or Admin invites a valid email that belongs to an existing account with a permitted role, an invitation email is sent, and the invitation appears in the pending list with sent date and 7-day expiry.
- AC-6: Given the invitee clicks the link within 7 days and accepts, they are immediately added to the workspace with the assigned role and can access it.

**Invitation — New User**
- AC-7: Given an invited email has no account, the invitee clicks the link, completes registration with that exact email, and is automatically added to the workspace with the assigned role upon successful signup.

**Pending Invitation Management**
- AC-8: Given an Owner or Admin cancels a pending invitation, the record is deleted and the token is immediately invalid. Subsequent clicks on the old link return `410`.
- AC-9: Given an Owner or Admin resends a pending invitation, the old token is invalidated, a new token is issued, and the expiry resets to 7 days from now.

**Role Changes**
- AC-10: Given an Owner changes a Member's role to Admin, the change takes effect immediately and the affected user's permissions update on their next request.

**Member Removal**
- AC-11: Given an Owner removes an Admin, the Admin immediately loses access. Any workspace-scoped request from that user returns `403`.

**Leave Workspace**
- AC-12: Given a Member leaves a workspace, they are removed immediately and the workspace no longer appears in their workspace list.

**Workspace Deletion**
- AC-13: Given an Owner sends `confirmName` matching the exact workspace name, the workspace is hard deleted in a single transaction: audit logs are purged first, then the workspace and all associated data (member records, pending invitations, projects, tasks) are cascade-deleted. The Owner is redirected to their workspace list or the empty state if none remain.

---

### Error Cases

**Workspace Creation**
- AC-14: Slug already taken (including race condition): `409` `{ error: "This slug is already taken. Please choose a different one." }`
- AC-15: Slug fails format validation (uppercase, spaces, leading/trailing hyphens, etc.): `422` with a field-level validation error.
- AC-16: Name exceeds 100 characters or is empty after trimming: `422` with a field-level validation error.

**Settings — Slug**
- AC-17: Non-Owner attempts to change the slug: `403` `{ error: "Only the workspace Owner can change the slug." }`
- AC-18: Slug already taken: `409` `{ error: "This slug is already taken. Please choose a different one." }`

**Invitation**
- AC-19: Invited email is already a workspace member (any role): `409` `{ error: "This user is already a member of this workspace." }`
- AC-20: Admin attempts to invite with role Owner: `403` `{ error: "Admins cannot assign the Owner role." }`
- AC-21: Member or Viewer attempts to invite anyone: `403`.
- AC-22: Invitee clicks an expired link: `410` `{ error: "This invitation has expired. Ask a workspace Owner or Admin to send a new one." }`
- AC-23: Invitee clicks a cancelled or superseded token: `410` (token not found in DB — treat identically to expired).

**Resend**
- AC-24: Resend attempted on an expired invitation: `409` `{ error: "This invitation has expired and cannot be resent. Create a new invitation for this email address instead." }`
- AC-25: Resend attempted by a Member or Viewer: `403`.

**Role Changes**
- AC-26: Admin attempts to change another Admin's role: `403`.
- AC-27: Admin attempts to promote anyone to Owner: `403`.
- AC-28: Owner attempts to demote themselves when sole Owner: `422` (code `CANNOT_CHANGE_OWNER_ROLE`)

**Member Removal**
- AC-29: Admin attempts to remove another Admin: `403`.
- AC-30: Admin attempts to remove the Owner: `403`.
- AC-31: A member removing themselves (leaving) uses `DELETE /workspaces/{workspaceId}/members/{userId}` with their own `userId`. Sole Owner self-removal returns `422` (`CANNOT_REMOVE_SOLE_OWNER`). There is no separate leave endpoint.

**Leave Workspace**
- AC-32: Sole Owner attempts to leave: `422` (code `CANNOT_REMOVE_SOLE_OWNER`)

**Account Deletion**
- AC-33: User is sole Owner of one or more workspaces: `409` `{ error: "You are the sole Owner of the following workspaces: [name1, name2]. Transfer ownership or delete these workspaces before deleting your account." }`

**Workspace Deletion**
- AC-34: Non-Owner attempts deletion: `403`.
- AC-35: `confirmName` is absent or does not match the exact workspace name: `400` (code `CONFIRMATION_MISMATCH`). The frontend also keeps the delete button inactive until the input matches — the API check is the authoritative enforcement.

---

### Edge Cases

**Workspace deletion with last OWNER**
- AC-36: Deleting a workspace where the requesting user is the sole OWNER succeeds without restriction. The workspace is hard deleted; there is no "must transfer ownership first" block on deletion — that block applies only to leaving the workspace.

**Slug with uppercase letters**
- AC-37: A `POST /workspaces` request with a slug containing uppercase letters (e.g. `"AcmeCorp"`) returns `422` with a validation error describing the `^[a-z0-9-]{3,50}$` pattern requirement. The slug must be corrected by the caller; the API does not normalise it automatically.

**Slug race condition**
- AC-38: Two users submit identical slugs simultaneously. The database unique index rejects the second write. The API surfaces `409` to the losing request. No partial state is written.

**Invitation accepted after role change**
- AC-39: An invitation is sent with role Member. Before the invitee accepts, an Admin cancels the invitation and re-invites with role Viewer. The invitee's original link is invalid (cancelled token). Only the new link is valid.

**Invitation sent to email that registers with a different address**
- AC-40: If the invitee registers with a different email than the one invited, the invitation is not auto-accepted. The invited email remains in pending state until it expires. No error is raised.

**Member removed while holding a pending invitation they sent**
- AC-41: Removing a member does not cancel pending invitations they issued. Those invitations remain valid until accepted, expired, or explicitly cancelled by a remaining Owner or Admin.

**Workspace deleted while invitations are pending**
- AC-42: Cascade delete includes all pending invitation records. Any token from those invitations immediately becomes invalid (`410`) because the token lookup will find no matching record.

**User belongs to no workspaces**
- AC-43: After leaving or being removed from all workspaces, the user's workspace list is empty. The frontend shows an empty state with a prompt to create a new workspace. No `404` — an empty list is a valid state.

**Sole Owner is also the only member**
- AC-44: The Owner cannot leave (blocked by sole-Owner rule). They can only delete the workspace. This is the correct and intended path, not an error.

**Resend generates duplicate send within seconds**
- AC-45: If an Admin resends an invitation twice in quick succession, each resend invalidates the previous token. Only the most recently issued token is valid. No rate-limit is specified for v1 — see Open Questions.

**Name updated to its current value**
- AC-46: Submitting the existing name as the new name is a no-op success. The API returns `200` with the unchanged workspace object. No error, no special handling.

---

## Constraints and Non-Negotiables

- `workspaceId` is **never** taken from the client request body or query parameters. It is always sourced from the authenticated session — specifically from the JWT `sub` claim resolved against the user's `WorkspaceMember` records — and validated server-side. Accepting a client-supplied `workspaceId` would enable horizontal privilege escalation (a user reaching another tenant's data). Violation of this is a security issue, not a bug.
- Every query that touches workspace-scoped data **must** include a `workspaceId` filter at the repository layer. A query that returns data without this filter is a multi-tenancy breach.
- Invitation tokens are opaque random values stored in the database. They must never be JWTs or any self-contained format that cannot be individually revoked. Cancellation and resend require instant invalidation.
- All database-mutating operations that span multiple tables (workspace creation + owner record, workspace deletion cascade) must be wrapped in a single transaction. Partial writes are not acceptable.
- Role enforcement is checked server-side on every mutating request. Frontend role-gating (hiding buttons, disabling inputs) is a UX concern only — it is not a security control.
- Workspace deletion is irreversible and immediate. No recovery mechanism exists in v1. This must be documented in user-facing copy at the point of confirmation.
- As the data model grows (comments, activity logs, file attachments, notifications), each new entity must include a documented cascade or orphan-handling strategy for workspace deletion. Omitting this from a future PR is a spec violation.
- No `any` types in TypeScript. Workspace and membership types must be defined in `packages/shared` and used by both `apps/api` and `apps/web`.

---

## Out of Scope (v1)

- **Slug change redirects.** Old slug URLs break permanently. No redirect or alias mechanism.
- **Soft delete / workspace recovery.** Deletion is immediate and permanent. No trash, grace period, or restore flow.
- **Billing plans, seats, or member limits.**
- **Feature flags per workspace.**
- **Team or department sub-divisions within a workspace.**
- **SSO, magic links, or public join links.** Invitation by email only.
- **Multiple Owners per workspace.**
- **Invitation rate limiting.** No cap on how many invitations can be sent or resent in a given period.
- **Bulk member operations** (bulk invite, bulk remove, bulk role change).
- **Audit log** of workspace settings changes or membership changes.
- **Member search or filtering** within the member list.
- **Pagination** of the workspace list or member list.

---

## Open Questions

1. **Invitation rate limiting.** No rate limit is specified for v1, but a motivated actor could spam the resend endpoint. Should a per-workspace, per-invitee rate limit be added before shipping, or deferred to a hardening pass? If deferred, what is the threshold that would trigger adding it (e.g. abuse report, volume threshold)?

2. **Invitation email delivery failure.** The spec requires sending an invitation email, but does not address what happens if the email provider returns a delivery failure (hard bounce, invalid address). Should the invitation record still be created and appear as pending, or should the API surface the delivery failure to the sender?

3. **Slug character limits and SEO.** The 2–50 character slug range was set pragmatically. Is there a URL length constraint from the routing layer (TanStack Router) or any planned integration (webhooks, API keys scoped to slug) that would make this range too permissive or too restrictive?

4. **Session invalidation on removal.** §7 specifies that a removed member's existing session remains valid but workspace-scoped requests return `403`. This is the correct stateless approach given JWT-based auth, but it means a removed user could continue accessing non-workspace-scoped endpoints (e.g. their profile) until their access token expires (15 min per CLAUDE.md). Is this acceptable, or should removal trigger a Redis session revocation?

5. **Expired invitation visibility cutoff.** Expired invitations are retained in the database with an "Expired" status. Is there a retention policy — e.g. auto-purge expired records after 30 days — or are they kept indefinitely? This affects database growth and whether the pending list UI needs pagination eventually.

6. **Concurrent slug change.** If two Owners of different workspaces race to claim the same slug simultaneously, the database unique index resolves it correctly. Should the frontend pre-validate slug availability with a debounced availability check on the settings form, to reduce friction before submission? This is a UX question, not a correctness one — but it should be decided before frontend implementation begins.

---

## References

### Prisma Models

- [`Workspace`](../../prisma/schema.prisma) — top-level tenant container; hard deleted; fields: `id`, `name`, `slug` (`@unique`), `logoUrl`, `createdAt`, `updatedAt`.
- [`WorkspaceMember`](../../prisma/schema.prisma) — junction between `User` and `Workspace`; carries `WorkspaceRole`; compound unique on `(workspaceId, userId)`; created automatically with role `OWNER` on workspace creation.
- [`WorkspaceInvite`](../../prisma/schema.prisma) — pending email invitation; fields: `token` (`@unique`), `email`, `role`, `expiresAt`, `acceptedAt`; cascade-deleted when the workspace is deleted.

### API Paths (`docs/api/openapi.yaml`)

**Active (Phase 3)**

| Method | Path | Operation |
|--------|------|-----------|
| `GET` | `/workspaces` | `listWorkspaces` |
| `POST` | `/workspaces` | `createWorkspace` |
| `GET` | `/workspaces/{workspaceId}` | `getWorkspace` |
| `PATCH` | `/workspaces/{workspaceId}` | `updateWorkspace` |
| `DELETE` | `/workspaces/{workspaceId}` | `deleteWorkspace` |
| `GET` | `/workspaces/{workspaceId}/members` | `listWorkspaceMembers` |
| `POST` | `/workspaces/{workspaceId}/members/invite` | `inviteWorkspaceMember` |
| `PATCH` | `/workspaces/{workspaceId}/members/{userId}` | `updateWorkspaceMember` |
| `DELETE` | `/workspaces/{workspaceId}/members/{userId}` | `removeWorkspaceMember` |

**Deferred**

| Method | Path | Deferred Feature |
|--------|------|-----------------|
| `GET` | `/workspaces/{workspaceId}/invitations` | `workspace-invitation-accept` |
| `DELETE` | `/workspaces/{workspaceId}/invitations/{invitationId}` | `workspace-invitation-accept` |
| `GET` | `/workspaces/{workspaceId}/tokens` | `api-tokens` |
| `POST` | `/workspaces/{workspaceId}/tokens` | `api-tokens` |
| `DELETE` | `/workspaces/{workspaceId}/tokens/{tokenId}` | `api-tokens` |
| `GET` | `/workspaces/{workspaceId}/webhooks` | `webhooks` |
| `POST` | `/workspaces/{workspaceId}/webhooks` | `webhooks` |
| `GET` | `/workspaces/{workspaceId}/webhooks/{webhookId}` | `webhooks` |
| `PATCH` | `/workspaces/{workspaceId}/webhooks/{webhookId}` | `webhooks` |
| `DELETE` | `/workspaces/{workspaceId}/webhooks/{webhookId}` | `webhooks` |
| `GET` | `/workspaces/{workspaceId}/audit-logs` | `audit-logs` |
| `GET` | `/workspaces/{workspaceId}/tasks` | `workspace-task-list` |

### ADRs

- [`docs/adr/ADR-001-multi-tenant-data-isolation.md`](../../docs/adr/ADR-001-multi-tenant-data-isolation.md) — defines shared-database, shared-schema multi-tenancy; `workspaceId` scoping rules; repository-layer enforcement.
