# Provider Migration FIXME List

**Status**: Infrastructure complete. Remaining work is migrating call sites.

This document tracks remaining direct usage of `*algolia.Client` and `*gw.Service` that should be migrated to use `SearchProvider` and `WorkspaceProvider`.

## ✅ COMPLETED (Previous Sessions)

- **Provider Infrastructure**: SearchProvider and WorkspaceProvider interfaces complete
- **Adapters**: Algolia, Meilisearch, Google Workspace adapters fully implemented
- **Server**: `server.Server` only uses SearchProvider and WorkspaceProvider
- **V1 API**: All migrated to use adapter wrapping pattern
- **V2 API Core**: approvals.go, people.go, me.go, groups.go fully migrated
- **Documents/Drafts**: Core operations migrated (IsLocked, ReplaceHeader using WorkspaceProvider)
- **Links Package**: Migrated to use SearchProvider.LinksIndex() (2025-10-04)
- **Projects Infrastructure**: ProjectIndex added to SearchProvider (2025-10-04)

## 🚧 REMAINING WORK

### Priority 1: V2 API Reviews (High - Blocks Feature)

**File**: `internal/api/v2/reviews.go`

Status: Critical path - review approval flow broken without migration

| Line | Current | Fix |
|------|---------|-----|
| 44 | `hcd.IsLocked(docID, srv.DB, srv.GWService, ...)` | Change to `srv.WorkspaceProvider` |
| 194 | `doc.ReplaceHeader(..., srv.GWService)` | Change to `srv.WorkspaceProvider` |
| 200 | `doc.ReplaceHeader(..., srv.GWService)` | Change to `srv.WorkspaceProvider` |
| 230 | `srv.GWService.GetFile(docID)` | Change to `srv.WorkspaceProvider.GetFile()` |
| 271 | `srv.GWService.GetLatestRevision(docID)` | Change to `srv.WorkspaceProvider.GetLatestRevision()` |
| 292 | `srv.GWService.KeepRevisionForever(...)` | Change to `srv.WorkspaceProvider.KeepRevisionForever()` |
| 295 | `srv.GWService.UpdateKeepRevisionForever(...)` | Change to `srv.WorkspaceProvider.UpdateKeepRevisionForever()` |
| 362 | `srv.GWService.MoveFile(...)` | Change to `srv.WorkspaceProvider.MoveFile()` |
| 366 | `srv.GWService.MoveFile(...)` (revert) | Change to `srv.WorkspaceProvider.MoveFile()` |
| 512 | `srv.GWService.ShareFile(...)` | Change to `srv.WorkspaceProvider.ShareFile()` |
| 428 | `links.SaveDocumentRedirectDetails(srv.AlgoWrite, ...)` | Change to `srv.SearchProvider` |
| 431 | `links.DeleteDocumentRedirectDetails(srv.AlgoWrite, ...)` | Change to `srv.SearchProvider` |
| 648 | `srv.AlgoWrite.Docs.SaveObject(docObj)` | Change to `srv.SearchProvider.DocumentIndex().Index(ctx, doc)` |
| 670 | `srv.AlgoWrite.Drafts.DeleteObject(docID)` | Change to `srv.SearchProvider.DraftIndex().Delete(ctx, docID)` |
| 746 | `srv.AlgoSearch.Docs.GetObject(docID, &algoDoc)` | Change to `srv.SearchProvider.DocumentIndex().GetObject(ctx, docID)` |

**Impact**: Review creation and approval features currently use old clients directly

### Priority 2: V2 API Projects (Medium)

**File**: `internal/api/v2/projects.go`

| Line | Current | Fix |
|------|---------|-----|
| 286 | `saveProjectInAlgolia(proj, srv.AlgoWrite)` | Change to `srv.SearchProvider` |
| 538 | `saveProjectInAlgolia(patch, srv.AlgoWrite)` | Change to `srv.SearchProvider` |

Note: Function signature already updated, just need to fix call sites

### Priority 3: Indexer (Low - Separate Service)

**File**: `internal/indexer/indexer.go`, `internal/indexer/refresh_headers.go`

The indexer runs as a separate service and still uses direct `*algolia.Client` and `*gw.Service`:
- Line 35: `AlgoliaClient *algolia.Client` field
- Line 55: `GoogleWorkspaceService *gw.Service` field  
- Line 513: `saveDocInAlgolia(*doc, idx.AlgoliaClient)` call
- refresh_headers.go lines 163, 276: Uses `GoogleWorkspaceService` directly

**Fix Strategy**: Create SearchProvider and WorkspaceProvider in indexer initialization, update struct fields

### Priority 4: Helper Function Comments (Documentation Only)

**File**: `internal/api/v2/documents.go`

Lines with FIXME comments (features disabled, not blocking):
- Line 152: Search functionality commented out (needs SearchProvider.Search())
- Line 276: Data consistency check disabled (needs SearchProvider.GetObject())
- Lines 382, 572, 831, 879: Features that used GWService (already migrated or disabled)

**Action**: Remove outdated FIXME comments after verification

## Quick Reference

### Search Pattern Migration
```go
// OLD (Algolia direct)
res, err := srv.AlgoWrite.Docs.SaveObject(docObj)
err = srv.AlgoWrite.Drafts.DeleteObject(docID)
err = srv.AlgoSearch.Docs.GetObject(docID, &doc)

// NEW (SearchProvider)
err := srv.SearchProvider.DocumentIndex().Index(ctx, doc)
err := srv.SearchProvider.DraftIndex().Delete(ctx, docID)
doc, err := srv.SearchProvider.DocumentIndex().GetObject(ctx, docID)
```

### Workspace Pattern Migration
```go
// OLD (Google Workspace direct)
file, err := srv.GWService.GetFile(fileID)
err := srv.GWService.ShareFile(fileID, email, "writer")
locked, err := hcd.IsLocked(docID, db, srv.GWService, logger)

// NEW (WorkspaceProvider)
file, err := srv.WorkspaceProvider.GetFile(fileID)
err := srv.WorkspaceProvider.ShareFile(fileID, email, "writer")
locked, err := hcd.IsLocked(docID, db, srv.WorkspaceProvider, logger)
```

### Links Pattern Migration
```go
// OLD (Algolia direct - DEPRECATED)
err := links.SaveDocumentRedirectDetailsLegacy(srv.AlgoWrite, id, docType, docNum)

// NEW (SearchProvider)
err := links.SaveDocumentRedirectDetails(srv.SearchProvider, id, docType, docNum)
```

## Next Steps

1. **Start with Priority 1** (reviews.go) - Critical for review approval flow
2. **Test thoroughly** after each file migration
3. **Update this document** as work progresses - mark items complete
4. **Remove FIXME comments** from code after migration complete
