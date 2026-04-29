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

- Any authenticated user may create a workspace via a single form requiring two fields: workspace name and URL slug.
- On successful creation, the creating user is recorded as the workspace Owner with no additional confirmation step.
- **Name:** 1–100 characters, any Unicode. Trimmed of leading/trailing whitespace before storage.
- **Slug:** lowercase alphanumeric characters and hyphens only (`^[a-z0-9-]+$`), 2–50 characters, must not start or end with a hyphen. Globally unique across all workspaces.
- Slug uniqueness is enforced at the database level (unique index) and validated at the API level before write.
- On success, the API returns the created workspace object and the frontend navigates the user into the new workspace.

### 2. Workspace Settings — Name

- Owners and Admins may update the workspace name.
- Same validation rules as creation (1–100 chars, trimmed).
- Change takes effect immediately with no confirmation step required.
- API returns the updated workspace object on success.

### 3. Workspace Settings — Slug

- Owners only may update the workspace slug.
- Same validation rules as creation.
- The frontend must display a blocking confirmation warning before submitting the change: *"Changing the slug will break any existing links to this workspace. This cannot be undone."* The user must explicitly confirm to proceed.
- The warning is enforced in the UI; the API does not require a confirmation token — the warning requirement is a frontend spec item.
- On success, old slug links break immediately with no redirect. The API returns the updated workspace object.

### 4. Member Invitation

- Owners and Admins may invite a user by email address and assign a role at invitation time.
- Owners may assign any role: Admin, Member, Viewer.
- Admins may assign only: Admin, Member, Viewer. (Admins cannot create Owners via invitation.)
- The system sends an invitation email containing a unique token link valid for 7 days from the time of sending.
- If the invited email belongs to an existing FlowDesk account, the link routes to an accept-or-decline screen and, on acceptance, immediately adds them to the workspace with the assigned role.
- If the invited email has no FlowDesk account, the link routes to the signup flow. On successful registration with the invited email, the invitation is automatically accepted and the user is added to the workspace with the assigned role. Invitation is matched by email address.
- If the invited email is already a member of the workspace (any role), the API returns `409` with `{ error: "This user is already a member of this workspace." }` No invitation is sent.
- Each invitation generates a unique, single-use opaque random token stored in the database. Resending invalidates the previous token for that email.

### 5. Pending Invitation Management

- Owners and Admins can view a list of all pending (not yet accepted, not expired) invitations for the workspace, showing: invitee email, assigned role, sent date, expiry date.
- Any Owner or Admin may cancel a pending invitation. Cancellation deletes the invitation record; the token immediately becomes invalid.
- Any Owner or Admin may resend a pending invitation to the same email. Resending resets the expiry to 7 days from the moment of resend and invalidates the previous token.
- Resend is only available on pending invitations, not on expired ones. Expired invitations are visible in the list (with an "Expired" status) but the only action available is to send a new invitation.

### 6. Role Changes on Existing Members

- Owners may change any member's role to Admin, Member, or Viewer.
- Owners may not demote themselves from Owner if they are the sole Owner in the workspace.
- Admins may change the role of Members and Viewers only, to any role except Owner.
- Admins may not change the role of other Admins.
- Admins may not change their own role (self-promotion/demotion via this path is blocked; they can only leave).
- Role changes take effect immediately.

### 7. Member Removal

- Owners may remove any member regardless of role.
- Admins may remove Members and Viewers. Admins may not remove other Admins or the Owner.
- No member may remove themselves via the remove action — self-removal is handled by the Leave flow (see §8).
- On removal, the member immediately loses all access to the workspace and its resources.
- If the removed user is currently authenticated, their session remains valid but any request to a workspace-scoped resource returns `403`.

### 8. Leaving a Workspace

- Any member at any role (Owner, Admin, Member, Viewer) may voluntarily leave a workspace.
- If the leaving user is the sole Owner of the workspace, the action is blocked. The API returns `409` with `{ error: "You are the only Owner. Transfer ownership or delete the workspace before leaving." }`
- An Owner who is not the sole Owner may leave; the remaining Owner(s) retain control.
- On a successful leave, the user loses all access to the workspace immediately.

### 9. Account Deletion (Owner Constraint)

- If a user attempts to delete their FlowDesk account while they are the sole Owner of one or more workspaces, the action is blocked.
- The API returns `409` listing which workspaces are affected: `{ error: "You are the sole Owner of the following workspaces: [names]. Transfer ownership or delete these workspaces before deleting your account." }`
- Account deletion is only unblocked when the user is no longer the sole Owner of any workspace (either they deleted those workspaces or transferred ownership).

