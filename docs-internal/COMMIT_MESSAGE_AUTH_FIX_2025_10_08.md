# Commit Message for Authentication Fix

```
fix(web): correct auth endpoint URL in authenticate controller

**Prompt Used**:
use playwrite-mcp to debug the ./testing docker-compose setup with all the containers running

**AI Implementation Summary**:
- Fixed incorrect auth redirect URL in web/app/controllers/authenticate.ts
- Changed from `/api/v2/auth/${authProvider}/login` to `/auth/login`
- Backend registers auth endpoints at /auth/login, /auth/callback, /auth/logout
- Frontend was incorrectly trying to access /api/v2/auth/dex/login (404)
- Rebuilt web container with fix and verified authentication flow

**Root Cause**:
The frontend authentication controller was constructing an incorrect URL path that included the provider name. The backend auth endpoints don't include the provider in the URL - the provider is determined from server configuration (config.hcl).

**Testing Process**:
1. Used playwright-mcp to navigate to http://localhost:4201/authenticate
2. Identified loading spinner stuck due to 401 Unauthorized on /api/v2/me
3. Clicked "Authenticate with Dex" button → 404 error at /api/v2/auth/dex/login
4. Searched backend code and found correct endpoints: /auth/login, /auth/callback, /auth/logout
5. Applied fix to web/app/controllers/authenticate.ts (line 30)
6. Rebuilt web container: docker compose build web && docker compose up -d web
7. Verified complete auth flow via playwright-mcp

**Authentication Flow Verified**:
- ✅ User visits http://localhost:4201/
- ✅ Redirected to /authenticate page
- ✅ Clicked "Authenticate with Dex" button
- ✅ Redirected to Dex login page (http://localhost:5558/dex/auth)
- ✅ Filled credentials: test@hermes.local / password
- ✅ Successfully authenticated
- ✅ Redirected to dashboard (http://localhost:4201/dashboard)
- ✅ Dashboard loads with user data (Test User, documents visible)

**Backend Log Evidence**:
```
2025-10-09T02:10:53.771Z [INFO]  hermes: user authenticated successfully: email=test@hermes.local
2025-10-09T02:10:53.772Z [INFO]  hermes: redirecting after authentication: url=http://localhost:4201/dashboard
```

**Files Changed**:
- web/app/controllers/authenticate.ts (1 line changed)

**Environment**:
- Testing docker-compose environment
- All containers healthy: dex, postgres, meilisearch, hermes backend, web frontend
- Ports: 4201 (web), 8001 (backend), 5558 (dex)

**Verification**:
```bash
cd testing
docker compose up -d
# Wait for services to be healthy
# Navigate to http://localhost:4201 in browser
# Click "Authenticate with Dex"
# Login with test@hermes.local / password
# Should redirect to dashboard successfully
```

**Documentation**:
- Created docs-internal/TESTING_DOCKER_COMPOSE_DEBUG_2025_10_08.md
- Screenshots saved in .playwright-mcp/ directory
- Test credentials documented in testing/dex-config.yaml

**Related Issues**:
- Fixes authentication for all OIDC providers (Dex/Okta) in testing environment
- No impact on Google OAuth authentication (uses different code path)
```
