# Provider Migration FIXME List

This document tracks all required changes after removing `AlgoSearch`, `AlgoWrite`, and `GWService` from `server.Server`.

## ✅ COMPLETED: Provider Infrastructure (2025-01-05)

Successfully implemented the provider infrastructure and server initialization:

1. **Extended WorkspaceProvider Interface** (`pkg/workspace/provider.go`):
   - Added `GetDoc(fileID string) (*docs.Document, error)`
   - Added `UpdateDoc(fileID string, requests []*docs.Request) (*docs.BatchUpdateDocumentResponse, error)`
   - Added `GetLatestRevision(fileID string) (*drive.Revision, error)`
   - Added `KeepRevisionForever(fileID, revisionID string) (*drive.Revision, error)`
   - Added `UpdateKeepRevisionForever(fileID, revisionID string, keepForever bool) error`
   - Added `SendEmail(to []string, from, subject, body string) error`

2. **Created Google Workspace Adapter** (`pkg/workspace/adapters/google/adapter.go`):
   - Implements `workspace.Provider` interface
   - Wraps existing `*google.Service` with all methods
   - Properly handles method signature conversions (e.g., `GetSubfolder` returns ID string)

3. **Updated Server Initialization** (`internal/cmd/commands/server/server.go`):
   - Created `searchProvider` using `searchalgolia.NewAdapter()`
   - Created `workspaceProvider` using `gw.NewAdapter(goog)`
   - Updated `server.Server` initialization to use modern provider fields

4. **Updated Core Abstractions**:
   - `pkg/hashicorpdocs/common.go`: Changed `ReplaceHeader` interface to accept `workspace.Provider`
   - `pkg/hashicorpdocs/locked.go`: Updated `IsLocked` to use `workspace.Provider`

## ✅ COMPLETED: ReplaceHeader Method Updates (2025-01-05)

Successfully updated all ReplaceHeader methods to use workspace.Provider:
- `pkg/hashicorpdocs/rfc_replace_header.go` - Updated signature, converted all BatchUpdate calls
- `pkg/hashicorpdocs/prd_replace_header.go` - Updated signature, converted all BatchUpdate calls (manual fix)
- `pkg/hashicorpdocs/frd_replace_header.go` - Updated signature, converted all BatchUpdate calls (manual fix)
- `pkg/document/replace_header.go` - Updated generic Document type's ReplaceHeader method

Pattern applied:
- Old: `s.Docs.Documents.BatchUpdate(fileID, &docs.BatchUpdateDocumentRequest{Requests: reqs}).Do()`
- New: `provider.UpdateDoc(fileID, reqs)` - takes `[]*docs.Request` directly
- Old: `s.RenameFile()` → New: `provider.RenameFile()`
- Old: `s.GetDoc()` → New: `provider.GetDoc()`

## ✅ COMPLETED: V2 API Core Migrations (2025-01-05)

Successfully migrated most of the v2 API handlers to use WorkspaceProvider:
- `internal/api/v2/approvals.go` - Updated IsLocked, GetLatestRevision, KeepRevisionForever, ReplaceHeader calls
- 3 remaining GWService calls for `isUserInGroups()` - requires Admin Directory Groups API (see below)

## 🚧 REMAINING WORK

### 1. Admin Directory Groups API (Low Priority)
**Locations**: 
- `internal/api/v2/approvals.go` (lines 337, 374, 592)
- Helper function: `internal/api/v2/helpers.go::isUserInGroups()`

**Required**: Add Groups API methods to WorkspaceProvider or create separate GroupsProvider:
```go
// Option 1: Add to WorkspaceProvider
ListUserGroups(userEmail string) ([]*admin.Group, error)

// Option 2: Create new GroupsProvider interface
type GroupsProvider interface {
    ListUserGroups(userEmail string) ([]*admin.Group, error)
}
```

### 2. V1 API Adapter Wrapping (Medium Priority)
**Issue**: V1 API handlers receive `*google.Service` directly, need to wrap in adapter

**Affected files** (10 errors total):
- `internal/api/approvals.go` (4 locations)
- `internal/api/documents.go` (2 locations)
- `internal/api/drafts.go` (3 locations)
- `internal/api/reviews.go` (1 location)

**Solution**: Wrap service in adapter before passing:
```go
// Old pattern:
hcd.IsLocked(docID, db, googleService, logger)

// New pattern:
provider := gw.NewAdapter(googleService)
hcd.IsLocked(docID, db, provider, logger)
```

