# Playwright Document Creation Test - October 8, 2025

## Summary

Successfully completed end-to-end testing of Hermes authentication flow using Playwright MCP with testing environment (Docker Compose) and local Ember dev server in proxy mode. Identified several blockers in the document creation flow related to the Local workspace provider implementation.

## Test Environment Setup

### Components
- **Backend**: Hermes server in Docker (port 8001)
- **Database**: PostgreSQL 17.1 in Docker (port 5433)
- **Search**: Meilisearch 1.11 in Docker (port 7701)
- **Auth**: Dex OIDC in Docker (port 5558)
- **Frontend**: Local Ember dev server (port 4201) with proxy to backend

### Configuration
- Workspace Provider: **Local** (file-based, no Google Workspace)
- Search Provider: **Meilisearch**
- Auth Provider: **Dex OIDC** with static passwords
- User: `test@hermes.local` / `password`

## Test Execution

### ✅ Successful Steps

1. **Environment Verification**
   - All Docker containers running and healthy
   - Backend listening on port 8001
   - Frontend Ember server built successfully on port 4201

2. **Authentication Flow** 
   - Navigated to `http://localhost:4201/auth/login`
   - Redirected to Dex OIDC login page at `http://localhost:5558/dex/auth`
   - Selected "Log in with Email" (local connector with staticPasswords)
   - Filled credentials: `test@hermes.local` / `password`
   - Successfully authenticated and redirected to dashboard
   - Session cookie established

3. **Dashboard Access**
   - Landed on `/dashboard` with user "Test User" (TU avatar)
   - UI fully rendered with navigation, search, and "New" button
   - Footer showing "Hermes v0.5.0 (3c4cc95)"

4. **Template Selection Navigation**
   - Clicked "+ New" button
   - Navigated to `/new` template selection page
   - Saw RFC and PRD template options

### ❌ Blockers Encountered

#### 1. Frontend: animated-container Component Missing
**Location**: `/new/doc?docType=RFC`

**Error**:
```
Error: Attempted to resolve `animated-container`, which was expected to be a component, but nothing was found.
```

**Impact**: Cannot access document creation form through UI

**Root Cause**: The `animated-container` component (likely from `ember-animated`) is not properly registered or imported in the Ember app

---

#### 2. Backend: Template Document Copy Failure
**Endpoint**: `POST /api/v2/drafts`

**Error Log**:
```
[ERROR] hermes: error creating draft: error="failed to copy document: resource not found: document with id \"test-rfc-template-id\""
method=POST path=/api/v2/drafts
template=test-rfc-template-id
drafts_folder=test-drafts-folder-id
```

**Impact**: API-based document creation returns 500 error

**Root Cause**: The Local workspace provider's `CopyFile` method cannot find template documents even when they exist on the filesystem at `/app/workspace_data/docs/test-rfc-template-id/`

**Attempted Workaround**: 
- Created template documents manually in filesystem
- Templates exist with proper structure (metadata.json + content.md)
- Still not found by workspace provider

---

#### 3. Backend: Draft Listing Failure
**Endpoint**: `GET /api/v2/drafts`

**Error Log**:
```
[ERROR] hermes: error retrieving document drafts from search provider:
error="Search: unaccepted status code found: 400 expected: [200], 
MeilisearchApiError Message: Invalid facet distribution, attribute `` is not filterable.
The available filterable attributes are `approvers, contributors, createdTime, docType, modifiedTime, owners, product, status`."
```

**Impact**: "My Docs" page shows "You don't have any docs yet" even after manually creating drafts

**Root Cause**: Search query is using an empty string as a facet attribute, causing Meilisearch to reject the request

---

#### 4. Backend: Draft Retrieval by ID Failure
**Endpoint**: `GET /api/v2/drafts/RFC-1759904678`

**Response**: `404 Draft not found`

**Impact**: Manually created drafts not accessible via API

**Root Cause**: Local workspace provider not indexing filesystem drafts, or draft ID format mismatch

---

#### 5. Backend: Search Filter Errors
**Endpoints**: Various `/api/v2/search/docs*`

**Error Logs**:
```
[ERROR] hermes: error executing search:
Attribute `appCreated` is not filterable.
Available filterable attributes are: `approvers`, `contributors`, `createdTime`, `docType`, `modifiedTime`, `owners`, `product`, `status`.

[ERROR] hermes: error executing search:
Attribute `approvedBy` is not filterable.
```

