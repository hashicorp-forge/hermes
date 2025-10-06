# Provider Migration Progress - January 3, 2025

## Overview
Refactoring to remove deprecated `AlgoSearch`, `AlgoWrite`, and `GWService` from `server.Server` and replace with modern provider interfaces.

## Phase 1: Simple Replacements ✅ COMPLETE
All simple WorkspaceProvider replacements were already done in previous work:
- `srv.GWService.ShareFile` → `srv.WorkspaceProvider.ShareFile`
- `srv.GWService.RenameFile` → `srv.WorkspaceProvider.RenameFile`
- `srv.GWService.GetFile` → `srv.WorkspaceProvider.GetFile`
- `srv.GWService.MoveFile` → `srv.WorkspaceProvider.MoveFile`
- `srv.GWService.SearchPeople` → `srv.WorkspaceProvider.SearchPeople`

## Phase 2: SearchProvider Enhancements ⚙️ IN PROGRESS

### ✅ Interface Updates Complete
- Added `GetObject(ctx context.Context, docID string) (*Document, error)` to `DocumentIndex` interface
- Added `GetObject(ctx context.Context, docID string) (*Document, error)` to `DraftIndex` interface
- Location: `pkg/search/search.go`

### ✅ Adapter Implementations Complete
1. **Algolia Adapter** (`pkg/search/adapters/algolia/adapter.go`)
   - Implemented `documentIndex.GetObject()` using `di.index.GetObject()`
   - Implemented `draftIndex.GetObject()` using `dri.index.GetObject()`

2. **Meilisearch Adapter** (`pkg/search/adapters/meilisearch/adapter.go`)
   - Implemented `documentIndex.GetObject()` using `idx.GetDocumentWithContext()`
   - Implemented `draftIndex.GetObject()` via delegation to documentIndex
   - Uses `convertMeilisearchHit()` helper for type conversion

### ✅ Helper Functions Created
- `mapToSearchDocument(m map[string]any) (*search.Document, error)` in `internal/api/v2/helpers.go`
- Converts Algolia-style document maps to search.Document via JSON round-trip
- Required because existing code uses `doc.ToAlgoliaObject()` which returns `map[string]any`

### ⚙️ API Handler Updates - IN PROGRESS

#### ✅ Fixed: `internal/api/v2/documents.go` (1 of 8 locations)
**Line ~938-1009**: Document PATCH request post-processing
- **Old**: `srv.AlgoWrite.Docs.SaveObject(docObj)` + `res.Wait()`
- **New**: `srv.SearchProvider.DocumentIndex().Index(ctx, docObj)`
- **Old**: `srv.AlgoSearch.Docs.GetObject(docID, &algoDoc)`
- **New**: `srv.SearchProvider.DocumentIndex().GetObject(ctx, docID)`
- Added null check: `if srv.SearchProvider != nil`
- Updated data consistency comparison to use new approach

#### 🔄 Remaining in `internal/api/v2/documents.go` (7 more locations)
- Line 152: `srv.AlgoSearch` in helper function call
- Line 382: `hcd.IsLocked` uses `srv.GWService`
- Line 572: `doc.ReplaceHeader` uses `srv.GWService`
- Line 831: `doc.ToDoc` uses `srv.GWService`
- Line 879: `GetDocContent` uses `srv.GWService`
- Line 276: Data consistency comparison removed (commented out)

#### 🔄 Remaining in `internal/api/v2/drafts.go` (17 locations)
AlgoWrite/AlgoSearch usages:
- Lines 387-415: SaveObject + GetObject in POST draft handler
- Lines 582-586: DraftsCreatedTimeAsc/Desc.Search (needs custom sorting)
- Line 747: AlgoSearch in helper call
- Line 752: AlgoSearch in helper call
- Line 852: Drafts.GetObject
- Line 933: Drafts.DeleteObject
- Lines 1566-1591: SaveObject + GetObject in PATCH draft handler

GWService usages (need DocumentContentProvider):
- Lines 256-259: ReplaceHeader for draft
- Line 753: GWService in helper call
- Line 1098: IsLocked check
- Line 1495: GetDocContent helper
- Line 1525: ReplaceHeader for draft

#### 🔄 Remaining in `internal/api/v2/approvals.go` (Multiple locations)
Currently causing 10+ compile errors. Needs:
- Multiple `srv.GWService` → need WorkspaceProvider + DocumentContentProvider
- Multiple `srv.AlgoWrite` → need SearchProvider.Index()
- Multiple `srv.AlgoSearch` → need SearchProvider.GetObject()

