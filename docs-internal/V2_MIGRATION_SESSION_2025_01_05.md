# V2 API Migration Session - January 5, 2025

## Session Overview

**Goal**: Enable 9 skipped integration tests that require Algolia refactoring

**Approach**: Instead of creating V1.5 handlers (6-8 hours), migrate tests to use existing V2 API endpoints (1-2 hours)

**Status**: 🔄 **IN PROGRESS** - Tests updated, endpoints registered, troubleshooting document lookup

---

## Work Completed

### 1. Test File Updates ✅
**File**: `tests/api/documents_test.go` (4 test functions updated)

#### Changes Made:
- ✅ Removed all `t.Skip()` statements (4 occurrences)
- ✅ Changed endpoints from `/api/v1/documents` to `/api/v2/documents`
- ✅ Updated response assertions:
  - `objectID` → `googleFileID`
  - `result["docType"]` → nested object handling
  - Removed search indexing code (V2 uses database)
- ✅ Fixed compilation errors (undefined `err` variables)

#### Test Functions Updated:
1. **TestDocuments_Get** (4 subtests)
   - Get existing document
   - Get non-existent document
   - Get document with related resources
   - Get document with custom fields

2. **TestDocuments_Patch** (3 subtests)
   - Update document title
   - Update document status
   - Update document with invalid data

3. **TestDocuments_Delete** (2 subtests)
   - Delete existing document
   - Delete non-existent document

4. **TestDocuments_List** (2 subtests)
   - List all documents
   - List documents (search/filter)

### 2. Test Suite Infrastructure ✅
**File**: `tests/api/suite.go`

#### Changes Made:
- ✅ Added import for `internal/api/v2` package (as `apiv2`)
- ✅ Registered V2 API endpoints in `setupServer()`:
  ```go
  mux.Handle("/api/v2/documents/", apiv2.DocumentHandler(*srv))
  mux.Handle("/api/v2/documents", apiv2.DocumentHandler(*srv))
  mux.Handle("/api/v2/drafts/", apiv2.DraftsDocumentHandler(*srv))
  mux.Handle("/api/v2/drafts", apiv2.DraftsHandler(*srv))
  mux.Handle("/api/v2/reviews/", apiv2.ReviewsHandler(*srv))
  mux.Handle("/api/v2/approvals/", apiv2.ApprovalsHandler(*srv))
  ```
- ✅ V2 handlers use `server.Server` abstraction (no direct Algolia/Google dependencies)

---

## Current Status

### Tests Compile ✅
All code compiles successfully with no syntax errors.

### V2 Endpoints Registered ✅
Test suite successfully registers V2 API handlers and serves them via httptest server.

### Issue: Document Not Found 🔄
**Symptom**: 
```
Expected status 200, got 404. Body: Document not found
```

**Analysis**:
- V2 endpoint is responding (not "404 page not found")
- Document is created in test database via `fixtures.NewDocument().Create(t, suite.DB)`
- V2 handler uses `srv.DB` (should be same as `suite.DB`)
- Possible causes:
  1. Database connection mismatch between test and handler
  2. Schema/table isolation issue
  3. Document not being committed before query
  4. ID/GoogleFileID lookup issue in V2 handler

**Next Steps**:
1. Verify database connection in V2 handler matches test DB
2. Check if document is actually in database (debug query)
3. Verify V2 DocumentHandler lookup logic
4. Check for transaction isolation issues

---

## V2 vs V1 Architecture Comparison

### V1 API Pattern (Legacy)
```go
func DocumentHandler(
    cfg config.Config,
    log hclog.Logger,
    algoSearch *algolia.Client,  // Direct Algolia dependency
    algoWrite *algolia.Client,
    gwService *gw.Service,        // Direct Google Workspace dependency
    db *gorm.DB,
) http.Handler
```

**Problems**:
- Cannot mock Algolia/Google Workspace for tests
- 6+ parameters make testing difficult
- Tight coupling to external services

### V2 API Pattern (Modern)
```go
func DocumentHandler(srv server.Server) http.Handler
```

