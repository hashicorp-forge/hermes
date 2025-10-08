# Frontend Validation with Playwright MCP

## Overview

This document describes the automated frontend validation strategy using Playwright MCP to test the Ember application in local dev proxy mode against the Docker Compose testing environment.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Test Environment                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Playwright MCP (Browser Automation)                            │
│         ↓                                                        │
│  http://localhost:4201  (Ember Dev Server)                      │
│         ↓ proxies to ↓                                          │
│  http://localhost:8001  (Hermes API - Docker Container)         │
│         ↓ depends on ↓                                          │
│  - PostgreSQL (5433 → 5432)                                     │
│  - Meilisearch (7701 → 7700)                                    │
│  - Dex OIDC (5558 → 5557)                                       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Docker Compose Environment Running**:
   ```bash
   cd /Users/jrepp/hc/hermes/testing
   docker compose up -d
   docker compose ps  # Verify all services healthy
   ```

2. **Ember Dev Server with Proxy**:
   ```bash
   cd /Users/jrepp/hc/hermes/web
   MIRAGE_ENABLED=false yarn ember server --port 4201 --proxy http://127.0.0.1:8001
   ```

3. **Playwright MCP Available**: Copilot has access to `mcp_microsoft_pla_browser_*` tools

## Test Scenarios

### Phase 1: Basic Connectivity & Authentication

1. **Navigate to Application**
   - URL: `http://localhost:4201`
   - Expected: Login page loads (Dex OIDC)
   - Verify: Page title, login button present

2. **Authenticate with Test User**
   - Action: Click login button
   - Redirects to: Dex login form
   - Enter credentials: `test-user-1@example.com` / `password`
   - Expected: OAuth callback redirect to dashboard

3. **Verify User Session**
   - Expected: `/api/v2/me` endpoint returns user info
   - Verify: User email displayed in UI
   - Verify: Navigation menu accessible

### Phase 2: Search Endpoint Validation

4. **Test New Search Endpoint**
   - Navigate to: Dashboard
   - Action: Trigger search (if search UI exists)
   - Expected: POST to `/api/v2/search/docs` or `/api/v2/search/drafts`
   - Verify: No 404 errors
   - Verify: Search results load (or empty state if no docs)

5. **Monitor Network Requests**
   - Capture: All XHR/fetch requests
   - Verify: No failed requests to `/1/indexes/*` (old Algolia proxy)
   - Verify: Successful requests to `/api/v2/search/*` (new endpoint)
   - Verify: No console errors

### Phase 3: Dashboard Loading

6. **Dashboard Loads Without Hanging**
   - Navigate to: `/dashboard` (or home route)
   - Expected: Dashboard loads within 10 seconds
   - Verify: No infinite spinner
   - Verify: Content visible (drafts list, recent docs, etc.)

7. **Recently Viewed Documents**
   - API: `/api/v2/me/recently-viewed-docs`
   - Expected: Returns 200 OK
   - Verify: UI displays recent docs (or empty state)

### Phase 4: Document Operations

8. **Browse Documents** (if any exist)
   - Navigate to: Documents list
   - Expected: List loads
   - Verify: Document cards render
   - Verify: Pagination works (if applicable)

9. **Create Draft** (if user has permissions)
   - Action: Click "New Document" button
   - Expected: Draft creation form
   - Fill form: Title, product, doc type
   - Submit: Creates draft
   - Verify: Redirects to draft editor

10. **Search Documents**
    - Action: Enter search query in search bar
    - Expected: Search results update
    - Verify: Uses `/api/v2/search/docs` endpoint
    - Verify: Results display correctly

## Validation Script Structure

```javascript
// Pseudo-code for test flow
async function validateHermesFrontend() {
  // 1. Navigate and wait for page load
  await browser.navigate('http://localhost:4201');
  await browser.waitFor('text=Sign in');
  
  // 2. Login via Dex
  await browser.click('button:text("Sign in")');
  await browser.waitFor('input[name="login"]');
  await browser.type('input[name="login"]', 'test-user-1@example.com');
  await browser.type('input[name="password"]', 'password');
  await browser.click('button[type="submit"]');
  
  // 3. Wait for redirect back to app
  await browser.waitFor('text=Dashboard', { timeout: 15000 });
  
  // 4. Verify user session
  const consoleMessages = await browser.consoleMessages();
  const hasErrors = consoleMessages.filter(m => m.type === 'error');
  assert(hasErrors.length === 0, 'No console errors');
  
  // 5. Check network requests
  const networkRequests = await browser.networkRequests();
  const searchRequests = networkRequests.filter(r => 
    r.url.includes('/api/v2/search/')
  );
  const oldAlgoliaRequests = networkRequests.filter(r =>
    r.url.includes('/1/indexes/')
  );
  
  assert(oldAlgoliaRequests.length === 0, 'No requests to old Algolia proxy');
  assert(searchRequests.every(r => r.status === 200), 'All search requests successful');
  
  // 6. Take screenshot
  await browser.takeScreenshot({ filename: 'dashboard-loaded.png' });
  
  return {
    success: true,
    consoleErrors: hasErrors,
    networkRequests: {
      total: networkRequests.length,
      searchEndpoint: searchRequests.length,
      oldAlgoliaProxy: oldAlgoliaRequests.length
    }
  };
}
```

