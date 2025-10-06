# DocumentHandler V1.5 Refactoring - Change Summary

**File**: `internal/api/v1_5/documents.go` (to be created from `internal/api/documents.go`)  
**Size**: ~780 lines in handler function alone  
**Complexity**: HIGH - This is a very large handler with many responsibilities

---

## 🎯 Required Changes Summary

### 1. Package and Imports (Lines 1-21)
```go
// Change package
package v1_5  // Was: package api

// Add imports:
import (
    "context"  // NEW - for ctx
    "github.com/hashicorp-forge/hermes/internal/server"  // NEW
    "github.com/hashicorp-forge/hermes/pkg/search"  // NEW
    "github.com/hashicorp-forge/hermes/pkg/workspace"  // NEW (if needed)
)

// Remove imports:
// "github.com/algolia/algoliasearch-client-go/v3/algolia/errs"  // REMOVE
// "github.com/hashicorp-forge/hermes/pkg/algolia"  // REMOVE
```

### 2. Function Signature (Line 45-51)
```go
// OLD (6 parameters):
func DocumentHandler(
    cfg *config.Config,
    l hclog.Logger,
    ar *algolia.Client,
    aw *algolia.Client,
    s *gw.Service,
    db *gorm.DB) http.Handler

// NEW (1 parameter):
func DocumentHandler(srv server.Server) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ctx := r.Context()  // ADD THIS
```

### 3. Direct Replacements Throughout File

#### Logger (50+ occurrences)
```bash
Find: l\.
Replace: srv.Logger.
```

#### Config (20+ occurrences)
```bash
Find: cfg\.
Replace: srv.Config.
```

#### Database (30+ occurrences)
```bash
Find: , db\)
Replace: , srv.DB)
```

### 4. Workspace Calls (2 locations)

**Line 127**:
```go
// OLD:
file, err := s.GetFile(docID)

// NEW:
file, err := srv.WorkspaceProvider.GetFile(docID)
```

**Line 360**:
```go
// OLD:
provider := gw.NewAdapter(s)
locked, err := hcd.IsLocked(docID, db, provider, l)

// NEW:
locked, err := hcd.IsLocked(docID, srv.DB, srv.WorkspaceProvider, srv.Logger)
```

**Line ~620 (PATCH - email sending)**:
```go
// OLD:
err = s.SendEmail(...)

// NEW:
err = srv.WorkspaceProvider.SendEmail(...)
```

**Line ~660 (PATCH - rename file)**:
```go
// OLD:
s.RenameFile(docID, ...)

// NEW:
srv.WorkspaceProvider.RenameFile(docID, ...)
```

### 5. Algolia/Search Calls (3 locations)

**Line 69-88**: Get document
```go
// OLD:
var algoObj map[string]any
err = ar.Docs.GetObject(docID, &algoObj)
if err != nil {
    if _, is404 := errs.IsAlgoliaErrWithCode(err, 404); is404 {
        l.Warn("document object not found in Algolia", ...)
        http.Error(w, "Document not found", http.StatusNotFound)
        return
    }
    l.Error("error requesting document from Algolia", ...)
    http.Error(w, "Error accessing document", http.StatusInternalServerError)
    return
}
doc, err := document.NewFromAlgoliaObject(algoObj, cfg.DocumentTypes.DocumentType)

// NEW:
searchDoc, err := srv.SearchProvider.DocumentIndex().GetObject(ctx, docID)
if err != nil {
    if errors.Is(err, search.ErrObjectNotFound) {
        srv.Logger.Warn("document not found in search index",
            "error", err, "doc_id", docID, "path", r.URL.Path, "method", r.Method)
        http.Error(w, "Document not found", http.StatusNotFound)
        return
    }
    srv.Logger.Error("error requesting document from search index",
        "error", err, "doc_id", docID)
    http.Error(w, "Error accessing document", http.StatusInternalServerError)
    return
}
// Convert to map for backward compatibility
algoObj := searchDocumentToMap(searchDoc)
doc, err := document.NewFromAlgoliaObject(algoObj, srv.Config.DocumentTypes.DocumentType)
```

**Line 250-273**: Get document for comparison (in GET handler)
```go
// OLD:
var algoDoc map[string]any
err = ar.Docs.GetObject(docID, &algoDoc)

// NEW:
searchDoc, err := srv.SearchProvider.DocumentIndex().GetObject(ctx, docID)
if err != nil {
    srv.Logger.Error("error getting search object for data comparison", ...)
    return
}
algoDoc := searchDocumentToMap(searchDoc)
```

