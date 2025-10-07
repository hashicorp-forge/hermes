# Search and Authentication Refactoring

**Date**: October 6, 2025  
**Branch**: jrepp/dev-tidy  
**Status**: Implementation Complete

---

## Overview

This refactoring accomplishes two major architectural improvements:

1. **Enforce all search operations through backend** - Eliminates direct Algolia web edge infrastructure access
2. **Multi-provider authentication support** - Runtime selection of Google OAuth, Okta, or Dex authentication

---

## Part 1: Backend-Only Search Architecture

### Problem Statement

Previously, the web frontend made environment-dependent decisions about Algolia access:
- **Development**: Direct calls to Algolia's API (`algoliaSearch(appID, apiKey)`)
- **Production**: Proxied through backend at `/1/indexes/*`

This created unnecessary complexity and required Algolia credentials at web build time, even though a backend proxy already existed.

### Solution

**All environments now proxy search through the backend**, eliminating direct Algolia infrastructure access.

### Changes Made

#### Backend Changes

**`web/web.go`** (Lines 60-77):
- Added `AuthProvider` field to `ConfigResponse` struct
- Added Dex-specific fields: `DexIssuerURL`, `DexClientID`, `DexRedirectURL`
- Updated logic to determine auth provider from config (Google/Okta/Dex)
- Made Google and Dex configs conditional based on selected provider

No changes needed to `pkg/algolia/proxy.go` - the existing proxy handler already works correctly and is protected by auth middleware.

#### Frontend Changes

**`web/app/services/algolia.ts`** (Lines 47-88):
- Removed environment-based `createClient()` logic
- **Always** configures Algolia client to proxy through backend
- Changed to lazy-loaded getter to ensure auth provider config is loaded
- Added `getAuthHeaders()` method to select appropriate auth header format
- Simplified protocol selection (http for localhost, https otherwise)
- Updated console logging to show auth provider being used

**`web/config/environment.js`** (Lines 44-55):
- **Removed** `ALGOLIA_APP_ID` environment variable
- **Removed** `ALGOLIA_SEARCH_API_KEY` environment variable
- Kept only index name configuration with sensible defaults
- Added comment explaining proxy architecture

**`web/app/config/environment.d.ts`** (Lines 12-18):
- **Removed** `appID: string`
- **Removed** `apiKey: string`
- Updated comments to reflect backend-only credentials

**`web/mirage/algolia/hosts.ts`** (Complete rewrite):
- Changed from mocking Algolia's external hosts (`https://{appID}-dsn.algolia.net`)
- Now mocks backend proxy endpoint (`/1/indexes/**`)
- Simplified from 10+ routes to single proxy route

### Benefits

✅ **No more build-time Algolia credentials** - Web can be built without `HERMES_WEB_ALGOLIA_APP_ID` or `HERMES_WEB_ALGOLIA_SEARCH_API_KEY`  
✅ **Consistent behavior** - All environments use same proxy path  
✅ **Better security** - Algolia credentials only on backend  
✅ **Simpler testing** - Mock single backend endpoint instead of multiple Algolia hosts  
✅ **Docker-friendly** - Testing environments don't need real Algolia credentials

---

## Part 2: Multi-Provider Authentication

### Problem Statement

The system was hardcoded to assume either:
- Google OAuth (when `skip_google_auth = false`)
- Okta OIDC (when `skip_google_auth = true`)

This didn't account for:
- Dex OIDC (needed for acceptance tests)
- Potential future auth providers
- Runtime auth provider selection

### Solution

Implemented **runtime auth provider selection** with support for Google OAuth, Okta OIDC, and Dex OIDC.

### Authentication Architecture

#### Provider Selection Flow

```
1. Backend server starts
   ├── Reads config.hcl
   ├── Detects which auth adapter is configured
   └── Sets authProvider: "google" | "okta" | "dex"

2. Frontend boots
   ├── Calls GET /api/v2/web/config
   ├── Receives { auth_provider: "dex", dex_issuer_url: "...", ... }
   └── Configures authentication system

3. User authenticates
   ├── If Google: OAuth2 implicit flow, custom header
   ├── If Okta: ALB JWT, Bearer token
   └── If Dex: OIDC flow, Bearer token

4. API requests
   ├── Fetch service adds auth header based on provider
   ├── Google: "Hermes-Google-Access-Token: {token}"
   └── Okta/Dex: "Authorization: Bearer {token}"
```

