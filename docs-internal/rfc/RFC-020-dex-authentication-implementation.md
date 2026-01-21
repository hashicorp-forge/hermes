---
id: RFC-020
title: Dex OIDC Authentication Implementation
date: 2025-10
type: RFC
subtype: Implementation
status: Implemented
tags: [authentication, dex, oidc, implementation]
related:
  - RFC-007
  - RFC-009
---

# Dex OIDC Authentication Implementation

## Context

Hermes requires local authentication capability for development, testing, and CI/CD without dependency on external OAuth providers (Google, Okta). Dex provides OpenID Connect (OIDC) identity provider with static password authentication.

## Architecture

### Components

1. **Dex Server** (`ghcr.io/dexidp/dex:v2.41.1`)
   - Docker container
   - Static password connector
   - OIDC endpoints

2. **Dex Auth Adapter** (`pkg/auth/adapters/dex/`)
   - Implements `auth.Provider` interface
   - Validates OIDC ID tokens
   - Extracts user email from claims

3. **Backend Endpoints** (`internal/api/auth.go`)
   - `GET /auth/login` - Initiates OIDC flow
   - `GET /auth/callback` - Handles OAuth callback
   - `GET /auth/logout` - Clears session

4. **Session Management** (`internal/auth/auth.go`)
   - `DexSessionProvider` - Cookie-based auth
   - HttpOnly, Secure, SameSite=Lax cookies

### Authentication Priority

```
1. Dex (if configured and enabled)
2. Okta (if configured and enabled)
3. Google (default fallback)
```

## Deployment Configurations

### Integration Testing (`docker-compose.yml`)

**Purpose**: Infrastructure for Go integration tests

```yaml
Port: 5556 (HTTP), 5558 (telemetry)
Issuer: http://localhost:5556/dex
Client ID: hermes-integration
Client Secret: ZXhhbXBsZS1hcHAtc2VjcmV0
```

### Acceptance Testing (`testing/docker-compose.yml`)

**Purpose**: Full-stack containerized environment

```yaml
Port: 5557 (HTTP), 5559 (telemetry) # non-conflicting
Issuer: http://dex:5557/dex (internal)
Client ID: hermes-acceptance
Client Secret: YWNjZXB0YW5jZS1hcHAtc2VjcmV0
```

### Configuration

```hcl
profile "testing" {
  dex {
    disabled      = false
    issuer_url    = "http://dex:5557/dex"
    client_id     = "hermes-acceptance"
    client_secret = "YWNjZXB0YW5jZS1hcHAtc2VjcmV0"
    redirect_url  = "http://localhost:8001/auth/callback"
  }
}
```

## Frontend Integration

**Authentication Check** (`web/app/routes/authenticated.ts`):
- HEAD request to `/api/v2/me`
- Redirect to `/auth/login?redirect=<url>` if unauthenticated
- Preserves original URL for post-login redirect

**Proxy Middleware** (`web/server/index.js`):
- Proxies `/auth/*` and `/api/*` to backend
- Prevents Ember router interception

## Test Users

Static password connector provides:
- `test@hermes.local` / `password`
- `admin@hermes.local` / `password`

## Implementation Status

✅ Backend endpoints (login, callback, logout)  
✅ Session-based authentication  
✅ Frontend authentication check  
✅ Docker Compose configurations  
✅ Integration test support  
✅ Acceptance test support  

## References

- Source: `DEX_AUTHENTICATION.md`, `DEX_AUTHENTICATION_IMPLEMENTATION.md`
- Related: `AUTH_ARCHITECTURE_DIAGRAMS.md`, `SESSION_AUTHENTICATION_FIX.md`
