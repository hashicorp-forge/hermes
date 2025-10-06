# Refactoring V1 API Handlers to Use Search Provider Abstraction

**Created**: October 5, 2025  
**Status**: 🚧 In Progress  
**Goal**: Enable 9 skipped integration tests by migrating V1 API handlers from direct Algolia usage to `search.Provider` abstraction

---

## 📋 Overview

### Current State
- **9 tests skipped** due to tight Algolia coupling in V1 API handlers
- V1 handlers directly use `*algolia.Client` parameters (`ar`, `aw`)
- V2 handlers use `server.Server` struct with `SearchProvider` field
- Cannot mock or test V1 handlers without real Algolia connection

### Target State
- V1 handlers refactored to use `search.Provider` interface
- All 9 tests passing with mock search provider
- Zero direct Algolia dependencies in V1 API handlers
- Consistent pattern between V1 and V2 APIs

---

## 🎯 Affected Tests (9 Total)

### Handler Tests (5)
1. `TestAPI_DocumentHandler` - Tests DocumentHandler with mocked search
2. `TestAPI_DraftsHandler` - Tests DraftsHandler POST/GET operations
3. `TestAPI_MeHandler` - Tests user-specific endpoints
4. `TestAPI_ReviewsHandler` - Tests review workflow
5. `TestAPI_ApprovalsHandler` - Tests approval workflow

### Document Endpoint Tests (4)
6. `TestDocuments_Get` - GET /api/v1/documents/:id
7. `TestDocuments_Patch` - PATCH /api/v1/documents/:id
8. `TestDocuments_Delete` - DELETE /api/v1/documents/:id
9. `TestDocuments_List` - GET /api/v1/documents with filters

---

## 🔧 Refactoring Strategy

### Phase 1: Handler Signature Migration ✅

**Affected Files**:
- `internal/api/documents.go` - `DocumentHandler()`
- `internal/api/drafts.go` - `DraftsHandler()`
- `internal/api/me.go` - `MeHandler()`
- `internal/api/reviews.go` - `ReviewsHandler()`
- `internal/api/approvals.go` - `ApprovalsHandler()`

**Changes**:
```go
// OLD SIGNATURE (V1 - Direct Algolia)
func DocumentHandler(
    cfg *config.Config,
    l hclog.Logger,
    ar *algolia.Client,  // ❌ Remove
    aw *algolia.Client,  // ❌ Remove
    s *gw.Service,
    db *gorm.DB) http.Handler

// NEW SIGNATURE (V1 - With Abstraction)
func DocumentHandler(srv server.Server) http.Handler
```

### Phase 2: Internal API Call Migration

**Pattern**: Replace Algolia-specific calls with search.Provider interface methods

#### Example: Get Document
```go
// OLD (Direct Algolia)
var algoObj map[string]any
err = ar.Docs.GetObject(docID, &algoObj)
if err != nil {
    if _, is404 := errs.IsAlgoliaErrWithCode(err, 404); is404 {
        // Handle 404
    }
}

// NEW (Search Provider)
searchDoc, err := srv.SearchProvider.DocumentIndex().GetObject(ctx, docID)
if err != nil {
    if errors.Is(err, search.ErrObjectNotFound) {
        // Handle 404
    }
}
```

#### Example: Index Document
```go
// OLD (Direct Algolia)
err = aw.Docs.SaveObject(docObj)

// NEW (Search Provider)
err = srv.SearchProvider.DocumentIndex().Index(ctx, searchDoc)
```

#### Example: Search Documents
```go
// OLD (Direct Algolia)
results, err := ar.Docs.Search(query, opt.Filters(filters))

// NEW (Search Provider)
resp, err := srv.SearchProvider.DocumentIndex().Search(ctx, search.Query{
    Query: query,
    Filters: filters,
})
```

### Phase 3: Router Updates

**File**: `internal/server/router.go`

```go
// OLD
api1.Handle("/documents/{id}",
    pkgauth.Middleware(authProvider, log)(
        api.DocumentHandler(cfg, log, algoliaRead, algoliaWrite, gwService, db)))

// NEW
api1.Handle("/documents/{id}",
    pkgauth.Middleware(srv.AuthProvider, srv.Logger)(
        api.DocumentHandler(srv)))
```

