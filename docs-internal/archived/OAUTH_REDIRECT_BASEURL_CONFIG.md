# Environment-Agnostic OAuth Redirect Configuration

**Date**: October 8, 2025  
**Author**: AI Agent (Claude)  
**Status**: ✅ Implementation Complete

## Executive Summary

Implemented environment-agnostic OAuth redirect configuration for Hermes by introducing `base_url` configuration parameter. This solves the issue where OAuth callbacks would redirect users to the backend URL (port 8001) instead of the frontend URL (port 4201), causing user info to not display correctly.

## Problem Statement

When users authenticated via Dex OIDC, the backend's OAuth callback handler (`/auth/callback`) would redirect to `/dashboard` as a relative path. This caused the browser to navigate to `http://localhost:8001/dashboard` (backend static build) instead of `http://localhost:4201/dashboard` (Ember dev server).

**Impact**:
- Users landed on backend-served static build instead of live dev server
- Static build didn't make proper GET requests to `/api/v2/me` to fetch user info
- User menu showed "Guest User" instead of authenticated user's name
- Required manual navigation to correct port to see user info

**Root Cause**:
- Backend used relative path redirects (e.g., `/dashboard`)
- Relative paths resolve relative to current host/port
- No mechanism to specify frontend URL for redirects

## Solution Design

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       OAuth Authentication Flow                      │
└─────────────────────────────────────────────────────────────────────┘

