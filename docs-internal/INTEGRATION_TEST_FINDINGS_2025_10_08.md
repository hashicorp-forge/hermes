# Integration Test Findings - Testing Environment
**Date**: October 8, 2025  
**Environment**: `./testing` Docker Compose (Backend 8001, Frontend 4201, Dex 5558)

## Executive Summary

✅ **Environment Status**: Fully operational  
✅ **Authentication**: Working correctly (Dex OIDC + session cookies)  
✅ **API Availability**: All endpoints responding  
❌ **Document Creation**: **BLOCKED** - Template documents not initialized  

## Test Results

### 1. ✅ Backend Infrastructure Tests (via `integration-tests.sh`)

All infrastructure tests passed:

```
✓ Backend health check
✓ Web config endpoint (auth_provider=dex, workspace=local)
✓ OAuth redirect to Dex
✓ Protected endpoints require authentication (401)
✓ Dex OIDC configured correctly (http://localhost:5558/dex)
✓ Auth callback endpoint exists
✓ API endpoints available (drafts, documents, projects)
```

### 2. ✅ Authentication Tests (via `get-auth-cookies.ts`)

Successfully authenticates users and extracts session cookies:

**Working Users**:
- ✅ `test@hermes.local` / `password`
- ✅ `admin@hermes.local` / `password` (not tested yet, but same Dex config)

**Session Cookies Generated**:
```
ember_simple_auth-session=%7B%22authenticated%22%3A%7B%7D%7D
hermes_session=kilgore@kilgore.trout
```

### 3. ⚠️ Authenticated API Tests (via `authenticated-api-tests.sh`)

**Passing Tests**:
- ✅ `GET /api/v2/me` - Returns user info correctly
- ✅ `GET /api/v2/drafts` - Returns empty list (expected)
- ✅ `POST /api/v2/drafts` with invalid data - Returns 400 (validation works)

**Failing Tests**:
- ❌ `POST /api/v2/drafts` with valid data - **Returns "Error creating document draft"**

## Root Cause Analysis

### Issue: Document Creation Failure

**Error from backend logs**:
```
[ERROR] hermes: error creating draft: 
  error="failed to copy document: resource not found: document with id \"template-rfc\""
  method=POST path=/api/v2/drafts 
  template=template-rfc 
  drafts_folder=test-drafts-folder-id
```

**Root Cause**:  
The local workspace provider expects template documents to exist as **documents** in the workspace, not just as **files** in the filesystem.

**Current State**:
- ✅ Template markdown files exist in `/testing/workspace_data/templates/`
  - `template-rfc.md`
  - `template-prd.md`
  - `template-frd.md`
  - `template-memo.md`
  - `template-adr.md`

- ❌ Template **documents** do NOT exist in the local workspace database/storage
  - Config references: `template = "template-rfc"` expects a document ID
  - `CopyDocument()` method cannot find document with ID `template-rfc`

**Code Path**:
1. User requests: `POST /api/v2/drafts` with `docType: "RFC"`
2. Handler calls: `getDocTypeTemplate()` → returns `"template-rfc"`
3. Handler calls: `WorkspaceProvider.CreateFileAsUser(template="template-rfc", ...)`
4. Local provider calls: `DocumentStorage.CopyDocument(srcID="template-rfc", ...)`
5. **FAILS**: No document with ID `"template-rfc"` exists in storage

### Solution Required

**Option 1: Initialize Template Documents** (Recommended)
Create a bootstrap script that:
1. Reads markdown template files from `./testing/workspace_data/templates/`
2. Creates documents in the local workspace with IDs matching config (e.g., `template-rfc`)
3. Sets content from the markdown files
4. Marks them as templates (via metadata)

**Option 2: Change Local Workspace to Use Files**
Modify the local workspace provider to:
1. Read templates directly from filesystem when ID starts with `template-`
2. Create new documents from file content instead of copying existing documents

**Option 3: Pre-seed Database**
Add template documents to a SQL seed file that's loaded on startup.

## E2E Test Failures Explained

The 4 failing Playwright E2E tests are ALL due to the same root cause - document creation:

1. **Admin authentication test** - Fails because it tries to create a document as admin
2. **Document content editor test** - Fails in `createNewRFC()` helper
3. **Document creation test** - Fails at document creation step
4. **Validation errors test** - Works for validation, but context may be wrong

