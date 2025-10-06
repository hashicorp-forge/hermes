# V1 API Handler Refactoring Patterns

## Overview
This document provides the systematic patterns for refactoring V1 API handlers from using concrete Algolia and Google Workspace types to using the provider abstractions.

## Completed
- ✅ `internal/api/documents.go` - DocumentHandler (fully refactored and tested)
- ✅ `internal/api/helpers.go` - Added `searchDocumentToMap()` helper function
- ⚠️ `internal/api/approvals.go` - ApprovalHandler (partially complete - DELETE case done)

## In Progress
- ⚠️ `internal/api/approvals.go` - Need to complete POST and PUT cases

## Remaining
- ❌ `internal/api/drafts.go` - DraftsHandler
- ❌ `internal/api/drafts.go` - DraftsDocumentHandler  
- ❌ `internal/api/reviews.go` - ReviewHandler

## Refactoring Patterns

### 1. Update Function Signature

**Before:**
```go
func HandlerName(
	cfg *config.Config,
	l hclog.Logger,
	ar *algolia.Client,
	aw *algolia.Client,
	s *gw.Service,
	db *gorm.DB) http.Handler {
```

**After:**
```go
func HandlerName(
	cfg *config.Config,
	l hclog.Logger,
	searchProvider search.Provider,
	workspaceProvider workspace.Provider,
	db *gorm.DB) http.Handler {
```

### 2. Update Imports

**Remove:**
```go
"github.com/algolia/algoliasearch-client-go/v3/algolia/errs"
"github.com/hashicorp-forge/hermes/pkg/algolia"
gw "github.com/hashicorp-forge/hermes/pkg/workspace/adapters/google"
```

**Add:**
```go
"context"
"errors"
"github.com/hashicorp-forge/hermes/pkg/search"
"github.com/hashicorp-forge/hermes/pkg/workspace"
```

### 3. Add Context to Handler

**Add at start of handler function:**
```go
return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	// ... rest of handler
```

### 4. Replace Algolia Read Operations

**Before:**
```go
var algoObj map[string]any
err = ar.Docs.GetObject(docID, &algoObj)
if err != nil {
	if _, is404 := errs.IsAlgoliaErrWithCode(err, 404); is404 {
		// Handle 404
	} else {
		// Handle error
	}
}
```

**After:**
```go
searchDoc, err := searchProvider.DocumentIndex().GetObject(ctx, docID)
if err != nil {
	if errors.Is(err, search.ErrNotFound) {
		// Handle 404
	} else {
		// Handle error
	}
}

// If you need map format for compatibility
algoObj, err := searchDocumentToMap(searchDoc)
if err != nil {
	// Handle error
}
```

**For Drafts index:**
```go
// Use DraftIndex() instead of DocumentIndex()
searchDoc, err := searchProvider.DraftIndex().GetObject(ctx, docID)
```

### 5. Replace Algolia Write Operations

**Before:**
```go
// Save to Algolia
res, err := aw.Docs.SaveObject(docObj)
if err != nil {
	// Handle error
}
err = res.Wait()
if err != nil {
	// Handle error
}
```

**After:**
```go
// Convert Algolia object to search document
searchDoc, err := mapToSearchDocument(docObj)
if err != nil {
	// Handle error
}

// Save to search index (no wait needed - synchronous)
err = searchProvider.DocumentIndex().Index(ctx, searchDoc)
if err != nil {
	// Handle error
}
```

**For Drafts index:**
```go
err = searchProvider.DraftIndex().Index(ctx, searchDoc)
```

### 6. Replace Algolia Search Operations

**Before:**
```go
resp, err := ar.DocsCreatedTimeDesc.Search("query", params...)
```

**After:**
```go
results, err := searchProvider.DocumentIndex().Search(ctx, "query", opts...)
```

Note: Search options may need to be converted from Algolia-specific to search.Provider interface

### 7. Replace Workspace Provider Calls

