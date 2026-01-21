# Storage Package

The storage package provides a storage abstraction layer for Hermes, allowing the application to work with different document storage backends through a unified interface.

## Overview

The storage abstraction separates document storage concerns from business logic, enabling:

- **Multiple Backend Support**: Use Google Workspace, local filesystem, S3, etc.
- **Testability**: Easy mocking for unit tests
- **Flexibility**: Switch storage backends without changing application code
- **Development Ease**: Use filesystem adapter locally without Google credentials

## Architecture

```
┌─────────────────────────────────┐
│     Application Layer           │
│  (API Handlers, Indexer, etc.)  │
└────────────┬────────────────────┘
             │ Uses
             ▼
┌─────────────────────────────────┐
│  Storage Abstraction Interface  │
│  • DocumentStorage              │
│  • PeopleService                │
│  • NotificationService          │
│  • AuthService                  │
└────────────┬────────────────────┘
             │ Implemented by
        ┌────┴────┬─────────┐
        ▼         ▼         ▼
   ┌────────┐ ┌──────┐ ┌──────┐
   │ Google │ │ File │ │  S3  │
   │Workspace│ │System│ │(TBD) │
   │ Adapter│ │Adapter│ │      │
   └────────┘ └──────┘ └──────┘
```

## Interfaces

### StorageProvider

The main interface that provides access to all storage services:

```go
type StorageProvider interface {
    DocumentStorage() DocumentStorage
    PeopleService() PeopleService
    NotificationService() NotificationService
    AuthService() AuthService
}
```

### DocumentStorage

Handles all document-related operations:

```go
type DocumentStorage interface {
    // CRUD operations
    GetDocument(ctx context.Context, id string) (*Document, error)
    CreateDocument(ctx context.Context, doc *DocumentCreate) (*Document, error)
    UpdateDocument(ctx context.Context, id string, updates *DocumentUpdate) (*Document, error)
    DeleteDocument(ctx context.Context, id string) error
    
    // Listing and search
    ListDocuments(ctx context.Context, folderID string, opts *ListOptions) ([]*Document, error)
    
    // Content operations
    GetDocumentContent(ctx context.Context, id string) (string, error)
    UpdateDocumentContent(ctx context.Context, id string, content string) error
    ReplaceTextInDocument(ctx context.Context, id string, replacements map[string]string) error
    
    // File operations
    CopyDocument(ctx context.Context, sourceID, destFolderID, name string) (*Document, error)
    MoveDocument(ctx context.Context, docID, destFolderID string) error
    
    // Folder operations
    CreateFolder(ctx context.Context, name, parentID string) (*Folder, error)
    GetFolder(ctx context.Context, id string) (*Folder, error)
    ListFolders(ctx context.Context, parentID string) ([]*Folder, error)
    GetSubfolder(ctx context.Context, parentID, name string) (*Folder, error)
    
    // Revisions
    ListRevisions(ctx context.Context, docID string) ([]*Revision, error)
    GetRevision(ctx context.Context, docID, revisionID string) (*Revision, error)
    GetLatestRevision(ctx context.Context, docID string) (*Revision, error)
}
```

## Adapters

### Filesystem Adapter

The filesystem adapter stores documents as Markdown files on the local filesystem.

#### Directory Structure

```
{basePath}/
├── docs/              # Published documents
│   ├── abc123.md
│   └── def456.md
├── drafts/            # Draft documents
│   └── xyz789.md
├── folders/           # Folder metadata
│   ├── folder1.json
│   └── folder2.json
├── metadata/          # Document metadata
│   ├── abc123.meta.json
│   ├── def456.meta.json
│   └── xyz789.meta.json
├── users.json         # User directory
└── tokens.json        # Authentication tokens
```

#### Usage