#### 🔄 Remaining in `internal/api/v2/reviews.go` (Multiple locations)
- Line 44: `hcd.IsLocked` uses `srv.GWService`
- Line 196: `doc.ReplaceHeader` uses `srv.GWService`
- Line 204: `GetDocContent` uses `srv.GWService`
- Lines 275-301: Revision operations (need RevisionProvider)
  - `srv.GWService.GetLatestRevision`
  - `srv.GWService.KeepRevisionForever`
  - `srv.GWService.UpdateKeepRevisionForever`
- Lines 436-440: AlgoWrite in helpers
- Lines 659-682: SaveObject + DeleteObject for docs/drafts
- Line 760: AlgoSearch.Docs.GetObject

#### 🔄 Remaining in `internal/api/v2/projects.go` (2 locations)
- Line 287: `saveProjectInAlgolia(proj, srv.AlgoWrite)`
- Line 540: `saveProjectInAlgolia(patch, srv.AlgoWrite)`
- Need to update `saveProjectInAlgolia` function signature and implementation

#### 🔄 Remaining in `internal/api/v2/people.go` (2 locations)
- Line 36: `srv.GWService.People.SearchDirectoryPeople` → Already covered by WorkspaceProvider?
- Line 77: `srv.GWService.People.SearchDirectoryPeople` → Already covered by WorkspaceProvider?

#### 🔄 Remaining in `internal/api/v2/groups.go` (2 locations)
- Line 96: `srv.GWService.AdminDirectory.Groups.List` → Need GroupProvider
- Line 114: `srv.GWService.AdminDirectory.Groups.List` → Need GroupProvider

#### 🔄 Remaining in `internal/api/v2/me.go` (1 location)
- Line 102: `srv.GWService.SendEmail` → Need EmailProvider or move to email service

## Phase 3: Document Content Provider 🔜 TODO

### Interface Design Needed
```go
type DocumentContentProvider interface {
    // GetDoc retrieves document content from Google Docs API
    GetDoc(ctx context.Context, fileID string) (*docs.Document, error)
    
    // UpdateDoc updates document content using batch requests
    UpdateDoc(ctx context.Context, fileID string, requests []*docs.Request) error
}
```

### Required Updates
- `pkg/document/replace_header.go` - ReplaceHeader function
- `pkg/hashicorpdocs` - IsLocked check function
- Multiple locations in API handlers that call ReplaceHeader or IsLocked

### Implementation Plan
1. Create `pkg/docscontent/provider.go` interface
2. Create `pkg/docscontent/adapters/google/adapter.go` implementation
3. Create `pkg/docscontent/adapters/mock/adapter.go` for tests
4. Add `DocumentContentProvider` field to `server.Server`
5. Update all `ReplaceHeader` calls to use the provider
6. Update all `IsLocked` calls to use the provider

## Phase 4: Revision Provider 🔜 TODO

### Interface Design Needed
```go
type RevisionProvider interface {
    // GetLatestRevision retrieves the latest revision for a file
    GetLatestRevision(ctx context.Context, fileID string) (*Revision, error)
    
    // KeepRevisionForever marks a revision to be kept forever
    KeepRevisionForever(ctx context.Context, fileID, revisionID string) error
    
    // UpdateKeepRevisionForever updates the keep forever flag
    UpdateKeepRevisionForever(ctx context.Context, fileID, revisionID string, keep bool) error
}
```

### Required Updates
- `internal/api/v2/reviews.go` - Lines 275-301

## Phase 5: Group Provider 🔜 TODO

### Interface Design Needed
```go
type GroupProvider interface {
    // ListGroups lists groups in the organization
    ListGroups(ctx context.Context, query string) ([]*Group, error)
}
```

### Required Updates
- `internal/api/v2/groups.go` - Lines 96, 114

## Testing Strategy

After each file is fixed:
1. ✅ Run `go build ./pkg/search/...` - PASSING
2. 🔄 Run `go build ./internal/api/...` - 10+ errors remaining
3. Run `make go/test` for unit tests
4. Run `go test -v -tags=integration ./tests/api/...` for API tests

## Current Build Status
- Search package: ✅ Compiling successfully
- API package: ❌ 10+ undefined field/method errors
- Main package: Not tested yet

## Next Immediate Steps
1. Fix remaining SearchProvider usages in drafts.go (highest impact - 17 locations)
2. Fix approvals.go SearchProvider usages
3. Fix reviews.go SearchProvider usages (partial - skip revision ops for now)
4. Fix projects.go SearchProvider usages
5. Design and implement DocumentContentProvider interface
6. Continue with remaining phases

## Notes
- AlgoSearch and AlgoWrite are DEPRECATED - SearchProvider is the modern approach
- Some operations like `DraftsCreatedTimeAsc.Search` need custom sorting implementation
- The new `GetObject` method enables data consistency checks between DB and search index
- JSON round-trip conversion via `mapToSearchDocument` is acceptable for now but could be optimized later