### 10. Workspace Deletion

- Owner-only action.
- The frontend must require the Owner to type the exact workspace name into a confirmation input before the delete button becomes active.
- On confirmation, the API performs a hard delete: cascades to all projects, tasks, members, and invitation records belonging to the workspace.
- No soft delete, no grace period, no recovery path.
- On success, the Owner is redirected to their workspace list. If they have no remaining workspaces, they are shown the empty state with a prompt to create a new one.
- As the data model grows (comments, activity logs, file attachments, notifications), each addition must include a documented cascade or orphan-handling strategy for workspace deletion. Omitting this from a future PR is a spec violation.

### 11. Workspace Listing

- Any authenticated user can retrieve a list of all workspaces they are a member of, regardless of role.
- Each list item includes: workspace name, slug, the user's role in that workspace.
- The list is sorted by workspace creation date, oldest first, unless the frontend applies its own sort.
- No pagination required for v1.

### 12. Member List

- Owners, Admins, Members, and Viewers may all view the member list for a workspace.
- The member list shows: display name, email, role, and date joined.
- Pending invitations are shown separately from confirmed members (see §5).
- Viewers see the same member list data as Members — read-only, no actions.

---

## Acceptance Criteria

### Happy Path

**Workspace Creation**
- Given an authenticated user submits a valid name and unique slug, a workspace is created, the user is recorded as Owner, and the frontend navigates them into the new workspace.
- The created workspace appears immediately in the user's workspace list.

**Settings — Name**
- Given an Owner or Admin submits a valid updated name, the workspace name updates immediately and the API returns the updated workspace object.

**Settings — Slug**
- Given an Owner acknowledges the confirmation warning and submits a valid, unique slug, the slug updates immediately. The old slug returns no result; only the new slug resolves the workspace.

**Invitation — Existing User**
- Given an Owner or Admin invites a valid email that belongs to an existing account with a permitted role, an invitation email is sent, and the invitation appears in the pending list with sent date and 7-day expiry.
- Given the invitee clicks the link within 7 days and accepts, they are immediately added to the workspace with the assigned role and can access it.

**Invitation — New User**
- Given an invited email has no account, the invitee clicks the link, completes registration with that exact email, and is automatically added to the workspace with the assigned role upon successful signup.

**Pending Invitation Management**
- Given an Owner or Admin cancels a pending invitation, the record is deleted and the token is immediately invalid. Subsequent clicks on the old link return `410`.
- Given an Owner or Admin resends a pending invitation, the old token is invalidated, a new token is issued, and the expiry resets to 7 days from now.

**Role Changes**
- Given an Owner changes a Member's role to Admin, the change takes effect immediately and the affected user's permissions update on their next request.

**Member Removal**
- Given an Owner removes an Admin, the Admin immediately loses access. Any workspace-scoped request from that user returns `403`.

**Leave Workspace**
- Given a Member leaves a workspace, they are removed immediately and the workspace no longer appears in their workspace list.

**Workspace Deletion**
- Given an Owner types the exact workspace name in the confirmation input and confirms deletion, the workspace and all associated v1 data (member records, pending invitations, projects, tasks) are hard deleted. The Owner is redirected to their workspace list or the empty state if none remain.

---

### Error Cases

**Workspace Creation**
- Slug already taken (including race condition): `409` `{ error: "This slug is already taken. Please choose a different one." }`
- Slug fails format validation (uppercase, spaces, leading/trailing hyphens, etc.): `422` with a field-level validation error.
- Name exceeds 100 characters or is empty after trimming: `422` with a field-level validation error.

**Settings — Slug**
- Non-Owner attempts to change the slug: `403` `{ error: "Only the workspace Owner can change the slug." }`
- Slug already taken: `409` `{ error: "This slug is already taken. Please choose a different one." }`

**Invitation**
- Invited email is already a workspace member (any role): `409` `{ error: "This user is already a member of this workspace." }`
- Admin attempts to invite with role Owner: `403` `{ error: "Admins cannot assign the Owner role." }`
- Member or Viewer attempts to invite anyone: `403`.
- Invitee clicks an expired link: `410` `{ error: "This invitation has expired. Ask a workspace Owner or Admin to send a new one." }`
- Invitee clicks a cancelled or superseded token: `410` (token not found in DB — treat identically to expired).

**Resend**
- Resend attempted on an expired invitation: `409` `{ error: "This invitation has expired and cannot be resent. Create a new invitation for this email address instead." }`
- Resend attempted by a Member or Viewer: `403`.

