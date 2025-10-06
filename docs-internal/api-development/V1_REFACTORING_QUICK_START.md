# V1 API Refactoring - Quick Start Guide

**Ready to implement?** Follow these steps to enable the 9 skipped integration tests.

---

## 📖 Before You Start

### Required Reading (5 minutes)
1. **V1_REFACTORING_EXECUTIVE_SUMMARY.md** - Overview and approach
2. **V1_API_WORKSPACE_CALLS_INVENTORY.md** - Line-by-line changes needed

### What You're Fixing
- 9 skipped integration tests
- ~25 direct Google Workspace Service calls
- ~16 direct Algolia client calls
- 12 function signatures

### Recommended Approach
**V1.5 Parallel API** - Create new handlers alongside existing V1 (zero risk!)

---

## 🚀 Implementation Steps

### Step 1: Create V1.5 Directory (2 minutes)

```bash
cd /Users/jrepp/hc/hermes

# Create new directory for V1.5 handlers
mkdir -p internal/api/v1_5

# Create initial README
cat > internal/api/v1_5/README.md << 'EOF'
# V1.5 API Handlers

Refactored versions of V1 handlers using:
- `server.Server` parameter (instead of individual services)
- `search.Provider` abstraction (instead of direct Algolia)
- `workspace.Provider` abstraction (instead of direct Google Workspace)

## Why V1.5?

This allows us to:
1. Test new implementations without affecting V1
2. Support both APIs during migration
3. Enable 9 previously skipped integration tests
4. Gradually migrate clients to cleaner abstraction

## Migration Path

V1 → V1.5 → Eventually deprecate V1
EOF
```

### Step 2: Implement DocumentHandler (45-60 minutes)

```bash
# Copy V1 handler as starting point
cp internal/api/documents.go internal/api/v1_5/documents.go

# Edit internal/api/v1_5/documents.go
# Make these key changes:
```

**Key Changes:**

1. **Update package and imports:**
```go
package v1_5  // Changed from: package api

import (
    "context"
    "encoding/json"
    "errors"
    "fmt"
    "net/http"
    // ... other imports
    
    "github.com/hashicorp-forge/hermes/internal/server"
    "github.com/hashicorp-forge/hermes/pkg/search"
    // Remove: "github.com/algolia/algoliasearch-client-go/v3/algolia/errs"
    // Remove: "github.com/hashicorp-forge/hermes/pkg/algolia"
)
```

2. **Update function signature (line ~45):**
```go
// OLD:
func DocumentHandler(
    cfg *config.Config,
    l hclog.Logger,
    ar *algolia.Client,
    aw *algolia.Client,
    s *gw.Service,
    db *gorm.DB) http.Handler {

// NEW:
func DocumentHandler(srv server.Server) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ctx := r.Context()
```

3. **Replace workspace calls (2 locations):**

Line ~127:
```go
// OLD:
file, err := s.GetFile(docID)

// NEW:
file, err := srv.WorkspaceProvider.GetFile(docID)
```

Line ~360:
```go
// OLD:
provider := gw.NewAdapter(s)
locked, err := hcd.IsLocked(docID, db, provider, l)

// NEW:
locked, err := hcd.IsLocked(docID, srv.DB, srv.WorkspaceProvider, srv.Logger)
```

4. **Replace Algolia calls (3 locations):**

Line ~69:
```go
// OLD:
var algoObj map[string]any
err = ar.Docs.GetObject(docID, &algoObj)
if err != nil {
    if _, is404 := errs.IsAlgoliaErrWithCode(err, 404); is404 {
        // ...
    }
}

// NEW:
searchDoc, err := srv.SearchProvider.DocumentIndex().GetObject(ctx, docID)
if err != nil {
    if errors.Is(err, search.ErrObjectNotFound) {
        srv.Logger.Warn("document not found in search index", "error", err, "doc_id", docID)
        http.Error(w, "Document not found", http.StatusNotFound)
        return
    }
    // ... other error handling
}

// Convert to map for backward compatibility with document.NewFromAlgoliaObject
algoObj := searchDocumentToMap(searchDoc)
```