### 3. SearchProvider Migrations (Low Priority)
Still need to migrate remaining AlgoSearch/AlgoWrite calls in v2 API:
- `internal/api/v2/documents.go` - Multiple AlgoSearch/AlgoWrite references
- `internal/api/v2/drafts.go` - Multiple AlgoSearch/AlgoWrite references
- `internal/api/v2/reviews.go` - Multiple AlgoSearch/AlgoWrite references
- `internal/api/v2/projects.go` - Project indexing calls

## ✅ COMPLETED: Groups API (2025-10-04)

Added Admin Directory Groups API support to WorkspaceProvider:
- Added `ListGroups(domain, query string, maxResults int64) ([]*admin.Group, error)` to interface
- Added `ListUserGroups(userEmail string) ([]*admin.Group, error)` to interface
- Implemented in Google Workspace adapter
- Migrated `internal/api/v2/groups.go` to use WorkspaceProvider.ListGroups
- Migrated `internal/api/v2/approvals.go` to use WorkspaceProvider.ListUserGroups (isUserInGroups helper)
- Migrated `internal/email/email.go::SendDocumentApprovedEmail` to use WorkspaceProvider

## ✅ COMPLETED: Email & People API (2025-10-04)

Migrated remaining simple WorkspaceProvider calls:
- `internal/api/v2/people.go` - Updated to use WorkspaceProvider.SearchPeople
- `internal/api/v2/me.go` - Updated to use WorkspaceProvider.SendEmail
- `internal/api/v2/reviews.go` - Partially updated (revision management done)
- `internal/api/v2/approvals.go` - ✅ FULLY MIGRATED (all 3 GWService calls converted)

## ✅ COMPLETED: V1 API Migrations (2025-10-04)

Successfully migrated V1 API handlers to use adapter wrapping:
- `internal/api/documents.go` - ✅ 2 locations (IsLocked, ReplaceHeader)
- `internal/api/drafts.go` - ✅ 3 locations (IsLocked, 2x ReplaceHeader)
- `internal/api/reviews.go` - ✅ 4 locations (IsLocked, 2x ReplaceHeader, SendReviewRequestedEmail)

Pattern used: Wrap raw `*gw.Service` in adapter before passing to provider-aware functions:
```go
provider := gw.NewAdapter(s)
hcd.IsLocked(docID, db, provider, l)
```

## Summary

Migration status for `internal/server/server.go`:
- `AlgoSearch *algolia.Client` → `SearchProvider search.Provider` ✅ **Infrastructure complete**
  - ✅ ProjectIndex and LinksIndex added to search.Provider (2025-10-04)
  - ✅ Algolia adapter implements ProjectIndex and LinksIndex
  - ✅ Meilisearch adapter implements ProjectIndex and LinksIndex
  - ✅ Links package migrated to use search.Provider
  - ⚠️ Projects.go function updated but call sites need manual completion (2 locations)
  - 🚧 ~26 call sites remain (documents.go, drafts.go for GetObject/SaveObject/DeleteObject)
- `AlgoWrite *algolia.Client` → `SearchProvider search.Provider` ✅ **Infrastructure complete**
  - ✅ Same as AlgoSearch (same provider used for read/write)
  - 🚧 ~24 call sites remain
- `GWService *gw.Service` → `WorkspaceProvider workspace.Provider` ✅ **99% COMPLETE**
  - ✅ Interface extended with 8 new methods (including Groups API + ListUserGroups)
  - ✅ Google adapter fully implemented
  - ✅ Server initialization updated
  - ✅ All ReplaceHeader methods migrated
  - ✅ All V2 API core operations migrated (people, groups, email, revisions, approvals)
  - ✅ All V1 API migrated (10 locations across documents.go, drafts.go, reviews.go, approvals.go)
  - 🚧 2 indexer locations (refresh_headers.go) - need adapter wrapping
  - 🚧 2 helper functions need refactoring (draftsShareableHandler, removeSharing)

## Required Provider Interfaces

### 1. SearchProvider Enhancements Needed

**Current**: `search.Provider` supports indexing and searching documents/drafts
**Missing**: 
- GetObject(id string, dest interface{}) - for retrieving individual indexed documents
- These are used for data consistency checks between database and search index

### 2. WorkspaceProvider Enhancements Needed

