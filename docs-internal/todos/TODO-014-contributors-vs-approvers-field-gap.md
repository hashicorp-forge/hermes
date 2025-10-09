---
id: TODO-014
title: Contributors vs Approvers Field Gap in Document Creation
date: 2025-10-09
type: TODO
priority: high
status: open
progress: 0%
tags: [backend, frontend, document-creation, reviews, approvers]
related:
  - TODO-011
  - TODO-013
blocking: TODO-011
---

# TODO-014: Contributors vs Approvers Field Gap in Document Creation

## Problem Statement

The E2E test for "Awaiting Review" dashboard (TODO-011) revealed a **product/backend gap**: the document creation UI only exposes a "Contributors" field, but the dashboard searches for documents using the "approvers" field in the search index.

**Dashboard Search Filter** (`web/app/routes/authenticated/dashboard.ts`):
```typescript
filters:
  `approvers:'${userEmail}'` +
  ` AND NOT approvedBy:'${userEmail}'` +
  " AND appCreated:true" +
  " AND status:In-Review",
```

**Document Creation Form**: Only has "Contributors" field, no "Approvers" field.

## Impact

- **Users cannot be added as approvers during document creation**
- **Dashboard "Awaiting your review" section never populates**
- **E2E test fails at Phase 2 (dashboard check)**
- **Review workflow is broken for newly created documents**

## Root Cause Analysis

### Current State

1. **Document Creation Form** (`web/app/components/new/doc-form.hbs` or similar):
   - Has "Contributors" field
   - Contributors are people who collaborate on the document
   - No "Approvers" field visible

2. **Search Index Fields**:
   - `approvers` - Array of email addresses who need to review
   - `approvedBy` - Array of email addresses who have approved
   - `contributors` - Array of email addresses who contributed

3. **Database Schema** (`pkg/models/document_review.go`):
   - `DocumentReview` model exists with `DocumentID`, `UserID`, `Status`
   - Tracks individual reviewer status (Approved, ChangesRequested)

### Gap

**Contributors are not automatically mapped to Approvers**, and there's no UI to add approvers during document creation.

## Possible Solutions

### Option 1: Backend - Auto-map Contributors → Approvers ⚡ (Quickest)

**Approach**: When a document is created, automatically add all contributors as approvers.

**Changes Needed**:
- `internal/api/v2/documents.go` - In document creation endpoint
- When contributors are added, also create `DocumentReview` records
- Update search index to include contributors in `approvers` field

**Pros**:
- No UI changes required
- Quick fix for current workflow
- Works with existing E2E test

**Cons**:
- Contributors and Approvers serve different purposes (collaboration vs review)
- May not match actual user intent
- Could cause confusion (contributors forced to review)

**Estimated Effort**: 2-4 hours

### Option 2: UI - Add Approvers Field to Document Creation 🎨 (Best UX)

**Approach**: Add a separate "Approvers" field to the document creation form.

**Changes Needed**:
- `web/app/components/new/doc-form.hbs` - Add "Approvers" field
- `web/app/components/new/doc-form.ts` - Handle approvers input
- `internal/api/v2/documents.go` - Accept approvers in creation payload
- Create `DocumentReview` records for each approver

**Pros**:
- Clear separation of Contributors vs Approvers
- Users can explicitly choose reviewers
- Better UX and clarity

**Cons**:
- Requires frontend and backend changes
- Need to design where the field appears
- More complex implementation

**Estimated Effort**: 6-8 hours

### Option 3: Post-Creation - Add Approvers via Document Editor 📝 (Current Workaround)

**Approach**: Allow users to add approvers after creating the document via the document editor/sidebar.

**Changes Needed**:
- Check if document editor already has approvers field
- Update E2E test to navigate to document page and add approvers
- Ensure approvers field is visible and functional

**Pros**:
- May already be partially implemented
- Separates creation from review workflow
- More flexible (can change approvers later)

**Cons**:
- Two-step process (create, then add approvers)
- May require explicit status change to "In-Review"
- Not as smooth UX as Option 2

**Estimated Effort**: 2-4 hours (if field exists), 6-8 hours (if needs implementation)

## Investigation Tasks

### 1. ✅ Check Existing Document Editor UI (COMPLETED)

**Objective**: Determine if approvers field exists in document view/edit mode.

**Findings** (2025-10-09):
- ✅ **Approvers field EXISTS in document sidebar** (`web/app/components/document/sidebar.hbs`)
- ✅ Field is editable via UI (click on "None" button to open)
- ✅ Has searchbox with "Search by name or email..." placeholder
- ✅ Has Save/Cancel buttons to persist changes
- ✅ Calls `saveApprovers` task which PATCHes `/api/v2/documents/{id}` with `approvers` array
- ⚠️ **Issue**: Search only finds users that exist in people database
- ⚠️ **Blocker**: `test@hermes.local` and other Dex users don't automatically appear in people database

**UI Flow**:
1. Navigate to document page (draft or published)
2. Sidebar shows "Approvers" section with "None" button
3. Click "None" → Opens searchbox
4. Type email/name → Dropdown shows matching people
5. Select person → Added to list
6. Click "Save" → Sends PATCH request to backend

**Code References**:
- `web/app/components/document/sidebar.hbs` lines 279-289 - Approvers field UI
- `web/app/components/document/sidebar.ts` lines 105-108 - Approvers state tracking
- `web/app/components/document/sidebar.ts` lines 949-955 - `saveApprovers` task