```go
import (
    "github.com/hashicorp-forge/hermes/pkg/storage/adapters/filesystem"
)

// Create adapter
adapter, err := filesystem.NewAdapter(&filesystem.Config{
    BasePath:   "/var/hermes/storage",
    DocsPath:   "/var/hermes/storage/docs",
    DraftsPath: "/var/hermes/storage/drafts",
})
if err != nil {
    log.Fatal(err)
}

// Use document storage
docStorage := adapter.DocumentStorage()

// Create a document
doc, err := docStorage.CreateDocument(ctx, &storage.DocumentCreate{
    Name:           "My RFC",
    ParentFolderID: "docs",
    Content:        "# RFC-001\n\nThis is my RFC content...",
    Owner:          "user@example.com",
})

// Retrieve a document
doc, err := docStorage.GetDocument(ctx, "abc123")

// List documents in a folder
docs, err := docStorage.ListDocuments(ctx, "docs", &storage.ListOptions{
    PageSize: 100,
})

// Update document content
err := docStorage.UpdateDocumentContent(ctx, "abc123", "Updated content")

// Replace template placeholders
err := docStorage.ReplaceTextInDocument(ctx, "abc123", map[string]string{
    "product": "Terraform",
    "version": "1.5.0",
})
```

### Google Workspace Adapter

The Google Workspace adapter wraps the existing `pkg/googleworkspace` service (to be implemented in Phase 1).

```go
import (
    gwadapter "github.com/hashicorp-forge/hermes/pkg/storage/adapters/googleworkspace"
    gw "github.com/hashicorp-forge/hermes/pkg/googleworkspace"
)

// Initialize Google Workspace service (existing code)
gwService := gw.NewFromConfig(cfg.GoogleWorkspace.Auth)

// Wrap in adapter
adapter := gwadapter.NewAdapter(gwService, &gwadapter.Config{
    DocsFolder:            cfg.GoogleWorkspace.DocsFolder,
    DraftsFolder:          cfg.GoogleWorkspace.DraftsFolder,
    ShortcutsFolder:       cfg.GoogleWorkspace.ShortcutsFolder,
    TemporaryDraftsFolder: cfg.GoogleWorkspace.TemporaryDraftsFolder,
})

// Use exactly like filesystem adapter
docStorage := adapter.DocumentStorage()
doc, err := docStorage.GetDocument(ctx, googleDocID)
```

## Configuration

### config.hcl

```hcl
# Storage configuration
storage {
  # Provider: "googleworkspace" or "filesystem"
  provider = "filesystem"
  
  # Filesystem configuration (when provider = "filesystem")
  filesystem {
    base_path   = "/var/hermes/storage"
    docs_path   = "/var/hermes/storage/docs"
    drafts_path = "/var/hermes/storage/drafts"
  }
  
  # Google Workspace configuration (when provider = "googleworkspace")
  googleworkspace {
    docs_folder             = "my-docs-folder-id"
    drafts_folder           = "my-drafts-folder-id"
    shortcuts_folder        = "my-shortcuts-folder-id"
    temporary_drafts_folder = "my-temp-drafts-folder-id"
  }
}

# Google Workspace auth (used when provider = "googleworkspace")
google_workspace {
  domain = "example.com"
  
  auth {
    client_email        = "service-account@project.iam.gserviceaccount.com"
    private_key         = "-----BEGIN PRIVATE KEY-----\n..."
    subject             = "admin@example.com"
    create_docs_as_user = true
  }
}
```

## Using in API Handlers

### Before (coupled to Google Workspace)

```go
func DocumentHandler(
    cfg *config.Config,
    l hclog.Logger,
    s *gw.Service,  // Direct dependency on Google Workspace
    db *gorm.DB) http.Handler {
    
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Direct use of Google Workspace APIs
        driveFile, err := s.Drive.Files.Get(docID).Do()
        googleDoc, err := s.Docs.Documents.Get(docID).Do()
        // ...
    })
}
```

### After (abstracted)

```go
func DocumentHandler(srv server.Server) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Use storage abstraction
        docStorage := srv.StorageProvider.DocumentStorage()
        doc, err := docStorage.GetDocument(r.Context(), docID)
        // Works with any adapter!
    })
}
```

## Error Handling

The storage package defines standard errors:

```go
import "github.com/hashicorp-forge/hermes/pkg/storage"

doc, err := docStorage.GetDocument(ctx, id)
if err != nil {
    if errors.Is(err, storage.ErrNotFound) {
        http.Error(w, "Document not found", http.StatusNotFound)
        return
    }
    if errors.Is(err, storage.ErrPermissionDenied) {
        http.Error(w, "Forbidden", http.StatusForbidden)
        return
    }
    // Other errors
    http.Error(w, "Internal error", http.StatusInternalServerError)
    return
}
```

## Testing

### Mock Adapter for Tests