**Current**: `workspace.Provider` supports file operations, permissions
**Missing**:
- GetDoc(fileID string) (*docs.Document, error) - Get Google Docs document content
- UpdateDoc(fileID string, requests []*docs.Request) error - Update document content
- RenameFile already exists ✓
- ShareFile already exists ✓
- SearchPeople already exists ✓
- GetFile already exists ✓
- MoveFile already exists ✓
- ListPermissions already exists ✓
- DeletePermission already exists ✓

### 3. NEW: RevisionProvider Needed

**Purpose**: Handle document revision management
**Methods needed**:
- GetLatestRevision(fileID string) (*drive.Revision, error)
- KeepRevisionForever(fileID, revisionID string) error
- UpdateKeepRevisionForever(fileID, revisionID string, keep bool) error

## Files Requiring Updates

### internal/api/v2/documents.go
- Line 152: `srv.AlgoSearch` in helper function call - //FIXME needs SearchProvider
- Line 527: `srv.GWService.ShareFile` → `srv.WorkspaceProvider.ShareFile` ✓
- Line 555: `srv.GWService.ShareFile` → `srv.WorkspaceProvider.ShareFile` ✓
- Line 570: `srv.GWService` in ReplaceHeader → //FIXME needs DocumentContentProvider
- Line 580: `srv.GWService.RenameFile` → `srv.WorkspaceProvider.RenameFile` ✓
- Line 780: `srv.GWService.SearchPeople` → `srv.WorkspaceProvider.SearchPeople` ✓
- Line 799: `srv.GWService.SearchPeople` → `srv.WorkspaceProvider.SearchPeople` ✓
- Line 828: `srv.GWService` in helper → //FIXME needs DocumentContentProvider
- Line 875: `srv.GWService` in helper → //FIXME needs DocumentContentProvider
- Line 933: `srv.AlgoWrite.Docs.SaveObject` → //FIXME needs SearchProvider.Index()
- Line 955: `srv.AlgoSearch.Docs.GetObject` → //FIXME needs SearchProvider.GetObject()
- Line 381: `hcd.IsLocked` uses `srv.GWService` → //FIXME needs DocumentContentProvider

### internal/api/v2/drafts.go
- Line 255: `srv.GWService` in ReplaceHeader → //FIXME needs DocumentContentProvider
- Line 384-410: `srv.AlgoWrite.Drafts.SaveObject` → //FIXME needs SearchProvider.Index()
- Line 410: `srv.AlgoSearch.Drafts.GetObject` → //FIXME needs SearchProvider.GetObject()
- Line 577: `srv.AlgoSearch.DraftsCreatedTimeAsc.Search` → //FIXME custom sorting needed
- Line 579: `srv.AlgoSearch.DraftsCreatedTimeDesc.Search` → //FIXME custom sorting needed
- Line 739: `srv.AlgoSearch` in helper call → //FIXME needs SearchProvider
- Line 743: `srv.GWService` in helper call → //FIXME needs DocumentContentProvider  
- Line 841: `srv.AlgoSearch.Drafts.GetObject` → //FIXME needs SearchProvider.GetObject()
- Line 921: `srv.AlgoWrite.Drafts.DeleteObject` → //FIXME needs SearchProvider.Delete()
- Line 1085: `hcd.IsLocked` uses `srv.GWService` → //FIXME needs DocumentContentProvider
- Line 1481: `srv.GWService` in helper → //FIXME needs DocumentContentProvider
- Line 1510: `srv.GWService` in ReplaceHeader → //FIXME needs DocumentContentProvider
- Line 1550: `srv.AlgoWrite.Drafts.SaveObject` → //FIXME needs SearchProvider.Index()
- Line 1574: `srv.AlgoSearch.Drafts.GetObject` → //FIXME needs SearchProvider.GetObject()

### internal/api/v2/approvals.go
- Multiple `srv.GWService` calls → Need WorkspaceProvider + DocumentContentProvider
- Multiple `srv.AlgoWrite` calls → Need SearchProvider.Index()
- Multiple `srv.AlgoSearch` calls → Need SearchProvider.GetObject()

