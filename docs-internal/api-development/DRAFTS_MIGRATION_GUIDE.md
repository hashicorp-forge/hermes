# Drafts Module Migration Guide
## Moving from Monolithic drafts.go to Modular Package

**Status**: 🚧 Migration Plan  
**Date**: October 5, 2025  
**Target**: `internal/api/drafts.go` (1442 lines) → `internal/api/drafts/` package

---

## Overview

This guide provides a **concrete, step-by-step migration path** from the current monolithic `drafts.go` file to a modular package structure. Each step is designed to be safe, testable, and reversible.

## Current State

```
internal/api/
├── drafts.go                    # 1442 lines - MONOLITHIC
│   ├── DraftsHandler()          # Main handler for /api/v1/drafts
│   ├── DraftsDocumentHandler()  # Handler for /api/v1/drafts/{id}
│   ├── draftsShareableHandler() # Helper for sharing operations
│   ├── removeSharing()          # Helper for unsharing
│   └── [Inline logic]           # Mixed concerns throughout
```

## Target State

```
internal/api/drafts/
├── handler.go              # HTTP handlers (thin orchestration)
├── create.go              # Draft creation operations
├── update.go              # Draft update operations
├── delete.go              # Draft deletion operations
├── get.go                 # Single draft retrieval
├── list.go                # Draft listing and search
├── share.go               # Sharing/permissions operations
├── templates.go           # Template operations
└── types.go               # Shared types and interfaces
```

---

## Migration Strategy

### Phase 1: Prepare (No Breaking Changes)
Create new package alongside existing code, gradually move functionality.

### Phase 2: Extract (Pure Code Movement)
Move code into new modules without changing logic.

### Phase 3: Refactor (Provider Migration)
Update extracted modules to use provider abstractions.

### Phase 4: Integrate (Switch Over)
Update main handlers to use new modules, deprecate old code.

### Phase 5: Cleanup (Remove Old Code)
Delete old monolithic file once migration is complete.

---

## Detailed Migration Steps

### Step 1: Create Package Structure (5 min)

**What**: Create the new package directory and initial files.

**Commands**:
```bash
cd /Users/jrepp/hc/hermes
mkdir -p internal/api/drafts
touch internal/api/drafts/types.go
touch internal/api/drafts/handler.go
```

**Verification**:
```bash
ls -la internal/api/drafts/
# Should show: types.go, handler.go
```

**Commit**:
```bash
git add internal/api/drafts/
git commit -m "feat(api): create drafts package structure

Initial package structure for modular drafts API.
No functionality moved yet - preparation step only."
```

---

### Step 2: Extract Types (15 min)

**What**: Move type definitions to `types.go`.

**Create** `internal/api/drafts/types.go`:

```go
package drafts

import (
	"time"

	"github.com/hashicorp-forge/hermes/pkg/document"
)

// DraftsRequest contains fields for a document draft.
type DraftsRequest struct {
	Approvers           []string `json:"approvers,omitempty"`
	Contributors        []string `json:"contributors,omitempty"`
	DocType             string   `json:"docType,omitempty"`
	Product             string   `json:"product,omitempty"`
	Summary             string   `json:"summary,omitempty"`
	Tags                []string `json:"tags,omitempty"`
	Title               string   `json:"title,omitempty"`
	TemplateID          string   `json:"templateId,omitempty"`
	CreateAsUser        bool     `json:"createAsUser,omitempty"`
	CreateFolderShortcut bool    `json:"createFolderShortcut,omitempty"`
}

// DraftsPatchRequest contains fields for updating a draft.
type DraftsPatchRequest struct {
	Approvers    *[]string               `json:"approvers,omitempty"`
	Contributors *[]string               `json:"contributors,omitempty"`
	CustomFields *[]document.CustomField `json:"customFields,omitempty"`
	Product      *string                 `json:"product,omitempty"`
	Summary      *string                 `json:"summary,omitempty"`
	Title        *string                 `json:"title,omitempty"`
}

// DraftsResponse is returned when a draft is created.
type DraftsResponse struct {
	ID string `json:"id"`
}
```

