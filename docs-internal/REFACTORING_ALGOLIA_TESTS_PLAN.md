# Refactoring Algolia-Coupled Tests - Implementation Plan

## Overview

This document outlines the plan to refactor the 9 skipped integration tests that are tightly coupled to Algolia's concrete types. These tests are currently disabled but represent important API functionality that should be tested.

**Goal**: Enable these tests to run using the search abstraction layer (`search.Provider`) instead of Algolia-specific types.

## Current Status

### Skipped Tests (9 total)

Located in `tests/api/`:

1. **`documents_test.go`** (4 tests)
   - `TestDocuments_Get` - GET /api/v1/documents/:id
   - `TestDocuments_Patch` - PATCH /api/v1/documents/:id  
   - `TestDocuments_Delete` - DELETE /api/v1/documents/:id
   - `TestDocuments_List` - GET /api/v1/documents

2. **`api_v1_test.go`** (5 tests)
   - `TestAPI_DocumentHandler` - Full document handler workflow
   - `TestAPI_DraftsHandler` - Full drafts handler workflow
   - `TestAPI_MeHandler` - User profile endpoint
   - `TestAPI_ReviewsHandler` - Reviews management
   - `TestAPI_ApprovalsHandler` - Approvals management

### Why They're Skipped

All tests include this skip:
```go
t.Skip("API handlers are tightly coupled to Algolia - needs refactoring. See tests/api/README.md")
```

**Root cause**: The V1 API handlers in `internal/api/` use:
- `*algolia.Client` directly instead of `search.Provider`
- Algolia-specific response types
- Direct Algolia index operations

## Refactoring Strategy

### Phase 1: Analyze Handler Dependencies ✅ (DONE)

We've already established:
- ✅ Search abstraction exists (`pkg/search/provider.go`)
- ✅ Mock search provider works (used by 44 passing tests)
- ✅ V2 API handlers use abstractions correctly
- ✅ Server struct has `SearchProvider` and `WorkspaceProvider` fields

### Phase 2: Update V1 API Handlers (Medium effort)

**Files to modify**:
- `internal/api/documents.go` - Main document operations
- `internal/api/drafts.go` - Draft operations  
- `internal/api/me.go` - User profile
- `internal/api/reviews.go` - Review management
- `internal/api/approvals.go` - Approval management

**Required changes**:

1. **Replace Algolia client parameters with search.Provider**
   ```go
   // Before:
   func someHandler(algoClient *algolia.Client, ...) {
       index := algoClient.InitIndex("docs")
       // ...
   }
   
   // After:
   func someHandler(searchProvider search.Provider, ...) {
       index := searchProvider.DocumentIndex()
       // ...
   }
   ```

2. **Update search operations**
   ```go
   // Before (Algolia-specific):
   task, err := index.SaveObject(map[string]any{...})
   task.Wait()
   
   // After (abstraction):
   doc := &search.Document{...}
   err := index.Index(ctx, doc)
   // Note: New API is synchronous, no need to wait
   ```

3. **Convert Algolia responses to generic maps**
   ```go
   // Before:
   res, err := index.GetObject("id", opt.WithAttributes("*"))
   
   // After:
   searchDoc, err := index.GetObject(ctx, "id")
   // Convert to map[string]any if needed for compatibility
   bytes, _ := json.Marshal(searchDoc)
   var result map[string]any
   json.Unmarshal(bytes, &result)
   ```

### Phase 3: Enable Tests (Easy)

Once handlers are refactored:

1. **Remove skip statements**
   ```go
   // Delete this line:
   t.Skip("API handlers are tightly coupled to Algolia...")
   ```

2. **Update test setup** (if needed)
   ```go
   // Tests should already use suite.SearchProvider
   // Verify they don't try to create algolia.Client directly
   ```

3. **Run and verify**
   ```bash
   go test -tags=integration -v -run TestDocuments ./tests/api/
   go test -tags=integration -v -run TestAPI ./tests/api/
   ```

## Detailed Implementation Plan

### Step 1: Documents Handler (`internal/api/documents.go`)

**Current state**: Uses `*algolia.Client` in several functions

**Action items**:
1. Identify all functions that take `*algolia.Client`
2. Change parameter to `search.Provider`
3. Replace `algoClient.InitIndex()` with `searchProvider.DocumentIndex()`
4. Update SaveObject/DeleteObject calls to Index/Delete
5. Update GetObject calls to use context

**Estimated effort**: 2-3 hours
**Risk**: Medium - this is a heavily used file
**Testing**: Run TestDocuments_* tests after changes

### Step 2: Drafts Handler (`internal/api/drafts.go`)

**Current state**: Similar to documents.go

**Action items**:
1. Same pattern as documents.go
2. Use `searchProvider.DraftIndex()` for draft operations
3. Ensure consistency with V2 drafts handler

**Estimated effort**: 2-3 hours
**Risk**: Medium
**Testing**: Run TestAPI_DraftsHandler after changes

### Step 3: Me Handler (`internal/api/me.go`)

**Current state**: Simpler than documents/drafts

**Action items**:
1. Update user-related search operations
2. May involve DocumentIndex for recently viewed docs

**Estimated effort**: 1 hour
**Risk**: Low - smaller file
**Testing**: Run TestAPI_MeHandler after changes

