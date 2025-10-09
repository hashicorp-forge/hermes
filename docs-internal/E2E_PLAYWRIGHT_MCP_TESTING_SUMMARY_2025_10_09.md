# E2E Testing with playwright-mcp - Session Summary

**Date**: October 9, 2025  
**Testing Environment**: ./testing (Docker Compose) + Local Ember Proxy  
**Method**: playwright-mcp browser automation

## Executive Summary

Successfully completed E2E testing of document editing functionality using playwright-mcp with the local testing environment. The testing revealed **one critical frontend bug** while confirming that backend save operations work correctly.

## Testing Setup

### Environment Configuration
- **Backend**: Docker container (port 8001) with local workspace provider
- **Frontend**: Local Ember dev server (port 4200) proxying to backend
- **Database**: PostgreSQL 17.1 (port 5433)
- **Search**: Meilisearch v1.11 (port 7701)
- **Auth**: Dex OIDC (ports 5558/5559)

### Services Status
All services running and healthy:
```
✅ hermes-server (backend)
✅ hermes-web (frontend container, not used in this test)
✅ testing-postgres-1
✅ testing-meilisearch-1
✅ hermes-dex
```

### Authentication
- Successfully authenticated as `admin@hermes.local` via Dex OIDC
- Auth flow worked seamlessly
- Dashboard loaded correctly with user info

## Test Results

### ✅ **PASS**: Document Navigation
- Dashboard loaded successfully
- Recently viewed documents displayed correctly
- Document links navigated to document detail page
- Sidebar metadata displayed properly

### ✅ **PASS**: Edit Mode Activation
- "Edit" button on document detail page worked
- Editor UI switched to edit mode correctly
- Large textarea loaded with existing document content
- Cancel and Save buttons appeared

### ✅ **PASS**: Content Modification
- Successfully cleared existing content (Ctrl+A)
- Successfully typed new content (Markdown format)
- Textarea accepted full document with:
  - Headings
  - Lists
  - Bold text
  - Paragraphs

### ✅ **PASS**: Backend Save Operation
- API call succeeded: `PUT /api/v2/documents/{id}/content => 200 OK`
- Success message displayed: "Document saved successfully"
- Backend logs confirmed: `updated document content via local workspace provider`
- File verification confirmed content written to disk:
  ```
  /app/workspace_data/drafts/e92a95903b8fcfd3ac01f2d858741a18.md
  ```
- Modified timestamp updated correctly
- Content persisted with proper frontmatter

### ❌ **FAIL**: Content Display After Save

**Issue**: After clicking Save, the document content view does NOT update to show the new content.

**Observed Behavior**:
1. User edits content in textarea
2. User clicks "Save"
3. Success toast appears: "Document saved successfully"
4. Editor closes, returns to view mode
5. ❌ Content area still shows placeholder text: "Click 'Edit' to modify this document's content."
6. Page refresh (F5) also shows placeholder text

**Expected Behavior**:
- After save, content should display the newly saved Markdown content
- Content should render from the API response

**Backend Evidence**:
```bash
# File content verified:
$ docker compose exec hermes cat /app/workspace_data/drafts/e92a95903b8fcfd3ac01f2d858741a18.md

---
id: e92a95903b8fcfd3ac01f2d858741a18
modified_time: 2025-10-09T16:07:58.760420886Z
---

# E2E Test Document

## Overview
This is a test document created during E2E testing with playwright-mcp.
[... full content ...]
```

**API Evidence**:
- `GET /api/v2/documents/{id}/content => 200 OK` (before edit)
- `PUT /api/v2/documents/{id}/content => 200 OK` (save succeeded)
- No GET request after save to reload content

**Root Cause Hypothesis**:
The document content component (`DocumentContent` or similar) is not:
1. Reloading content after save operation
2. Invalidating cached content
3. Refreshing the model/store data

**Impact**: **HIGH**
- Users cannot see their edited content without complex workarounds
- May lead users to believe save failed
- Breaks basic document editing workflow

### ✅ **PASS**: New Document Form
- Template selection page loaded correctly
- RFC template form displayed with:
  - Title field (required, auto-focused)
  - Summary field
  - Product/Area dropdown (required)
  - Contributors search
  - "Create Draft" button
- Form accepted input correctly

## Screenshots Captured