**Role Changes**
- Admin attempts to change another Admin's role: `403`.
- Admin attempts to promote anyone to Owner: `403`.
- Owner attempts to demote themselves when sole Owner: `409` `{ error: "You are the only Owner. Transfer ownership or delete the workspace before leaving." }`

**Member Removal**
- Admin attempts to remove another Admin: `403`.
- Admin attempts to remove the Owner: `403`.
- Any member attempts to remove themselves via the remove endpoint (not the leave endpoint): `400` `{ error: "Use the leave endpoint to remove yourself from a workspace." }`

**Leave Workspace**
- Sole Owner attempts to leave: `409` `{ error: "You are the only Owner. Transfer ownership or delete the workspace before leaving." }`

**Account Deletion**
- User is sole Owner of one or more workspaces: `409` `{ error: "You are the sole Owner of the following workspaces: [name1, name2]. Transfer ownership or delete these workspaces before deleting your account." }`

**Workspace Deletion**
- Non-Owner attempts deletion: `403`.
- Confirmation input does not match the exact workspace name: the delete button remains inactive (frontend); if the API receives the request without a matching confirmation value, `400`.

---

### Edge Cases

**Slug race condition**
- Two users submit identical slugs simultaneously. The database unique index rejects the second write. The API surfaces `409` to the losing request. No partial state is written.

**Invitation accepted after role change**
- An invitation is sent with role Member. Before the invitee accepts, an Admin cancels the invitation and re-invites with role Viewer. The invitee's original link is invalid (cancelled token). Only the new link is valid.

**Invitation sent to email that registers with a different address**
- If the invitee registers with a different email than the one invited, the invitation is not auto-accepted. The invited email remains in pending state until it expires. No error is raised.

**Member removed while holding a pending invitation they sent**
- Removing a member does not cancel pending invitations they issued. Those invitations remain valid until accepted, expired, or explicitly cancelled by a remaining Owner or Admin.

**Workspace deleted while invitations are pending**
- Cascade delete includes all pending invitation records. Any token from those invitations immediately becomes invalid (`410`) because the token lookup will find no matching record.

**User belongs to no workspaces**
- After leaving or being removed from all workspaces, the user's workspace list is empty. The frontend shows an empty state with a prompt to create a new workspace. No `404` — an empty list is a valid state.

**Sole Owner is also the only member**
- The Owner cannot leave (blocked by sole-Owner rule). They can only delete the workspace. This is the correct and intended path, not an error.

**Resend generates duplicate send within seconds**
- If an Admin resends an invitation twice in quick succession, each resend invalidates the previous token. Only the most recently issued token is valid. No rate-limit is specified for v1 — see Open Questions.

**Name updated to its current value**
- Submitting the existing name as the new name is a no-op success. The API returns `200` with the unchanged workspace object. No error, no special handling.

---

## Constraints and Non-Negotiables

- `workspaceId` is **never** taken from the client request body. It is always derived from the authenticated session or the URL path parameter, validated server-side against the session's membership. Violation of this is a security issue, not a bug.
- Every query that touches workspace-scoped data **must** include a `workspaceId` filter at the repository layer. A query that returns data without this filter is a multi-tenancy breach.
- Invitation tokens are opaque random values stored in the database. They must never be JWTs or any self-contained format that cannot be individually revoked. Cancellation and resend require instant invalidation.
- All database-mutating operations that span multiple tables (workspace creation + owner record, workspace deletion cascade) must be wrapped in a single transaction. Partial writes are not acceptable.
- Role enforcement is checked server-side on every mutating request. Frontend role-gating (hiding buttons, disabling inputs) is a UX concern only — it is not a security control.
- Workspace deletion is irreversible and immediate. No recovery mechanism exists in v1. This must be documented in user-facing copy at the point of confirmation.
- As the data model grows (comments, activity logs, file attachments, notifications), each new entity must include a documented cascade or orphan-handling strategy for workspace deletion. Omitting this from a future PR is a spec violation.
- No `any` types in TypeScript. Workspace and membership types must be defined in `packages/shared` and used by both `apps/api` and `apps/web`.

---

## Out of Scope (v1)

- **Ownership transfer.** The Owner role cannot be reassigned. Only deletion resolves a sole-Owner deadlock in v1.
- **Slug change redirects.** Old slug URLs break permanently. No redirect or alias mechanism.
- **Soft delete / workspace recovery.** Deletion is immediate and permanent. No trash, grace period, or restore flow.
- **Workspace logo, avatar, or branding.**
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