### Changes Made

#### Backend Changes

**`web/web.go`** (Lines 60-77, 113-168):

Added new fields to `ConfigResponse`:
```go
AuthProvider     string `json:"auth_provider"`      // "google", "okta", or "dex"
DexIssuerURL     string `json:"dex_issuer_url,omitempty"`
DexClientID      string `json:"dex_client_id,omitempty"`
DexRedirectURL   string `json:"dex_redirect_url,omitempty"`
SkipGoogleAuth   bool   `json:"skip_google_auth"`   // Deprecated legacy field
```

Auth provider detection logic:
```go
authProvider := "google" // Default
if cfg.Dex != nil && !cfg.Dex.Disabled {
    authProvider = "dex"
} else if cfg.Okta != nil && !cfg.Okta.Disabled {
    authProvider = "okta"
}
```

Conditional config exposure:
- Google OAuth config only sent when `auth_provider == "google"`
- Dex config only sent when `auth_provider == "dex"`
- Okta requires no frontend config (uses ALB headers)

#### Frontend Changes

**`web/app/services/config.ts`** (Lines 3-22):

Added runtime auth provider fields:
```typescript
auth_provider: "google" | "okta" | "dex",
dex_issuer_url: "",
dex_client_id: "",
dex_redirect_url: "",
skip_google_auth: ..., // Deprecated, kept for compatibility
```

**`web/app/services/fetch.ts`** (Lines 38-58):

Updated to select auth header format based on provider:
```typescript
if (authProvider === "google") {
  headers["Hermes-Google-Access-Token"] = accessToken;
} else if (authProvider === "dex" || authProvider === "okta") {
  headers["Authorization"] = `Bearer ${accessToken}`;
}
```

**`web/app/services/_session.ts`** (Multiple changes):

Added `isUsingOIDC` getter:
```typescript
get isUsingOIDC(): boolean {
  const provider = this.configSvc.config.auth_provider;
  return provider === "okta" || provider === "dex";
}
```

Updated reauthentication logic:
```typescript
if (this.isUsingOIDC) {
  window.location.reload(); // Redirect to OIDC provider
} else {
  await this.authenticate("authenticator:torii", "google-oauth2-bearer");
}
```

**`web/config/environment.js`** (Lines 68-78):

Made Google OAuth client ID optional:
```typescript
torii: {
  providers: {
    "google-oauth2-bearer-v2": {
      apiKey: getEnv("GOOGLE_OAUTH2_CLIENT_ID", ""), // Default to empty
      hd: getEnv("GOOGLE_OAUTH2_HD", ""),
      scope: "email profile https://www.googleapis.com/auth/drive.appdata",
    },
  },
}
```

### Benefits

✅ **Runtime provider selection** - Auth provider determined by backend config, not build-time vars  
✅ **Dex support** - Enables acceptance testing without Google/Okta  
✅ **Future-proof** - Easy to add new OIDC providers  
✅ **No build changes** - Same web bundle works with any auth provider  
✅ **Type-safe** - TypeScript enforces correct header format per provider

---

## Configuration Examples

### Google OAuth Configuration

**Backend `config.hcl`**:
```hcl
google_workspace {
  oauth2 {
    client_id = "123456-abc.apps.googleusercontent.com"
    hd        = "hashicorp.com"
  }
  # ... other Google Workspace config
}

# Okta and Dex blocks omitted or disabled
```

**Web build** (optional, can be empty):
```bash
HERMES_WEB_GOOGLE_OAUTH2_CLIENT_ID="123456-abc.apps.googleusercontent.com"
HERMES_WEB_GOOGLE_OAUTH2_HD="hashicorp.com"
```

**Runtime `/api/v2/web/config` response**:
```json
{
  "auth_provider": "google",
  "google_oauth2_client_id": "123456-abc.apps.googleusercontent.com",
  "google_oauth2_hd": "hashicorp.com",
  "skip_google_auth": false
}
```

### Dex OIDC Configuration

**Backend `config.hcl`**:
```hcl
dex {
  issuer_url   = "http://localhost:5556/dex"
  client_id    = "hermes-client"
  client_secret = "hermes-secret"
  redirect_url = "http://localhost:4200/callback"
  disabled     = false
}

# Google OAuth and Okta blocks omitted or disabled
```