```go
import "github.com/hashicorp-forge/hermes/pkg/storage/adapters/mock"

func TestDocumentHandler(t *testing.T) {
    // Create mock adapter with test data
    mockAdapter := mock.NewMockAdapter()
    mockAdapter.AddDocument(&storage.Document{
        ID:      "test-123",
        Name:    "Test Doc",
        Content: "Test content",
    })
    
    // Create test server with mock adapter
    srv := server.Server{
        StorageProvider: mockAdapter,
        // ... other fields
    }
    
    // Test handler
    handler := DocumentHandler(srv)
    req := httptest.NewRequest("GET", "/api/v2/documents/test-123", nil)
    rec := httptest.NewRecorder()
    handler.ServeHTTP(rec, req)
    
    assert.Equal(t, http.StatusOK, rec.Code)
}
```

## Migration Guide

### Phase 1: No Changes to Existing Code

1. Add storage package with interfaces
2. Keep using existing `pkg/googleworkspace` directly
3. No breaking changes

### Phase 2: Introduce Adapter

1. Create Google Workspace adapter that wraps existing service
2. Update `server.Server` to include `StorageProvider`
3. Maintain backward compatibility with `GWService` field

### Phase 3: Migrate Handlers

1. Update handlers one by one to use `StorageProvider`
2. Test each handler with both adapters
3. Remove direct `gw.Service` dependencies gradually

### Phase 4: Enable Filesystem Option

1. Document filesystem adapter usage
2. Provide example configurations
3. Support local development without Google credentials

## Feature Comparison

| Feature | Google Workspace | Filesystem | Notes |
|---------|------------------|------------|-------|
| Document CRUD | ✅ | ✅ | Full support |
| Content storage | ✅ Rich text | ✅ Markdown | Format differs |
| Folders | ✅ | ✅ | Full support |
| Revisions | ✅ Full history | ⚠️ Latest only | FS: could add git backend |
| Search | ✅ Drive search | ❌ | Use Algolia for both |
| Permissions | ✅ Fine-grained | ⚠️ Basic | FS: file permissions |
| Real-time collab | ✅ | ❌ | GW-specific |
| People directory | ✅ Workspace | ✅ JSON file | Different sources |
| Email | ✅ Gmail API | ✅ SMTP | Different backends |
| Authentication | ✅ OAuth | ✅ Token files | Different methods |

## Best Practices

### 1. Always Use Context

```go
// Good
doc, err := docStorage.GetDocument(ctx, id)

// Bad
doc, err := docStorage.GetDocument(context.Background(), id)
```

### 2. Handle All Error Types

```go
doc, err := docStorage.GetDocument(ctx, id)
if err != nil {
    switch {
    case errors.Is(err, storage.ErrNotFound):
        // Handle not found
    case errors.Is(err, storage.ErrPermissionDenied):
        // Handle permission denied
    case errors.Is(err, storage.ErrNotImplemented):
        // Handle not implemented (optional feature)
    default:
        // Handle other errors
    }
}
```

### 3. Check Feature Support

```go
// Some features may not be available in all adapters
revisions, err := docStorage.ListRevisions(ctx, docID)
if errors.Is(err, storage.ErrNotImplemented) {
    // Revisions not supported, use alternative approach
    revision, _ := docStorage.GetLatestRevision(ctx, docID)
}
```

### 4. Prefer Storage Types Over Adapter-Specific Types

```go
// Good - uses storage.Document
doc, err := docStorage.GetDocument(ctx, id)

// Bad - coupled to Google Drive types
driveFile, err := gwService.Drive.Files.Get(id).Do()
```

## Future Enhancements

- **S3 Adapter**: Store documents in S3 buckets
- **Azure Blob Adapter**: Azure storage support
- **Git Backend**: Version control for filesystem adapter
- **Caching Layer**: Cache frequently accessed documents
- **Hybrid Mode**: Mix adapters (e.g., GW for storage, LDAP for people)
- **Migration Tools**: Move documents between storage backends

## See Also

- [Storage Abstraction Proposal](./STORAGE_ABSTRACTION_PROPOSAL.md) - Full architecture proposal
- [Sequence Diagrams](./STORAGE_SEQUENCE_DIAGRAMS.md) - Detailed operation flows
- [GitHub Copilot Instructions](../.github/copilot-instructions.md) - Project overview
