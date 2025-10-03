# Handler Migration to Search Provider

**Status**: Phase 1A Complete ✅, Phase 1B Paused ⏸️  
**Date Started**: 2025-01-03  
**Last Updated**: 2025-01-03  
**Context**: Search provider dependency injection is working, but handlers still use direct Algolia/GWService calls

## Progress Summary

**Phase 1A: Products Handler** ✅ **COMPLETE**
- ✅ Migrated to use database instead of Algolia
- ✅ All 3 products tests passing
- ✅ Commit: 0cd08af
- **Impact**: Removed Algolia dependency for products endpoint

**Phase 1B: Drafts Mock** ⏸️ **PAUSED**
- ⚠️ Drafts handlers have 20+ Google Workspace API calls
- ⚠️ Complex to fully mock GWService
- 📝 Recommend skipping to Phase 2 (proper migration)

**Next Recommended**: Phase 2 - Migrate handlers to use SearchProvider

## Current Test Status

**Passing: 4/7 (57%)** - Up from 3/7! 📈

Products Tests (3/3) ✅:
- ✅ `TestV2Products_Get` - Now uses database (was failing)
- ✅ `TestV2Products_MethodNotAllowed` - Auth + HTTP method validation
- ✅ `TestV2Products_Unauthorized` - Auth failure handling

Drafts Tests (1/4) ⚠️:
- ✅ `TestV2Drafts_Unauthorized` - Auth failure handling
- ❌ `TestV2Drafts_List` - Drafts handler uses `srv.AlgoSearch.Drafts` + `srv.GWService`
- ❌ `TestV2Drafts_GetSingle` - Drafts handler uses `srv.GWService.GetFile()`
- ❌ `TestV2Drafts_Patch` - Not tested yet (depends on above fixes)

## Root Cause Analysis

### Infrastructure: ✅ WORKING

The dependency injection is complete and correct:

```go
// Server struct has SearchProvider
type Server struct {
    SearchProvider search.Provider  // ✅ Available
    AlgoSearch     algolia.Client   // 🔄 Empty in tests (deprecated)
    AlgoWrite      algolia.Client   // 🔄 Empty in tests (deprecated)
    GWService      *google.Service  // ❌ Nil in tests
}

// Tests properly inject SearchProvider
func (s *Suite) setupServer() *server.Server {
    return &server.Server{
        SearchProvider: s.SearchProvider,  // ✅ Meilisearch adapter
        // AlgoSearch not set - empty struct
        // GWService not set - nil
    }
}
```

### Handler Layer: ❌ NEEDS REFACTORING

Handlers haven't been updated to use SearchProvider:

```go
// ❌ Products handler - Still uses AlgoSearch.Internal
func ProductsHandler(srv server.Server) http.Handler {
    err := srv.AlgoSearch.Internal.GetObject("products", &p)
    // PANIC: AlgoSearch.Internal is nil
}

// ❌ Drafts handler - Still uses AlgoSearch + GWService
func DraftsDocumentHandler(srv server.Server) http.Handler {
    file, err := srv.GWService.GetFile(...)  // PANIC: GWService is nil
    srv.AlgoSearch.Drafts.GetObject(...)     // PANIC: AlgoSearch.Drafts is nil
}
```

## Migration Strategy

### Phase 1: Quick Wins (Get Tests Passing)

**Goal**: Make existing tests pass without major refactoring

#### 1A. Products Handler - Use Database

Products are already in the database. Fetch from there instead of Algolia.

**File**: `internal/api/v2/products.go`  
**Change**: Replace Algolia call with GORM query

```go
// Before:
func getProductsData(a *algolia.Client) ([]productsResponseItem, error) {
    var p productsIndex
    err := a.Internal.GetObject("products", &p)  // ❌ Algolia
    // ...
}

// After:
func getProductsData(db *gorm.DB) ([]productsResponseItem, error) {
    var products []models.Product
    err := db.Find(&products).Error  // ✅ Database
    // Transform to productsResponseItem
}
```

**Test Impact**: ✅ `TestV2Products_Get` will pass