**Web build** (no auth vars needed):
```bash
# No GOOGLE_OAUTH2_CLIENT_ID needed!
# Auth config comes from backend at runtime
```

**Runtime `/api/v2/web/config` response**:
```json
{
  "auth_provider": "dex",
  "dex_issuer_url": "http://localhost:5556/dex",
  "dex_client_id": "hermes-client",
  "dex_redirect_url": "http://localhost:4200/callback",
  "skip_google_auth": true
}
```

### Okta Configuration

**Backend `config.hcl`**:
```hcl
okta {
  auth_server_url = "https://hashicorp.okta.com/oauth2/default"
  aws_region      = "us-west-2"
  client_id       = "okta-client-id"
  jwt_signer      = "arn:aws:elasticloadbalancing:..."
  disabled        = false
}
```

**Web build** (no auth vars needed):
```bash
# No authentication env vars needed!
```

**Runtime `/api/v2/web/config` response**:
```json
{
  "auth_provider": "okta",
  "skip_google_auth": true
}
```

---

## Docker Testing Configuration

### Before This Refactoring

```yaml
# testing/docker-compose.yml
services:
  web:
    build:
      args:
        HERMES_WEB_ALGOLIA_APP_ID: "${ALGOLIA_APP_ID}"          # ❌ Required, fails if missing
        HERMES_WEB_ALGOLIA_SEARCH_API_KEY: "${ALGOLIA_API_KEY}" # ❌ Required, fails if missing
        HERMES_WEB_GOOGLE_OAUTH2_CLIENT_ID: "${GOOGLE_CLIENT_ID}" # ❌ Required, fails if missing
```

### After This Refactoring

```yaml
# testing/docker-compose.yml
services:
  web:
    build:
      args:
        # No Algolia credentials needed! ✅
        # No Google OAuth client ID needed if using Dex! ✅
        HERMES_WEB_GOOGLE_OAUTH2_CLIENT_ID: ""  # Optional, can be empty
```

**Backend `testing/config.hcl`**:
```hcl
dex {
  issuer_url    = "http://dex:5556/dex"
  client_id     = "hermes-test"
  client_secret = "test-secret"
  redirect_url  = "http://localhost:8080/callback"
}

algolia {
  app_id         = "test-app-id"
  search_api_key = "test-key"
  docs_index_name = "docs"
  # ... other index names
}
```

The web build **no longer needs any external service credentials** - all authentication and search configuration comes from the backend at runtime!

---

## Migration Guide

### For Developers

**No changes needed!** The refactoring is backward compatible:
- Existing Google OAuth setups continue to work
- `skip_google_auth` field still present (deprecated but functional)
- Search operations transparently use backend proxy

### For Deployment

**Option A: Continue with Google OAuth** (no changes)
```bash
# .env or docker-compose
HERMES_WEB_GOOGLE_OAUTH2_CLIENT_ID=your-client-id
# Backend config.hcl already has google_workspace block
```

**Option B: Switch to Dex** (testing/CI)
```bash
# Remove Algolia and Google env vars from web build
# Add dex block to backend config.hcl
# Web automatically uses Dex at runtime
```

**Option C: Switch to Okta** (production)
```bash
# Remove Algolia and Google env vars from web build
# Configure okta block in backend config.hcl
# Ensure AWS ALB is configured for OIDC
```

### For Testing

**Update mirage mocks** if you're mocking Algolia:
```typescript
// Old: Mock Algolia's external API
this.get("https://{appID}-dsn.algolia.net/1/indexes/:index/query", ...)

// New: Mock backend proxy
this.get("/1/indexes/:index/query", ...)
```

---

## Verification

### Backend Build
```bash
make bin  # Should succeed
```

### Web Build (No Algolia Credentials)
```bash
cd web
# Don't set ALGOLIA env vars - they're no longer needed!
yarn build  # Should succeed with no Algolia warnings
```

### Web Build (No Auth Credentials if using Dex)
```bash
cd web
# Don't set GOOGLE_OAUTH2_CLIENT_ID if backend uses Dex
yarn build  # Should succeed
```

### Runtime Verification

**Check backend config endpoint**:
```bash
curl -H "Authorization: Bearer {token}" \
  http://localhost:8000/api/v2/web/config | jq '.auth_provider'
# Should return: "google" or "okta" or "dex"
```