## Test Data

### Test Users (from testing/users.json)

```json
{
  "test-user-1@example.com": {
    "emailAddress": "test-user-1@example.com",
    "displayName": "Test User 1",
    "firstName": "Test",
    "lastName": "User 1"
  },
  "test-user-2@example.com": {
    "emailAddress": "test-user-2@example.com",
    "displayName": "Test User 2",
    "firstName": "Test",
    "lastName": "User 2"
  }
}
```

### Dex Credentials

- **Username**: `test-user-1@example.com`
- **Password**: `password`

(Configured in `testing/dex-config.yaml`)

## Expected Outcomes

### Success Criteria

✅ **Authentication**:
- User can log in via Dex
- Session persists across page refreshes
- `/api/v2/me` returns user info

✅ **Search Endpoint**:
- No requests to `/1/indexes/*` (old Algolia proxy)
- All search requests use `/api/v2/search/{index}`
- Search requests return 200 OK (or 404 if no documents)

✅ **Dashboard**:
- Loads within 10 seconds
- No infinite spinner
- No console errors
- Content displays correctly

✅ **Network Requests**:
- All API requests return expected status codes
- No CORS errors
- No authentication failures

### Failure Indicators

❌ **Dashboard Hangs**:
- Spinner visible for >10 seconds
- Console error: Network timeout
- Failed requests to `/1/indexes/*`

❌ **Authentication Issues**:
- Login fails
- Redirect loop
- 401 Unauthorized on API requests

❌ **Search Failures**:
- 404 on `/api/v2/search/*`
- Console errors about search
- Empty results when documents exist

## Running the Validation

### Option 1: Interactive Playwright Session

```bash
# Start all services
cd /Users/jrepp/hc/hermes/testing
docker compose up -d

# In another terminal, start Ember dev server
cd /Users/jrepp/hc/hermes/web
MIRAGE_ENABLED=false yarn ember server --port 4201 --proxy http://127.0.0.1:8001

# Use Copilot with Playwright MCP tools to:
# 1. Navigate to http://localhost:4201
# 2. Log in with test credentials
# 3. Verify dashboard loads
# 4. Check network requests
# 5. Take screenshots
```

### Option 2: Automated Script (Future Enhancement)

Create a standalone Playwright test file that can be run with:
```bash
cd /Users/jrepp/hc/hermes/testing
npx playwright test frontend-validation.spec.ts
```

## Troubleshooting

### Ember Dev Server Won't Start

**Error**: "Port 4201 already in use"

**Solution**:
```bash
lsof -ti :4201 | xargs kill -9
MIRAGE_ENABLED=false yarn ember server --port 4201 --proxy http://127.0.0.1:8001
```

### Docker Services Not Healthy

**Error**: Container restarting or unhealthy

**Solution**:
```bash
docker compose logs hermes    # Check backend logs
docker compose restart hermes # Restart if needed
docker compose down && docker compose up -d  # Full restart
```

### Authentication Fails

**Error**: "Invalid credentials" or redirect loop

**Solution**:
1. Verify Dex is running: `docker compose ps dex`
2. Check Dex logs: `docker compose logs dex`
3. Verify config: `cat testing/dex-config.yaml`
4. Ensure `HERMES_BASE_URL=http://localhost:4201` in docker-compose.yml

### Search Requests Fail

**Error**: 404 on `/api/v2/search/*`

**Solution**:
1. Verify endpoint registered: Check server.go line 563
2. Rebuild backend: `cd testing && docker compose build hermes`
3. Restart: `docker compose restart hermes`
4. Check logs: `docker compose logs hermes | grep search`

### CORS Errors

**Error**: "CORS policy blocked request"

**Solution**:
- Verify Ember proxy is enabled: `--proxy http://127.0.0.1:8001`
- Check backend CORS headers (should allow localhost:4201)
- Verify ports match in all configs

## Monitoring During Tests

### Backend Logs
```bash
cd /Users/jrepp/hc/hermes/testing
docker compose logs -f hermes | grep -E "(search|error|panic)"
```

### Frontend Console
- Open DevTools in browser
- Monitor Console tab for errors
- Monitor Network tab for failed requests

### Database Activity
```bash
docker compose exec postgres psql -U postgres -d hermes_testing -c "SELECT COUNT(*) FROM documents;"
```

### Search Index Status
```bash
curl -H "Authorization: Bearer masterKey123" http://localhost:7701/indexes
```

## Success Metrics

After validation, document:

1. **Performance**:
   - Time to first render: ___ ms
   - Time to dashboard load: ___ ms
   - Search response time: ___ ms

2. **Reliability**:
   - Console errors: 0
   - Failed network requests: 0
   - Authentication success rate: 100%

3. **Functionality**:
   - ✅ Login works
   - ✅ Dashboard loads
   - ✅ Search works
   - ✅ Navigation works

## Next Steps After Validation

1. **If Passing**: Document success, update copilot-instructions.md
2. **If Failing**: Capture screenshots, logs, network traces for debugging
3. **Create Regression Suite**: Convert manual tests to automated Playwright tests
4. **Add CI Integration**: Run validation in GitHub Actions

---

**Document Version**: 1.0  
**Created**: October 8, 2025  
**Status**: Ready for Execution  
**Test Environment**: Docker Compose + Ember Dev Proxy
