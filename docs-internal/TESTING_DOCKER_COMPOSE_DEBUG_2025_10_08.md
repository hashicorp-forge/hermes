# Testing Docker-Compose Debug Session - October 8, 2025

## Summary
Successfully debugged and fixed the authentication flow in the `./testing` docker-compose environment using playwright-mcp browser tools.

## Environment
All containers were running and healthy:
- **PostgreSQL**: localhost:5433 → 5432
- **Meilisearch**: localhost:7701 → 7700
- **Dex**: localhost:5558 (external 5557), localhost:5559 (telemetry)
- **Hermes backend**: localhost:8001 → 8000
- **Web frontend**: localhost:4201 → 4200

## Issue Discovered

### Problem
The web frontend could not authenticate users. Users would click "Authenticate with Dex" and get a 404 error page.

### Root Cause
The frontend authentication controller was redirecting to an incorrect URL path:

**File**: `web/app/controllers/authenticate.ts` (line 30)

**Incorrect code**:
```typescript
window.location.href = `/api/v2/auth/${authProvider}/login`;
```

**Expected behavior**: Should redirect to `/auth/login`

### Why This Failed
1. The backend registers auth endpoints at:
   - `/auth/login` - Initiates OIDC flow
   - `/auth/callback` - OIDC callback handler
   - `/auth/logout` - Logout handler
   
2. The frontend was trying to access `/api/v2/auth/dex/login` which doesn't exist

3. Backend code reference: `internal/cmd/commands/server/server.go:608-613`

## Fix Applied

### Code Change
**File**: `web/app/controllers/authenticate.ts`

```typescript
// Before:
protected authenticateOIDC = dropTask(async () => {
  const authProvider = this.authProvider;
  window.location.href = `/api/v2/auth/${authProvider}/login`;
});

// After:
protected authenticateOIDC = dropTask(async () => {
  window.location.href = `/auth/login`;
});
```

**Rationale**: The backend auth endpoints don't include the provider name in the URL path. The provider is determined from the server configuration (`config.hcl`), not from the URL.

## Testing Process with Playwright-MCP

### 1. Initial Investigation
- Navigated to http://localhost:4201/
- Found page stuck on loading spinner
- Identified `/api/v2/me` endpoint returning 401 Unauthorized
- Backend logs showed: `authentication failed: provider=dex-session error="no session cookie found"`

### 2. Authentication Page Analysis
- Navigated to http://localhost:4201/authenticate
- Found "Authenticate with Dex" button
- Clicked button → redirected to non-existent `/api/v2/auth/dex/login` → 404 error

### 3. Code Investigation
- Located authentication controller in `web/app/controllers/authenticate.ts`
- Found incorrect URL construction using `${authProvider}` variable
- Checked backend route registration in `internal/cmd/commands/server/server.go`
- Confirmed backend uses `/auth/login` not `/api/v2/auth/${provider}/login`

### 4. Fix and Rebuild
- Updated `web/app/controllers/authenticate.ts` line 30
- Rebuilt web container: `docker compose build web && docker compose up -d web`
- Wait time: ~3 minutes (Ember build process)
- Note: Container initially killed by OOM (exit 137), restarted successfully

### 5. Verification
- Navigated to http://localhost:4201/authenticate
- Clicked "Authenticate with Dex" button
- Successfully redirected to Dex login page at http://localhost:5558/dex/auth
- Filled in test credentials:
  - Email: `test@hermes.local`
  - Password: `password`
- Successfully authenticated and redirected to http://localhost:4201/dashboard
- Dashboard loaded with user data (Test User, documents visible)

## Test Credentials
From `testing/dex-config.yaml`:

| Email | Password | Username | Groups |
|-------|----------|----------|--------|
| test@hermes.local | password | test | users, testers |
| admin@hermes.local | password | admin | users, admins |
| user@hermes.local | password | user | users |

## Backend Log Evidence

**Before Fix** (attempts to access wrong endpoint):
```
2025-10-09T02:01:10.655Z [ERROR] hermes: authentication failed: provider=dex-session error="no session cookie found" method=GET path=/api/v2/auth/dex/login
```

**After Fix** (successful authentication):
```
2025-10-09T02:10:53.771Z [INFO]  hermes: user authenticated successfully: email=test@hermes.local
2025-10-09T02:10:53.772Z [INFO]  hermes: redirecting after authentication: url=http://localhost:4201/dashboard base_url=http://localhost:4201 email=test@hermes.local
```

## Screenshots Captured
1. `authenticate-page.png` - Initial login page with "Authenticate with Dex" button
2. `dex-login-page.png` - Dex identity provider selection (Email/Mock)
3. `dex-login-filled.png` - Email login form with credentials filled
4. `dashboard-authenticated.png` - Successful dashboard view after authentication
5. `testing-homepage.png` - Initial loading spinner (before fix)

## Configuration Details