---

## 📝 Implementation Checklist

> **📋 Complete Call Inventory**: See `V1_API_WORKSPACE_CALLS_INVENTORY.md` for detailed mapping of all 25+ workspace calls and 16+ Algolia calls

### Phase 1: DocumentHandler (Priority 1 - 4 tests)
- [ ] Change signature to `func DocumentHandler(srv server.Server)`
- [ ] Replace `s.GetFile()` → `srv.WorkspaceProvider.GetFile()` (1 call)
- [ ] Remove `gw.NewAdapter(s)` → use `srv.WorkspaceProvider` directly (1 call)
- [ ] Replace `ar.Docs.GetObject()` → `srv.SearchProvider.DocumentIndex().GetObject()` (2 calls)
- [ ] Replace `aw.Docs.SaveObject()` → `srv.SearchProvider.DocumentIndex().Index()` (1 call)
- [ ] Update router registration in `internal/server/router.go`
- [ ] Enable `TestDocuments_Get`, `TestDocuments_Patch`, `TestDocuments_Delete`, `TestDocuments_List`
- [ ] Verify all 4 tests passing

### Phase 2: DraftsHandler (Priority 1 - 1 test)
- [ ] Change signatures for `DraftsHandler()` and `DraftHandler()`
- [ ] Replace `s.MoveFile()` → `srv.WorkspaceProvider.MoveFile()` (1 call)
- [ ] Replace `s.CopyFile()` → `srv.WorkspaceProvider.CopyFile()` (1 call)
- [ ] Replace `s.ShareFile()` → `srv.WorkspaceProvider.ShareFile()` (2 calls)
- [ ] Replace `s.GetFile()` → `srv.WorkspaceProvider.GetFile()` (1 call)
- [ ] Remove `gw.NewAdapter(s)` → use `srv.WorkspaceProvider` directly (1 call)
- [ ] Refactor `removeSharing()` helper to use `workspace.Provider` (2 calls)
- [ ] Replace `ar.Drafts.GetObject()` → `srv.SearchProvider.DraftIndex().GetObject()` (3 calls)
- [ ] Replace `aw.Drafts.SaveObject()` → `srv.SearchProvider.DraftIndex().Index()` (1 call)
- [ ] Replace `aw.Drafts.DeleteObject()` → `srv.SearchProvider.DraftIndex().Delete()` (1 call)
- [ ] Update router registration
- [ ] Enable `TestAPI_DraftsHandler`
- [ ] Verify test passing

### Phase 3: ReviewsHandler (Priority 2 - 1 test)
- [ ] Change signature to `func ReviewsHandler(srv server.Server)`
- [ ] Replace 11 workspace calls (see V1_API_WORKSPACE_CALLS_INVENTORY.md for details):
  - [ ] `s.GetFile()` → `srv.WorkspaceProvider.GetFile()` (1 call)
  - [ ] `s.GetLatestRevision()` → `srv.WorkspaceProvider.GetLatestRevision()` (1 call)
  - [ ] `s.MoveFile()` → `srv.WorkspaceProvider.MoveFile()` (2 calls)
  - [ ] `s.GetSubfolder()` → `srv.WorkspaceProvider.GetSubfolder()` (2 calls)
  - [ ] `s.CreateFolder()` → `srv.WorkspaceProvider.CreateFolder()` (2 calls)
  - [ ] `s.CreateShortcut()` → `srv.WorkspaceProvider.CreateShortcut()` (1 call)
  - [ ] `s.DeleteFile()` → `srv.WorkspaceProvider.DeleteFile()` (1 call)
