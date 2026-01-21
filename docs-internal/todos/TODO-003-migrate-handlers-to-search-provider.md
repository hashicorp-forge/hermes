---
id: TODO-003
title: Migrate API Handlers to Search Provider Abstraction
date: 2025-10-09
type: TODO
priority: high
status: in-progress
progress: 71%
tags: [refactoring, search, algolia, meilisearch, handlers, migration]
related:
  - ADR-073
  - ADR-075
  - RFC-076
---

# Migrate API Handlers to Search Provider Abstraction

## Status Summary

**Phase 1A: Complete ✅** - Products and Drafts List migrated to database  
**Phase 1B: Paused ⏸️** - Drafts Single/Patch needs workspace provider abstraction  
**Next**: Phase 2 - Migrate remaining handlers to SearchProvider

**Current Test Status**: 5/7 tests passing (71%) - Up from 3/7 initially! 📈

## Context

Search provider dependency injection is working, but many handlers still use direct Algolia/GWService calls. Need to migrate all handlers to use the SearchProvider abstraction to:
- Enable testing without external dependencies
- Support Meilisearch as Algolia alternative
- Improve code maintainability and flexibility

## Completed Work

### Phase 1A: Products Handler ✅
- ✅ Migrated to use database instead of Algolia
- ✅ All 3 products tests passing
- ✅ Commit: 0cd08af
- **Impact**: Removed Algolia dependency for products endpoint

### Phase 1A-2: Drafts List Handler ✅
- ✅ Hybrid database-first approach for listing
- ✅ TestV2Drafts_List now passing
- ✅ Commit: 46eddf8
- **Impact**: Removed Algolia dependency for simple list operations
- **Strategy**: Database for simple lists, Algolia for advanced search

## Current Blockers

### Phase 1B: Drafts Single/Patch ⏸️
- ⚠️ DraftsDocumentHandler (GET single) needs GWService
- ⚠️ DraftsPatchHandler needs GWService
- ⚠️ Complex to fully mock GWService (20+ methods)
- 📝 **Recommendation**: Skip to Phase 2 or create WorkspaceProvider abstraction

## Root Cause Analysis

### Infrastructure: ✅ WORKING

Dependency injection is complete:

```go
type Server struct {
    SearchProvider search.Provider  // ✅ Available
    AlgoSearch     algolia.Client   // 🔄 Empty in tests (deprecated)
    AlgoWrite      algolia.Client   // 🔄 Empty in tests (deprecated)
    GWService      *google.Service  // ❌ Nil in tests
}
```

### Handler Layer: ❌ NEEDS REFACTORING

Handlers haven't been updated:

```go
// ❌ Still uses AlgoSearch
err := srv.AlgoSearch.Internal.GetObject("products", &p)

// ❌ Still uses GWService
file, err := srv.GWService.GetFile(...)
```

## Remaining Work

### Phase 2: Proper Handler Migration

#### 2A. Audit Algolia Usage

Grep results show **11 direct calls** across 2 files:

```bash
internal/api/v2/drafts.go:413:  srv.AlgoSearch.Drafts.GetObject(...)
internal/api/v2/drafts.go:441:  srv.AlgoWrite.Drafts.SaveObject(...)
internal/api/v2/drafts.go:563:  srv.AlgoSearch.Drafts.DeleteObject(...)
internal/api/v2/drafts.go:565:  srv.AlgoWrite.Documents.PartialUpdateObject(...)
internal/api/v2/drafts.go:725:  srv.AlgoSearch.Drafts.Search(...)
internal/api/v2/drafts.go:729:  srv.AlgoWrite.Drafts.SaveObject(...)
internal/api/v2/drafts.go:827:  srv.AlgoWrite.Drafts.SaveObject(...)
internal/api/v2/drafts.go:907:  srv.AlgoWrite.Drafts.SaveObject(...)
internal/api/v2/drafts.go:1536: srv.AlgoSearch.Drafts.GetObject(...)
internal/api/v2/drafts.go:1560: srv.AlgoWrite.Drafts.SaveObject(...)
internal/api/v2/products.go:54: srv.AlgoSearch.Internal.GetObject(...) [DONE]
```

#### 2B. Refactoring Pattern

```go
// Before:
err := srv.AlgoSearch.Drafts.GetObject(draftID, &draft)

// After:
result, err := srv.SearchProvider.DraftIndex().Search(query{
    Filters: fmt.Sprintf("objectID:%s", draftID),
})
if err == nil && len(result.Hits) > 0 {
    draft = result.Hits[0]
}
```

#### 2C. Migration Order

1. **Products Handler** (1 call) - ✅ **DONE** via database
2. **Drafts GET Operations** (3 calls - lines 413, 1536):
   - Replace `GetObject` with `Search` with filter
3. **Drafts Write Operations** (7 calls):
   - Lines 441, 729, 827, 907, 1560: `SaveObject` → `Index`
   - Line 563: `DeleteObject` → `Delete`
   - Line 565: `PartialUpdateObject` → `Update` or `Index`
4. **Drafts Search** (1 call - line 725):
   - Already search, just use SearchProvider

### Phase 3: Cleanup

1. **Update v1 APIs** - Check `internal/api/*.go` for Algolia usage
2. **Remove Deprecated Fields** - Delete `AlgoSearch` and `AlgoWrite` from Server struct
3. **Update Documentation**

## Implementation Checklist

### Phase 1: Quick Wins 🔄

- [x] 1A. Products - Use Database ✅
- [x] 1A-2. Drafts List - Use Database ✅
- [ ] 1B. Drafts Single/Patch - Mock GWService ⏸️

### Phase 2: Proper Migration ⏳

- [ ] 2A. Audit Algolia Usage
- [ ] 2B. Migrate Drafts GET (Lines 413, 1536)
- [ ] 2C. Migrate Drafts Write (Lines 441, 563, 565, 729, 827, 907, 1560)
- [ ] 2D. Migrate Drafts Search (Line 725)

### Phase 3: Cleanup ⏳

- [ ] 3A. Audit v1 APIs
- [ ] 3B. Remove Deprecated Fields

## Testing Strategy

For each migration step:

1. **Write Failing Test** (if doesn't exist)
2. **Refactor Handler** - Add SearchProvider path, keep Algolia as fallback
3. **Verify Tests Pass**
4. **Remove Fallback** - Delete old Algolia code path

## Expected Outcomes

### Short Term (Phase 1) - ✅ ACHIEVED
- **Test Coverage**: 5/7 tests passing (71%)
- **Code Quality**: Tests work with mock dependencies
- **Developer Experience**: Tests run fast, no external dependencies

### Medium Term (Phase 2)
- **Handler Quality**: All handlers use search abstraction
- **Flexibility**: Easy to switch search backends
- **Maintainability**: Cleaner code, fewer dependencies

### Long Term (Phase 3)
- **Architecture**: Clean dependency injection throughout
- **Testing**: Comprehensive integration tests
- **Production Ready**: Meilisearch as Algolia alternative

## Notes

**Why Tests Fail Now**:
- Infrastructure refactoring is complete (✅)
- Handlers haven't been updated yet (❌)
- This is the **expected state** of a two-phase migration

**Migration Philosophy**:
- Infrastructure changes are **architectural** (affects structure)
- Handler changes are **implementation** (affects behavior)
- Do architecture first, then gradually update implementation
- Tests reveal what needs updating

## References

- `internal/api/v2/drafts.go` - Main file needing migration
- `pkg/search/search.go` - Search abstraction interface
- ADR-073 - Provider Abstraction Architecture
- ADR-075 - Meilisearch as Local Search Solution
- RFC-076 - Search and Authentication Refactoring