#### 1B. Drafts Tests - Mock GWService (Temporary)

Create a mock workspace adapter for tests only.

**File**: `tests/api/suite.go`  
**Change**: Add mock GWService to test server

```go
// Add to Suite:
type Suite struct {
    // ...existing fields...
    MockWorkspace *mockworkspace.Adapter
}

// Update setupServer:
func (s *Suite) setupServer() *server.Server {
    return &server.Server{
        SearchProvider: s.SearchProvider,
        GWService:      s.MockWorkspace.Service(),  // ✅ Mock
        // ...
    }
}
```

**File**: `pkg/workspace/adapters/mock/adapter.go` (new)  
**Create**: Mock workspace adapter similar to mock auth

```go
package mock

type Adapter struct {
    Files map[string]*drive.File
}

func (a *Adapter) GetFile(fileID string) (*drive.File, error) {
    if file, ok := a.Files[fileID]; ok {
        return file, nil
    }
    return nil, fmt.Errorf("file not found: %s", fileID)
}
```

**Test Impact**: ✅ `TestV2Drafts_*` will pass (with mock data)

### Phase 2: Proper Handler Migration

**Goal**: Update handlers to use SearchProvider properly

#### 2A. Identify All Direct Algolia Calls

**Grep Results**:
```bash
$ grep -n "srv.AlgoSearch\|srv.AlgoWrite" internal/api/v2/*.go
drafts.go:413:  srv.AlgoSearch.Drafts.GetObject(...)
drafts.go:441:  srv.AlgoWrite.Drafts.SaveObject(...)
drafts.go:563:  srv.AlgoSearch.Drafts.DeleteObject(...)
drafts.go:565:  srv.AlgoWrite.Documents.PartialUpdateObject(...)
drafts.go:725:  srv.AlgoSearch.Drafts.Search(...)
drafts.go:729:  srv.AlgoWrite.Drafts.SaveObject(...)
drafts.go:827:  srv.AlgoWrite.Drafts.SaveObject(...)
drafts.go:907:  srv.AlgoWrite.Drafts.SaveObject(...)
drafts.go:1536: srv.AlgoSearch.Drafts.GetObject(...)
drafts.go:1560: srv.AlgoWrite.Drafts.SaveObject(...)
products.go:54: srv.AlgoSearch.Internal.GetObject(...)
```

**Total**: 11 calls across 2 files

#### 2B. Refactoring Pattern

Replace direct calls with search provider:

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

For writes:
```go
// Before:
_, err := srv.AlgoWrite.Drafts.SaveObject(draft)

// After:
err := srv.SearchProvider.DraftIndex().Index(draft)
```

#### 2C. Migration Order

1. **Products Handler** (1 call):
   - Phase 1A handles this via database
   - No search provider needed for products

2. **Drafts GET Operations** (3 calls):
   - Lines 413, 1536: `GetObject` → `Search` with filter
   - Test first with passing queries

3. **Drafts Write Operations** (7 calls):
   - Lines 441, 729, 827, 907, 1560: `SaveObject` → `Index`
   - Lines 563: `DeleteObject` → `Delete`
   - Line 565: `PartialUpdateObject` → `Update` or `Index`

4. **Drafts Search** (1 call):
   - Line 725: Already search, just use SearchProvider

### Phase 3: Cleanup

**Goal**: Remove deprecated fields

#### 3A. Mark Deprecated (Already Done)
```go
// internal/server/server.go
type Server struct {
    SearchProvider search.Provider
    
    // Deprecated: Use SearchProvider.DocumentIndex() instead
    AlgoSearch algolia.Client
    
    // Deprecated: Use SearchProvider.DocumentIndex() instead  
    AlgoWrite algolia.Client
}
```

#### 3B. Update Remaining Handlers

After v2 APIs work, update remaining handlers:
- `internal/api/*.go` (v1 APIs)
- Any other direct Algolia usage

#### 3C. Remove Deprecated Fields

