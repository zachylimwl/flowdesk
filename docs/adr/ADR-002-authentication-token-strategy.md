# ADR-002: Authentication Token Strategy

**Date:** 2026-05-01
**Status:** Accepted
**Deciders:** Engineering team

## Context

FlowDesk is a stateless API served by Fastify. Every request to a workspace-scoped endpoint must be authenticated and authorised. We needed to decide how to represent and validate identity on each request before writing any auth middleware or frontend API client code, because this decision shapes the entire request lifecycle, the session invalidation model, and the resilience characteristics of the platform.

The core tension is between statelessness and control. A purely stateless token (a self-contained JWT) requires no server-side lookup per request, which is fast and scales horizontally, but it cannot be individually revoked before it expires — a stolen token is valid until expiry regardless of what the server does. A purely stateful session requires a server-side lookup on every request, which is slower but allows instant revocation. We needed a strategy that preserves horizontal scalability on the hot path while retaining the ability to revoke sessions on logout, password change, and member removal.

The consequence of choosing the wrong model early is high: the token format, the refresh flow, the frontend API client's retry logic, and the Redis data structures are all coupled to this decision. Changing authentication strategy after the first features ship means rewriting middleware, the API client, and every integration test that depends on auth.

## Options Considered

### Option 1: Server-Side Session Store Only
The server issues an opaque session ID stored in a cookie. Every request looks up the session in Redis to retrieve the user's identity and role. Revocation is instant — deleting the Redis key invalidates the session immediately. The trade-off is that Redis is on the critical path for every single request: a Redis outage means no authenticated requests succeed, even for operations that require no session state beyond identity.

### Option 2: Long-Lived JWT Only (No Refresh)
The server issues a single JWT with a long expiry (e.g. 7 days). No server-side state is required — the API verifies the signature on every request without a database or cache lookup. This is the simplest client implementation, but a stolen token is valid for up to 7 days with no server-side recourse. There is no logout mechanism that actually invalidates the token; clearing it from the client is security theatre if the token has been exfiltrated.

### Option 3: Short-Lived JWT Access Token + Redis-Backed Refresh Token
The server issues two tokens: a short-lived JWT access token (15-minute expiry) and an opaque refresh token stored in Redis under a session ID (7-day expiry). The API verifies access tokens by signature only — no Redis lookup on the hot path. When the access token expires, the frontend transparently exchanges the refresh token for a new access token; this exchange validates the session ID against Redis, allowing the server to reject it if it has been revoked. Sessions can be invalidated instantly by deleting the Redis key — logout, password change, and member removal all take effect within 15 minutes at most (the remaining access token lifetime) with no Redis involvement on the hot path.

## Decision

We use short-lived JWT access tokens (15-minute expiry) combined with opaque refresh tokens stored in Redis (7-day expiry). This is the only option that achieves both horizontal scalability on the request hot path and server-side session revocation, which is required by the workspace member removal and account deletion flows specified in the workspace management spec.

## Consequences

**Positive:**
- Access token verification is a local signature check — no database or cache lookup on every request.
- Sessions can be individually revoked server-side (logout, password change, member removal, account deletion) by deleting the Redis refresh token key.
- Refresh tokens are opaque random values in Redis — they cannot be forged or decoded, and each one can be individually invalidated without affecting other sessions.
- The API remains horizontally scalable: any instance can verify any access token without shared state.
- A stolen access token expires in 15 minutes without server intervention.

**Negative / Trade-offs:**
- The two-token pattern requires the frontend API client to implement a transparent refresh flow: detect a 401, attempt token exchange, retry the original request. This adds client complexity.
- Redis is a hard dependency for session creation and refresh. If Redis is unavailable, users cannot log in and existing access tokens cannot be refreshed after they expire.
- There is an up-to-15-minute window after member removal or logout during which a revoked access token remains technically valid for non-workspace-scoped endpoints (e.g. the user's own profile). This is accepted as the correct stateless trade-off.
- Refresh token rotation (issuing a new refresh token on each exchange) requires careful handling to avoid race conditions when multiple tabs refresh simultaneously.

**Mitigation:**
- Redis is configured with a replica and automatic failover (Redis Sentinel or Redis Cluster) in production. The 15-minute access token expiry means that a Redis outage window shorter than 15 minutes does not create a security gap — existing valid access tokens continue to work, and no new sessions can be created until Redis recovers.
- The frontend API client implements a single in-flight refresh gate: if multiple requests receive a 401 simultaneously, only one refresh request is sent; the others wait and retry once the new access token is available. This prevents refresh token invalidation races.
- Member removal and account deletion record revocation in Redis immediately. The 15-minute residual access window is documented as an accepted limitation, not a bug, and is consistent with the workspace spec's statement that removed members "lose access immediately" for workspace-scoped resources (enforced by the 403 check) while non-workspace endpoints remain accessible until token expiry.
- Refresh tokens are generated with a cryptographically secure random function (`crypto.randomBytes`), never JWTs or any self-describing format.
