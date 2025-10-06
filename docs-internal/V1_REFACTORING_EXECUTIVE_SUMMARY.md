# V1 API Refactoring - Executive Summary

**Date**: October 5, 2025  
**Status**: 📋 Planning Complete - Ready for Implementation  
**Goal**: Enable 9 skipped integration tests by removing Algolia and Google Workspace coupling

---

## 🎯 What We Need to Fix

### Current State
- **50/59 tests passing** (85% pass rate)
- **9 tests skipped** due to tight coupling to Algolia and Google Workspace
- V1 handlers directly use `*algolia.Client` and `*gw.Service` parameters
- Cannot mock or test without real external services

### Target State  
- **59/59 tests passing** (100% pass rate)
- All V1 handlers use `server.Server` with provider abstractions
- Easy to mock for testing
- Consistent with V2 API patterns

---

## 📊 Scope of Changes

### Direct Calls to Replace
- **~25 Google Workspace calls** across 8 handler files
- **~16 Algolia calls** across 5 handler files
- **12 function signatures** need updating

### Most Impacted Files
1. **drafts.go** - 8 workspace calls, 5 Algolia calls
2. **reviews.go** - 11 workspace calls, 4 Algolia calls
3. **documents.go** - 2 workspace calls, 3 Algolia calls
4. **approvals.go** - 2 workspace calls, 4 Algolia calls

---

## 🔄 The Refactoring Pattern

### Before (V1 - Current)
```go
func DocumentHandler(
    cfg *config.Config,
    l hclog.Logger,
    ar *algolia.Client,      // ❌ Direct Algolia
    aw *algolia.Client,      // ❌ Direct Algolia
    s *gw.Service,           // ❌ Direct Google Workspace
    db *gorm.DB) http.Handler {
    
    // Direct calls - can't mock!
    file, err := s.GetFile(docID)
    err = ar.Docs.GetObject(docID, &algoObj)
    provider := gw.NewAdapter(s)
}
```

### After (V1 Refactored or V1.5)
```go
func DocumentHandler(srv server.Server) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ctx := r.Context()
        
        // Provider abstractions - easily mocked!
        file, err := srv.WorkspaceProvider.GetFile(docID)
        searchDoc, err := srv.SearchProvider.DocumentIndex().GetObject(ctx, docID)
        
        // srv.WorkspaceProvider IS already an adapter!
        locked, err := hcd.IsLocked(docID, srv.DB, srv.WorkspaceProvider, srv.Logger)
    })
}
```

---

## 🚀 Implementation Approaches

### Option A: V1.5 Parallel API (Recommended ✅)

**Create new handlers alongside V1:**
- New directory: `internal/api/v1_5/`
- Copy V1 handlers, refactor with new signatures
- Mount at `/api/v1.5/` routes
- Test independently
- Zero risk to existing V1

**Pros:**
- ✅ Zero risk to production API
- ✅ Easy rollback
- ✅ Side-by-side testing
- ✅ Gradual client migration

**Cons:**
- ⚠️ Code duplication (temporary)
- ⚠️ Two versions to maintain

**Time Estimate:** 4-6 hours

### Option B: Direct V1 Refactoring

**Modify existing V1 handlers in place:**
- Systematic find-and-replace
- Fix all compilation errors
- Verify all tests pass

**Pros:**
- ✅ No code duplication
- ✅ Single version to maintain

**Cons:**
- ⚠️ Higher risk of breaking changes
- ⚠️ Must complete fully before testing
- ⚠️ Harder to roll back

**Time Estimate:** 8-13 hours

---

## 📋 Priority Order

### Phase 1: High Priority (5 tests) 🔴
1. **DocumentHandler** - Affects 4 tests
   - 2 workspace calls to replace
   - 3 Algolia calls to replace
   - Tests: `TestDocuments_Get`, `TestDocuments_Patch`, `TestDocuments_Delete`, `TestDocuments_List`

2. **DraftsHandler** - Affects 1 test
   - 8 workspace calls to replace
   - 5 Algolia calls to replace
   - Test: `TestAPI_DraftsHandler`

### Phase 2: Medium Priority (2 tests) 🟡
3. **ReviewsHandler** - Affects 1 test
   - 11 workspace calls to replace (most complex!)
   - 4 Algolia calls to replace