Line ~250 (similar replacement)

Line ~513:
```go
// OLD:
res, err := aw.Docs.SaveObject(docObj)

// NEW:
searchDoc := mapToSearchDocument(docObj)  // You'll need this helper
err = srv.SearchProvider.DocumentIndex().Index(ctx, searchDoc)
```

5. **Replace all `l.` with `srv.Logger.`:**
```bash
# Use find-and-replace in your editor
l.Error → srv.Logger.Error
l.Warn → srv.Logger.Warn
l.Info → srv.Logger.Info
```

6. **Replace all `cfg.` with `srv.Config.`:**
```bash
cfg.DocumentTypes → srv.Config.DocumentTypes
cfg.BaseURL → srv.Config.BaseURL
cfg.GoogleWorkspace → srv.Config.GoogleWorkspace
```

7. **Replace all `db` with `srv.DB`:**
```bash
model.Get(db) → model.Get(srv.DB)
reviews.Find(db, → reviews.Find(srv.DB,
```

8. **Add helper functions at end of file:**
```go
// searchDocumentToMap converts search.Document to map for backward compatibility
func searchDocumentToMap(doc *search.Document) map[string]any {
    return map[string]any{
        "objectID":     doc.ObjectID,
        "docID":        doc.DocID,
        "title":        doc.Title,
        "docNumber":    doc.DocNumber,
        "docType":      doc.DocType,
        "product":      doc.Product,
        "status":       doc.Status,
        "owners":       doc.Owners,
        "contributors": doc.Contributors,
        "approvers":    doc.Approvers,
        "summary":      doc.Summary,
        "content":      doc.Content,
        "createdTime":  doc.CreatedTime,
        "modifiedTime": doc.ModifiedTime,
        "customFields": doc.CustomFields,
    }
}

// mapToSearchDocument converts map to search.Document for indexing
func mapToSearchDocument(m map[string]any) *search.Document {
    doc := &search.Document{}
    if v, ok := m["objectID"].(string); ok {
        doc.ObjectID = v
    }
    if v, ok := m["title"].(string); ok {
        doc.Title = v
    }
    // ... convert other fields as needed
    return doc
}
```

### Step 3: Update Router (15 minutes)

Edit `internal/server/router.go`:

```go
// Add import
import (
    v1_5 "github.com/hashicorp-forge/hermes/internal/api/v1_5"
)

// In the router setup function, after V1 routes:

// V1.5 API routes (refactored with provider abstractions)
api1_5 := r.PathPrefix("/api/v1.5").Subrouter()

// Document endpoints
api1_5.Handle("/documents/{id}",
    pkgauth.Middleware(srv.AuthProvider, srv.Logger)(
        v1_5.DocumentHandler(srv)))
api1_5.Handle("/documents/{id}/related-resources",
    pkgauth.Middleware(srv.AuthProvider, srv.Logger)(
        v1_5.DocumentHandler(srv)))
```

### Step 4: Update Tests (10 minutes)

Edit `tests/api/documents_test.go`:

```go
// Change t.Skip() to actual test:
func TestDocuments_Get(t *testing.T) {
    // Remove: t.Skip("API handlers are tightly coupled...")
    
    suite := NewIntegrationSuite(t)
    defer suite.Cleanup()

    t.Run("Get existing document", func(t *testing.T) {
        // Create test document
        doc := fixtures.NewDocument().
            WithGoogleFileID("test-file-123").
            WithTitle("Test RFC").
            WithDocType("RFC").
            WithStatus(models.WIPDocumentStatus).
            Create(t, suite.DB)

        // Index in search
        searchDoc := ModelToSearchDocument(doc)
        err := suite.SearchProvider.DocumentIndex().Index(suite.Ctx, searchDoc)
        require.NoError(t, err)

        // Make request to V1.5 endpoint
        resp := suite.Client.Get("/api/v1.5/documents/" + doc.GoogleFileID)
        
        // Assert
        resp.AssertStatusOK()
        
        var result map[string]interface{}
        resp.DecodeJSON(&result)
        
        assert.Equal(t, doc.GoogleFileID, result["objectID"])
        assert.Equal(t, doc.Title, result["title"])
    })
}
```

