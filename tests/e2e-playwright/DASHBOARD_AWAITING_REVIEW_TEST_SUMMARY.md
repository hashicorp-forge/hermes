# E2E Test Implementation Summary: Awaiting Review Dashboard

**Date**: October 9, 2025  
**Test File**: `tests/e2e-playwright/tests/dashboard-awaiting-review.spec.ts`  
**Status**: Partial Implementation - Document Creation Working, Review Detection Needs Backend Work

## What Was Accomplished

### ✅ Test Environment Validated
- All Docker services running successfully (hermes, web, postgres, meilisearch, dex)
- Backend using local workspace provider (confirmed in logs)
- Frontend accessible at http://localhost:4201
- Backend accessible at http://localhost:8001

### ✅ Existing Infrastructure Confirmed
- `pkg/models/document_review.go` exists with all required fields (DocumentID, UserID, Status)
- Dashboard UI components already exist:
  - `web/app/components/dashboard/docs-awaiting-review.hbs` - with pip badge count
  - `web/app/routes/authenticated/dashboard.ts` - searches for docs awaiting review
- Dashboard route searches for: `approvers:'${userEmail}' AND NOT approvedBy:'${userEmail}' AND appCreated:true AND status:In-Review`

### ✅ E2E Test Created
- Successfully authenticates User A (test@hermes.local) and User B (admin@hermes.local) via Dex OIDC
- Creates RFC document with title, summary, and product/area selection
- Adds contributor (admin@hermes.local) to document
- Publishes document as draft
- Logs out User A and authenticates User B
- Navigates to dashboard

### ✅ Test Execution Results

**Phase 1: Document Creation** - ✅ **SUCCESS**
```
[Auth] ✓ User test@hermes.local authenticated successfully
[Document] ✓ Clicked new document button
[Document] ✓ Navigated to RFC creation page
[Document] ✓ Document creation form loaded
[Document] ✓ Filled in title
[Document] ✓ Filled in summary
[Document] ✓ Clicked Product/Area dropdown
[Document] ✓ Selected Engineering product
[Document] ✓ Clicked Contributors search field
[Document] ✓ Typed approver email: admin@hermes.local
[Document] ✓ Added approver via Enter key
[Document] ✓ Approver admin@hermes.local added
[Document] ✓ Clicked publish button
[Document] ✓ Document published successfully
```

**Phase 2: Dashboard Review Detection** - ❌ **BLOCKED**
```
[Auth] ✓ User admin@hermes.local authenticated successfully
[Test] ❌ "Awaiting your review" section not found
```

## What Needs To Be Done

### 🔴 Issue #1: Contributors ≠ Approvers

**Problem**: The document creation form has a "Contributors" field, but the dashboard searches for "approvers" field in the search index.

**Investigation Needed**:
1. Check if there's a separate "Approvers" field in the document editor (after creation)
2. Determine if "Contributors" are automatically promoted to "Approvers"
3. Check if document status needs to be "In-Review" (not "Draft") for approvers to appear

**Possible Solutions**:
- Add an "Approvers" field to the document creation form
- Add approvers via document edit page after creation
- Check if there's an API endpoint to add approvers: `POST /api/v2/documents/{id}/reviews`

### 🔴 Issue #2: Document Status

**Problem**: Dashboard searches for `status:In-Review`, but newly created documents are in "Draft" status.

**Investigation Needed**:
1. Check how to change document status from Draft to In-Review
2. Determine if this is a UI button/dropdown or an API call
3. Check if status change triggers search index update

**Possible Solutions**:
- Add a step in the test to change document status to "In-Review"
- Check document editor for status dropdown/button
- Look for "Request Review" or "Publish" button in document view

### 🔴 Issue #3: Search Index Update Timing

**Problem**: Even if approvers and status are set correctly, the search index (Meilisearch) might not update immediately.

**Investigation Needed**:
1. Check backend logs for search index update messages
2. Determine if there's a delay between document creation and index update
3. Check if there's a manual index refresh endpoint

**Possible Solutions**:
- Add a delay/wait in the test after document creation
- Poll the dashboard until the document appears (with timeout)
- Trigger manual search index update if endpoint exists

## Next Steps for Agent Iteration

### Step 1: Investigate Document Editor UI
```typescript
// After document creation, the test should:
1. Stay on the document page (don't navigate away immediately)
2. Take a screenshot to see what fields/buttons are available
3. Look for:
   - "Approvers" field (separate from Contributors)
   - Status dropdown (change from Draft to In-Review)
   - "Request Review" or similar button
```

### Step 2: Check API Endpoints
```bash
# Check what endpoints exist for document reviews
grep -r "approvers\|reviews" internal/api/v2/*.go

# Check if there's an endpoint to add approvers
grep -r "POST.*reviews" internal/api/v2/*.go
```

### Step 3: Test with Browser MCP
```typescript
// Use playwright-mcp to manually test the workflow:
1. Create document with contributor
2. View document page
3. Look for how to add approvers
4. Look for how to change status
5. Verify dashboard shows document
```

### Step 4: Update Test Based on Findings
- Add steps to set document status to "In-Review"
- Add steps to explicitly add approvers (if different from contributors)
- Add wait/poll logic for search index update

## Files Modified

- **Created**: `tests/e2e-playwright/tests/dashboard-awaiting-review.spec.ts` (453 lines)

## Test Command

```bash
# Run the test (currently failing at dashboard check)
cd tests/e2e-playwright
npx playwright test tests/dashboard-awaiting-review.spec.ts --reporter=line --max-failures=1

# Run with headed browser for debugging
npx playwright test tests/dashboard-awaiting-review.spec.ts --headed

# View trace for debugging
npx playwright show-trace test-results/dashboard-awaiting-review-*/trace.zip
```

## Related Documentation

- **TODO-011**: Original requirements document
- **Dashboard Route**: `web/app/routes/authenticated/dashboard.ts` - Search filter logic
- **DocumentReview Model**: `pkg/models/document_review.go` - Database schema
- **Dashboard Component**: `web/app/components/dashboard/docs-awaiting-review.hbs` - UI with pip badge

## Conclusion

The E2E test successfully demonstrates:
1. ✅ Dex OIDC authentication with multiple users
2. ✅ Document creation workflow with all required fields
3. ✅ Adding contributors to documents
4. ✅ Multi-user session handling (logout/login)

**Investigation Completed** (2025-10-09): ✅
- ✅ Approvers field **DOES EXIST** in document sidebar
- ✅ Field is fully functional with save/cancel UI
- ✅ Backend PATCH endpoint `/api/v2/documents/{id}` accepts `approvers` array
- ⚠️ **NEW BLOCKER**: People database not populated with Dex users

**Root Cause Identified**:
- Approvers search requires users to exist in people database (`/api/v2/people`)
- Dex OIDC users (`test@hermes.local`, `admin@hermes.local`) are NOT auto-created in database
- Cannot add approvers unless person record exists

**Required Fix**:
1. **Short-term**: Seed people database with test users in testing environment
2. **Long-term**: Auto-create people on first OIDC login (all auth providers)

**Next Steps**: See TODO-014 for detailed implementation plan