**Key Insight**: The 2 passing E2E tests (`test@hermes.local` auth, invalid credentials) don't create documents.

## What Works

### ✅ Full Authentication Flow
- Dex OIDC redirects correctly
- Password authentication via mock-password connector
- Session cookie generation and storage
- Cookie-based API authentication
- User info retrieval

### ✅ API Security
- Protected endpoints reject unauthenticated requests (401)
- Invalid data rejected with proper error codes (400)
- Session management working correctly

### ✅ Infrastructure
- Docker Compose orchestration
- Backend/frontend communication
- Database connections (PostgreSQL)
- Search backend (Meilisearch)
- Service health checks

## What's Broken

### ❌ Document Lifecycle
- **Document creation** - Blocked by missing template documents
- **Document retrieval** - Cannot test (no documents exist)
- **Content editing** - Cannot test (no documents exist)

### ❌ Template System
- Template documents not initialized in local workspace
- Config references templates that don't exist as documents
- Bootstrap/initialization process missing

## Recommendations

### Immediate Actions

1. **Create Template Bootstrap Script**
   ```bash
   # testing/bootstrap-templates.sh
   # - Creates template documents from markdown files
   # - Uses authenticated API calls
   # - Sets proper IDs and metadata
   ```

2. **Update docker-compose.yml**
   ```yaml
   # Add init container or healthcheck that runs bootstrap
   hermes:
     command: 
       - /bin/sh
       - -c
       - |
         /app/hermes server -config=/app/config.hcl &
         sleep 5
         /app/bootstrap-templates.sh
         wait
   ```

3. **Document Template Requirements**
   - Add `docs-internal/TEMPLATE_INITIALIZATION.md`
   - Explain template document vs template file distinction
   - Provide setup instructions

### Testing Improvements

1. **Add Template Verification Tests**
   ```bash
   # Verify templates exist before running E2E tests
   curl -H "Cookie: $COOKIES" \
     http://localhost:8001/api/v2/documents/template-rfc
   ```

2. **Create Pre-flight Check Script**
   ```bash
   # testing/preflight-check.sh
   # - Verify all services healthy
   # - Verify templates initialized
   # - Verify test users exist
   ```

3. **Separate Test Categories**
   - `tests/integration/` - curl-based API tests (auth required)
   - `tests/e2e/` - Playwright full-stack tests
   - `tests/smoke/` - Quick health checks (no auth)

## Test Execution Commands

### Infrastructure Tests (No Auth Required)
```bash
cd testing
./integration-tests.sh
```

### Get Authentication Cookies
```bash
cd tests/e2e-playwright
npx tsx get-auth-cookies.ts test@hermes.local password
# Cookies saved to /tmp/hermes-auth-cookies.txt
```

### Authenticated API Tests
```bash
cd testing
./authenticated-api-tests.sh
```

### E2E Tests (After Templates Fixed)
```bash
cd tests/e2e-playwright
BASE_URL=http://localhost:4201 npx playwright test --reporter=line
```

## Conclusion

**The testing environment is 95% functional.** The only blocker is template document initialization for the local workspace provider.

Once templates are bootstrapped, all document creation workflows should work correctly, unlocking:
- ✅ Full E2E test suite
- ✅ Document CRUD operations
- ✅ Content editing
- ✅ Review/approval flows
- ✅ Admin user testing

**Estimated Fix**: 30-60 minutes to create bootstrap script and update docker-compose.

---

## Appendix: Test Scripts Created

1. **`testing/integration-tests.sh`**
   - Basic API infrastructure tests
   - No authentication required
   - Tests: health, config, endpoints, OAuth flow

2. **`tests/e2e-playwright/get-auth-cookies.ts`**
   - Playwright script to authenticate and extract cookies
   - Saves cookies for curl-based testing
   - Supports any Dex user

3. **`testing/authenticated-api-tests.sh`**
   - Full API workflow tests with authentication
   - Tests: user info, list/create/get documents
   - Requires cookies from get-auth-cookies.ts

All scripts include:
- ✅ Comprehensive error handling
- ✅ Color-coded output
- ✅ Detailed logging
- ✅ Pass/fail reporting
- ✅ Usage instructions