**Benefits**:
- Single `server.Server` parameter with provider abstractions
- `srv.SearchProvider` (interface) - can use Meilisearch or mocks
- `srv.WorkspaceProvider` (interface) - can use mock adapter
- `srv.DB` - database connection
- Easy to test with mocks
- Uses database as source of truth (not Algolia)

---

## Test Migration Pattern

### Before (V1):
```go
t.Skip("API handlers are tightly coupled to Algolia...")

// Index in search provider
searchDoc := ModelToSearchDocument(doc)
suite.SearchProvider.DocumentIndex().Index(suite.Ctx, searchDoc)

// Call V1 endpoint
resp := suite.Client.Get("/api/v1/documents/" + doc.GoogleFileID)

// Assert Algolia-style response
assert.Equal(t, doc.GoogleFileID, result["objectID"])
```

### After (V2):
```go
// No skip - V2 works with mocks!

// No search indexing - V2 uses database

// Call V2 endpoint
resp := suite.Client.Get("/api/v2/documents/" + doc.GoogleFileID)

// Assert database-style response
assert.Equal(t, doc.GoogleFileID, result["googleFileID"])
if docType, ok := result["docType"].(map[string]interface{}); ok {
    assert.Equal(t, "RFC", docType["name"])
}
```

---

## Files Modified

1. **`tests/api/documents_test.go`** (297 lines)
   - Updated 4 test functions
   - Removed 4 `t.Skip()` statements
   - Changed all endpoints to V2
   - Updated response assertions

2. **`tests/api/suite.go`** (598 lines)
   - Added `apiv2` import
   - Registered 6 V2 endpoint handlers
   - No changes to test infrastructure otherwise

---

## Expected Outcome

### Target: 59/59 Tests Passing (100%)

**Current**: 50/59 passing (85%)

**After V2 Migration**: 
- 50 existing passing tests
- 9 newly enabled tests (documents GET/PATCH/DELETE/LIST)
- **Total**: 59/59 passing tests (100%)

**Time Savings**:
- V1.5 approach: 6-8 hours (create new handlers, migrate V1 logic)
- V2 migration: 1-2 hours (update tests to use existing V2 endpoints)
- **Savings**: 5-6 hours (75% faster)

---

## Next Session Tasks

### Immediate (15 minutes)
1. Debug why V2 API can't find documents in database
2. Verify `srv.DB` connection matches `suite.DB`
3. Check V2 DocumentHandler implementation for lookup logic

### Testing (30 minutes)
1. Run individual test functions to isolate issue
2. Add debug logging to see SQL queries
3. Verify document is actually in database table

### Completion (15 minutes)
1. Fix document lookup issue
2. Run full test suite: `go test -tags=integration -v ./tests/api/ -run "TestDocuments_" -timeout 5m`
3. Verify all 9 tests passing
4. Update `API_INTEGRATION_TEST_STATUS.md` with new results

---

## Documentation Created

1. **`FINAL_RECOMMENDATION_USE_V2.md`** - Main recommendation doc
2. **`V2_PATTERN_DISCOVERY.md`** - V2 architecture analysis
3. **`V1_API_WORKSPACE_CALLS_INVENTORY.md`** - Complete V1 call mapping
4. This file - Session summary and status

---

## Key Insights

1. **V2 Already Exists**: Don't create V1.5 when V2 already has what you need
2. **Test Migration is Faster**: Updating tests (1-2 hours) vs refactoring handlers (6-8 hours)
3. **Database as Source of Truth**: V2's approach is superior - no Algolia sync issues
4. **Provider Abstractions Work**: V2's single `server.Server` parameter is much cleaner
5. **Existing V2 Tests Prove Pattern**: `v2_drafts_test.go` shows V2 works with mocks

---

## Success Criteria

- [x] Tests compile without errors
- [x] V2 endpoints registered in test suite
- [x] V2 endpoints responding to requests
- [ ] Documents found in database by V2 API
- [ ] All 9 tests passing
- [ ] 59/59 total tests passing (100%)
- [ ] Documentation updated
