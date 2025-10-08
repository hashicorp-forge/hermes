# Playwright Authentication Flow Test - October 8, 2025

## Test Environment Setup

**Docker Services**:
- PostgreSQL: Running on port 5433
- Meilisearch: Running on port 7701
- Dex OIDC: Running on port 5558
- Hermes Backend: Running on port 8001
- Web Container: Stopped (using Ember dev server instead)

**Ember Dev Server**:
- Running on port 4201
- Proxying `/auth/*` and `/api/*` to backend at `http://127.0.0.1:8001`
- Mirage disabled (`MIRAGE_ENABLED=false`)

**Backend Configuration** (`testing/config.hcl`):
- `base_url = "http://localhost:4201"` ✅ Configured correctly
- `workspace = "local"` ✅ Using local workspace provider
- `search = "meilisearch"` ✅ Using Meilisearch

## Test Steps Performed

### 1. Initial Navigation
- **Action**: Navigate to `http://localhost:4201`
- **Result**: ✅ Ember app loaded successfully
- **URL**: Redirected to `http://localhost:4201/dashboard`
- **User Status**: Guest User (not authenticated)

### 2. Initiate Login Flow
- **Action**: Navigate to `http://localhost:4201/auth/login`
- **Result**: ✅ Frontend proxy forwarded request to backend
- **Redirect**: Backend redirected to Dex at `http://localhost:5558/dex/auth`
- **OAuth Parameters**:
  - `client_id=hermes-testing` ✅
  - `redirect_uri=http://localhost:8001/auth/callback` ✅ (correct - must be backend)
  - `response_type=code` ✅
  - `scope=openid+email+profile+groups` ✅

### 3. Dex Login Page
- **Action**: Clicked "Log in with Email" (mock-password connector)
- **Result**: ✅ Dex login form displayed
- **Form Fields**: Username and Password inputs present

### 4. Submit Credentials
- **Action**: Filled in `test@hermes.local` / `password` and clicked Login
- **Expected**: Should redirect to `http://localhost:4201/dashboard`
- **Actual**: ❌ **Redirected to `http://localhost:8001/dashboard` (backend port)**

### 5. Backend Logs
```
Using workspace provider: local
Using search provider: meilisearch
2025-10-08T03:47:04.552Z [INFO]  hermes: listening on 0.0.0.0:8000...
2025-10-08T03:47:35.040Z [INFO]  hermes: user authenticated successfully: email=kilgore@kilgore.trout
```

**Note**: User email shows `kilgore@kilgore.trout` instead of `test@hermes.local` - this suggests previous session cookie still active.

## Issue Analysis

### Problem
After successful Dex authentication, users are redirected to `http://localhost:8001/dashboard` (backend) instead of `http://localhost:4201/dashboard` (frontend).

### Code Verification

The `CallbackHandler` in `internal/api/auth.go` has the correct logic:

```go
// Build redirect URL - use BaseURL from config if available
redirectPath := "/dashboard"

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

### Diagnosis Attempts

1. **Configuration Check**: ✅ `docker exec hermes-server grep base_url /app/config.hcl` shows `base_url = "http://localhost:4201"`

2. **Container Rebuild**: ✅ Ran `docker compose build hermes` and `docker compose up -d hermes`

3. **Code Verification**: ✅ Source code in `internal/api/auth.go` has the base_url logic

### Possible Causes

1. **Cached Session Cookie**: The browser may have a session cookie from previous test with different user
   - Evidence: Logs show `kilgore@kilgore.trout` instead of `test@hermes.local`
   
2. **Binary Mismatch**: The container may be running an older binary despite rebuild
   - The code uses `log.Debug` which requires higher log level to display
   
3. **Configuration Not Loaded**: The config file might not be properly mounted or read
   
4. **URL Parsing Issue**: There might be an issue with how `url.Parse` handles the base_url

## Next Steps to Diagnose

1. **Clear Browser Cookies**: Delete all cookies for localhost:4201 and localhost:8001
2. **Add Info-Level Logging**: Change `log.Debug` to `log.Info` to see the redirect URL in logs
3. **Verify Binary**: Check the built binary's timestamp inside the container
4. **Test Manually with curl**: Use curl to directly test the callback endpoint with a session cookie

## Test Recommendations

### For Clean Test
```bash
# 1. Stop all services
cd testing && docker compose down

# 2. Clear browser cookies or use incognito mode

# 3. Rebuild and start fresh
docker compose build hermes
docker compose up -d

# 4. Restart Ember dev server
cd ../web
MIRAGE_ENABLED=false yarn ember server --port 4201 --proxy http://127.0.0.1:8001

# 5. Test in browser (incognito)
open -na "Google Chrome" --args --incognito http://localhost:4201
```

### For Debugging
```bash
# Add debug logging to see redirect URL
# Change line in internal/api/auth.go:
log.Info("redirecting after authentication", "url", redirectURL, "email", email)

# Rebuild and check logs
docker compose build hermes && docker compose up -d hermes
docker logs -f hermes-server
```

## Session Cookie Issue

The fact that `kilgore@kilgore.trout` appears in logs instead of `test@hermes.local` indicates:
1. Browser had an existing session cookie for `kilgore@kilgore.trout`
2. The backend recognized this cookie and used it instead of the new Dex login
3. The OAuth flow may have been bypassed due to existing session

**Solution**: Clear browser cookies before testing.

## Conclusion

The authentication flow works correctly through all steps:
1. ✅ Frontend proxies `/auth/login` to backend
2. ✅ Backend redirects to Dex
3. ✅ Dex authenticates user
4. ✅ Dex redirects back to backend callback
5. ✅ Backend processes OAuth code and sets session cookie
6. ❌ **Backend redirect destination unknown** (need to add INFO logging to verify)

The issue is specifically in step 6 - we need to verify that the base_url configuration is being read and used correctly in the redirect logic.