**Before:**
```go
file, err := s.GetFile(docID)
```

**After:**
```go
file, err := workspaceProvider.GetFile(docID)
```

**Before:**
```go
latestRev, err := s.GetLatestRevision(docID)
```

**After:**
```go
latestRev, err := workspaceProvider.GetLatestRevision(docID)
```

**Before:**
```go
_, err = s.KeepRevisionForever(docID, revID)
```

**After:**
```go
_, err = workspaceProvider.KeepRevisionForever(docID, revID)
```

**Before:**
```go
err = s.ShareFile(fileID, email, role)
```

**After:**
```go
err = workspaceProvider.ShareFile(fileID, email, role)
```

**Before:**
```go
file, err = s.CopyFile(srcID, dstID, name)
```

**After:**
```go
file, err = workspaceProvider.CopyFile(srcID, dstID, name)
```

**Before:**
```go
file, err = s.MoveFile(fileID, folderID)
```

**After:**
```go
file, err = workspaceProvider.MoveFile(fileID, folderID)
```

**Before:**
```go
err = s.RenameFile(fileID, newName)
```

**After:**
```go
// Note: RenameFile returns only error, not (file, error)
err = workspaceProvider.RenameFile(fileID, newName)
```

**Before:**
```go
people, err := s.SearchPeople(email, fields)
```

**After:**
```go
people, err := workspaceProvider.SearchPeople(email, fields)
```

### 8. Replace gw.NewAdapter Calls

**Before:**
```go
provider := gw.NewAdapter(s)
locked, err := hcd.IsLocked(docID, db, provider, l)
```

**After:**
```go
locked, err := hcd.IsLocked(docID, db, workspaceProvider, l)
```

**Before:**
```go
provider = gw.NewAdapter(s)
if err := doc.ReplaceHeader(cfg.BaseURL, false, provider); err != nil {
```

**After:**
```go
if err := doc.ReplaceHeader(cfg.BaseURL, false, workspaceProvider); err != nil {
```

### 9. Update Data Comparison Sections

**Before:**
```go
// Compare Algolia and database documents
var algoDoc map[string]any
err = ar.Docs.GetObject(docID, &algoDoc)
if err != nil {
	// Handle error
}
// ... get dbDoc from database
if err := compareAlgoliaAndDatabaseDocument(algoDoc, dbDoc, reviews, cfg.DocumentTypes.DocumentType); err != nil {
	// Log inconsistencies
}
```

**After:**
```go
// Compare search index and database documents
searchDocComp, err := searchProvider.DocumentIndex().GetObject(ctx, docID)
if err != nil {
	// Handle error
}
// Convert to map for comparison function
algoDoc, err := searchDocumentToMap(searchDocComp)
if err != nil {
	// Handle error  
}
// ... get dbDoc from database
if err := compareAlgoliaAndDatabaseDocument(algoDoc, dbDoc, reviews, cfg.DocumentTypes.DocumentType); err != nil {
	// Log inconsistencies
}
```

## Special Cases

### Drafts Handler - Search Operations
The drafts handler uses different Algolia indices:
- `ar.DraftsCreatedTimeAsc` → `searchProvider.DraftIndex()` with ascending sort option
- `ar.DraftsCreatedTimeDesc` → `searchProvider.DraftIndex()` with descending sort option
- `aw.Drafts` → `searchProvider.DraftIndex()`

### SendEmail Operations
If a handler uses `s.SendEmail()`, this is NOT in the workspace.Provider interface yet. You have two options:
1. Comment out with TODO for future implementation
2. Check if workspace provider has been extended to support email

## Server Registration Updates

After refactoring handlers, update `internal/cmd/commands/server/server.go`:

**Before:**
```go
{"/api/v1/approvals/",
	api.ApprovalHandler(cfg, c.Log, algoSearch, algoWrite, goog, db)},
```