**Line 513-540**: Save document (in PATCH handler)
```go
// OLD:
docObj, err := doc.ToAlgoliaObject(true)
if err != nil {
    l.Error("error converting document to Algolia object", ...)
    http.Error(w, "Error patching document", http.StatusInternalServerError)
    return
}
res, err := aw.Docs.SaveObject(docObj)
if err != nil {
    l.Error("error saving patched document in Algolia", ...)
    http.Error(w, "Error patching document", http.StatusInternalServerError)
    return
}
err = res.Wait()
if err != nil {
    l.Error("error saving patched document in Algolia", ...)
    http.Error(w, "Error patching document", http.StatusInternalServerError)
    return
}

// NEW:
docObj, err := doc.ToAlgoliaObject(true)
if err != nil {
    srv.Logger.Error("error converting document to object", ...)
    http.Error(w, "Error patching document", http.StatusInternalServerError)
    return
}
// Convert map to search.Document
searchDoc := mapToSearchDocument(docObj)
err = srv.SearchProvider.DocumentIndex().Index(ctx, searchDoc)
if err != nil {
    srv.Logger.Error("error indexing patched document", 
        "error", err, "method", r.Method, "path", r.URL.Path, "doc_id", docID)
    http.Error(w, "Error patching document", http.StatusInternalServerError)
    return
}
```

**Line 769-790**: Get document for comparison (in PATCH handler - duplicate of GET)
```go
// Same replacement as Line 250-273
```

### 6. Helper Functions to Add (at end of file)

```go
// searchDocumentToMap converts search.Document to map for backward compatibility
// with document.NewFromAlgoliaObject which expects a map.
func searchDocumentToMap(doc *search.Document) map[string]any {
    m := map[string]any{
        "objectID":     doc.ObjectID,
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
    }
    if doc.CustomFields != nil {
        m["customFields"] = doc.CustomFields
    }
    return m
}

// mapToSearchDocument converts map[string]any to search.Document for indexing.
// This handles the conversion from the document.ToAlgoliaObject format.
func mapToSearchDocument(m map[string]any) *search.Document {
    doc := &search.Document{}
    
    if v, ok := m["objectID"].(string); ok {
        doc.ObjectID = v
    }
    if v, ok := m["title"].(string); ok {
        doc.Title = v
    }
    if v, ok := m["docNumber"].(string); ok {
        doc.DocNumber = v
    }
    if v, ok := m["docType"].(string); ok {
        doc.DocType = v
    }
    if v, ok := m["product"].(string); ok {
        doc.Product = v
    }
    if v, ok := m["status"].(string); ok {
        doc.Status = v
    }
    if v, ok := m["summary"].(string); ok {
        doc.Summary = v
    }
    if v, ok := m["content"].(string); ok {
        doc.Content = v
    }
    
    // Handle arrays
    if v, ok := m["owners"].([]string); ok {
        doc.Owners = v
    }
    if v, ok := m["contributors"].([]string); ok {
        doc.Contributors = v
    }
    if v, ok := m["approvers"].([]string); ok {
        doc.Approvers = v
    }
    
    // Handle timestamps
    if v, ok := m["createdTime"].(int64); ok {
        doc.CreatedTime = v
    }
    if v, ok := m["modifiedTime"].(int64); ok {
        doc.ModifiedTime = v
    }
    
    // Handle custom fields
    if v, ok := m["customFields"].(map[string]interface{}); ok {
        doc.CustomFields = v
    }
    
    return doc
}
```

---

## 📊 Change Statistics

| Type | Count | Lines Affected |
|------|-------|----------------|
| Logger replacements | ~50 | Throughout |
| Config replacements | ~20 | Throughout |
| Database replacements | ~30 | Throughout |
| Workspace calls | 4 | 127, 360, ~620, ~660 |
| Algolia/Search calls | 3 groups | 69-88, 250-273, 513-540, 769-790 |
| Helper functions | 2 | End of file |
| **Total lines changed** | ~150+ | Out of ~960 total |

---

## ⚠️ Complexity Assessment

**This is a LARGE refactoring** because:
1. Handler is 780 lines long (should be split into smaller functions)
2. Mix of GET and PATCH logic in one function
3. Data comparison logic duplicated
4. Email sending logic embedded
5. Database sync logic embedded

### 💡 Recommendation

**Option A**: Implement V1.5 with systematic find-and-replace (2-3 hours)
- Use editor's find-and-replace for bulk changes
- Manually fix the 3-4 Algolia call sites
- Add helper functions
- Test thoroughly

**Option B**: Simplify by creating focused test cases first (1 hour)
- Create minimal V1.5 handler that only handles GET
- Skip PATCH complexity for now
- Get 1-2 tests passing
- Iterate on remaining functionality

**Option C**: Use V2 API pattern as template (3-4 hours)
- Check if V2 documents handler exists
- Copy that cleaner implementation
- Adapt for V1.5 routes

---

## 🎯 Next Steps

1. **Decision**: Choose approach (A, B, or C above)
2. **If Option A**: Would you like me to create the full refactored file?
3. **If Option B**: Should we start with a minimal GET-only handler?
4. **If Option C**: Should we check what V2 documents.go looks like?

Which approach would you prefer?