- [ ] Replace `ar.Drafts.GetObject()` → `srv.SearchProvider.DraftIndex().GetObject()` (1 call)
- [ ] Replace `aw.Drafts.DeleteObject()` → `srv.SearchProvider.DraftIndex().Delete()` (1 call)
- [ ] Replace `ar.Docs.GetObject()` → `srv.SearchProvider.DocumentIndex().GetObject()` (1 call)
- [ ] Replace `aw.Docs.DeleteObject()` → `srv.SearchProvider.DocumentIndex().Delete()` (1 call)
- [ ] Update helper function signatures (`createShortcutForReviewedDoc`, `removeShortcutForReviewedDoc`)
- [ ] Update router registration
- [ ] Enable `TestAPI_ReviewsHandler`
- [ ] Verify test passing

### Phase 4: ApprovalsHandler (Priority 2 - 1 test)
- [ ] Change signature to `func ApprovalsHandler(srv server.Server)`
- [ ] Replace `s.GetLatestRevision()` → `srv.WorkspaceProvider.GetLatestRevision()` (2 calls)
- [ ] Replace `ar.Docs.GetObject()` → `srv.SearchProvider.DocumentIndex().GetObject()` (2 calls)
- [ ] Replace `aw.Docs.SaveObject()` → `srv.SearchProvider.DocumentIndex().Index()` (2 calls - approximate)
- [ ] Update router registration
- [ ] Enable `TestAPI_ApprovalsHandler`
- [ ] Verify test passing

### Phase 5: Remaining Handlers (Priority 3 - 2 tests)
- [ ] MeHandler - investigate and refactor workspace usage
- [ ] PeopleHandler - refactor if needed
- [ ] Me_SubscriptionsHandler - refactor if needed
- [ ] DraftsShareableHandler - refactor if needed
- [ ] DocumentsRelatedResourcesHandler - only Algolia call to fix
- [ ] Enable `TestAPI_MeHandler` and any other remaining tests
- [ ] Verify all 9 tests now passing

### Phase 6: Cleanup and Validation
- [ ] Remove all `algolia` and `errs` imports from V1 API files
- [ ] Remove all `*gw.Service` parameters
- [ ] Verify no direct Algolia client usage in V1 handlers
- [ ] Run full test suite: `go test -tags=integration ./tests/api/ -timeout 5m`
- [ ] Verify 59/59 tests passing (100% pass rate)
- [ ] Update API_INTEGRATION_TEST_STATUS.md with results
- [ ] Document any breaking changes or migration notes

---

## 🔍 Key Differences Between Algolia and Search Provider

### Error Handling
```go
// Algolia-specific
if _, is404 := errs.IsAlgoliaErrWithCode(err, 404); is404 {
    // Handle 404
}

// Search Provider (generic)
if errors.Is(err, search.ErrObjectNotFound) {
    // Handle 404
}
```

### Object Structure
```go
// Algolia uses map[string]any
var algoObj map[string]any
err = ar.Docs.GetObject(docID, &algoObj)

// Search Provider uses typed search.Document
searchDoc, err := srv.SearchProvider.DocumentIndex().GetObject(ctx, docID)
// searchDoc is *search.Document
```

### Context Requirement
- Algolia client methods don't require context
- Search provider methods all require `context.Context` as first parameter

---

## 🧪 Testing Strategy

### 1. Unit Test Each Handler
```go
func TestDocumentHandler_Get(t *testing.T) {
    // Create mock search provider
    mockSearch := &mockSearchProvider{
        docs: map[string]*search.Document{
            "test-123": {...},
        },
    }
    
    srv := server.Server{
        SearchProvider: mockSearch,
        // ... other fields
    }
    
    handler := api.DocumentHandler(srv)
    
    req := httptest.NewRequest("GET", "/api/v1/documents/test-123", nil)
    w := httptest.NewRecorder()
    
    handler.ServeHTTP(w, req)
    
    assert.Equal(t, http.StatusOK, w.Code)
}
```

### 2. Integration Test with Real Search Provider
```go
func TestDocuments_Get(t *testing.T) {
    suite := NewIntegrationSuite(t) // Uses Meilisearch
    defer suite.Cleanup()
    
    // Create document in database and search index
    doc := fixtures.NewDocument().Create(t, suite.DB)
    searchDoc := ModelToSearchDocument(doc)
    suite.SearchProvider.DocumentIndex().Index(suite.Ctx, searchDoc)
    
    // Test handler
    resp := suite.Client.Get(fmt.Sprintf("/api/v1/documents/%s", doc.GoogleFileID))
    resp.AssertStatusOK()
}
```