### 2. Check Backend API Endpoints

**Objective**: Find existing API endpoints for managing approvers/reviews.

```bash
# Check V2 API for review endpoints
grep -rn "reviews\|approvers" internal/api/v2/*.go

# Check for POST/PATCH endpoints
grep -rn "POST\|PATCH" internal/api/v2/documents.go | grep -i review
```

**Expected Findings**:
- `POST /api/v2/documents/{id}/reviews` - Add reviewer
- `PATCH /api/v2/documents/{id}/reviews/{userId}` - Update review status
- `GET /api/v2/documents/{id}/reviews` - Get all reviews

### 3. Check Search Index Mapping

**Objective**: Understand how contributors/approvers are indexed.

```bash
# Check indexer logic
grep -rn "approvers\|contributors" internal/indexer/

# Check search provider
grep -rn "approvers\|contributors" pkg/search/
```

**Questions**:
- Are contributors automatically added to approvers field in search index?
- Is there transformation logic between DB and search index?

### 4. Check Document Status Flow

**Objective**: Understand when/how documents change from Draft → In-Review.

```bash
# Search for status changes
grep -rn "In-Review\|InReview" web/app/ internal/api/

# Look for status dropdown
grep -rn "status.*dropdown\|status.*select" web/app/components/document/
```

**Expected Findings**:
- UI button/dropdown to change status
- API endpoint: `PATCH /api/v2/documents/{id}` with status field

## Acceptance Criteria

Whichever solution is implemented:

- [ ] Users can designate approvers when creating a document
- [ ] Approvers see documents in "Awaiting your review" dashboard section
- [ ] Pip badge shows correct count of pending reviews
- [ ] E2E test passes all phases (creation + dashboard check)
- [ ] Documents with `status:In-Review` and `approvers` field populate dashboard
- [ ] Search index updates within reasonable time (< 30 seconds)

## Test Validation

After implementing any solution:

```bash
# Run E2E test
cd tests/e2e-playwright
npx playwright test tests/dashboard-awaiting-review.spec.ts --reporter=line

# Should see:
# Phase 1: ✅ Document creation successful
# Phase 2: ✅ Dashboard shows document in "Awaiting your review"
# Phase 2: ✅ Pip badge shows count "1"
# Phase 2: ✅ Click document navigates to document page
```

## New Issue Discovered: People Database Not Populated

### Problem

The Approvers field in the document sidebar searches the people database (`/api/v2/people`), but:
- Dex OIDC users (`test@hermes.local`, `admin@hermes.local`) don't automatically populate the people database
- Users must exist in the database before they can be added as approvers
- This breaks the E2E test workflow

### Investigation Needed

```bash
# Check how people are created
grep -rn "POST.*people\|people.*create" internal/api/v2/

# Check if people are auto-created on first login
grep -rn "createUser\|ensureUser" internal/auth/

# Check people API
curl -H "Cookie: hermes-session=..." http://localhost:8001/api/v2/people
```

### Possible Solutions

**Option A**: Auto-create people on first OIDC login
- Modify auth middleware to ensure user exists in people database
- Create person record when user authenticates for first time

**Option B**: Seed people database in testing environment
- Add `test@hermes.local` and `admin@hermes.local` to database on startup
- Use init script or migration

**Option C**: Allow direct email input for approvers
- Modify approvers field to accept email addresses not in database
- Validate email format but don't require existing person record

## Recommendation (Updated after Investigation)

**Short-term Fix (for E2E test)**:
1. ✅ Approvers field exists in document sidebar (Option 3 confirmed)
2. ⚠️ **Blocked by**: People database not populated with Dex users
3. **Action**: Implement Option B (seed people database) for testing environment
4. **Then**: Update E2E test to add approvers post-creation via sidebar

**Long-term Fix (for production)**:
1. Implement **Option A** (auto-create people on OIDC login) for all auth providers
2. Consider **Option C** (allow direct email input) as fallback for external reviewers

**Avoid Option 1** (auto-map Contributors → Approvers) - confirmed as wrong approach.

## Related Files

### Frontend
- `web/app/components/new/doc-form.hbs` - Document creation form
- `web/app/components/new/doc-form.ts` - Form logic
- `web/app/components/document/` - Document editor components
- `web/app/routes/authenticated/dashboard.ts` - Dashboard search filter

### Backend
- `internal/api/v2/documents.go` - Document CRUD endpoints
- `pkg/models/document_review.go` - DocumentReview model
- `internal/indexer/` - Search indexing logic

### Tests
- `tests/e2e-playwright/tests/dashboard-awaiting-review.spec.ts` - E2E test
- `tests/e2e-playwright/DASHBOARD_AWAITING_REVIEW_TEST_SUMMARY.md` - Investigation notes

## Next Steps

1. **Investigation Phase** (2-4 hours)
   - Use playwright-mcp to explore document editor UI
   - Check backend API endpoints
   - Review search index mapping

2. **Decision Point**: Choose Option 2 or Option 3 based on findings

3. **Implementation Phase** (4-8 hours depending on option)

4. **E2E Test Validation** (1 hour)

5. **Documentation Update** (1 hour)
   - Update TODO-011 with solution
   - Document approvers workflow in user guide

**Total Estimated Effort**: 8-14 hours