### Dex Configuration (testing/dex-config.yaml)
- Issuer: `http://localhost:5558/dex`
- Client ID: `hermes-testing`
- Client Secret: `dGVzdGluZy1hcHAtc2VjcmV0`
- Redirect URI: `http://localhost:8001/auth/callback`
- Authentication methods: Email (local), Mock

### Hermes Configuration (testing/config.hcl)
```hcl
base_url = "http://localhost:4201"

dex {
  disabled      = false
  issuer_url    = "http://localhost:5558/dex"
  client_id     = "hermes-testing"
  client_secret = "dGVzdGluZy1hcHAtc2VjcmV0"
  redirect_url  = "http://localhost:8001/auth/callback"
}
```

### Web Config Response (from /api/v2/web/config)
```json
{
  "auth_provider": "dex",
  "dex_issuer_url": "http://localhost:5558/dex",
  "dex_client_id": "hermes-testing",
  "dex_redirect_url": "http://localhost:8001/auth/callback",
  "workspace_provider": "local"
}
```

## Full Authentication Flow (Corrected)

1. **User visits** → http://localhost:4201/
2. **Unauthenticated** → Redirected to http://localhost:4201/authenticate
3. **Click "Authenticate with Dex"** → Frontend calls `window.location.href = '/auth/login'`
4. **Backend /auth/login** → Initiates OIDC flow, redirects to Dex
5. **Dex login page** → http://localhost:5558/dex/auth?client_id=...&redirect_uri=...
6. **User logs in** → Dex authenticates user (test@hermes.local)
7. **Dex callback** → http://localhost:8001/auth/callback?code=...&state=...
8. **Backend exchanges code** → Gets ID token, creates session, sets cookie
9. **Redirect to app** → http://localhost:4201/dashboard
10. **Dashboard loads** → `/api/v2/me` now returns user data with session cookie

## Docker Compose Notes

### Web Container Build Issues
- **First build**: Container killed (exit 137) due to OOM during Ember build
- **Solution**: Restart container, build completes on second attempt
- **Build time**: ~60 seconds for Ember compilation
- **Memory consideration**: Ember builds are memory-intensive, may need Docker resource adjustment

### Port Mappings (testing vs integration)
Testing environment uses non-conflicting ports:
- PostgreSQL: 5433 (vs 5432 in integration)
- Meilisearch: 7701 (vs 7700)
- Dex: 5558/5559 (vs 5556/5557 in integration)
- Backend: 8001 (vs 8000)
- Frontend: 4201 (vs 4200)

## Related Files

### Frontend
- `web/app/controllers/authenticate.ts` - **FIXED** authentication redirect
- `web/app/routes/authenticated.ts` - Auth enforcement for protected routes
- `web/app/routes/login.ts` - Login route logic

### Backend
- `internal/cmd/commands/server/server.go` - HTTP route registration
- `internal/api/auth.go` - Auth handlers (likely location)
- `internal/auth/dex/` - Dex OIDC provider implementation

### Configuration
- `testing/config.hcl` - Backend configuration (Dex, database, workspace)
- `testing/dex-config.yaml` - Dex identity provider configuration
- `testing/docker-compose.yml` - Container orchestration

## Playwright-MCP Tools Used

1. **mcp_microsoft_pla_browser_navigate** - Navigate to URLs
2. **mcp_microsoft_pla_browser_snapshot** - Get page structure for analysis
3. **mcp_microsoft_pla_browser_take_screenshot** - Capture visual evidence
4. **mcp_microsoft_pla_browser_click** - Interact with buttons/links
5. **mcp_microsoft_pla_browser_fill_form** - Fill login credentials
6. **mcp_microsoft_pla_browser_console_messages** - Check for errors
7. **mcp_microsoft_pla_browser_network_requests** - Analyze API calls

## Next Steps

### Recommended Testing
1. ✅ Verify authentication with all three test users
2. ✅ Test logout functionality
3. ✅ Test session persistence (refresh page)
4. ✅ Verify document creation/editing while authenticated
5. ✅ Test OIDC callback error handling

### Code Quality
1. Consider extracting auth endpoint URLs to a configuration/constant file
2. Add TypeScript types for auth provider values
3. Add integration tests for auth flow
4. Document auth endpoints in API documentation

### Future Improvements
1. Add retry logic for OOM build failures
2. Optimize Ember build for Docker (multi-stage build with caching)
3. Add health check for authentication service
4. Consider adding auth state debugging in development mode

## Conclusion

The authentication flow in the testing docker-compose environment is now fully functional. Users can:
- Access the application at http://localhost:4201
- Authenticate via Dex OIDC provider
- View the dashboard and access documents
- All backend services (PostgreSQL, Meilisearch, Dex) are integrated and working

The fix was minimal (one line change) but required careful debugging to identify the URL mismatch between frontend and backend auth endpoints.