Once all handlers migrated:
```go
type Server struct {
    SearchProvider search.Provider
    // AlgoSearch removed
    // AlgoWrite removed
}
```

## Implementation Checklist

### Phase 1: Quick Wins 🔄

- [x] 1A. Products - Use Database ✅
  - [x] Refactor `getProductsData()` to use GORM
  - [x] Test `TestV2Products_Get` passes
  - **Result**: All 3 products tests passing (100%)
  - **Commit**: 0cd08af
  
- [ ] 1B. Drafts - Mock GWService  
  - [x] Create `pkg/workspace/adapters/mock/adapter.go` (partial)
  - [ ] Complete mock implementation with all required methods
  - [ ] Add `MockWorkspace` to test suite
  - [ ] Update `setupServer()` to inject mock
  - [ ] Test `TestV2Drafts_*` passes
  - **Status**: Paused - drafts handlers have 20+ GWService calls, complex to mock
  - **Alternative**: Focus on Phase 2 (proper search provider migration)

### Phase 2: Proper Migration 🔄

- [ ] 2A. Audit Algolia Usage
  - [ ] Document all direct calls with line numbers
  - [ ] Identify read vs write operations
  - [ ] Check for special cases (like products.Internal)

- [ ] 2B. Migrate Drafts GET (Lines 413, 1536)
  - [ ] Replace `GetObject` with `Search(filter)`
  - [ ] Update tests
  - [ ] Verify existing functionality

- [ ] 2C. Migrate Drafts Write (Lines 441, 563, 565, 729, 827, 907, 1560)
  - [ ] Replace `SaveObject` with `Index`
  - [ ] Replace `DeleteObject` with `Delete`
  - [ ] Replace `PartialUpdateObject` with `Update`
  - [ ] Update tests
  - [ ] Verify existing functionality

- [ ] 2D. Migrate Drafts Search (Line 725)
  - [ ] Use `SearchProvider.DraftIndex().Search()`
  - [ ] Update tests

### Phase 3: Cleanup ⏳

- [ ] 3A. Audit v1 APIs
  - [ ] Check `internal/api/*.go` for Algolia usage
  - [ ] Plan migration for v1 handlers

- [ ] 3B. Remove Deprecated Fields
  - [ ] Delete `AlgoSearch` from Server
  - [ ] Delete `AlgoWrite` from Server
  - [ ] Update all call sites
  - [ ] Update documentation

## Testing Strategy

### For Each Migration Step:

1. **Write Failing Test** (if doesn't exist)
   ```go
   func TestDrafts_GetWithSearchProvider(t *testing.T) {
       suite := NewIntegrationSuite(t)
       // Test uses SearchProvider
   }
   ```

2. **Refactor Handler**
   - Add SearchProvider code path
   - Keep Algolia path as fallback initially
   ```go
   if srv.SearchProvider != nil {
       // New path
   } else {
       // Old path (deprecated)
   }
   ```

3. **Verify Tests Pass**
   ```bash
   go test -tags=integration ./tests/api -run TestDrafts
   ```

4. **Remove Fallback** (once all tests pass)
   - Delete old Algolia code path
   - Update documentation

## Expected Outcomes

### Short Term (Phase 1)
- **Test Coverage**: 7/7 tests passing (100%)
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

**Why This Approach**:
1. **Separation of Concerns**: Infrastructure first, handlers second
2. **Safety**: Infrastructure changes are low-risk (additive)
3. **Testing**: Can verify infrastructure works before touching handlers
4. **Incremental**: Can migrate one handler at a time

**Migration Philosophy**:
- Infrastructure changes are **architectural** (affects structure)
- Handler changes are **implementation** (affects behavior)
- Do architecture first, then gradually update implementation
- Tests reveal what needs updating (that's their job!)

## References

- **Infrastructure**: `docs-internal/SEARCH_PROVIDER_INJECTION.md`
- **Auth Pattern**: `docs-internal/AUTH_ADAPTER_COMPLETE.md`
- **Search Abstraction**: `pkg/search/search.go`
- **Test Infrastructure**: `tests/api/suite.go`