**After:**
```go
{"/api/v1/approvals/",
	api.ApprovalHandler(cfg, c.Log, srv.SearchProvider, srv.WorkspaceProvider, db)},
```

## Test Suite Updates

After refactoring handlers, update `tests/api/suite.go`:

**Before:**
```go
mux.Handle("/api/v1/approvals/",
	api.ApprovalHandler(s.Config, srv.Logger, algoSearch, algoWrite, gwService, s.DB))
```

**After:**
```go
mux.Handle("/api/v1/approvals/",
	api.ApprovalHandler(s.Config, srv.Logger, s.SearchProvider, s.WorkspaceProvider, s.DB))
```

## Helper Functions Available

### In `internal/api/helpers.go`:
- `mapToSearchDocument(m map[string]any) (*search.Document, error)` - Converts Algolia map to search.Document
- `searchDocumentToMap(doc *search.Document) (map[string]any, error)` - Converts search.Document to Algolia-compatible map

## Testing Pattern

After refactoring each handler:

1. **Compile check:**
   ```bash
   make bin
   ```

2. **Run tests:**
   ```bash
   go test -tags=integration -v -run TestV1Suite ./tests/api/ -timeout 30s
   ```

3. **Update tests to add mock data:**
   ```go
   // Add file to mock workspace provider
   mockWorkspace := suite.WorkspaceProvider.(*mock.Adapter)
   mockWorkspace.WithFile(doc.GoogleFileID, doc.Title, "application/vnd.google-apps.document")
   
   // Index document in search
   err := suite.SearchProvider.DocumentIndex().Index(context.Background(), searchDoc)
   ```

## Current Status: approvals.go

### Completed in approvals.go:
- ✅ Updated function signature
- ✅ Updated imports
- ✅ Added ctx to handler
- ✅ DELETE case: First GetObject call replaced
- ✅ DELETE case: workspace.IsLocked call replaced
- ✅ DELETE case: GetLatestRevision replaced
- ✅ DELETE case: KeepRevisionForever replaced
- ✅ DELETE case: First SaveObject replaced
- ✅ DELETE case: ReplaceHeader workspaceProvider call fixed

### Remaining in approvals.go:
- ❌ DELETE case: Data comparison section (GetObject call ~line 253)
- ❌ POST case: GetObject call (~line 336)
- ❌ POST case: IsLocked call (~line 316)
- ❌ POST case: GetLatestRevision call (~line 407)
- ❌ POST case: KeepRevisionForever call (~line 420)
- ❌ POST case: SaveObject call (~line 452)
- ❌ POST case: ReplaceHeader call (~line 476)
- ❌ POST case: Data comparison section (~line 515)

### Pattern to Complete approvals.go:
Each remaining case follows the exact same pattern as the first DELETE case. Simply:
1. Find each `ar.Docs.GetObject` → replace with `searchProvider.DocumentIndex().GetObject(ctx, ...)` + `searchDocumentToMap` if map needed
2. Find each `aw.Docs.SaveObject` → replace with `mapToSearchDocument` + `searchProvider.DocumentIndex().Index(ctx, ...)`
3. Find each `s.Method()` → replace with `workspaceProvider.Method()`
4. Find each `gw.NewAdapter(s)` → replace with direct `workspaceProvider`

## Next Steps

1. Complete approvals.go refactoring (follow patterns above for remaining POST and PUT cases)
2. Apply same patterns to reviews.go
3. Apply same patterns to drafts.go (note: uses DraftIndex instead of DocumentIndex)
4. Update server.go route registrations
5. Update test suite.go registrations
6. Enable skipped V1 tests
7. Run full test suite

## Notes

- The refactoring is **systematic and repetitive** - each handler follows the exact same patterns
- The search provider interface is **synchronous** - no need for `.Wait()` calls
- The workspace provider methods have slightly different signatures than *gw.Service (check return values)
- All refactored handlers have been tested and work with the documents.go example
