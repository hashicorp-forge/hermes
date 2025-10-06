# Provider Migration - Remaining Work

## Status: 85% Complete

The provider migration to abstract search and workspace providers is nearly complete. This document tracks the remaining work items.

## ✅ Completed Work

### Fully Migrated Files
1. **internal/api/v2/documents.go** - All GWService and AlgoSearch calls migrated
2. **internal/api/v2/documents_related_resources.go** - Updated to use search.Provider
3. **internal/email/email.go** - SendNewOwnerEmail and SendReviewRequestedEmail use workspace.Provider
4. **internal/api/v2/drafts.go** - Most call sites migrated:
   - ✅ All `.Drafts.GetObject()` calls → `DraftIndex().GetObject(ctx, id)`
   - ✅ All `.Drafts.SaveObject()` calls → `DraftIndex().Index(ctx, doc)`
   - ✅ All `.Drafts.DeleteObject()` calls → `DraftIndex().Delete(ctx, id)`
   - ✅ Conversion from `document.Document` to `search.Document` for indexing

### Infrastructure
- ✅ `pkg/workspace/provider.go` - Extended interface with 6 new methods
- ✅ `pkg/workspace/adapters/google/adapter.go` - Full implementation
- ✅ `pkg/search/search.go` - Provider abstraction complete
- ✅ `pkg/search/adapters/algolia/adapter.go` - Algolia implementation
- ✅ `pkg/search/adapters/meilisearch/adapter.go` - Meilisearch implementation
- ✅ `internal/cmd/commands/server/server.go` - Providers initialized

## 🚧 Remaining Work (10 Build Errors)

### 1. Admin Directory Groups API (3 errors) - **DESIGN DECISION REQUIRED**
**File:** `internal/api/v2/approvals.go`  
**Lines:** 337, 374, 592

**Issue:** The `isUserInGroups()` function uses Google Admin Directory Groups API to check group membership. This is not exposed via the current WorkspaceProvider interface.

**Options:**
- **Option A:** Extend `workspace.Provider` interface with group management methods:
  ```go
  IsUserInGroups(ctx context.Context, email string, groups []string) (bool, error)
  ```
- **Option B:** Create a separate `GroupsProvider` interface for Admin Directory operations
- **Option C:** Keep Admin Directory as a special case with direct Google service access

**Recommendation:** Option A - Extend WorkspaceProvider. Group membership checking is a workspace operation.

**Code Location:**
```go
// internal/api/v2/approvals.go:337, 374, 592
isMember, err := isUserInGroups(
    srv.Config.GoogleWorkspace.Domain,
    userEmail, []string{group.Email},
    srv.GWService, // ← ERROR: GWService no longer exists
)
```

### 2. Impersonation Pattern (1 error) - **DESIGN DECISION REQUIRED**
**File:** `internal/api/v2/drafts.go`  
**Line:** 151

**Issue:** Code attempts to create an impersonated Google Workspace service by dereferencing the provider interface:
```go
copyTemplateSvc := *srv.WorkspaceProvider // ← Cannot dereference interface
copyTemplateSvc.Drive, err = drive.NewService(ctx, option.WithHTTPClient(client))
```

**Context:** This is used to impersonate a user when copying template documents, so the copied document is owned by the user rather than the service account.

**Options:**
- **Option A:** Add `Impersonate(userEmail string) Provider` method to workspace.Provider
- **Option B:** Add `ImpersonatedCopy(userEmail, templateID, destFolderID string) (fileID string, err error)` to provider
- **Option C:** Keep a reference to underlying `*google.Service` in server for impersonation cases
- **Option D:** Refactor to avoid impersonation (service account creates, then transfers ownership)

**Recommendation:** Option B - Add a high-level ImpersonatedCopy method that encapsulates the impersonation logic inside the provider.

### 3. Search API Conversion (3 errors) - **IMPLEMENTATION NEEDED**
**File:** `internal/api/v2/drafts.go`  
**Lines:** 614, 617, 619

**Issue:** Old code uses Algolia-specific sorted indices and QueryRes type:
```go
var resp search.QueryRes // ← Algolia type, not in pkg/search
if sortBy == "dateAsc" {
    resp, err = srv.SearchProvider.DraftsCreatedTimeAsc.Search("", params...)
} else {
    resp, err = srv.SearchProvider.DraftsCreatedTimeDesc.Search("", params...)
}
```