4. **ApprovalsHandler** - Affects 1 test
   - 2 workspace calls to replace
   - 4 Algolia calls to replace

### Phase 3: Low Priority (2 tests) 🟢
5. **MeHandler** and other handlers
   - 2 remaining tests

---

## 📚 Documentation Created

### Comprehensive Guides
1. **REFACTORING_V1_ALGOLIA_HANDLERS.md**
   - Overall strategy and patterns
   - Step-by-step implementation plan
   - Success criteria
   - Time estimates

2. **V1_API_WORKSPACE_CALLS_INVENTORY.md** ⭐ **NEW**
   - Complete inventory of all ~25 workspace calls
   - Line-by-line mapping with replacements
   - Handler-by-handler breakdown
   - Before/after code examples
   - Priority ranking

3. **API_INTEGRATION_TEST_STATUS.md** (Updated)
   - Current test status (50/59 passing)
   - Link to refactoring plan
   - Expected outcomes

---

## 🎯 Expected Outcomes

### After Phase 1 (DocumentHandler + DraftsHandler)
- ✅ 5 more tests passing
- ✅ 55/59 total (93% pass rate)
- ⏱️ 2-3 hours estimated

### After Phase 2 (ReviewsHandler + ApprovalsHandler)
- ✅ 2 more tests passing
- ✅ 57/59 total (97% pass rate)
- ⏱️ 2-3 hours estimated

### After Phase 3 (Remaining handlers)
- ✅ 2 more tests passing
- ✅ 59/59 total (100% pass rate!) 🎉
- ⏱️ 1-2 hours estimated

**Total Time:** 4-6 hours (V1.5) or 8-13 hours (direct V1)

---

## 💡 Key Insights

### Critical Discovery
**No need to create workspace adapters!** 

❌ Wrong:
```go
provider := gw.NewAdapter(s)  // Creating adapter from service
hcd.IsLocked(docID, db, provider, l)
```

✅ Right:
```go
// srv.WorkspaceProvider IS already an adapter!
hcd.IsLocked(docID, srv.DB, srv.WorkspaceProvider, srv.Logger)
```

### Workspace Call Patterns
Most common operations:
- `GetFile()` - 4 occurrences
- `ShareFile()` - 3 occurrences  
- `MoveFile()` - 3 occurrences
- `GetLatestRevision()` - 3 occurrences
- Folder operations - 7 occurrences (reviews.go)

### Algolia Call Patterns
All follow similar pattern:
- `ar.Docs.GetObject()` → `srv.SearchProvider.DocumentIndex().GetObject(ctx, ...)`
- `aw.Docs.SaveObject()` → `srv.SearchProvider.DocumentIndex().Index(ctx, ...)`
- `aw.Docs.DeleteObject()` → `srv.SearchProvider.DocumentIndex().Delete(ctx, ...)`

---

## ✅ Recommendation

**Start with V1.5 API Approach:**

1. **Week 1 - Phase 1** (High Priority)
   - Create `internal/api/v1_5/` directory
   - Implement DocumentHandler
   - Implement DraftsHandler
   - Mount v1.5 routes
   - Enable and fix 5 tests
   - **Result:** 55/59 tests passing

2. **Week 2 - Phase 2** (Medium Priority)
   - Implement ReviewsHandler
   - Implement ApprovalsHandler
   - Enable and fix 2 tests
   - **Result:** 57/59 tests passing

3. **Week 3 - Phase 3** (Low Priority + Cleanup)
   - Implement remaining handlers
   - Enable final 2 tests
   - Documentation updates
   - **Result:** 59/59 tests passing (100%)

---

## 🚦 Ready to Start

### Prerequisites
- ✅ Complete inventory of changes documented
- ✅ Refactoring patterns defined
- ✅ Test targets identified
- ✅ Time estimates calculated
- ✅ Risk mitigation strategy chosen (V1.5)

### Next Command
```bash
# Create V1.5 directory
mkdir -p internal/api/v1_5

# Start with DocumentHandler
# Copy logic from internal/api/documents.go
# Refactor with server.Server pattern
# See V1_API_WORKSPACE_CALLS_INVENTORY.md for exact changes
```

---

**All planning complete. Ready to implement!** 🚀
