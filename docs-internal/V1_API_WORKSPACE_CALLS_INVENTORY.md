# V1 API Google Workspace Direct Calls Inventory

**Created**: October 5, 2025  
**Purpose**: Comprehensive mapping of all direct Google Workspace Service calls in V1 API handlers  
**Goal**: Replace with `workspace.Provider` abstraction for better testability

---

## 📊 Summary

### Files Requiring Refactoring
| File | Handler Functions | Direct GW Calls | Algolia Calls | Priority |
|------|------------------|----------------|---------------|----------|
| `documents.go` | DocumentHandler | 2 | 3 | 🔴 High |
| `drafts.go` | DraftsHandler, DraftHandler, removeSharing | 8 | 5 | 🔴 High |
| `reviews.go` | ReviewsHandler, createShortcutForReviewedDoc, removeShortcutForReviewedDoc | 11 | 3 | 🟡 Medium |
| `approvals.go` | ApprovalsHandler | 2 | 4 | 🟡 Medium |
| `me.go` | MeHandler | TBD | TBD | 🟢 Low |
| `people.go` | PeopleHandler | TBD | TBD | 🟢 Low |
| `me_subscriptions.go` | Multiple | TBD | TBD | 🟢 Low |
| `drafts_shareable.go` | Multiple | TBD | TBD | 🟢 Low |
| `documents_related_resources.go` | documentsResourceRelatedResourcesHandler | 0 | 1 | 🟢 Low |

**Total Estimated**: 25+ direct workspace calls + 16+ Algolia calls across V1 API

---

## 🔍 Detailed Call Inventory

### 1. `internal/api/documents.go` - DocumentHandler

**Function Signature** (Current):
```go
func DocumentHandler(
    cfg *config.Config,
    l hclog.Logger,
    ar *algolia.Client,      // ❌ Direct Algolia - needs removal
    aw *algolia.Client,      // ❌ Direct Algolia - needs removal
    s *gw.Service,           // ❌ Direct Google Workspace - needs removal
    db *gorm.DB) http.Handler
```

#### Direct Workspace Calls:
1. **Line 127**: `file, err := s.GetFile(docID)`
   - **Purpose**: Get file metadata for modified time
   - **Replacement**: `file, err := srv.WorkspaceProvider.GetFile(docID)`
   
2. **Line 360**: `provider := gw.NewAdapter(s)`
   - **Purpose**: Create adapter for IsLocked check
   - **Replacement**: Use `srv.WorkspaceProvider` directly (already an adapter!)

#### Algolia Calls to Replace:
1. **Line 69**: `err = ar.Docs.GetObject(docID, &algoObj)`
   - **Replacement**: `searchDoc, err := srv.SearchProvider.DocumentIndex().GetObject(ctx, docID)`
   
2. **Line 250**: `err = ar.Docs.GetObject(docID, &algoDoc)` (data comparison)
   - **Replacement**: Same as above
   
3. **Line 513**: `res, err := aw.Docs.SaveObject(docObj)`
   - **Replacement**: `err = srv.SearchProvider.DocumentIndex().Index(ctx, searchDoc)`

---

### 2. `internal/api/drafts.go` - DraftsHandler & DraftHandler

**Function Signatures** (Current):
```go
func DraftsHandler(
    cfg *config.Config,
    l hclog.Logger,
    ar *algolia.Client,      // ❌ Remove
    aw *algolia.Client,      // ❌ Remove
    s *gw.Service,           // ❌ Remove
    db *gorm.DB) http.Handler

func DraftHandler(
    cfg *config.Config,
    l hclog.Logger,
    ar *algolia.Client,      // ❌ Remove
    aw *algolia.Client,      // ❌ Remove
    s *gw.Service,           // ❌ Remove
    db *gorm.DB) http.Handler
```

#### Direct Workspace Calls:
1. **Line 187**: `_, err = s.MoveFile(f.Id, cfg.GoogleWorkspace.DraftsFolder)`
   - **Purpose**: Move draft to drafts folder
   - **Replacement**: `_, err = srv.WorkspaceProvider.MoveFile(f.Id, srv.Config.GoogleWorkspace.DraftsFolder)`

2. **Line 206**: `f, err = s.CopyFile(template, title, cfg.GoogleWorkspace.DraftsFolder)`
   - **Purpose**: Copy template to create new draft
   - **Replacement**: `f, err = srv.WorkspaceProvider.CopyFile(template, title, srv.Config.GoogleWorkspace.DraftsFolder)`

3. **Line 295**: `provider := gw.NewAdapter(s)`
   - **Purpose**: Create adapter for ReplaceHeader
   - **Replacement**: Use `srv.WorkspaceProvider` directly