**Update** `internal/api/drafts.go` (temporarily keep types, add alias):

```go
package api

import (
	// ... existing imports ...
	apiDrafts "github.com/hashicorp-forge/hermes/internal/api/drafts"
)

// Alias types to maintain backward compatibility during migration
type DraftsRequest = apiDrafts.DraftsRequest
type DraftsPatchRequest = apiDrafts.DraftsPatchRequest
type DraftsResponse = apiDrafts.DraftsResponse

// Keep existing handler functions unchanged for now
```

**Test**:
```bash
make bin
# Should compile successfully
```

**Commit**:
```bash
git add internal/api/drafts/types.go internal/api/drafts.go
git commit -m "refactor(api): extract drafts types to separate file

Move type definitions to drafts/types.go.
Add type aliases in drafts.go for backward compatibility.
No functional changes."
```

---

### Step 3: Extract Sharing Operations (30 min)

**What**: Move sharing-related code to `share.go`.

**Create** `internal/api/drafts/share.go`:

```go
package drafts

import (
	"net/http"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/pkg/document"
	"github.com/hashicorp-forge/hermes/pkg/workspace"
	"github.com/hashicorp/go-hclog"
	"gorm.io/gorm"
)

// ShareDraft adds sharing permissions to a draft document.
func ShareDraft(
	docID string,
	emails []string,
	role string,
	workspaceProvider workspace.Provider,
	l hclog.Logger,
) error {
	for _, email := range emails {
		if err := workspaceProvider.ShareFile(docID, email, role); err != nil {
			l.Error("error sharing file",
				"error", err,
				"doc_id", docID,
				"email", email,
			)
			return err
		}
	}
	return nil
}

// UnshareDraft removes sharing permissions from a draft document.
func UnshareDraft(
	docID string,
	email string,
	workspaceProvider workspace.Provider,
	l hclog.Logger,
) error {
	// Get current permissions
	file, err := workspaceProvider.GetFile(docID)
	if err != nil {
		return err
	}

	// Find and remove permission
	if file.Permissions != nil {
		for _, perm := range file.Permissions {
			if perm.EmailAddress == email {
				if err := workspaceProvider.DeletePermission(docID, perm.Id); err != nil {
					l.Error("error removing permission",
						"error", err,
						"doc_id", docID,
						"email", email,
					)
					return err
				}
				break
			}
		}
	}

	return nil
}

// HandleShareableRequest handles the /shareable endpoint for drafts.
func HandleShareableRequest(
	w http.ResponseWriter,
	r *http.Request,
	docID string,
	doc document.Document,
	cfg config.Config,
	l hclog.Logger,
	workspaceProvider workspace.Provider,
	db *gorm.DB,
) {
	// This will be implemented in Phase 3 (refactoring phase)
	// For now, this is a placeholder that matches the old signature
	http.Error(w, "Not yet implemented", http.StatusNotImplemented)
}
```

**Update** `internal/api/drafts.go`:

Replace the `removeSharing` function with a call to the new module:

```go
// OLD CODE (to be replaced):
// func removeSharing(s *gw.Service, docId, email string) error { ... }

// NEW CODE:
func removeSharing(s *gw.Service, docId, email string) error {
	// Temporary adapter until full migration
	adapter := gw.NewAdapter(s)
	return apiDrafts.UnshareDraft(docId, email, adapter, l)
}
```

**Test**:
```bash
make bin
# Should compile successfully
```

**Commit**:
```bash
git add internal/api/drafts/share.go internal/api/drafts.go
git commit -m "refactor(api): extract sharing operations to drafts/share.go

Move sharing logic to dedicated module.
Old functions now delegate to new module for compatibility.
Enables independent testing of sharing operations."
```

---

### Step 4: Extract Delete Operations (20 min)

**Create** `internal/api/drafts/delete.go`:

```go
package drafts

import (
	"context"

	"github.com/hashicorp-forge/hermes/pkg/search"
	"github.com/hashicorp-forge/hermes/pkg/workspace"
	"github.com/hashicorp/go-hclog"
)

// DeleteDraft removes a draft document from both search index and workspace.
func DeleteDraft(
	ctx context.Context,
	docID string,
	searchProvider search.Provider,
	workspaceProvider workspace.Provider,
	l hclog.Logger,
) error {
	// Delete from workspace first (primary source)
	if err := workspaceProvider.DeleteFile(docID); err != nil {
		l.Error("error deleting file from workspace",
			"error", err,
			"doc_id", docID,
		)
		return err
	}

	// Then delete from search index
	if err := searchProvider.DraftIndex().Delete(ctx, docID); err != nil {
		l.Warn("error deleting draft from search index",
			"error", err,
			"doc_id", docID,
		)
		// Don't fail the request if search deletion fails
		// Search index can be rebuilt
	}

	return nil
}
```

**Test**:
```bash
make bin
```

**Commit**:
```bash
git add internal/api/drafts/delete.go
git commit -m "refactor(api): extract delete operations to drafts/delete.go

Simple delete operation extracted to dedicated module.
Uses provider abstractions (search.Provider, workspace.Provider).
Ready for integration into main handler."
```

---

### Step 5: Extract Get Operations (20 min)

**Create** `internal/api/drafts/get.go`:

```go
package drafts

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/pkg/document"
	"github.com/hashicorp-forge/hermes/pkg/search"
	"github.com/hashicorp/go-hclog"
)

// GetDraft retrieves a single draft document by ID.
func GetDraft(
	ctx context.Context,
	docID string,
	searchProvider search.Provider,
	cfg *config.Config,
	l hclog.Logger,
) (*document.Document, error) {
	// Get from search index
	searchDoc, err := searchProvider.DraftIndex().GetObject(ctx, docID)
	if err != nil {
		if errors.Is(err, search.ErrNotFound) {
			l.Warn("draft not found in search index",
				"doc_id", docID,
			)
			return nil, search.ErrNotFound
		}
		l.Error("error getting draft from search",
			"error", err,
			"doc_id", docID,
		)
		return nil, err
	}

	// Convert search document to map
	searchDocBytes, err := json.Marshal(searchDoc)
	if err != nil {
		return nil, fmt.Errorf("error marshaling search doc: %w", err)
	}

	var algoObj map[string]any
	if err := json.Unmarshal(searchDocBytes, &algoObj); err != nil {
		return nil, fmt.Errorf("error unmarshaling to map: %w", err)
	}

	// Convert to document
	doc, err := document.NewFromAlgoliaObject(
		algoObj,
		cfg.DocumentTypes.DocumentType,
	)
	if err != nil {
		l.Error("error converting to document",
			"error", err,
			"doc_id", docID,
		)
		return nil, err
	}

	return doc, nil
}
```

**Commit**:
```bash
git add internal/api/drafts/get.go
git commit -m "refactor(api): extract get operations to drafts/get.go

Single draft retrieval extracted to dedicated module.
Uses provider abstractions with proper error handling."
```

---

### Step 6: Create Integration Handler (30 min)

**Create** `internal/api/drafts/handler.go`:

