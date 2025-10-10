---
id: TODO-006
title: Migrate V1 API Handlers to Search Provider
date: 2025-10-09
updated: 2025-10-09
type: TODO
priority: obsolete
status: superseded
tags: [api, v1, search-provider, migration, refactoring, obsolete]
related:
  - TODO-003
  - TODO-014
  - ADR-073
  - RFC-076
superseded_by: TODO-014
---

# ⚠️ OBSOLETE: Migrate V1 API Handlers to Search Provider

## Status Update (2025-10-09)

**This TODO is OBSOLETE** - V1 API endpoints are **no longer registered** in the Hermes server.

- ✅ Server only registers `/api/v2/*` endpoints (see `internal/cmd/commands/server/server.go`)
- ✅ Frontend hardcoded to use `api_version: "v2"` (see `web/app/services/config.ts`)
- ⚠️ V1 handler implementations remain in codebase but are unreachable

**Next Action**: See **TODO-007** (Remove V1 API Legacy Code) for cleanup tasks.

---

## Original Description (Historical)

V1 API handlers still use direct Algolia client calls instead of the `SearchProvider` abstraction. This prevents:
- Running tests without external Algolia dependency
- Using Meilisearch as an alternative search backend
- Consistent search behavior across API versions

## Code References

### Test Suite Comments
- **File**: `tests/api/suite.go`
- **Lines**: 259, 261, 278, 285

```go
//FIXME: v1 API handlers still use Algolia and GWService directly - 
//       need to migrate them

// TODO: Migrate remaining v1 handlers (drafts, reviews) to use SearchProvider
// TODO: Refactor drafts handlers to use search.Provider instead of algolia.Client
// TODO: Refactor reviews handler to use search.Provider instead of algolia.Client
```

### V1 Test Suite
- **File**: `tests/api/suite_v1_test.go`
- **Lines**: 202, 216, 226

```go
// TODO: Uncomment when V1 API is refactored to use search.Provider
```

## Status: Blocked

This work is blocked by **TODO-003** (Migrate API Handlers to Search Provider), which is currently:
- Phase 1A: ✅ Complete (Products, Drafts List)
- Phase 1B: ⏸️ Paused (needs workspace provider abstraction)
- Phase 2: ⏳ Pending (migrate remaining handlers)

## Affected Handlers

### V1 Drafts Handler
- **File**: `internal/api/drafts.go`
- **Direct Algolia Usage**: Multiple calls to `srv.AlgoSearch` and `srv.AlgoWrite`
- **Test Impact**: 3 test methods commented out

### V1 Reviews Handler  
- **File**: `internal/api/reviews.go`
- **Direct Algolia Usage**: Search operations for document lookups
- **Test Impact**: Test setup cannot inject SearchProvider

## Migration Strategy

Follow the same pattern as V2 API migration (TODO-003):

### Step 1: Identify All Algolia Calls
```bash
grep -n "srv.AlgoSearch\|srv.AlgoWrite" internal/api/drafts.go internal/api/reviews.go
```

### Step 2: Replace with SearchProvider
```go
// Before:
err := srv.AlgoSearch.Drafts.GetObject(id, &draft)

// After:
result, err := srv.SearchProvider.DraftIndex().Search(&search.Query{
    Filters: fmt.Sprintf("objectID:%s", id),
})
```

### Step 3: Update Tests
Uncomment test methods in `suite_v1_test.go` once handlers are migrated.

### Step 4: Remove Deprecated Fields
Once all V1 and V2 handlers are migrated, remove `AlgoSearch` and `AlgoWrite` from `Server` struct.

## Tasks

- [ ] Wait for TODO-003 Phase 2 completion
- [ ] Audit all V1 handler Algolia usage
- [ ] Migrate V1 drafts handler to SearchProvider
- [ ] Migrate V1 reviews handler to SearchProvider
- [ ] Uncomment and update V1 tests
- [ ] Verify all V1 API tests pass
- [ ] Remove FIXME/TODO comments

## Impact

**Files Affected**: 3 files
- `internal/api/drafts.go`
- `internal/api/reviews.go`
- `tests/api/suite_v1_test.go`

**Complexity**: Medium (pattern established by TODO-003)  
**Test Coverage**: Will enable ~3 additional integration tests

## Dependencies

- **Blocks**: Final cleanup of `AlgoSearch`/`AlgoWrite` fields
- **Blocked By**: TODO-003 Phase 2 (V2 handler migration)

## References

- `tests/api/suite.go` - Test suite with FIXME comments
- `tests/api/suite_v1_test.go` - Commented out tests
- `internal/api/drafts.go` - V1 drafts handler
- `internal/api/reviews.go` - V1 reviews handler
- TODO-003 - Main search provider migration tracking