**Impact**: Some search queries fail, though basic searches work

**Root Cause**: Meilisearch index missing `appCreated` and `approvedBy` as filterable attributes

---

## Workarounds Attempted

### Manual Draft Creation
Created draft document directly in filesystem:

**Files Created**:
```bash
/app/workspace_data/drafts/RFC-1759904678/
├── metadata.json
└── content.md
```

**metadata.json**:
```json
{
  "id": "RFC-1759904678",
  "googleFileID": "RFC-1759904678",
  "title": "Playwright Test RFC - Manual Creation",
  "docType": "RFC",
  "docNumber": "RFC-001",
  "product": "Engineering",
  "status": "WIP",
  "owners": ["test@hermes.local"],
  "approvers": [],
  "contributors": [],
  "summary": "This RFC was created manually...",
  "createdTime": "2025-10-08T06:24:38Z",
  "modifiedTime": "2025-10-08T06:24:38Z"
}
```

**Result**: Draft exists on filesystem but not accessible via API or UI

---

## Screenshots

Captured screenshots saved to `.playwright-mcp/`:
1. `hermes-initial-load.png` - Initial loading spinner
2. `dex-login.png` - Dex OIDC login page with connector options
3. `dashboard-authenticated.png` - Successfully authenticated dashboard
4. `new-document-template-selection.png` - Template selection page (RFC/PRD)
5. `new-rfc-error.png` - Blank page after animated-container error

---

## Root Cause Analysis

### Local Workspace Provider Issues

The Local workspace provider appears to be incomplete or not properly integrated with the rest of the system:

1. **Document Lookup**: Cannot find documents by ID even when they exist on filesystem
2. **Template Copying**: CopyFile method fails to locate template documents
3. **Draft Indexing**: Drafts created on filesystem are not indexed into Meilisearch
4. **API Integration**: Draft retrieval endpoints return 404 for filesystem documents

### Meilisearch Index Configuration

The Meilisearch indices are missing required filterable attributes:
- `appCreated` - Used in approval workflow queries
- `approvedBy` - Used in review/approval queries  
- Empty facet attribute in draft listing

### Frontend Component Dependencies

The document creation UI depends on `animated-container` which is not properly loaded, suggesting:
- Missing dependency in package.json
- Improper component registration
- Build configuration issue with ember-animated

---

## Next Steps to Unblock

### Priority 1: Fix Local Workspace Provider

**File**: `pkg/workspace/adapters/local/adapter.go`

1. Implement proper document indexing on startup
2. Fix `CopyFile` to correctly locate documents by ID
3. Ensure drafts are indexed into Meilisearch
4. Add logging to debug document lookup failures

### Priority 2: Fix Meilisearch Index Configuration

**File**: Meilisearch index setup (likely in indexer or startup code)

1. Add `appCreated` to filterable attributes for `docs` index
2. Add `approvedBy` to filterable attributes for `docs` index  
3. Fix empty facet attribute in draft queries

### Priority 3: Fix Frontend Component

**File**: `web/app/components/` or `web/app/templates/`

1. Ensure ember-animated is installed: `yarn add ember-animated`
2. Register `animated-container` component properly
3. Alternative: Replace animated-container with simpler transition

### Priority 4: Template Creation Script

Create initialization script to set up required templates:
- Create templates in correct format
- Index templates into Meilisearch
- Validate templates are discoverable via API

---

## Testing Validation Points

When fixes are implemented, verify:

1. ✅ User can authenticate via Dex OIDC
2. ✅ Dashboard loads successfully
3. ✅ Template selection page displays
4. ⏳ Document creation form loads without errors
5. ⏳ POST /api/v2/drafts successfully creates draft
6. ⏳ Created draft appears in "My Docs" list
7. ⏳ Draft is accessible via GET /api/v2/drafts/{id}
8. ⏳ Draft content is editable
9. ⏳ Search returns created documents

---

## Conclusion

Successfully demonstrated Hermes authentication and basic navigation using Playwright MCP in the testing environment. The test revealed that while the authentication layer and basic UI work correctly, the Local workspace provider needs significant work to support document creation and management. 

The integration between the Local workspace provider, Meilisearch indexing, and the API layer is incomplete, preventing end-to-end document creation testing.

**Recommendation**: Focus development effort on completing the Local workspace provider implementation before attempting further end-to-end testing of document workflows.