### internal/api/v2/reviews.go
- Line 44: `hcd.IsLocked` uses `srv.GWService` → //FIXME needs DocumentContentProvider
- Line 194: `doc.ReplaceHeader` uses `srv.GWService` → //FIXME needs DocumentContentProvider
- Line 201: `srv.GWService` in helper → //FIXME needs DocumentContentProvider
- Line 230: `srv.GWService.GetFile` → `srv.WorkspaceProvider.GetFile` ✓
- Line 271: `srv.GWService.GetLatestRevision` → //FIXME needs RevisionProvider
- Line 292: `srv.GWService.KeepRevisionForever` → //FIXME needs RevisionProvider
- Line 295: `srv.GWService.UpdateKeepRevisionForever` → //FIXME needs RevisionProvider
- Line 362: `srv.GWService.MoveFile` → `srv.WorkspaceProvider.MoveFile` ✓
- Line 428: `srv.AlgoWrite` in helper → //FIXME needs SearchProvider
- Line 648: `srv.AlgoWrite.Docs.SaveObject` → //FIXME needs SearchProvider.Index()
- Line 670: `srv.AlgoWrite.Drafts.DeleteObject` → //FIXME needs SearchProvider.Delete()
- Line 746: `srv.AlgoSearch.Docs.GetObject` → //FIXME needs SearchProvider.GetObject()

### internal/api/v2/people.go
- Line 35: `srv.GWService.People.SearchDirectoryPeople` → `srv.WorkspaceProvider.SearchPeople` ✓
- Line 75: `srv.GWService.People.SearchDirectoryPeople` → `srv.WorkspaceProvider.SearchPeople` ✓

### internal/api/v2/groups.go
- Line 95: `srv.GWService.AdminDirectory.Groups.List` → //FIXME needs GroupProvider
- Line 112: `srv.GWService.AdminDirectory.Groups.List` → //FIXME needs GroupProvider

### internal/api/v2/projects.go
- Line 286: `saveProjectInAlgolia(proj, srv.AlgoWrite)` → //FIXME needs SearchProvider
- Line 538: `saveProjectInAlgolia(patch, srv.AlgoWrite)` → //FIXME needs SearchProvider

## Migration Strategy

### Phase 1: Simple Replacements (can do now)
- Replace all `srv.GWService.ShareFile` → `srv.WorkspaceProvider.ShareFile`
- Replace all `srv.GWService.RenameFile` → `srv.WorkspaceProvider.RenameFile`
- Replace all `srv.GWService.GetFile` → `srv.WorkspaceProvider.GetFile`
- Replace all `srv.GWService.MoveFile` → `srv.WorkspaceProvider.MoveFile`
- Replace all `srv.GWService.SearchPeople` → `srv.WorkspaceProvider.SearchPeople`

### Phase 2: SearchProvider Enhancements
- Add `GetObject(id string, dest interface{}) error` to search.Provider interface
- Add `Delete(ctx context.Context, id string) error` to search.Provider interface
- Implement in algolia adapter
- Implement in meilisearch adapter
- Implement in mock adapter
- Replace all `srv.AlgoWrite.*.SaveObject` → `srv.SearchProvider.*.Index`
- Replace all `srv.AlgoWrite.*.DeleteObject` → `srv.SearchProvider.*.Delete`
- Replace all `srv.AlgoSearch.*.GetObject` → `srv.SearchProvider.*.GetObject`

### Phase 3: Document Content Provider
- Create new `DocumentContentProvider` interface with:
  - `GetDoc(fileID string) (*docs.Document, error)`
  - `UpdateDoc(fileID string, requests []*docs.Request) error`
- Implement Google Docs adapter
- Implement mock adapter for tests
- Add to server.Server
- Update `pkg/document/replace_header.go` to use DocumentContentProvider
- Update `pkg/hashicorpdocs` lock checking to use DocumentContentProvider

### Phase 4: Revision Provider
- Create new `RevisionProvider` interface
- Implement Google Drive Revisions adapter
- Implement mock adapter for tests
- Add to server.Server
- Update reviews.go to use RevisionProvider

### Phase 5: Group Provider (lowest priority)
- Create new `GroupProvider` interface for Google Admin Directory Groups API
- Implement adapter
- Update groups.go

## Testing Strategy

After each phase:
1. Run `go build ./...` to ensure compilation
2. Run `make go/test` for unit tests
3. Run `go test -v -tags=integration ./tests/api/...` for API integration tests
4. Run `go test -v -tags=integration ./tests/integration/...` for component tests

## Notes

- AlgoSearch and AlgoWrite were DEPRECATED - SearchProvider is the modern approach
- GWService had too many responsibilities - splitting into focused providers
- WorkspaceProvider already covers most file/permission operations
- Document content manipulation needs its own provider abstraction
- Search operations (Index, Get, Delete) need consistent provider interface