### Step 4: Reviews Handler (`internal/api/reviews.go`)

**Current state**: Manages document reviews

**Action items**:
1. Update document search operations when reviews change
2. Ensure review changes trigger re-indexing

**Estimated effort**: 1-2 hours
**Risk**: Low-Medium
**Testing**: Run TestAPI_ReviewsHandler after changes

### Step 5: Approvals Handler (`internal/api/approvals.go`)

**Current state**: Manages document approvals

**Action items**:
1. Similar to reviews handler
2. Update search when approval status changes

**Estimated effort**: 1-2 hours
**Risk**: Low-Medium
**Testing**: Run TestAPI_ApprovalsHandler after changes

## Testing Strategy

### Validation Steps (After Each Handler)

1. **Compile check**
   ```bash
   go build ./internal/api/
   ```

2. **Run specific test**
   ```bash
   go test -tags=integration -v -run TestDocuments_Get ./tests/api/
   ```

3. **Check for regressions**
   ```bash
   # Run all passing tests to ensure nothing broke
   go test -tags=integration -v ./tests/api/ -timeout 5m
   ```

4. **Manual verification** (if available)
   - Start server with Meilisearch
   - Test endpoint manually with curl/httpie
   - Verify search index updates

### Expected Outcomes

After completing all phases:
- ✅ 9 additional tests passing (from 44 → 53 passing)
- ✅ Pass rate improves from 74% to 90%
- ✅ V1 API handlers use abstractions like V2
- ✅ Tests work with both Meilisearch and Algolia adapters
- ✅ Reduced coupling to specific search vendor

## Alternative: Skip V1, Focus on V2

**Consideration**: If V1 API is deprecated or V2 is the future, we could:

1. **Option A**: Leave V1 tests skipped
   - Document that V1 handlers are legacy
   - Focus testing effort on V2 API
   - Maintain V1 handlers in "works but not tested" state

2. **Option B**: Refactor V1 handlers (recommended)
   - Reduces technical debt
   - Improves maintainability
   - Enables full test coverage
   - Sets pattern for future handlers

**Recommendation**: Go with **Option B** (refactor) because:
- V1 handlers are still in use
- Refactoring work is manageable (8-10 hours total)
- Establishes good patterns across all handlers
- Makes future migrations easier

## Quick Wins Before Full Refactoring

If full refactoring is too much work right now, consider:

### Quick Win 1: Test One Handler
Pick the simplest handler (e.g., `me.go`) and refactor just that one to:
- Validate the approach works
- Identify any hidden issues
- Estimate effort more accurately

### Quick Win 2: Partial Migration
Update handlers to accept both old and new interfaces:
```go
func documentHandler(searchProvider search.Provider, legacyClient *algolia.Client, ...) {
    // Use searchProvider if available, fall back to legacyClient
    if searchProvider != nil {
        // New path
    } else {
        // Old path
    }
}
```

This allows gradual migration without breaking existing code.

### Quick Win 3: Document Pattern
Create a detailed migration guide for one handler, then:
- Use it as a template for others
- Potentially distribute work across team
- Enable parallel refactoring

## Current Recommendation

**Start with documents_test.go** because:

1. ✅ Clear test cases already written
2. ✅ Tests are isolated and self-contained
3. ✅ Success here validates the approach
4. ✅ Documents handler is similar to V2 (already abstracted)
5. ✅ Quick path to 4 more passing tests

**Steps to take now**:

1. Run the current skipped tests to see what breaks:
   ```bash
   # Comment out the t.Skip() line in documents_test.go
   go test -tags=integration -v -run TestDocuments_Get ./tests/api/
   ```

2. Analyze error messages to understand exact issues

3. Make minimal changes to `internal/api/documents.go`

4. Re-run tests until passing

5. Document lessons learned

6. Apply pattern to remaining handlers

## Timeline Estimate

| Phase | Effort | Duration |
|-------|--------|----------|
| Documents handler | Medium | 2-3 hours |
| Drafts handler | Medium | 2-3 hours |
| Me handler | Low | 1 hour |
| Reviews handler | Low-Med | 1-2 hours |
| Approvals handler | Low-Med | 1-2 hours |
| Test validation | Low | 1-2 hours |
| **Total** | | **8-13 hours** |

Could be done in:
- **1-2 focused work sessions** (if doing all at once)
- **5-10 small PRs** (if doing incrementally)
- **1 sprint story** (if planned work)

## Success Metrics

- ✅ 9 tests moved from SKIP to PASS
- ✅ Pass rate improves to 90% (53/59 tests)
- ✅ No regressions in currently passing tests
- ✅ V1 and V2 handlers use consistent patterns
- ✅ Search abstraction fully adopted across API layer

## Next Actions

**Immediate** (to start refactoring):
1. Read `internal/api/documents.go` to understand current implementation
2. Identify all Algolia-specific calls
3. Create a draft PR with documents.go refactored
4. Test with documents_test.go enabled

**Short-term** (this week):
1. Complete documents handler refactoring
2. Enable and validate documents tests
3. Apply same pattern to other handlers

**Medium-term** (this month):
1. Complete all handler refactoring
2. All 53 tests passing
3. Update documentation
4. Remove Algolia dependency from V1 handlers
