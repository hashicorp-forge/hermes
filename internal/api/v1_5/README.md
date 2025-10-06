# V1.5 API Handlers

Refactored versions of V1 handlers using provider abstractions for better testability.

## Key Changes from V1

### Architecture
- **V1**: Direct dependencies on `*algolia.Client` and `*gw.Service`
- **V1.5**: Uses `server.Server` with provider abstractions

### Benefits
1. ✅ **Testable** - Easy to mock search and workspace providers
2. ✅ **Consistent** - Same pattern as V2 API
3. ✅ **Flexible** - Can switch between Algolia/Meilisearch or Google/Local workspace
4. ✅ **Clean** - Single `srv` parameter instead of 6+ parameters

## Handler Signatures

### V1 (Old Pattern)
```go
func DocumentHandler(
    cfg *config.Config,
    l hclog.Logger,
    ar *algolia.Client,      // ❌ Direct Algolia
    aw *algolia.Client,      // ❌ Direct Algolia
    s *gw.Service,           // ❌ Direct Google Workspace
    db *gorm.DB) http.Handler
```

### V1.5 (New Pattern)
```go
func DocumentHandler(srv server.Server) http.Handler
```

## Provider Abstractions

### Search Provider
```go
// Get document from search index
searchDoc, err := srv.SearchProvider.DocumentIndex().GetObject(ctx, docID)

// Index document
err = srv.SearchProvider.DocumentIndex().Index(ctx, searchDoc)

// Delete document
err = srv.SearchProvider.DocumentIndex().Delete(ctx, docID)
```

### Workspace Provider
```go
// Get file metadata
file, err := srv.WorkspaceProvider.GetFile(docID)

// Move file
newFile, err := srv.WorkspaceProvider.MoveFile(docID, targetFolder)

// Share file
err = srv.WorkspaceProvider.ShareFile(docID, email, role)

// No need to create adapter - srv.WorkspaceProvider IS the adapter!
locked, err := hcd.IsLocked(docID, srv.DB, srv.WorkspaceProvider, srv.Logger)
```

## Migration Status

| Handler | Lines Changed | Workspace Calls | Algolia Calls | Status | Tests Enabled |
|---------|--------------|-----------------|---------------|--------|---------------|
| documents.go | ~50 | 2 | 3 | 🚧 In Progress | 4 tests |
| drafts.go | ~100 | 8 | 5 | ⬜ Not Started | 1 test |
| reviews.go | ~150 | 11 | 4 | ⬜ Not Started | 1 test |
| approvals.go | ~80 | 2 | 4 | ⬜ Not Started | 1 test |
| me.go | TBD | TBD | TBD | ⬜ Not Started | 1 test |
| others | TBD | TBD | TBD | ⬜ Not Started | 1 test |

## Testing

Tests are updated to use V1.5 endpoints:
```go
// V1 endpoint (old)
resp := suite.Client.Get("/api/v1/documents/test-123")

// V1.5 endpoint (new)
resp := suite.Client.Get("/api/v1.5/documents/test-123")
```

## Routes

V1.5 routes are mounted at `/api/v1.5/` in `internal/server/router.go`:
```go
api1_5 := r.PathPrefix("/api/v1.5").Subrouter()
api1_5.Handle("/documents/{id}", v1_5.DocumentHandler(srv))
api1_5.Handle("/drafts", v1_5.DraftsHandler(srv))
// ...
```

## Documentation

See `docs-internal/`:
- `V1_REFACTORING_QUICK_START.md` - Implementation guide
- `V1_API_WORKSPACE_CALLS_INVENTORY.md` - Complete call inventory
- `REFACTORING_V1_ALGOLIA_HANDLERS.md` - Detailed strategy
- `V1_REFACTORING_EXECUTIVE_SUMMARY.md` - Overview

## Goal

Enable 9 skipped integration tests to achieve **100% pass rate (59/59 tests)**.

Current: 50/59 (85%) → Target: 59/59 (100%) ✅