### Step 5: Build and Test (5 minutes)

```bash
# Verify it compiles
go build ./internal/api/v1_5/

# Run the specific test
go test -tags=integration -v ./tests/api/ -run TestDocuments_Get

# If passing, run all document tests
go test -tags=integration -v ./tests/api/ -run TestDocuments
```

### Step 6: Repeat for DraftsHandler (1-2 hours)

Follow same pattern:
1. Copy `internal/api/drafts.go` → `internal/api/v1_5/drafts.go`
2. Update package and function signatures
3. Replace 8 workspace calls (see V1_API_WORKSPACE_CALLS_INVENTORY.md)
4. Replace 5 Algolia calls
5. Update router
6. Update tests
7. Run tests

---

## ✅ Success Checklist

After DocumentHandler:
- [ ] `internal/api/v1_5/documents.go` created and compiles
- [ ] Router updated with `/api/v1.5/documents/` route
- [ ] `TestDocuments_Get` passing
- [ ] `TestDocuments_Patch` passing
- [ ] `TestDocuments_Delete` passing
- [ ] `TestDocuments_List` passing

After DraftsHandler:
- [ ] `internal/api/v1_5/drafts.go` created and compiles
- [ ] Router updated with `/api/v1.5/drafts/` route
- [ ] `TestAPI_DraftsHandler` passing

**Progress**: 5/9 tests now passing! (55/59 total)

---

## 🆘 Common Issues

### Issue: "undefined: searchDocumentToMap"
**Solution**: Add the helper functions shown in Step 2.8

### Issue: "too many arguments to GetFile"
**Solution**: workspace.Provider.GetFile() takes only docID, not context
```go
// Correct:
file, err := srv.WorkspaceProvider.GetFile(docID)

// Wrong:
file, err := srv.WorkspaceProvider.GetFile(ctx, docID)
```

### Issue: Test fails with "document not found"
**Solution**: Make sure to index the document in search BEFORE making the request:
```go
searchDoc := ModelToSearchDocument(doc)
err := suite.SearchProvider.DocumentIndex().Index(suite.Ctx, searchDoc)
require.NoError(t, err)
```

### Issue: Type mismatch errors
**Solution**: Check V1_API_WORKSPACE_CALLS_INVENTORY.md for exact signatures

---

## 📊 Progress Tracking

| Phase | Handler | Files | Tests | Status |
|-------|---------|-------|-------|--------|
| 1 | DocumentHandler | 1 | 4 | ⬜ Not Started |
| 1 | DraftsHandler | 1 | 1 | ⬜ Not Started |
| 2 | ReviewsHandler | 1 | 1 | ⬜ Not Started |
| 2 | ApprovalsHandler | 1 | 1 | ⬜ Not Started |
| 3 | Remaining | 4 | 2 | ⬜ Not Started |

**Current**: 50/59 tests (85%)  
**Target**: 59/59 tests (100%)

---

## 📚 Reference Commands

```bash
# Build check
go build ./internal/api/v1_5/

# Run single test
go test -tags=integration -v ./tests/api/ -run TestDocuments_Get

# Run all document tests
go test -tags=integration -v ./tests/api/ -run TestDocuments

# Run full API test suite
go test -tags=integration -v ./tests/api/ -timeout 5m

# Check test count
go test -tags=integration -list . ./tests/api/ 2>/dev/null | grep "^Test" | wc -l
```

---

## 🎯 Next Steps

1. **Start with DocumentHandler** (easiest - 2 workspace calls, 3 Algolia calls)
2. **Then DraftsHandler** (more complex - 8 workspace calls, 5 Algolia calls)
3. **Take a break!** You've just enabled 5 tests 🎉
4. **Continue with Reviews/Approvals** when ready
5. **Finish with remaining handlers**

---

**Time to completion**: 4-6 hours for all handlers  
**Immediate win**: 1-2 hours gets you DocumentHandler + 4 passing tests

Good luck! 🚀