### 3. Run Full Test Suite
```bash
# Should pass all 59 tests (50 currently passing + 9 being unblocked)
go test -tags=integration -v ./tests/api/ -timeout 5m
```

---

## 📊 Expected Outcomes

### Before Refactoring
- ✅ 50 tests passing
- ⏭️ 9 tests skipped (Algolia coupling)
- **Pass rate**: 85% (50/59)

### After Refactoring
- ✅ 59 tests passing
- ⏭️ 0 tests skipped
- **Pass rate**: 100% (59/59)

### Additional Benefits
- ✅ V1 and V2 APIs use consistent patterns
- ✅ Easier to switch search providers (Algolia ↔ Meilisearch)
- ✅ Better testability with mocks
- ✅ Cleaner dependency injection
- ✅ Reduced tight coupling to external services

---

## ⚠️ Potential Challenges

### 1. Type Conversions
**Issue**: Algolia uses `map[string]any`, search provider uses `search.Document`

**Solution**: Keep existing conversion functions but update call sites
```go
// Keep this helper
func document.NewFromAlgoliaObject(obj map[string]any) (*document.Document, error)

// But get obj from search provider
searchDoc, err := srv.SearchProvider.DocumentIndex().GetObject(ctx, docID)
// Convert to map[string]any if needed for backward compatibility
algoObj := searchDocumentToMap(searchDoc)
doc, err := document.NewFromAlgoliaObject(algoObj)
```

### 2. Context Propagation
**Issue**: Many V1 handlers don't currently use context

**Solution**: Extract context from request: `ctx := r.Context()`

### 3. Search Query Syntax
**Issue**: Algolia filter syntax may differ from abstraction

**Solution**: Keep Algolia-style filters, let adapter translate
```go
// This should work with both Algolia and Meilisearch adapters
filters := fmt.Sprintf("status:%s AND docType:%s", status, docType)
```

---

## 🚀 Execution Plan

### Session 1: DocumentHandler (2-3 hours)
1. Update function signature
2. Replace all Algolia calls
3. Update router registration
4. Enable and fix `TestDocuments_Get`
5. Enable and fix `TestDocuments_Patch`
6. Enable and fix `TestDocuments_Delete`

### Session 2: DraftsHandler (2-3 hours)
1. Update function signature
2. Replace all Algolia calls
3. Update router registration
4. Enable and fix `TestDocuments_List`
5. Enable and fix `TestAPI_DraftsHandler`

### Session 3: Remaining Handlers (3-4 hours)
1. MeHandler refactoring
2. ReviewsHandler refactoring
3. ApprovalsHandler refactoring
4. Enable and fix remaining 3 tests

### Session 4: Cleanup and Documentation (1 hour)
1. Remove unused Algolia imports
2. Update test documentation
3. Update API_INTEGRATION_TEST_STATUS.md
4. Verify all 59 tests passing

**Total Estimated Time**: 8-11 hours

---

## 🎯 Success Criteria

- [x] Created refactoring plan document
- [ ] All 5 V1 handler functions use `server.Server` parameter
- [ ] Zero direct Algolia client usage in V1 handlers
- [ ] All 9 skipped tests enabled and passing
- [ ] 59/59 tests passing (100% pass rate)
- [ ] No regression in existing 50 passing tests
- [ ] Documentation updated

---

## 📚 Reference Files

- **V2 Handler Examples**: `internal/api/v2/drafts.go`, `internal/api/v2/documents.go`
- **Search Provider Interface**: `pkg/search/provider.go`
- **Mock Search Provider**: `tests/api/mock_search_provider.go`
- **Integration Test Suite**: `tests/api/suite.go`
- **Test Status**: `docs-internal/API_INTEGRATION_TEST_STATUS.md`

---

## 💡 Alternative Approach: Incremental V1.5 API

Given the complexity of refactoring V1 handlers (900+ lines in `documents.go` alone), here's a pragmatic alternative:

