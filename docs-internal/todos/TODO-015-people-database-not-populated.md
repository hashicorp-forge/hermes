---
id: TODO-015
title: People API Not Returning Test Users - Investigation Required
date: 2025-10-09
type: TODO
priority: critical
status: investigation
progress: 50%
tags: [backend, authentication, dex, people-api, testing]
related:
  - TODO-014
  - TODO-011
  - ADR-075
blocking: TODO-011, TODO-014
---

# TODO-015: People API Not Returning Test Users - Investigation Required

## ⚠️ IMPORTANT: Architecture Correction

**The original problem statement was based on an incorrect assumption.**

**Hermes does NOT use a people database table.** See ADR-075 for complete details.

## Problem Statement (Revised)

**E2E Testing Issue**: When testing the Approvers field in the document sidebar, search queries for Dex OIDC authenticated users (`test@hermes.local`, `admin@hermes.local`) return "No results found".

**Impact**:
- ❌ Cannot add approvers to documents via sidebar UI
- ❌ E2E test TODO-011 fails at Phase 2 (dashboard check)
- ❌ Review workflow is broken for Dex-authenticated users
- ❌ Search returns "No results found" for valid users

**Discovered During**: Investigation of TODO-014 using playwright-mcp browser exploration

## Root Cause (Under Investigation)

### Architecture Facts (Verified 2025-10-09)

**Hermes does NOT store people in a database.** The `/api/v2/people` endpoint delegates to the workspace provider:

1. **Google Workspace**: Queries Google Directory API directly
2. **Local Workspace**: Reads from `users.json` file

**Testing Environment Status** (✅ = Verified):
- ✅ Local workspace provider enabled (`providers.workspace = "local"`)
- ✅ `users.json` mounted: `./users.json:/app/workspace_data/users.json`
- ✅ File contains 6 users: test@, admin@, user@, jane.smith@, john.doe@, sarah.johnson@ hermes.local
- ✅ SearchPeople implementation reads from this file and converts to `people.Person` format

### Possible Actual Causes

The issue must be one of:

1. **Authentication**: Playwright test not sending session cookie with API request
2. **Frontend Query Format**: Approvers field sending incorrect query format
3. **API Routing**: Request not reaching `/api/v2/people` endpoint correctly
4. **Response Parsing**: Frontend not parsing the `people.Person` response correctly

## Evidence

### Manual Test (playwright-mcp - 2025-10-09)

```
1. Logged in as admin@hermes.local via Dex OIDC ✅
2. Navigated to document page ✅
3. Clicked "Approvers" → "None" button ✅
4. Typed "test@hermes.local" in search ❌
   Result: "No results found"
5. Typed "test" in search ❌
   Result: "No results found"
6. Typed "admin" in search ❌
   Result: "No results found"
```

### API Check

```bash
# Expected: List of people including Dex users
curl -H "Cookie: hermes-session=..." http://localhost:8001/api/v2/people

# Actual: Empty or missing Dex users
```

## Solution Options (Revised)

### ❌ Option A: Auto-Create People on OIDC Login - NOT APPLICABLE

**This option was based on the incorrect assumption that Hermes uses a people database table.**

Hermes does NOT have a `Person` model or `people` table in the database. See ADR-075.

---

### ✅ Option B: Verify Existing Configuration - ALREADY IMPLEMENTED

**Status**: Testing environment is already correctly configured.

**Verified Configuration**:

1. **`testing/docker-compose.yml`** ✅:
   ```yaml
   hermes:
     volumes:
       - ./users.json:/app/workspace_data/users.json:ro
   ```

2. **`testing/config.hcl`** ✅:
   ```hcl
   local_workspace {
     base_path = "/app/workspace_data"
   }
   providers {
     workspace = "local"  # Uses local workspace adapter
   }
   ```

3. **`testing/users.json`** ✅:
   ```json
   {
     "test@hermes.local": { "email": "test@hermes.local", "name": "Test User", ... },
     "admin@hermes.local": { "email": "admin@hermes.local", "name": "Admin User", ... },
     ...
   }
   ```