**Solution:** Convert to use `SearchQuery` with sort parameters:
```go
sortOrder := "desc"
if sortBy == "dateAsc" {
    sortOrder = "asc"
}

searchQuery := &search.SearchQuery{
    Query:     "",
    Page:      page,
    PerPage:   hitsPerPage,
    Filters:   filters, // Convert from facetFilters
    Facets:    facets,
    SortBy:    "createdTime",
    SortOrder: sortOrder,
}

resp, err := srv.SearchProvider.DraftIndex().Search(r.Context(), searchQuery)
```

**Work Required:**
1. Convert `facetFilters` string array to `map[string][]string`
2. Change `search.QueryRes` to `*search.SearchResult`
3. Update response encoding to match new structure

### 4. Handler Function Signatures (3 errors) - **IMPLEMENTATION NEEDED**

#### 4a. draftsShareableHandler (2 errors)
**File:** `internal/api/v2/drafts.go`  
**Line:** 783

**Issue:**
```go
draftsShareableHandler(
    w, r, docID, *doc, srv.Config, srv.Logger,
    srv.SearchProvider, // ← Cannot use as *algolia.Client
    srv.WorkspaceProvider, // ← Cannot use as *google.Service
    srv.DB)
```

**Solution:** Update `draftsShareableHandler` signature in `drafts_shareable.go`:
```go
// Current
func draftsShareableHandler(
    w http.ResponseWriter,
    r *http.Request,
    docID string,
    doc document.Document,
    cfg config.Config,
    l hclog.Logger,
    algoRead *algolia.Client,      // ← Change to search.Provider
    goog *gw.Service,               // ← Change to workspace.Provider
    db *gorm.DB,
) {

// Update to
func draftsShareableHandler(
    w http.ResponseWriter,
    r *http.Request,
    docID string,
    doc document.Document,
    cfg config.Config,
    l hclog.Logger,
    searchProvider search.Provider,
    workspaceProvider workspace.Provider,
    db *gorm.DB,
) {
```

Then update all Algolia and Google service calls inside the handler to use providers.

#### 4b. removeSharing (1 error)
**File:** `internal/api/v2/drafts.go`  
**Line:** 1206

**Issue:**
```go
if err := removeSharing(srv.WorkspaceProvider, docID, c); err != nil {
    // ← Cannot use workspace.Provider as *google.Service
}
```

**Solution:** Update `removeSharing` function signature:
```go
// Find removeSharing function and change signature from:
func removeSharing(svc *gw.Service, docID string, email string) error {

// To:
func removeSharing(provider workspace.Provider, docID string, email string) error {
```

Then update the implementation to use provider methods instead of direct service calls.

## Implementation Priority

### High Priority (Blocks build)
1. ✅ Fix all `.Drafts` call sites (COMPLETED)
2. **Search API Conversion** (lines 614-619) - Straightforward, just needs conversion logic
3. **Handler Signatures** (lines 783, 1206) - Similar to already-completed work

### Medium Priority (Design decisions)
4. **Admin Directory Groups API** (approvals.go) - Needs architectural decision but has workaround
5. **Impersonation Pattern** (line 151) - Needs design decision, can be deferred with temp workaround

### Low Priority (Technical debt)
- V1 API still has 10 type mismatch errors (passing `*google.Service` instead of `workspace.Provider`)
- Consider adding conversion helpers between `document.Document` and `search.Document`
- Clean up temporary workarounds (e.g., `if false { ... }` blocks added during migration)

## Testing Status

### Integration Tests
- ✅ `tests/integration/search/` - Passing
- ✅ `tests/integration/workspace/` - Passing

### Manual Testing Needed
- [ ] Document creation (drafts POST)
- [ ] Document editing (drafts PATCH)
- [ ] Document deletion (drafts DELETE)
- [ ] Document search with sorting
- [ ] Shareable link creation
- [ ] Approval workflows
- [ ] Template copying with impersonation

## Next Steps

1. **Immediate:** Fix search API conversion (lines 614-619) - ~30 minutes
2. **Immediate:** Update handler signatures (lines 783, 1206) - ~1 hour
3. **Short-term:** Make design decisions on Admin Directory and Impersonation
4. **Short-term:** Implement chosen designs - ~2-4 hours
5. **Follow-up:** Manual testing of affected workflows
6. **Follow-up:** Clean up technical debt

## Notes

- The bulk of the migration (85%) is complete
- Remaining work is mostly mechanical updates following established patterns
- Two design decisions block completion but have clear options
- All critical infrastructure is in place and tested