1. **document-editor-open.png** - Editor with original RFC template content
2. **document-editor-modified.png** - Editor with new E2E test content
3. **document-after-save.png** - View mode after save (showing bug)
4. **new-document-form.png** - New RFC creation form with title filled

## Issues to Tackle

### Priority 1: Critical
1. **Document Content Not Displayed After Save**
   - Location: `web/app/components/document/content.ts` or similar
   - Fix: Add content reload after save operation
   - API call: Trigger `GET /api/v2/documents/{id}/content` after successful save
   - Consider: Model invalidation/refresh in Ember Data store

### Priority 2: High
2. **Initial Content Not Displayed**
   - The document shows placeholder text even on first load
   - May be related to local workspace provider content serving
   - Check: `GET /api/v2/documents/{id}/content` response format
   - Verify: Frontend content rendering component

### Priority 3: Medium
3. **Meilisearch Indexing Errors**
   - Backend logs show: `context canceled` errors when indexing drafts
   - Not blocking functionality but may affect search
   - Location: Search index sync operations

### Priority 4: Low
4. **Console Warnings**
   - Style binding security warning (expected, non-blocking)
   - No JavaScript errors during testing

## Recommended Next Steps

### Immediate (Fix Content Display Bug)
1. **Investigate content component**:
   ```bash
   grep -r "Click.*Edit.*to modify" web/app/
   # Find component showing placeholder text
   ```

2. **Check save handler**:
   ```bash
   grep -r "Document saved successfully" web/app/
   # Find component handling save success
   ```

3. **Add content reload**:
   - After successful save, trigger content fetch
   - Update component state with new content
   - Ensure Markdown rendering pipeline executes

4. **Test fix**:
   ```bash
   cd tests/e2e-playwright
   npx playwright test document-content-editor.spec.ts --reporter=line
   ```

### Follow-up (Comprehensive E2E Testing)
1. Create full test suite:
   - Document creation (all templates)
   - Metadata editing (title, summary, product/area)
   - Related resources management
   - Contributors/approvers assignment
   - Document publishing workflow
   - Search functionality

2. Add visual regression tests:
   - Screenshot comparisons
   - Layout consistency checks

3. Test error scenarios:
   - Network failures
   - Invalid input
   - Permission issues

## Testing Method Notes

### playwright-mcp Effectiveness
**Pros**:
- ✅ Excellent for interactive exploration
- ✅ Real browser automation with full JS execution
- ✅ Snapshot inspection reveals page structure
- ✅ Screenshot capture for documentation
- ✅ Network request inspection
- ✅ Console log monitoring

**Cons**:
- ⚠️ Verbose output for complex pages
- ⚠️ Requires manual ref tracking (element IDs)
- ⚠️ Cannot easily assert on content not in accessibility tree

**Best Use Cases**:
- Initial exploration of new features
- Bug reproduction and documentation
- Visual validation
- Integration testing with real backend

## Files Modified/Created

- Created: `docs-internal/E2E_PLAYWRIGHT_MCP_TESTING_SUMMARY_2025_10_09.md`
- Screenshots: `.playwright-mcp/*.png` (4 screenshots)
- Modified: `/app/workspace_data/drafts/e92a95903b8fcfd3ac01f2d858741a18.md` (via API)

## Conclusion

The E2E testing session successfully validated the document editing backend infrastructure and identified a critical frontend bug in content display refresh. The local workspace provider correctly saves and persists content, but the frontend component fails to reload and display the updated content after save operations.

**Recommendation**: Fix the content display bug before deploying document editing features to production. The bug is likely a simple state management issue that can be resolved by adding a content reload operation after the save succeeds.

## Commands to Reproduce

```bash
# Start testing environment
cd testing
docker compose up -d

# Start local frontend proxy
cd ../web
MIRAGE_ENABLED=false yarn ember server --port 4200 --proxy http://127.0.0.1:8001 &

# Wait for build
sleep 30

# Navigate to http://localhost:4200
# Login as admin@hermes.local (via Dex)
# Click recently viewed document
# Click "Edit" button
# Modify content
# Click "Save"
# Observe: content not displayed (BUG)

# Verify backend saved correctly
cd ../testing
docker compose exec hermes cat /app/workspace_data/drafts/e92a95903b8fcfd3ac01f2d858741a18.md
# Content should be present with updated modified_time
```