4. **Line 355**: `if err := s.ShareFile(f.Id, userEmail, "writer"); err != nil`
   - **Purpose**: Share file with owner
   - **Replacement**: `if err := srv.WorkspaceProvider.ShareFile(f.Id, userEmail, "writer"); err != nil`

5. **Line 368**: `if err := s.ShareFile(f.Id, c, "writer"); err != nil`
   - **Purpose**: Share file with contributors
   - **Replacement**: `if err := srv.WorkspaceProvider.ShareFile(f.Id, c, "writer"); err != nil`

6. **Line 647**: `file, err := s.GetFile(docId)`
   - **Purpose**: Get file metadata for modified time
   - **Replacement**: `file, err := srv.WorkspaceProvider.GetFile(docId)`

7. **Line 1430-1440**: `removeSharing(s *gw.Service, docId, email string)`
   - **Calls**:
     - `permissions, err := s.ListPermissions(docId)`
     - `return s.DeletePermission(docId, p.Id)`
   - **Replacement**: Change signature to use `workspace.Provider`

#### Algolia Calls to Replace:
1. **Line 401**: `err = ar.Drafts.GetObject(f.Id, &algoDoc)`
2. **Line 561**: `err = ar.Drafts.GetObject(docId, &algoObj)`
3. **Line 727**: `err = ar.Drafts.GetObject(docId, &algoDoc)`
4. **Line 283**: `res, err := aw.Drafts.SaveObject(docObj)` (approximately)
5. **Line ~900**: `delRes, err := aw.Drafts.DeleteObject(docId)` (DELETE handler)

---

### 3. `internal/api/reviews.go` - ReviewsHandler

**Function Signature** (Current):
```go
func ReviewsHandler(
    cfg *config.Config,
    l hclog.Logger,
    ar *algolia.Client,      // ❌ Remove
    aw *algolia.Client,      // ❌ Remove
    s *gw.Service,           // ❌ Remove
    db *gorm.DB,
    email email.EmailService) http.Handler
```

#### Direct Workspace Calls:
1. **Line 175**: `file, err := s.GetFile(docID)`
   - **Purpose**: Get file for review
   - **Replacement**: `file, err := srv.WorkspaceProvider.GetFile(docID)`

2. **Line 202**: `latestRev, err := s.GetLatestRevision(docID)`
   - **Purpose**: Get revision for review
   - **Replacement**: `latestRev, err := srv.WorkspaceProvider.GetLatestRevision(docID)`

3. **Line 330**: `if _, err := s.MoveFile(docID, cfg.GoogleWorkspace.PublishedDocsFolder); err != nil`
   - **Purpose**: Move reviewed doc to published folder
   - **Replacement**: `if _, err := srv.WorkspaceProvider.MoveFile(docID, srv.Config.GoogleWorkspace.PublishedDocsFolder); err != nil`

4. **Line 645**: `docTypeFolder, err := s.GetSubfolder(cfg.GoogleWorkspace.ShortcutsFolder, doc.DocType)`
   - **Purpose**: Get/create folder hierarchy for shortcuts
   - **Replacement**: `docTypeFolder, err := srv.WorkspaceProvider.GetSubfolder(srv.Config.GoogleWorkspace.ShortcutsFolder, doc.DocType)`

5. **Line 653**: `docTypeFolder, err = s.CreateFolder(doc.DocType, cfg.GoogleWorkspace.ShortcutsFolder)`
   - **Replacement**: `docTypeFolder, err = srv.WorkspaceProvider.CreateFolder(doc.DocType, srv.Config.GoogleWorkspace.ShortcutsFolder)`

6. **Line 661**: `productFolder, err := s.GetSubfolder(docTypeFolder.Id, doc.Product)`
   - **Replacement**: `productFolder, err := srv.WorkspaceProvider.GetSubfolder(docTypeFolder.Id, doc.Product)`

7. **Line 668**: `productFolder, err = s.CreateFolder(doc.Product, docTypeFolder.Id)`
   - **Replacement**: `productFolder, err = srv.WorkspaceProvider.CreateFolder(doc.Product, docTypeFolder.Id)`

8. **Line 676**: `if shortcut, err = s.CreateShortcut(doc.Title, doc.ObjectID, productFolder.Id); err != nil`
   - **Replacement**: `if shortcut, err = srv.WorkspaceProvider.CreateShortcut(doc.Title, doc.ObjectID, productFolder.Id); err != nil`

9. **Line 727**: `if err := s.DeleteFile(shortcut.Id); err != nil`
   - **Replacement**: `if err := srv.WorkspaceProvider.DeleteFile(shortcut.Id); err != nil`