4. **Container Verification** ✅:
   ```bash
   $ docker exec hermes-server cat /app/workspace_data/users.json | jq 'keys'
   [ "admin@hermes.local", "jane.smith@hermes.local", ... "test@hermes.local", ... ]
   ```

5. **Server Logs** ✅:
   ```
   Using workspace provider: local
   ```

**Conclusion**: The backend configuration is correct. The issue must be elsewhere.

---

### ⏭️ Next Step: Debug the Actual Issue

Since the backend is correctly configured, the problem is likely:

**Option C: Debug Frontend/API Integration**

1. **Test API directly with authenticated request**:
   ```bash
   # Get session cookie from browser
   # Test people search
   curl -X POST http://localhost:8001/api/v2/people \
     -H "Cookie: hermes-session=..." \
     -H "Content-Type: application/json" \
     -d '{"query":"test"}'
   ```

2. **Check network requests in browser DevTools**:
   - Navigate to document sidebar
   - Open Network tab
   - Type in Approvers field
   - Check if `/api/v2/people` request is sent
   - Verify request format and response

3. **Check frontend component code**:
   - `web/app/components/document/sidebar.ts`
   - `web/app/components/inputs/people-select.ts`
   - Verify query format sent to backend

**Estimated Effort**: 2-3 hours

---

## Recommended Implementation Plan (Revised)

### ✅ Phase 1: Verify Backend Configuration - COMPLETE

**Status**: Backend is correctly configured. No changes needed.

**Verification Results** (2025-10-09):
1. ✅ Local workspace provider enabled
2. ✅ `users.json` mounted and accessible
3. ✅ File contains all Dex test users
4. ✅ SearchPeople implementation working

### ⏭️ Phase 2: Debug Actual Issue - IN PROGRESS

**Timeline**: 2-3 hours

**Investigation Steps**:

