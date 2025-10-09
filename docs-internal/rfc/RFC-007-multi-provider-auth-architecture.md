---
id: RFC-007
title: Multi-Provider Auth Architecture
date: 2025-10-06
type: RFC
subtype: Architecture
status: Implemented
tags: [authentication, architecture, multi-provider, dex, okta, google]
related:
  - ADR-029
  - RFC-009
  - RFC-020
---

# Multi-Provider Auth Architecture

## Context

Hermes requires support for multiple authentication providers (Google OAuth, Okta OIDC, Dex OIDC) with runtime selection based on deployment environment. The architecture must handle different auth flows: client-side OAuth (Google) and server-side OIDC (Okta/Dex).

## Architecture Overview

### Provider Detection
- Backend exposes `/api/v2/web/config` with `auth_provider` field
- Frontend `ConfigService` loads config at startup
- All auth-aware services (SessionService, FetchService, SearchService) adapt based on `auth_provider`

### Authentication Flows

**Google OAuth** (Client-Side):
- Frontend manages OAuth popup using ember-simple-auth
- Access token sent via `Hermes-Google-Access-Token` header
- Token stored in browser session

**OIDC (Okta/Dex)** (Server-Side):
- Frontend redirects to `/api/v2/auth/{provider}/login`
- Backend handles OIDC protocol, code exchange, session creation
- JWT token sent via standard `Authorization: Bearer <jwt>` header
- Session maintained with HttpOnly cookie

### Header Selection Pattern

```typescript
function getAuthHeaders(authProvider: string, token: string) {
  if (authProvider === "google") {
    return { "Hermes-Google-Access-Token": token };
  } else if (authProvider === "dex" || authProvider === "okta") {
    return { "Authorization": `Bearer ${token}` };
  }
  return {};
}
```

## Key Components

**Backend**:
- `internal/api/auth.go`: OIDC endpoints (login, callback, logout)
- `internal/auth/auth.go`: Session provider for Dex/Okta
- `internal/cmd/commands/server/server.go`: Route registration

**Frontend**:
- `web/app/routes/authenticated.ts`: Auth check with redirect
- `web/app/controllers/authenticated.ts`: Provider-specific login methods
- `web/app/services/session.ts`: Session management with OIDC support
- `web/app/services/fetch.ts`: Automatic header selection

## Decision: No Torii Library

**Rationale**:
- Torii designed for client-side OAuth popups (not OIDC redirects)
- ember-simple-auth sufficient for Google OAuth
- OIDC flows handled entirely by backend (correct pattern)
- Torii adds unnecessary dependency and complexity
- Current pattern simpler, more maintainable, Ember 6.x compatible

## Implementation Status

✅ Runtime provider detection  
✅ Google OAuth flow  
✅ Okta OIDC flow  
✅ Dex OIDC flow (testing environment)  
✅ Header selection logic  
✅ Session management for all providers  

## References

- Source: `AUTH_ARCHITECTURE_DIAGRAMS.md`
- Related: `TORII_AUTH_ANALYSIS.md`, `AUTH_PROVIDER_SELECTION.md`, `DEX_AUTHENTICATION.md`