### Create V1.5 API Layer
Instead of modifying existing V1 handlers, create parallel "V1.5" versions:

```go
// internal/api/v1_5/documents.go - New file
func DocumentHandler(srv server.Server) http.Handler {
    // Clean implementation using search.Provider
    // Copy logic from V1 but with new signatures
}
```

**Benefits**:
- Zero risk to existing V1 API
- Can test V1.5 in parallel
- Gradual migration path
- Easy rollback if issues arise

**Implementation**:
1. Create `internal/api/v1_5/` directory
2. Copy V1 handlers and refactor with new signatures
3. Mount both V1 and V1.5 routes in router
4. Test V1.5 with integration tests
5. Eventually deprecate V1 after validation

### Recommended Next Steps

#### Option A: V1.5 API (Recommended - Lower Risk)
1. Create `internal/api/v1_5/documents.go` with new signature
2. Implement using `server.Server` and search abstraction  
3. Add new route: `/api/v1.5/documents/`
4. Enable tests for V1.5 endpoints
5. After validation, consider V1 → V1.5 migration or keep both

#### Option B: Direct V1 Refactoring (Higher Risk)
1. Create comprehensive test coverage for V1 endpoints first
2. Refactor `DocumentHandler` with systematic sed/awk scripts
3. Fix compilation errors incrementally
4. Verify all existing V1 tests still pass
5. Enable skipped tests

### Detailed V1.5 Implementation Plan

```bash
# 1. Create V1.5 directory structure
mkdir -p internal/api/v1_5

# 2. Create documents handler (copy from V2 pattern)
cat > internal/api/v1_5/documents.go << 'EOF'
package v1_5

import (
    "context"
    "encoding/json"
    "errors"
    "fmt"
    "net/http"
    
    "github.com/hashicorp-forge/hermes/internal/server"
    pkgauth "github.com/hashicorp-forge/hermes/pkg/auth"
    "github.com/hashicorp-forge/hermes/pkg/document"
    "github.com/hashicorp-forge/hermes/pkg/search"
    // ...
)

func DocumentHandler(srv server.Server) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ctx := r.Context()
        // Use srv.SearchProvider, srv.WorkspaceProvider, srv.DB, etc.
        // Clean implementation without Algolia coupling
    })
}
EOF

# 3. Update router to add V1.5 routes
# In internal/server/router.go, add:
#   api1_5 := r.PathPrefix("/api/v1.5").Subrouter()
#   api1_5.Handle("/documents/{id}", v1_5.DocumentHandler(srv))

# 4. Update tests to target V1.5 endpoints
# In tests/api/documents_test.go, change:
#   resp := suite.Client.Get("/api/v1/documents/123")
# To:
#   resp := suite.Client.Get("/api/v1.5/documents/123")

# 5. Remove skip statements and run tests
go test -tags=integration -v ./tests/api/ -run TestDocuments
```

### Success Criteria (V1.5 Approach)

- [ ] `internal/api/v1_5/` directory created
- [ ] `DocumentHandler` implemented with `server.Server` parameter
- [ ] `/api/v1.5/documents/` route mounted in router
- [ ] All 3 document tests passing against V1.5
- [ ] Zero impact to existing V1 endpoints
- [ ] Documentation updated

### Time Estimate

**V1.5 Approach**: 4-6 hours (much lower risk)
- 1 hour: Setup directory and basic structure
- 2 hours: Implement DocumentHandler
- 1 hour: Wire up routes and test
- 1 hour: Implement remaining handlers (drafts, me, etc.)

**V1 Direct Refactoring**: 8-11 hours (higher risk of breaking changes)

## 🎯 Recommendation

**Start with V1.5 API approach**. It's cleaner, safer, and allows us to:
1. Prove the abstraction works without risk
2. Get tests passing immediately
3. Keep V1 as-is for backward compatibility
4. Migrate clients gradually to V1.5

Once V1.5 is validated and stable, we can either:
- Keep both versions (API versioning)
- Migrate V1 logic to V1.5 implementation
- Deprecate V1 after transition period

Let's implement V1.5! 🚀