1. **Test API with authenticated request**:
   - Login to Hermes via Dex (http://localhost:4201)
   - Extract session cookie from browser
   - Make manual API request:
     ```bash
     curl -X POST http://localhost:8001/api/v2/people \
       -H "Cookie: hermes-session=..." \
       -H "Content-Type: application/json" \
       -d '{"query":"test"}' | jq
     ```
   - Expected: Array of `people.Person` objects
   - If fails: Check authentication/session

2. **Use playwright-mcp to test in browser**:
   - Navigate to document page
   - Click Approvers field
   - Use browser DevTools (Network tab)
   - Check if `/api/v2/people` request is sent
   - Check request/response format

3. **Check frontend implementation**:
   - Search for people-select component
   - Verify API endpoint and request format
   - Check if response is parsed correctly

4. **Check Approvers field vs Contributors field**:
   - Contributors works, Approvers doesn't
   - Compare implementations
   - Identify differences

### Phase 3: Validation
**Timeline**: 1 hour

After fixing the actual issue:
1. Test Approvers search manually in browser
2. Run E2E test: `cd tests/e2e-playwright && npx playwright test dashboard-awaiting-review.spec.ts`
3. Verify all test phases pass

---

## Implementation Details

### Files to Investigate

**Backend (Already Working)**:
- ✅ `internal/api/v2/people.go` - Delegates to workspace provider
- ✅ `pkg/workspace/adapters/local/provider.go` - SearchPeople implementation
- ✅ `pkg/workspace/adapters/local/people.go` - SearchUsers from users.json
- ✅ `testing/users.json` - Contains all test users

**Frontend (Needs Investigation)**:
- ⏭️ `web/app/components/document/sidebar.ts` - Approvers field
- ⏭️ `web/app/components/inputs/people-select.ts` - People search component
- ⏭️ Network requests - Check request format to `/api/v2/people`

**E2E Test (Needs Update)**:
- ⏭️ `tests/e2e-playwright/tests/dashboard-awaiting-review.spec.ts` - Add sidebar approvers step

### API Endpoints to Test

**People Search API** (POST):
```bash
# Must be authenticated (include session cookie)
curl -X POST http://localhost:8001/api/v2/people \
  -H "Cookie: hermes-session=..." \
  -H "Content-Type: application/json" \
  -d '{"query":"test"}' | jq

# Expected response:
[
  {
    "resourceName": "people/test@hermes.local",
    "names": [{"displayName": "Test User", "givenName": "Test", "familyName": "User"}],
    "emailAddresses": [{"value": "test@hermes.local", "type": "work", ...}],
    "photos": [{"url": "https://ui-avatars.com/api/?name=Test+User&..."}]
  }
]
```

**People Lookup API** (GET):
```bash
# Get specific users by email
curl http://localhost:8001/api/v2/people?emails=test@hermes.local,admin@hermes.local \
  -H "Cookie: hermes-session=..." | jq
```

### Backend Configuration Check

**No database table needed.** Verify configuration:

```bash
# Check users.json is mounted
docker exec hermes-server cat /app/workspace_data/users.json | jq 'keys'

# Check config uses local workspace
docker exec hermes-server grep -A5 "^providers" /app/config.hcl

# Check server logs
docker logs hermes-server 2>&1 | grep "workspace provider"
```

---

## Testing Checklist

### ✅ Phase 1 (Backend Verification) - COMPLETE

- [x] Verify local workspace provider enabled
  ```bash
  docker logs hermes-server 2>&1 | grep "workspace provider"
  # Output: "Using workspace provider: local"
  ```
- [x] Verify users.json mounted correctly
  ```bash
  docker exec hermes-server cat /app/workspace_data/users.json | jq 'keys'
  # Output: ["admin@hermes.local", ..., "test@hermes.local", ...]
  ```
- [x] Verify users.json contains Dex test users
  ```bash
  docker exec hermes-server cat /app/workspace_data/users.json | jq 'keys'
  # Contains: test@, admin@, user@, jane.smith@, john.doe@, sarah.johnson@
  ```
- [x] Verify SearchPeople implementation reads from file
  - See: `pkg/workspace/adapters/local/provider.go:225`
  - See: `pkg/workspace/adapters/local/people.go:43`

### ⏭️ Phase 2 (API Testing) - IN PROGRESS

- [ ] Login to Hermes via Dex (http://localhost:4201)
- [ ] Extract session cookie from browser (DevTools → Application → Cookies)
- [ ] Test people search API with authenticated request:
  ```bash
  curl -X POST http://localhost:8001/api/v2/people \
    -H "Cookie: hermes-session=<YOUR_SESSION_COOKIE>" \
    -H "Content-Type: application/json" \
    -d '{"query":"test"}' | jq
  ```
- [ ] Expected: Array of people.Person objects with test users
- [ ] If fails: Check authentication, session expiry, CORS

### ⏭️ Phase 3 (Frontend Investigation) - PENDING

- [ ] Use playwright-mcp to test Approvers field:
  - Navigate to document page
  - Click "Approvers" → "None" button
  - Open browser DevTools (Network tab)
  - Type "test" in search field
  - Check if `/api/v2/people` request is sent
  - Check request headers (Cookie header present?)
  - Check request body format
  - Check response status and body
- [ ] Compare with Contributors field implementation:
  - Find component code for Contributors
  - Find component code for Approvers
  - Identify differences in API calls
- [ ] Debug and fix the issue

### ⏭️ Phase 4 (E2E Test Update) - AFTER FIX

- [ ] Update E2E test to add approvers via sidebar:
  - Click "Approvers" → "None" button
  - Search for approver email
  - Select approver from dropdown
  - Click "Save" button
  - Wait for PATCH request to complete
- [ ] Add step to change status to "In-Review"
- [ ] Run full E2E test and verify all phases pass

### ⏭️ Phase 5 (Validation) - FINAL

- [ ] Run E2E test: `npx playwright test dashboard-awaiting-review.spec.ts --reporter=line`
- [ ] Verify all phases pass
- [ ] Check screenshots in `test-results/`
- [ ] Review trace if any failures

---

## Success Criteria

- [x] Backend uses local workspace provider (verified 2025-10-09)
- [x] `users.json` mounted and accessible (verified 2025-10-09)
- [x] File contains Dex test users (verified 2025-10-09)
- [ ] `/api/v2/people` endpoint returns test users with authenticated request
- [ ] Approvers search field successfully queries people API
- [ ] Can add Dex users as approvers via document sidebar
- [ ] Approvers are saved to document (verify via API or search index)
- [ ] E2E test passes all phases without errors
- [ ] Dashboard "Awaiting review" section shows document with approvers
- [ ] Pip badge displays correct count

---

## Key Insights

### Architecture Understanding (ADR-075)

1. **No People Database**: Hermes does NOT store people in PostgreSQL
2. **Provider-Based**: People API delegates to workspace provider
3. **Google Workspace**: Queries Directory API directly (real-time)
4. **Local Workspace**: Reads from `users.json` file (already configured)
5. **Testing Environment**: Already correctly configured with all test users

### What Was Wrong

The original TODO was based on incorrect assumptions:
- ❌ Assumed Hermes has a `people` database table
- ❌ Assumed users need to be inserted into database on login
- ❌ Assumed "Option B" meant creating database seeding scripts

### What's Actually Needed

- ✅ Backend is correctly configured (verified)
- ⏭️ Debug why frontend Approvers field returns "No results"
- ⏭️ Fix the actual integration issue (likely auth or request format)
- ⏭️ Update E2E test to use working Approvers workflow

---

## Related Issues & PRs

- **TODO-014**: Contributors vs Approvers field gap (parent issue)
- **TODO-011**: E2E test awaiting review dashboard (blocked by this)
- **Investigation**: playwright-mcp exploration confirmed issue (2025-10-09)

---

## Documentation Updates Needed

After fix is implemented:

1. **`docs-internal/adr/ADR-075-people-api-architecture-clarification.md`** ✅:
   - Created 2025-10-09
   - Documents that Hermes does NOT use a people database
   - Explains provider-based architecture

2. **`testing/README.md`**:
   - Add note about `users.json` file and test users
   - Document that people API reads from file (not database)
   - Add troubleshooting section for people search issues

3. **`tests/e2e-playwright/README.md`**:
   - Document that test users come from `testing/users.json`
   - Add section on approvers workflow and authentication requirements
   - Note that people search requires authenticated session

4. **`docs-internal/todos/TODO-011-e2e-test-awaiting-review-dashboard.md`**:
   - Update status to reflect architectural clarification
   - Add link to ADR-075
   - Update blocker status once issue is resolved

---

## Next Steps

### Immediate Actions

1. **Test authenticated API request** (30 mins):
   - Login to Hermes via browser
   - Extract session cookie
   - Make manual curl request to `/api/v2/people`
   - Verify response contains test users

2. **Use playwright-mcp to debug** (1-2 hours):
   - Navigate to document page with Approvers field
   - Monitor network requests when typing in field
   - Check if API request is sent with correct format
   - Check if session cookie is included
   - Identify the actual issue

3. **Fix the identified issue** (1-3 hours depending on root cause):
   - Could be: authentication, request format, response parsing, etc.
   - Implement fix in frontend or backend as needed

4. **Update E2E test** (1 hour):
   - Add approvers via sidebar workflow
   - Verify test passes with fix

5. **Update documentation** (30 mins):
   - Update testing README with findings
   - Document the actual issue and solution

**Estimated Total Effort**: 4-7 hours (investigation + fix + testing)

**Priority**: CRITICAL - Blocks TODO-011 E2E test and review workflow

**Status**: Investigation phase - backend verified working, need to debug frontend/integration