10. **Line 734**: `if _, err := s.MoveFile(doc.ObjectID, cfg.GoogleWorkspace.DraftsFolder); err != nil`
    - **Replacement**: `if _, err := srv.WorkspaceProvider.MoveFile(doc.ObjectID, srv.Config.GoogleWorkspace.DraftsFolder); err != nil`

#### Algolia Calls to Replace:
1. **Line 72**: `err = ar.Drafts.GetObject(docID, &algoObj)`
2. **Line 292**: `delRes, err := aw.Drafts.DeleteObject(docID)`
3. **Line 581**: `err = ar.Docs.GetObject(docID, &algoDoc)`
4. **Line 780**: `delRes, err := a.Docs.DeleteObject(doc.ObjectID)`

---

### 4. `internal/api/approvals.go` - ApprovalsHandler

**Function Signature** (Current):
```go
func ApprovalsHandler(
    cfg *config.Config,
    l hclog.Logger,
    ar *algolia.Client,      // ❌ Remove
    aw *algolia.Client,      // ❌ Remove
    s *gw.Service,           // ❌ Remove
    db *gorm.DB) http.Handler
```

#### Direct Workspace Calls:
1. **Line 134**: `latestRev, err := s.GetLatestRevision(docID)`
   - **Purpose**: Get revision for approval
   - **Replacement**: `latestRev, err := srv.WorkspaceProvider.GetLatestRevision(docID)`

2. **Line 395**: `latestRev, err := s.GetLatestRevision(docID)`
   - **Purpose**: Get revision for approval rejection
   - **Replacement**: Same as above

#### Algolia Calls to Replace:
1. **Line 65**: `err = ar.Docs.GetObject(docID, &algoObj)`
2. **Line 241**: `err = ar.Docs.GetObject(docID, &algoDoc)`
3. **Line 324**: `err = ar.Docs.GetObject(docID, &algoObj)`
4. **Line 503**: `err = ar.Docs.GetObject(docID, &algoDoc)`

---

### 5. Other Files (Lower Priority)

#### `internal/api/me.go`
- **Line 29**: Function signature takes `s *gw.Service`
- Likely uses workspace service for user-specific operations

#### `internal/api/people.go`
- **Line 26**: Function signature takes `s *gw.Service`
- Likely uses for people/permissions lookups

#### `internal/api/me_subscriptions.go`
- **Line 22**: Function signature takes `s *gw.Service`
- Subscription management may use workspace

#### `internal/api/drafts_shareable.go`
- **Line 33**: Function signature takes `goog *gw.Service`
- Shareable link generation uses workspace

#### `internal/api/documents_related_resources.go`
- **Line 126**: `err = algoRead.Docs.GetObject(hdrr.Document.GoogleFileID, &algoObj)`
- Only Algolia call, no direct workspace service usage

---

## 🔄 Refactoring Pattern

### Current Pattern (V1)
```go
// Function signature
func Handler(
    cfg *config.Config,
    l hclog.Logger,
    ar *algolia.Client,
    aw *algolia.Client,
    s *gw.Service,
    db *gorm.DB) http.Handler {
    
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Direct calls
        file, err := s.GetFile(docID)
        err = ar.Docs.GetObject(docID, &algoObj)
        provider := gw.NewAdapter(s)
    })
}
```

### Target Pattern (V1.5 or Refactored V1)
```go
// Function signature
func Handler(srv server.Server) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ctx := r.Context()
        
        // Workspace Provider calls
        file, err := srv.WorkspaceProvider.GetFile(docID)
        
        // Search Provider calls
        searchDoc, err := srv.SearchProvider.DocumentIndex().GetObject(ctx, docID)
        
        // No need to create adapter - srv.WorkspaceProvider IS the adapter!
        locked, err := hcd.IsLocked(docID, srv.DB, srv.WorkspaceProvider, srv.Logger)
    })
}
```

---

## 📋 Refactoring Checklist by Handler

### DocumentHandler ✅ Priority 1
- [ ] Change function signature to accept `server.Server`
- [ ] Replace `s.GetFile()` → `srv.WorkspaceProvider.GetFile()`
- [ ] Remove `gw.NewAdapter(s)` → use `srv.WorkspaceProvider` directly
- [ ] Replace 3 Algolia calls with SearchProvider
- [ ] Update router registration
- [ ] Enable and test `TestDocuments_*` tests (4 tests)

### DraftsHandler ✅ Priority 1
- [ ] Change function signature to accept `server.Server`
- [ ] Replace `s.MoveFile()` → `srv.WorkspaceProvider.MoveFile()`
- [ ] Replace `s.CopyFile()` → `srv.WorkspaceProvider.CopyFile()`
- [ ] Replace `s.ShareFile()` (2 calls) → `srv.WorkspaceProvider.ShareFile()`
- [ ] Replace `s.GetFile()` → `srv.WorkspaceProvider.GetFile()`
- [ ] Remove `gw.NewAdapter(s)` → use `srv.WorkspaceProvider` directly
- [ ] Refactor `removeSharing()` helper to use `workspace.Provider`
- [ ] Replace 5 Algolia calls with SearchProvider
- [ ] Update router registration
- [ ] Enable and test `TestAPI_DraftsHandler` test