```go
package drafts

import (
	"net/http"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/pkg/search"
	"github.com/hashicorp-forge/hermes/pkg/workspace"
	"github.com/hashicorp/go-hclog"
	"gorm.io/gorm"
)

// Handler provides HTTP handlers for draft operations.
type Handler struct {
	Config            *config.Config
	Logger            hclog.Logger
	SearchProvider    search.Provider
	WorkspaceProvider workspace.Provider
	DB                *gorm.DB
}

// HandleList handles GET /api/v1/drafts (list all drafts).
func (h *Handler) HandleList(w http.ResponseWriter, r *http.Request) {
	// To be implemented in later steps
	http.Error(w, "Not yet implemented", http.StatusNotImplemented)
}

// HandleCreate handles POST /api/v1/drafts (create new draft).
func (h *Handler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	// To be implemented in later steps
	http.Error(w, "Not yet implemented", http.StatusNotImplemented)
}

// HandleGet handles GET /api/v1/drafts/{id} (get single draft).
func (h *Handler) HandleGet(w http.ResponseWriter, r *http.Request, docID string) {
	ctx := r.Context()

	// Use the extracted GetDraft function
	doc, err := GetDraft(ctx, docID, h.SearchProvider, h.Config, h.Logger)
	if err != nil {
		h.Logger.Error("error getting draft",
			"error", err,
			"doc_id", docID,
		)
		http.Error(w, "Error getting draft", http.StatusInternalServerError)
		return
	}

	// Return document (to be implemented with proper JSON encoding)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = doc // Use doc in response
}

// HandleUpdate handles PATCH /api/v1/drafts/{id} (update draft).
func (h *Handler) HandleUpdate(w http.ResponseWriter, r *http.Request, docID string) {
	// To be implemented in later steps
	http.Error(w, "Not yet implemented", http.StatusNotImplemented)
}

// HandleDelete handles DELETE /api/v1/drafts/{id} (delete draft).
func (h *Handler) HandleDelete(w http.ResponseWriter, r *http.Request, docID string) {
	ctx := r.Context()

	// Use the extracted DeleteDraft function
	err := DeleteDraft(ctx, docID, h.SearchProvider, h.WorkspaceProvider, h.Logger)
	if err != nil {
		h.Logger.Error("error deleting draft",
			"error", err,
			"doc_id", docID,
		)
		http.Error(w, "Error deleting draft", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
```

**Commit**:
```bash
git add internal/api/drafts/handler.go
git commit -m "refactor(api): create integrated handler for drafts package

New Handler struct with provider-based architecture.
Implements GET and DELETE operations using extracted modules.
CREATE, UPDATE, and LIST operations are placeholders for now."
```

---

### Step 7: Add Tests for Extracted Modules (45 min)

**Create** `internal/api/drafts/delete_test.go`:

```go
package drafts

import (
	"context"
	"errors"
	"testing"

	"github.com/hashicorp-forge/hermes/pkg/search"
	"github.com/hashicorp/go-hclog"
)

// Mock implementations for testing
type mockSearchProvider struct {
	deleteErr error
}

func (m *mockSearchProvider) DraftIndex() search.DraftIndex {
	return &mockDraftIndex{deleteErr: m.deleteErr}
}

func (m *mockSearchProvider) DocumentIndex() search.DocumentIndex { return nil }
func (m *mockSearchProvider) ProjectIndex() search.ProjectIndex   { return nil }
func (m *mockSearchProvider) LinksIndex() search.LinksIndex       { return nil }
func (m *mockSearchProvider) Name() string                        { return "mock" }
func (m *mockSearchProvider) Healthy(ctx context.Context) error   { return nil }

type mockDraftIndex struct {
	deleteErr error
}

func (m *mockDraftIndex) Delete(ctx context.Context, docID string) error {
	return m.deleteErr
}

func (m *mockDraftIndex) Index(ctx context.Context, doc *search.Document) error { return nil }
func (m *mockDraftIndex) IndexBatch(ctx context.Context, docs []*search.Document) error {
	return nil
}
func (m *mockDraftIndex) DeleteBatch(ctx context.Context, docIDs []string) error { return nil }
func (m *mockDraftIndex) Search(ctx context.Context, query *search.SearchQuery) (*search.SearchResult, error) {
	return nil, nil
}
func (m *mockDraftIndex) GetObject(ctx context.Context, docID string) (*search.Document, error) {
	return nil, nil
}
func (m *mockDraftIndex) GetFacets(ctx context.Context, facetNames []string) (*search.Facets, error) {
	return nil, nil
}
func (m *mockDraftIndex) Clear(ctx context.Context) error { return nil }

type mockWorkspaceProvider struct {
	deleteErr error
}

func (m *mockWorkspaceProvider) DeleteFile(fileID string) error {
	return m.deleteErr
}

// Implement other workspace.Provider methods as no-ops for testing
// (abbreviated for brevity - add all required methods)

func TestDeleteDraft_Success(t *testing.T) {
	ctx := context.Background()
	searchProvider := &mockSearchProvider{}
	workspaceProvider := &mockWorkspaceProvider{}
	logger := hclog.NewNullLogger()

	err := DeleteDraft(ctx, "test-doc-123", searchProvider, workspaceProvider, logger)
	if err != nil {
		t.Errorf("Expected no error, got: %v", err)
	}
}

func TestDeleteDraft_WorkspaceError(t *testing.T) {
	ctx := context.Background()
	searchProvider := &mockSearchProvider{}
	workspaceProvider := &mockWorkspaceProvider{
		deleteErr: errors.New("workspace error"),
	}
	logger := hclog.NewNullLogger()

	err := DeleteDraft(ctx, "test-doc-123", searchProvider, workspaceProvider, logger)
	if err == nil {
		t.Error("Expected error, got nil")
	}
}

func TestDeleteDraft_SearchErrorDoesNotFail(t *testing.T) {
	ctx := context.Background()
	searchProvider := &mockSearchProvider{
		deleteErr: errors.New("search error"),
	}
	workspaceProvider := &mockWorkspaceProvider{}
	logger := hclog.NewNullLogger()

	// Should succeed even if search deletion fails
	err := DeleteDraft(ctx, "test-doc-123", searchProvider, workspaceProvider, logger)
	if err != nil {
		t.Errorf("Expected no error (search errors are non-fatal), got: %v", err)
	}
}
```