1. User clicks login at frontend (http://localhost:4201)
   ↓
2. Frontend proxies /auth/login → Backend (http://localhost:8001)
   ↓
3. Backend redirects to Dex (http://localhost:5558/dex/auth)
   ↓
4. User authenticates at Dex
   ↓
5. Dex redirects to Backend callback (http://localhost:8001/auth/callback)
   ↓
6. Backend processes OAuth code, sets session cookie
   ↓
7. Backend redirects to: base_url + "/dashboard"
   NEW: http://localhost:4201/dashboard (frontend URL)
   OLD: /dashboard → http://localhost:8001/dashboard (backend URL)
   ↓
8. Frontend loads, makes GET /api/v2/me → displays user info ✅
```

### Configuration Schema

**HCL Configuration** (`config.hcl`):
```hcl
// Base URL for the application (where users access the UI)
// Used for OAuth redirects after authentication
base_url = "http://localhost:4201"  // For local development
// base_url = "https://hermes.example.com"  // For production
```

**Environment Variable** (optional):
```bash
export HERMES_BASE_URL="http://localhost:4201"
```

### Code Changes

**File**: `internal/api/auth.go`

**Before**:
```go
// Redirect to dashboard
redirectURL := "/dashboard"

// Check if there's a redirect URL in the query params
if redirect := r.URL.Query().Get("redirect"); redirect != "" {
    // Validate redirect URL to prevent open redirects
    if u, err := url.Parse(redirect); err == nil && u.Host == "" {
        redirectURL = redirect
    }
}

http.Redirect(w, r, redirectURL, http.StatusFound)
```

**After**:
```go
// Build redirect URL - use BaseURL from config if available
// This ensures we redirect to the frontend URL (e.g., http://localhost:4201)
// instead of the backend URL (e.g., http://localhost:8001)
redirectPath := "/dashboard"

// Check if there's a redirect path in the query params
if redirect := r.URL.Query().Get("redirect"); redirect != "" {
    // Validate redirect URL to prevent open redirects
    if u, err := url.Parse(redirect); err == nil && u.Host == "" {
        redirectPath = redirect
    }
}

// Construct absolute URL if BaseURL is configured
var redirectURL string
if cfg.BaseURL != "" {
    baseURL, err := url.Parse(cfg.BaseURL)
    if err != nil {
        log.Error("invalid base_url in configuration", "base_url", cfg.BaseURL, "error", err)
        redirectURL = redirectPath // Fallback to relative path
    } else {
        baseURL.Path = redirectPath
        redirectURL = baseURL.String()
    }
} else {
    // Fallback to relative redirect if BaseURL not configured
    redirectURL = redirectPath
}

log.Debug("redirecting after authentication", "url", redirectURL, "email", email)
http.Redirect(w, r, redirectURL, http.StatusFound)
```

**Key Features**:
1. **Backward Compatible**: Falls back to relative paths if `base_url` not configured
2. **Secure**: Validates redirect paths to prevent open redirect vulnerabilities
3. **Flexible**: Supports query parameter redirects for deep linking
4. **Error Handling**: Logs errors and falls back gracefully if URL parsing fails

## Configuration Examples

### Local Development (Separate Backend + Frontend)

**Terminal 1 - Backend**:
```bash
cd testing
docker compose up -d postgres meilisearch dex
cd ..
cp testing/config.hcl config.hcl
# Edit config.hcl: set base_url = "http://localhost:4201"
./hermes server -config=config.hcl
```

**Terminal 2 - Frontend**:
```bash
cd web
MIRAGE_ENABLED=false yarn ember server --port 4201 --proxy http://127.0.0.1:8001
```

**Configuration**:
```hcl
base_url = "http://localhost:4201"
```

### Containerized Development (docker-compose)

**Docker Compose** (`testing/docker-compose.yml`):
```yaml
services:
  hermes:
    environment:
      HERMES_BASE_URL: "http://localhost:4201"
    # ... rest of config
  
  web:
    ports:
      - "4201:4200"
    # ... rest of config
```

**Configuration**:
```hcl
base_url = "http://localhost:4201"  # Host-facing URL
```

### Production (Single Domain)

**Configuration**:
```hcl
base_url = "https://hermes.example.com"
```

**Nginx/Load Balancer**:
- Frontend serves `/` and static assets
- Backend handles `/api/*` and `/auth/*`
- All traffic on same domain, different paths

## Frontend Proxy Configuration

The Ember dev server's proxy middleware (`web/server/index.js`) automatically proxies backend requests:

```javascript
// Proxy configuration
const proxyTarget = options.proxy || process.env.PROXY_URL || 'http://127.0.0.1:8001';

// Auth proxy - handles login/callback/logout
app.use('/auth', createProxyMiddleware({
  target: proxyTarget,
  changeOrigin: true,
  pathRewrite: (path, req) => '/auth' + path
}));

// API proxy - handles all API requests
app.use('/api', createProxyMiddleware({
  target: proxyTarget,
  changeOrigin: true,
  pathRewrite: (path, req) => '/api' + path
}));
```

**Usage**:
```bash
# Via command line
yarn ember server --port 4201 --proxy http://127.0.0.1:8001

# Via environment variable
PROXY_URL=http://backend-container:8000 yarn start

# Via package.json script
yarn start:with-proxy  # Uses predefined proxy target
```

## Security Considerations

### Open Redirect Prevention

The implementation validates redirect URLs to prevent open redirect attacks:

```go
// Validate redirect URL to prevent open redirects
if redirect := r.URL.Query().Get("redirect"); redirect != "" {
    if u, err := url.Parse(redirect); err == nil && u.Host == "" {
        redirectPath = redirect  // ✅ Only allow path-only redirects
    }
}
```

**Allowed**: `/dashboard`, `/documents/123`, `/search?q=test`  
**Blocked**: `http://evil.com/phish`, `//attacker.com/steal`

### Cookie Security

Session cookies are configured with security flags:

```go
http.SetCookie(w, &http.Cookie{
    Name:     "hermes_session",
    Value:    email,
    Path:     "/",
    MaxAge:   int(7 * 24 * time.Hour / time.Second),
    HttpOnly: true,              // Prevents XSS access
    Secure:   r.TLS != nil,      // HTTPS-only in production
    SameSite: http.SameSiteLaxMode,  // CSRF protection
})
```

## Testing

### Manual Testing

1. **Start services**:
   ```bash
   cd testing && docker compose up -d
   cd ../web && MIRAGE_ENABLED=false yarn start:with-proxy
   ```

2. **Test authentication**:
   - Navigate to `http://localhost:4201`
   - Click login → redirected to Dex
   - Enter `test@hermes.local` / `password`
   - Verify redirect to `http://localhost:4201/dashboard`
   - Verify user menu shows "Test User"

3. **Verify network requests**:
   - Open DevTools → Network tab
   - Confirm `GET /api/v2/me` request made
   - Verify response contains user data

### Automated Testing

**Backend Unit Test** (future work):
```go
func TestCallbackHandler_RedirectWithBaseURL(t *testing.T) {
    cfg := config.Config{
        BaseURL: "http://frontend:4200",
    }
    
    // Test redirect URL construction
    // ...
}
```

**Integration Test** (Playwright):
```typescript
test('OAuth flow redirects to frontend URL', async ({ page }) => {
  await page.goto('http://localhost:4201');
  await page.click('button:has-text("Login")');
  
  // Should redirect to Dex
  await expect(page).toHaveURL(/localhost:5558/);
  
  // Login at Dex
  await page.fill('input[name="login"]', 'test@hermes.local');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  // Should redirect back to frontend URL
  await expect(page).toHaveURL('http://localhost:4201/dashboard');
  
  // User info should display
  await expect(page.locator('.user-menu')).toContainText('Test User');
});
```

## Migration Guide

### For Existing Deployments

1. **Update configuration file**:
   ```hcl
   // Add base_url to config.hcl
   base_url = "https://your-hermes-domain.com"
   ```

2. **Update environment variables** (if using):
   ```bash
   export HERMES_BASE_URL="https://your-hermes-domain.com"
   ```

3. **Rebuild and deploy**:
   ```bash
   make build
   make deploy  # Or your deployment process
   ```

4. **Test authentication flow**:
   - Complete a full login/logout cycle
   - Verify redirect URLs in browser network tab
   - Check that users land on correct URL after auth

### Backward Compatibility

If `base_url` is not configured, the system falls back to relative redirects (original behavior):

```go
if cfg.BaseURL != "" {
    // Use absolute URL
    redirectURL = baseURL.String()
} else {
    // Fallback to relative path (original behavior)
    redirectURL = redirectPath
}
```

This ensures existing deployments continue to work without configuration changes.

## Related Documentation

- `docs-internal/LOCAL_WORKSPACE_USER_INFO_FIX.md` - Complete fix documentation
- `docs-internal/DEX_AUTHENTICATION_IMPLEMENTATION.md` - Dex OIDC setup
- `testing/config.hcl` - Example testing configuration
- `web/server/index.js` - Ember dev server proxy middleware

## Commit Message

```
feat(auth): add base_url configuration for environment-agnostic OAuth redirects

**Prompt Used**:
Consider #file:LOCAL_WORKSPACE_USER_INFO_FIX.md - the frontend should configure
itself and then proxy all requests for dex and the backend web service when it's
in dev mode. We should avoid hard coding URLs as the web frontend can run inside
a container or in a local dev instance.

**Problem**:
OAuth callback handler redirected to relative path `/dashboard`, which resolved
to backend URL (http://localhost:8001) instead of frontend URL (http://localhost:4201).
This caused users to land on backend static build instead of Ember dev server,
preventing user info from displaying correctly.

**Solution**:
1. Added base_url configuration parameter to control OAuth redirect destination
2. Updated CallbackHandler to construct absolute URLs using base_url
3. Maintains backward compatibility (falls back to relative paths if not configured)
4. Validates redirect paths to prevent open redirect vulnerabilities

**Implementation**:
- internal/api/auth.go: Enhanced CallbackHandler to use cfg.BaseURL for redirects
- testing/config.hcl: Set base_url = "http://localhost:4201" for dev environment
- docs-internal/LOCAL_WORKSPACE_USER_INFO_FIX.md: Comprehensive documentation

**Configuration Examples**:
- Local dev: base_url = "http://localhost:4201"
- Docker: base_url = "http://localhost:4201" (host-facing port)
- Production: base_url = "https://hermes.example.com"

**Security**:
- Validates redirect paths (blocks external URLs)
- Preserves existing CSRF protection
- Maintains HttpOnly, Secure, and SameSite cookie flags

**Testing**:
- Backend builds successfully (make bin/linux)
- Container rebuilt and ready for testing
- Manual testing instructions documented
- Ready for integration testing with Ember dev server

**Verification**:
- make bin/linux: ✅ Success
- docker compose build hermes: ✅ Success
- Configuration updated: ✅ Complete
- Documentation complete: ✅ Done
```

## Conclusion

This implementation provides a clean, secure, and flexible solution for handling OAuth redirects across different deployment environments. The use of `base_url` configuration allows the same backend code to work seamlessly in:

- Local development (separate backend + frontend processes)
- Containerized environments (docker-compose)
- Production (single domain with reverse proxy)

The solution is backward compatible, secure against open redirects, and well-documented for future maintenance.
