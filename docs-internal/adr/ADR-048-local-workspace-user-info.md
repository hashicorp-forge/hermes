# ADR-048: Local Workspace User Info Fix

**Status**: Accepted  
**Date**: October 8, 2025  
**Type**: ADR (Backend Decision)  
**Related**: RFC-047 (Local Workspace Setup), RFC-020 (Dex Authentication)

## Context

After Dex OIDC authentication in testing environment, user menu showed "Guest User (guest@hermes.local)" instead of authenticated user's actual name and email from `workspace_data/users.json`.

**Root Causes**:

1. **Wrong Provider Configuration**: `testing/config.hcl` specified `providers { workspace = "google" }` instead of `"local"`
2. **Uninitialized Provider**: Server initialization returned error "local workspace provider is not yet fully implemented" instead of instantiating `ProviderAdapter`
3. **ME Endpoint Flow**: Uses workspace provider's `SearchPeople` method as fallback when OIDC claims unavailable

## Decision

Fix backend to properly initialize local workspace provider and use it for user info retrieval.

**Changes Made**:

1. **Configuration** (`testing/config.hcl`):
   ```hcl
   providers {
     workspace = "local"  // Changed from "google"
     search    = "meilisearch"
   }
   ```

2. **Server Initialization** (`internal/cmd/commands/server/server.go`):
   ```go
   case "local":
       localCfg := cfg.LocalWorkspace.ToLocalAdapterConfig()
       adapter, err := localadapter.NewAdapter(localCfg)
       if err != nil {
           return 1
       }
       // Create workspace provider adapter
       workspaceProvider = localadapter.NewProviderAdapter(adapter)
   ```

3. **BaseURL Configuration** (environment-agnostic OAuth redirects):
   ```hcl
   base_url = "http://localhost:4201"  // Ember dev server
   ```

## Consequences

### Positive
- ✅ User info loads correctly from `users.json`
- ✅ Proper identity resolution in local workspace
- ✅ Testing environment fully functional without Google Workspace
- ✅ OAuth redirects go to correct frontend URL
- ✅ Environment-agnostic configuration

### Negative
- ❌ Requires separate config per environment
- ❌ `base_url` must be manually set (no auto-detection)
- ❌ OAuth callback still at backend port (by design)

## OAuth Redirect Flow

**Authentication Flow**:
1. User clicks login → Frontend proxies to backend
2. Backend redirects to Dex at `http://localhost:5558/dex/auth`
3. Dex authenticates → callback to backend at `http://localhost:8001/auth/callback`
4. Backend processes OAuth, sets session cookie
5. **Backend redirects to `base_url + "/dashboard"`** (e.g., `http://localhost:4201/dashboard`)
6. Frontend loads at dev server port, makes authenticated API calls
7. User info displays correctly

**Why OAuth callback stays at backend**:
- OAuth `redirect_uri` MUST point to backend (token exchange)
- Backend responsible for session cookie creation
- After processing, redirects to frontend via `base_url`

## Alternatives Considered

1. **Auto-detect frontend URL from request**
   - ❌ OAuth callback comes from Dex, not frontend
   - ❌ No reliable way to determine frontend URL from backend
   
2. **Use relative redirects**
   - ❌ Would redirect to backend port, not frontend
   - ❌ User lands on wrong server
   
3. **Frontend handles OAuth callback**
   - ❌ Violates OAuth security model (code exchange server-side only)
   - ❌ Exposes client secret
   
4. **Proxy both backend and frontend through single port**
   - ❌ Complex development setup
   - ❌ Doesn't match production architecture

## Configuration Examples

**Testing Environment** (`testing/config.hcl`):
```hcl
base_url = "http://localhost:4201"  # Ember dev server
providers { workspace = "local" }
dex {
  redirect_url = "http://localhost:8001/auth/callback"  # Backend callback
}
```

**Native Development** (`config.hcl`):
```hcl
base_url = "http://localhost:4200"  # Native dev server
providers { workspace = "local" }
dex {
  redirect_url = "http://localhost:8000/auth/callback"  # Native backend
}
```

**Production**:
```hcl
base_url = "https://hermes.company.com"
providers { workspace = "google" }
# OAuth redirects to production domain
```

## Verification

**Backend API Test**:
```bash
$ curl -b "hermes_session=test@hermes.local" \
  http://localhost:8001/api/v2/me | jq .
{
  "email": "test@hermes.local",
  "name": "Test User",
  "given_name": "Test",
  "picture": "https://ui-avatars.com/api/?name=Test+User..."
}
```

**Server Logs**:
```
Using workspace provider: local
2025-10-08T03:18:34.857Z [INFO]  hermes: listening on 0.0.0.0:8000...
2025-10-08T03:19:15.869Z [INFO]  hermes: user authenticated successfully: email=test@hermes.local
```

✅ Backend returns correct user info  
✅ Server uses local workspace provider  
✅ OAuth redirects to frontend correctly  
✅ User menu displays authenticated user  

## Future Considerations

- Add auto-detection of frontend URL from `Referer` header (with security validation)
- Support multiple `base_url` values per deployment stage
- Document `base_url` configuration in deployment guides
- Consider frontend-initiated OAuth flow (PKCE) for better separation

## References

- Source: `LOCAL_WORKSPACE_USER_INFO_FIX.md`
- Related: `LOCAL_WORKSPACE_SETUP_SUMMARY.md`, `DEX_AUTHENTICATION_IMPLEMENTATION.md`
