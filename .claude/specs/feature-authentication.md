# Feature Spec: Authentication

## Overview

Provides email/password registration, login, session persistence via JWT access tokens and rotating refresh tokens, and per-session logout. This is the identity foundation for all authenticated FlowDesk features.

## User Stories

- As a new user, I can register an account so that I can access FlowDesk
- As a registered user, I can log in so that I can access my workspaces
- As a logged-in user, my session persists across browser refreshes without re-entering my password
- As a logged-in user, I can log out and have my session fully invalidated

## Functional Requirements

### Registration

- FR-1: Accept `email`, `password`, and `name` in the request body. All three fields are required.
- FR-2: Normalise `email` to lowercase before any lookup or storage.
- FR-3: Reject passwords shorter than 8 characters, missing at least 1 uppercase letter, or missing at least 1 digit. Return 422 with field-level details.
- FR-4: Hash the password with bcrypt at cost factor 12 before storing in `User.passwordHash`.
- FR-5: Reject duplicate emails with 409 (`EMAIL_ALREADY_REGISTERED`). Uniqueness check must be performed on the normalised email.
- FR-6: On success, generate a UUID v7 for the new `User` record in application code (not the database).
- FR-7: Issue a token pair immediately on registration (same as login) and return `{ user: UserProfile, tokens: AuthTokens }` with HTTP 201.

### Login

- FR-8: Accept `email` and `password`. Normalise email to lowercase before lookup.
- FR-9: If the email is not found or the password does not match, return 401 with `{ error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials" } }`. Do not distinguish between the two cases (credential enumeration prevention).
- FR-10: On success, create one Redis session entry and one `RefreshToken` database record. Return `{ user: UserProfile, tokens: AuthTokens }` with HTTP 200.

### Token Issuance

- FR-11: Access token is a signed JWT with payload `{ sub: userId, email, iat, exp }` and a 15-minute expiry.
- FR-12: Refresh token is a cryptographically random opaque string prefixed `rt_`. It is returned to the client exactly once at issue time and never stored in plaintext.
- FR-13: Before storage, hash the raw refresh token with SHA-256. Store the hash in both Redis (`refresh:{userId}:{tokenId}` key) and `RefreshToken.tokenHash`. Set Redis TTL to 7 days.
- FR-14: `AuthTokens` response shape: `{ accessToken: string, refreshToken: string, expiresIn: 900 }`.

### Token Refresh

- FR-15: Accept `{ refreshToken }` in the request body.
- FR-16: Hash the provided token with SHA-256 and look up the hash in Redis. If not found, return 401 (`INVALID_REFRESH_TOKEN`).
- FR-17: Validate expiry and revocation state. If the token is expired or revoked, return 401 (`INVALID_REFRESH_TOKEN`).
- FR-18: Refresh token rotation: atomically delete the old Redis key and `RefreshToken` record, then issue a new token pair. The old token is invalidated in the same operation.
- FR-19: Return `{ tokens: AuthTokens }` with HTTP 200.

### Logout

- FR-20: Accept `{ refreshToken }` in the request body. Requires a valid access token in the `Authorization` header.
- FR-21: Hash the provided refresh token with SHA-256 and delete the matching Redis key. Mark the `RefreshToken` record as revoked (`revokedAt = now()`).
- FR-22: Invalidate only the specific session identified by the provided refresh token — not all sessions for the user.
- FR-23: Return HTTP 204 on success.

### Current User

- FR-24: `GET /auth/me` returns `{ user: UserProfile }` for the authenticated user. Requires a valid access token.
- FR-25: `PATCH /auth/me` accepts `{ name?, avatarUrl? }` and updates the user profile. Returns updated `{ user: UserProfile }`.

### Change Password

- FR-26: `POST /auth/change-password` accepts `{ currentPassword, newPassword }`. Verify `currentPassword` against `User.passwordHash` before proceeding.
- FR-27: On success, revoke all existing refresh tokens for the user (Redis keys + `RefreshToken.revokedAt`), hash and store the new password, then issue a fresh token pair.
- FR-28: If `currentPassword` is incorrect, return 401 (`INVALID_CURRENT_PASSWORD`).

## Acceptance Criteria

### Happy Path

- AC-1: `POST /auth/register` with valid `{ email, password, name }` returns 201 `{ user: UserProfile, tokens: AuthTokens }`. A `User` row and one `RefreshToken` row are created in the database; one Redis entry exists for the session.
- AC-2: `POST /auth/login` with correct credentials returns 200 `{ user: UserProfile, tokens: AuthTokens }`.
- AC-3: `POST /auth/refresh` with a valid, unexpired refresh token returns 200 `{ tokens: AuthTokens }` with a new token pair. The old refresh token is immediately invalid.
- AC-4: `DELETE /auth/logout` with a valid access token and refresh token returns 204. Subsequent `POST /auth/refresh` with that same refresh token returns 401.

### Error Cases

- AC-5: `POST /auth/register` with an already-registered email returns 409 with code `EMAIL_ALREADY_REGISTERED`.
- AC-6: `POST /auth/login` with the correct email but wrong password returns 401 with message `"Invalid credentials"`. The response is identical to the case where the email does not exist.
- AC-7: `POST /auth/refresh` with an expired refresh token returns 401 (`INVALID_REFRESH_TOKEN`).
- AC-8: `POST /auth/refresh` with a refresh token that has already been used (rotated out) returns 401 (`INVALID_REFRESH_TOKEN`).
- AC-9: `POST /auth/register` with a password shorter than 8 characters returns 422 with field-level details on the `password` field.
- AC-10: `POST /auth/register` with a password missing an uppercase letter or digit returns 422.

### Edge Cases

- AC-11: `POST /auth/register` with email `User@Example.com` creates the user with stored email `user@example.com`. A subsequent `POST /auth/login` with `user@example.com` succeeds.
- AC-12: A second `POST /auth/register` with `USER@EXAMPLE.COM` (after `user@example.com` is registered) returns 409.
- AC-13: `POST /auth/refresh` with a token string that was never issued (unknown hash) returns 401, not 500.

## Constraints and Non-Negotiables

- Passwords must be hashed with bcrypt at cost factor 12. No other hashing algorithm is acceptable.
- Refresh tokens must be stored as SHA-256 hashes in both Redis and PostgreSQL. The raw token value must never be persisted.
- `workspaceId` is never sourced from the request body. Auth endpoints operate on the `User` global entity only.
- All database-mutating operations that touch both `User` and `RefreshToken` in one logical action (e.g. change-password) must be wrapped in a Prisma transaction.
- Internal error details (stack traces, DB errors) must never be returned to the client. Log with Pino; respond with the safe error shape `{ error: { code, message } }`.
- No OAuth, SSO, or social login in Phase 3 — email/password only.

## Out of Scope (Phase 3)

- Email verification (`POST /auth/verify-email`, `User.emailVerifiedAt`)
- Password reset / forgot-password flow
- Multi-factor authentication
- Social login (Google, GitHub)
- Account deletion (`DELETE /auth/me`, `User.deletedAt`)

## Open Questions

- None at start of implementation. All decisions are resolved in CLAUDE.md and ADR-002.

## References

- Database schema: `prisma/schema.prisma` → `User`, `RefreshToken` models
- API contract: `docs/api/openapi.yaml` → `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`, `/auth/change-password`
- ADR: `docs/adr/ADR-002-authentication-token-strategy.md`
