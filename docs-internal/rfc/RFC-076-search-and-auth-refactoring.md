# RFC-076: Search and Authentication Refactoring

**Status**: Implemented  
**Date**: October 6, 2025  
**Type**: RFC (Architecture Refactoring)  
**Related**: RFC-007 (Multi-Provider Auth), RFC-009 (Provider Selection)

## Context

The system had two architectural issues:
1. Frontend made environment-dependent Algolia API calls (development: direct, production: proxied)
2. Authentication hardcoded to assume Google OAuth or Okta, without Dex support or runtime selection

## Part 1: Backend-Only Search

### Problem
- Development builds required Algolia credentials (`ALGOLIA_APP_ID`, `ALGOLIA_SEARCH_API_KEY`)
- Inconsistent behavior between environments
- Complexity in frontend search client configuration

### Solution
**All environments now proxy search through backend at `/1/indexes/*`**

**Changes**:
- `web/app/services/algolia.ts`: Always use proxy, removed environment branching
- `web/config/environment.js`: Removed Algolia credential env vars
- `web/mirage/algolia/hosts.ts`: Mock backend proxy instead of Algolia hosts
- Added auth header selection based on provider

**Benefits**:
✅ No build-time Algolia credentials needed  
✅ Consistent behavior across environments  
✅ Better security (credentials only on backend)  
✅ Simpler testing (mock single endpoint)  
✅ Docker-friendly (no real credentials needed)  

## Part 2: Multi-Provider Authentication

### Problem
- System assumed Google OAuth or Okta only
- No Dex support for acceptance testing
- No runtime provider selection

### Solution
**Runtime auth provider detection with Google/Okta/Dex support**

**Backend** (`web/web.go`):
```go
// Detect provider from config
authProvider := "google" // default
if cfg.Dex != nil && !cfg.Dex.Disabled {
    authProvider = "dex"
} else if cfg.Okta != nil && !cfg.Okta.Disabled {
    authProvider = "okta"
}

// Add to ConfigResponse
AuthProvider: authProvider,
DexIssuerURL: ...,  // if Dex
DexClientID: ...,   // if Dex
```

**Frontend** (`web/app/services/fetch.ts`):
```typescript
// Select auth header format based on provider
if (authProvider === "google") {
  headers["Hermes-Google-Access-Token"] = token;
} else if (authProvider === "dex" || authProvider === "okta") {
  headers["Authorization"] = `Bearer ${token}`;
}
```

**Benefits**:
✅ Runtime provider selection  
✅ Dex support for acceptance testing  
✅ Future-proof for new OIDC providers  
✅ No build changes (same bundle for any provider)  
✅ Type-safe header format per provider  

## Configuration Examples

### Dex (Testing)
```hcl
dex {
  issuer_url    = "http://localhost:5556/dex"
  client_id     = "hermes-test"
  client_secret = "test-secret"
  redirect_url  = "http://localhost:4200/callback"
}
```

Web build: No `GOOGLE_OAUTH2_CLIENT_ID` needed!

### Google OAuth (Production)
```hcl
google_workspace {
  oauth2 {
    client_id = "123456-abc.apps.googleusercontent.com"
    hd        = "hashicorp.com"
  }
}
```

## Docker Testing Impact

**Before**:
```yaml
# Required env vars - fails if missing
HERMES_WEB_ALGOLIA_APP_ID: "${ALGOLIA_APP_ID}"
HERMES_WEB_ALGOLIA_SEARCH_API_KEY: "${ALGOLIA_API_KEY}"
HERMES_WEB_GOOGLE_OAUTH2_CLIENT_ID: "${GOOGLE_CLIENT_ID}"
```

**After**:
```yaml
# All optional! ✅
HERMES_WEB_GOOGLE_OAUTH2_CLIENT_ID: ""  # Empty if using Dex
```

## Implementation Status

✅ Backend-only search proxy  
✅ Removed Algolia build credentials  
✅ Multi-provider auth detection  
✅ Provider-based header selection  
✅ OIDC reauthentication flow  
✅ Backward compatible with existing deployments  

## References

- Source: `SEARCH_AND_AUTH_REFACTORING.md`
- Related: `WEB_EXTERNAL_DEPENDENCIES_ANALYSIS.md`, `AUTH_ARCHITECTURE_DIAGRAMS.md`