**Run tests**:
```bash
go test -v ./internal/api/drafts/
```

**Commit**:
```bash
git add internal/api/drafts/delete_test.go
git commit -m "test(api): add unit tests for drafts delete operations

Comprehensive unit tests for DeleteDraft function.
Uses mock providers to test success and error cases.
Verifies search errors don't fail the operation."
```

---

### Step 8: Gradually Migrate Remaining Operations

**Continue with this pattern for each operation**:

1. **Create module** (e.g., `create.go`, `update.go`, `list.go`)
2. **Extract logic** from old `drafts.go`
3. **Add tests** for the module
4. **Update handler** to use new module
5. **Commit** each module independently

**For each new module**:

```bash
# Example for create.go
touch internal/api/drafts/create.go
# ... implement CreateDraft function ...
touch internal/api/drafts/create_test.go
# ... implement tests ...
make bin
go test ./internal/api/drafts/
git add internal/api/drafts/create.go internal/api/drafts/create_test.go
git commit -m "refactor(api): extract create operations to drafts/create.go"
```

---

### Step 9: Update Server Registration (15 min)

Once all modules are extracted and tested, update the server to use the new handler.

**Update** `internal/cmd/commands/server/server.go`:

```go
// OLD CODE:
{"/api/v1/drafts",
	api.DraftsHandler(cfg, c.Log, algoSearch, algoWrite, goog, db)},
{"/api/v1/drafts/",
	api.DraftsDocumentHandler(cfg, c.Log, algoSearch, algoWrite, goog, db)},

// NEW CODE:
draftsHandler := &drafts.Handler{
	Config:            cfg,
	Logger:            c.Log,
	SearchProvider:    srv.SearchProvider,
	WorkspaceProvider: srv.WorkspaceProvider,
	DB:                db,
}
{"/api/v1/drafts", draftsHandler.HandleList},      // GET - list
{"/api/v1/drafts", draftsHandler.HandleCreate},    // POST - create
// For routes with {id}, use a wrapper:
{"/api/v1/drafts/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
	// Parse docID from URL
	docID := parseDocIDFromPath(r.URL.Path)
	
	switch r.Method {
	case "GET":
		draftsHandler.HandleGet(w, r, docID)
	case "PATCH":
		draftsHandler.HandleUpdate(w, r, docID)
	case "DELETE":
		draftsHandler.HandleDelete(w, r, docID)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
})},
```

**Test**:
```bash
make bin
# Verify application starts and routes work
./build/bin/hermes server -config=config.hcl
```

**Commit**:
```bash
git add internal/cmd/commands/server/server.go
git commit -m "feat(api): integrate modular drafts package into server

Replace old monolithic handlers with new modular package.
All draft operations now use provider abstractions.
Maintains API compatibility."
```

---

### Step 10: Deprecate Old Code (5 min)

**Update** `internal/api/drafts.go`:

Add deprecation notice at top of file:

```go
// Package api provides V1 API handlers.
//
// DEPRECATED: The drafts handlers in this file are deprecated.
// New code should use github.com/hashicorp-forge/hermes/internal/api/drafts package.
// This file will be removed in a future version.
package api

// Deprecated: Use drafts.Handler instead.
func DraftsHandler(...) http.Handler {
	// Keep old implementation temporarily for backward compatibility
	// ...existing code...
}

// Deprecated: Use drafts.Handler instead.
func DraftsDocumentHandler(...) http.Handler {
	// Keep old implementation temporarily for backward compatibility
	// ...existing code...
}
```

**Commit**:
```bash
git add internal/api/drafts.go
git commit -m "deprecate(api): mark old drafts handlers as deprecated

Add deprecation notices to old monolithic handlers.
New code should use internal/api/drafts package.
Old handlers maintained temporarily for transition period."
```

---

### Step 11: Final Cleanup (10 min)

After confirming the new package works in production:

**Remove** `internal/api/drafts.go`:

```bash
git rm internal/api/drafts.go
git commit -m "cleanup(api): remove deprecated monolithic drafts.go

Old drafts.go file removed after successful migration.
All functionality now in internal/api/drafts/ package.
Migration complete."
```

---

## Verification Checklist

After completing migration:

- [ ] All modules compile independently
- [ ] `make bin` succeeds
- [ ] All unit tests pass: `go test ./internal/api/drafts/`
- [ ] Integration tests pass: `go test -tags=integration ./tests/api/`
- [ ] Application starts: `./build/bin/hermes server -config=config.hcl`
- [ ] API endpoints work (manual testing or E2E tests)
- [ ] No backward compatibility breaks
- [ ] Documentation updated
- [ ] Old code removed

---

## Rollback Plan

If issues are discovered at any step:

1. **Revert last commit**: `git revert HEAD`
2. **Or reset to before migration**: `git reset --hard <commit-before-migration>`
3. **Remove new package**: `rm -rf internal/api/drafts/`
4. **Restore old handler**: `git checkout main -- internal/api/drafts.go`

The incremental commit strategy ensures each step can be reverted independently.

---

## Timeline Estimate

| Step | Duration | Cumulative |
|------|----------|------------|
| 1. Package structure | 5 min | 5 min |
| 2. Extract types | 15 min | 20 min |
| 3. Extract sharing | 30 min | 50 min |
| 4. Extract delete | 20 min | 1h 10min |
| 5. Extract get | 20 min | 1h 30min |
| 6. Integration handler | 30 min | 2h |
| 7. Tests | 45 min | 2h 45min |
| 8. Remaining ops (5×) | 5h | 7h 45min |
| 9. Server registration | 15 min | 8h |
| 10. Deprecation | 5 min | 8h 5min |
| 11. Cleanup | 10 min | 8h 15min |
| **Total** | **~8-9 hours** | **spread over 2-3 days** |

---

## Success Metrics

### Quantitative
- ✅ File count: 1 file → 9+ files (better organization)
- ✅ Average file size: 1442 lines → ~150 lines per file
- ✅ Test coverage: 0% → >70% (unit tests for each module)
- ✅ Build time: Same or faster (smaller compilation units)

### Qualitative
- ✅ Code is easier to understand (single responsibility per file)
- ✅ Code is easier to test (isolated modules)
- ✅ Code is easier to modify (clear boundaries)
- ✅ Code uses provider abstractions (modern pattern)

---

## Next Steps After Migration

1. **Add comprehensive integration tests** for all draft operations
2. **Document the new package** with godoc comments
3. **Create architecture diagram** showing module relationships
4. **Consider similar migrations** for other large files
5. **Establish coding standards** to prevent future monolithic files

---

## Questions & Support

For questions about this migration:
- See: `docs-internal/MODULARIZATION_PLAN_2025_01_05.md` (overall strategy)
- See: `docs-internal/V1_HANDLER_REFACTORING_PATTERNS.md` (refactoring patterns)
- See: `docs-internal/SESSION_CHECKPOINT_2025_01_05.md` (current state)

---

**Last Updated**: October 5, 2025  
**Status**: 📋 Ready to Begin  
**Next Step**: Execute Step 1 (Create Package Structure)