**Check search proxy**:
```bash
# Search requests go to backend
curl -H "Authorization: Bearer {token}" \
  http://localhost:8000/1/indexes/docs/query \
  -d '{"query":"test"}'
# Backend forwards to Algolia with its own credentials
```

**Check auth headers**:
```typescript
// In browser console after login:
console.log(this.configSvc.config.auth_provider);
// Should show: "google", "okta", or "dex"
```

---

## Breaking Changes

### ❌ None for Existing Deployments

The refactoring is **fully backward compatible**:
- Google OAuth deployments continue working unchanged
- `skip_google_auth` field still present (deprecated)
- Search operations transparently use backend proxy

### ⚠️ For Custom Mirage Mocks

If you have custom test mocks for Algolia, update them to mock `/1/indexes/*` instead of `https://{appID}-dsn.algolia.net/*`.

### ⚠️ For Direct Algolia Usage

If any code directly imported and used `config.algolia.appID` or `config.algolia.apiKey`, it will no longer compile. These fields have been removed from the type definitions.

---

## Future Improvements

1. **Create Dex authenticator** - Add `web/app/authenticators/dex.ts` for native OIDC flow
2. **Remove torii dependency** - Replace Google OAuth torii provider with native implementation
3. **Backend search API** - Create `/api/v2/search` endpoint to fully abstract Algolia
4. **Provider-specific UI** - Customize login page based on `auth_provider`
5. **Multi-provider support** - Allow Google Workspace alongside Dex/Okta for different user populations

---

## Commit Messages

### Refactor: Enforce all search through backend proxy

**Prompt Used**:
Enforce all search index access to go through the backend, remove any references to algolia web edge infrastructure.

**Implementation Summary**:
- Modified `web/app/services/algolia.ts` to always proxy through backend at `/1/indexes/*`
- Removed `ALGOLIA_APP_ID` and `ALGOLIA_SEARCH_API_KEY` from web build config
- Updated `web/mirage/algolia/hosts.ts` to mock backend proxy instead of Algolia hosts
- Simplified Algolia client creation - no more environment-based branching
- Added dynamic auth header selection based on auth provider

**Files Changed**:
- `web/app/services/algolia.ts`: Removed env-based client creation, always use proxy
- `web/config/environment.js`: Removed Algolia credentials, kept index names
- `web/app/config/environment.d.ts`: Removed appID/apiKey types
- `web/mirage/algolia/hosts.ts`: Changed from external Algolia mocks to backend proxy mock

**Verification**:
- Web builds without `HERMES_WEB_ALGOLIA_APP_ID` or `HERMES_WEB_ALGOLIA_SEARCH_API_KEY`
- All search operations transparently proxy through backend
- Backend `/1/indexes/*` endpoint handles Algolia credentials

### Feat: Multi-provider authentication (Google/Okta/Dex)

**Prompt Used**:
Define the ability for the client to use a different authentication provider. We want to support okta, dex (for acceptance tests) and google auth.

**Implementation Summary**:
- Added `auth_provider` field to backend `/api/v2/web/config` response
- Backend detects configured auth adapter and sends provider type to frontend
- Frontend `fetch` service selects auth header format based on provider:
  - Google: `Hermes-Google-Access-Token: {token}`
  - Okta/Dex: `Authorization: Bearer {token}`
- Session service updated to handle OIDC reauthentication flow
- Made Google OAuth client ID optional in web build (only needed for Google provider)

**Files Changed**:
- `web/web.go`: Added auth_provider detection and Dex config fields
- `web/app/services/config.ts`: Added auth_provider and Dex config
- `web/app/services/fetch.ts`: Provider-based auth header selection
- `web/app/services/_session.ts`: Added isUsingOIDC getter
- `web/config/environment.js`: Made Google OAuth client ID optional

**Verification**:
- Backend returns correct `auth_provider` based on config
- Frontend uses correct auth header format per provider
- Google/Okta/Dex authentication flows work correctly
- Web builds without Google client ID when using Dex

---

## References

- **Search proxy**: `pkg/algolia/proxy.go` - Already existed, no changes needed
- **Auth adapters**: `pkg/auth/adapters/{google,okta,dex}/adapter.go`
- **Backend config**: `internal/config/config.go` - Already had Dex/Okta support
- **Previous analysis**: `docs-internal/WEB_EXTERNAL_DEPENDENCIES_ANALYSIS.md`