### ReviewsHandler 🟡 Priority 2
- [ ] Change function signature to accept `server.Server`
- [ ] Replace 11 workspace calls (GetFile, GetLatestRevision, MoveFile, GetSubfolder, CreateFolder, CreateShortcut, DeleteFile)
- [ ] Replace 4 Algolia calls with SearchProvider
- [ ] Update `createShortcutForReviewedDoc()` helper signature
- [ ] Update `removeShortcutForReviewedDoc()` helper signature
- [ ] Update router registration
- [ ] Enable and test `TestAPI_ReviewsHandler` test

### ApprovalsHandler 🟡 Priority 2
- [ ] Change function signature to accept `server.Server`
- [ ] Replace 2 `s.GetLatestRevision()` calls → `srv.WorkspaceProvider.GetLatestRevision()`
- [ ] Replace 4 Algolia calls with SearchProvider
- [ ] Update router registration
- [ ] Enable and test `TestAPI_ApprovalsHandler` test

### MeHandler 🟢 Priority 3
- [ ] Investigate workspace usage
- [ ] Change function signature if needed
- [ ] Replace workspace calls
- [ ] Enable and test `TestAPI_MeHandler` test

### Other Handlers 🟢 Priority 4
- [ ] PeopleHandler
- [ ] Me_SubscriptionsHandler
- [ ] DraftsShareableHandler
- [ ] DocumentsRelatedResourcesHandler (only Algolia call)

---

## 🎯 Success Metrics

### Phase 1 (High Priority - Documents & Drafts)
- [ ] DocumentHandler using `server.Server` signature
- [ ] DraftsHandler using `server.Server` signature  
- [ ] DraftHandler using `server.Server` signature
- [ ] All workspace calls use `srv.WorkspaceProvider`
- [ ] All search calls use `srv.SearchProvider`
- [ ] 5 tests enabled and passing (4 Documents + 1 Drafts)

### Phase 2 (Medium Priority - Reviews & Approvals)
- [ ] ReviewsHandler using `server.Server` signature
- [ ] ApprovalsHandler using `server.Server` signature
- [ ] Helper functions refactored
- [ ] 2 tests enabled and passing

### Phase 3 (Low Priority - Remaining)
- [ ] MeHandler refactored
- [ ] Remaining handlers refactored
- [ ] All 9 skipped tests enabled
- [ ] 59/59 tests passing (100%)

---

## 🚀 Implementation Strategy

### Recommended: V1.5 Parallel API

Create new handlers in `internal/api/v1_5/` directory:
1. Copy handler logic from V1
2. Change signatures to use `server.Server`
3. Replace all workspace calls
4. Replace all Algolia calls
5. Mount at `/api/v1.5/` routes
6. Test independently from V1

**Benefits**:
- Zero risk to production V1 API
- Side-by-side comparison
- Easy rollback
- Gradual client migration

### Alternative: Direct V1 Refactoring

Modify handlers in place:
1. Create comprehensive test coverage first
2. Backup all files
3. Systematic find-and-replace
4. Fix compilation errors
5. Verify all tests pass

**Risks**:
- Could break existing V1 API
- Harder to roll back
- Must fix all errors before testing

---

## 📚 Reference Documentation

- **This Document**: Complete inventory of workspace calls
- **REFACTORING_V1_ALGOLIA_HANDLERS.md**: Strategy and patterns
- **API_INTEGRATION_TEST_STATUS.md**: Test status and goals
- **workspace.Provider Interface**: `pkg/workspace/provider.go`
- **search.Provider Interface**: `pkg/search/provider.go`
- **V2 Handler Examples**: `internal/api/v2/*.go`

---

## 💡 Key Insights

1. **~25 direct workspace calls** across V1 API handlers
2. **~16 Algolia calls** need search provider abstraction
3. **No need to create adapters** - `srv.WorkspaceProvider` already is one!
4. **Pattern is consistent** - mostly GetFile, ShareFile, MoveFile, CopyFile
5. **ReviewsHandler is most complex** - 11 workspace operations for folder/shortcut management
6. **DraftsHandler has most sharing logic** - multiple ShareFile calls for contributors

---

**Next Steps**: Choose implementation strategy (V1.5 recommended) and begin with DocumentHandler + DraftsHandler to unblock 5 tests immediately.
