# Admin Login Investigation - 2025-10-08

## Summary

**Finding**: admin@hermes.local authentication **WORKS CORRECTLY**, but there's a **frontend loading spinner issue** after successful authentication.

## Investigation Results

### ✅ Authentication is Working

**Test**: Logged in as admin@hermes.local with password "password"

**Evidence**:
1. Dex login form accepted credentials
2. Backend logs confirm success:
   ```
   [INFO] hermes: user authenticated successfully: email=admin@hermes.local
   [INFO] hermes: redirecting after authentication: url=http://localhost:4201/dashboard
   ```
3. All API endpoints return 200 OK:
   - `/api/v2/me` → 200 OK
   - `/api/v2/products` → 200 OK
   - `/api/v2/search/docs` → 200 OK
   - `/api/v2/me/recently-viewed-docs` → 200 OK
   - `/api/v2/me/recently-viewed-projects` → 200 OK

4. No authentication errors in backend or frontend logs

### ❌ Frontend Display Issue

**Symptom**: Dashboard gets stuck showing only a loading spinner (gray circle with Hermes logo)

**What's Working**:
- Authentication completes successfully
- All API requests return data
- No JavaScript errors in console
- Network requests all successful (200 OK)

**What's NOT Working**:
- Dashboard content never renders
- Loading spinner never disappears
- Page remains blank with only the spinner

**Console Messages** (all normal):
```
[DEBUG] Ember: 6.7.0
[DEBUG] Ember Data: 4.12.8
```

**Network Requests** (all successful):
```
[GET] /api/v2/web/config => 200 OK
[GET] /api/v2/me => 200 OK (after auth)
[GET] /api/v2/products => 200 OK
[POST] /api/v2/search/docs => 200 OK
[POST] /api/v2/search/docs_createdTime_desc => 200 OK
[GET] /api/v2/me/recently-viewed-docs => 200 OK
[GET] /api/v2/me/recently-viewed-projects => 200 OK
```

## Configuration Verification

### Backend (localhost:8001)
```bash
$ curl -s http://localhost:8001/api/v2/web/config | jq '.auth_provider, .skip_google_auth'
"dex"
true
```

✅ Correct - using Dex authentication

### Dex Users (testing/users.json)
```json
{
  "admin@hermes.local": {
    "email": "admin@hermes.local",
    "name": "Admin User",
    "id": "08a8684b-db88-4b73-90a9-3cd1661f5467",
    "groups": ["users", "admins"]
  }
}
```

✅ Correct - admin user exists

### Frontend Controller (web/app/controllers/authenticate.ts)
```typescript
protected authenticateOIDC = dropTask(async () => {
  window.location.href = `/auth/login`;  // ✅ Correct endpoint
});
```

✅ Correct - using `/auth/login` endpoint

## Root Cause Analysis

This is **NOT an authentication problem**. The issue is a **frontend rendering problem** after successful authentication.

### Possible Causes

1. **Outdated Docker Container**: The containerized frontend (port 4201) might be running old code without the latest fixes
2. **Ember Data Store Issue**: Similar to the documented EMBER_DATA_STORE_ERROR_FIX_2025_10_08.md
3. **HDS Component Loading**: Possible issue with HashiCorp Design System components
4. **Route Rendering**: Dashboard route not completing after data loads

### Evidence for Outdated Container

The containerized web frontend on port 4201 may not have the latest code. Recent fixes to `authenticate.ts` and other frontend components might not be in the built Docker image.

## Recommended Solutions

### Option 1: Rebuild Web Container (Recommended)

```bash
cd /Users/jrepp/hc/hermes/testing
docker compose build web --no-cache
docker compose up -d web

# Verify rebuild
docker compose logs web --tail=20
```

This ensures the container has the latest code with all authentication and frontend fixes.

### Option 2: Use Native Frontend Instead

```bash
# Use native frontend (port 4200) with testing backend (port 8001)
cd /Users/jrepp/hc/hermes/web
yarn start:proxy:testing

# Access at http://localhost:4200
```

The native frontend will have the latest code changes without needing to rebuild containers.

### Option 3: Check for Frontend Errors

```bash
# Check if there are build errors in the container
cd /Users/jrepp/hc/hermes/testing
docker compose logs web | grep -i "error\|fail"
```

## Test Credentials

All testing users use password: `password`

| Email | Name | Groups |
|-------|------|--------|
| test@hermes.local | Test User | users, testers |
| admin@hermes.local | Admin User | users, admins |
| user@hermes.local | Regular User | users |

## Related Documentation

- `TESTING_DOCKER_COMPOSE_DEBUG_2025_10_08.md` - Previous auth debugging session
- `EMBER_DATA_STORE_ERROR_FIX_2025_10_08.md` - Frontend loading spinner fixes
- `FRONTEND_PROXY_CONFIGURATION.md` - Proxy setup documentation
- `DEV_QUICK_REFERENCE.md` - Development workflow commands

## Screenshots

1. `user-menu-opened.png` - test@hermes.local logged in successfully
2. `admin-login-result.png` - admin@hermes.local stuck on loading spinner

## Conclusion

**admin@hermes.local CAN login successfully** - the authentication flow works correctly from start to finish. The issue is purely a frontend display problem where the dashboard content doesn't render after the data loads successfully.

**Recommended immediate action**: Rebuild the web container with `docker compose build web --no-cache` to ensure it has the latest frontend code with all fixes.
