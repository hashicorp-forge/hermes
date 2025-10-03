# Storage Abstraction Layer Proposal

## Executive Summary

This document proposes a **storage abstraction layer** to decouple Hermes from Google Workspace, enabling support for local document storage (filesystem, S3, etc.) while maintaining backward compatibility. The abstraction will treat Google Workspace as one **adapter implementation** alongside new storage backends.

## Current Architecture Analysis

### Current Dependencies on Google Workspace

The codebase has **tight coupling** to Google Workspace across multiple layers:

#### 1. **Service Layer** (`pkg/googleworkspace/`)
```go
type Service struct {
    AdminDirectory *directory.Service
    Docs           *docs.Service
    Drive          *drive.Service
    Gmail          *gmail.Service
    OAuth2         *oauth2api.Service
    People         *people.PeopleService
}
```

**Key Operations:**
- Document CRUD: `GetDoc()`, `ReplaceText()`, `CopyFile()`, `CreateFolder()`
- File management: `GetFile()`, `GetFiles()`, `GetDocs()`, `GetLatestRevision()`
- People/Auth: `SearchPeople()`, `GetUser()`, `SendEmail()`

#### 2. **Injection Points** (Where `*gw.Service` is used)

**API Handlers:**
- `internal/api/documents.go` - `DocumentHandler(... s *gw.Service ...)`
- `internal/api/drafts.go` - `DraftsHandler(... s *gw.Service ...)`
- `internal/api/reviews.go` - `ReviewHandler(... s *gw.Service ...)`
- `internal/api/me.go` - `MeHandler(... s *gw.Service)`
- `internal/api/v2/*` - Similar pattern

**Indexer:**
- `internal/indexer/indexer.go` - Field `GoogleWorkspaceService *gw.Service`
- Used for scanning folders, reading docs, updating headers

**Document Type Handlers:**
- `pkg/hashicorpdocs/locked.go` - Takes `goog *googleworkspace.Service`

**Server Initialization:**
- `internal/server/server.go` - `GWService *gw.Service`
- `internal/cmd/commands/server/server.go` - Creates service, passes to all handlers

#### 3. **Document Operations Currently Using Google APIs**

| Operation | Current Implementation | Files Affected |
|-----------|----------------------|----------------|
| **Create Draft** | `s.Drive.Files.Copy()` | `internal/api/drafts.go` |
| **Get Document Content** | `s.Docs.Documents.Get()` | Throughout |
| **Update Document** | `s.Docs.Documents.BatchUpdate()` | `pkg/googleworkspace/docs_helpers.go` |
| **List Documents** | `s.Drive.Files.List()` | `pkg/googleworkspace/drive_helpers.go` |
| **Search People** | `s.People.SearchDirectoryPeople()` | `pkg/googleworkspace/people_helpers.go` |
| **Send Email** | `s.Gmail.Users.Messages.Send()` | `pkg/googleworkspace/gmail_helpers.go` |
| **Get File Revisions** | `s.Drive.Revisions.List()` | `pkg/googleworkspace/drive_helpers.go` |
| **Create Shortcuts** | `s.Drive.Files.Create()` (shortcut) | `internal/api/v2/reviews.go` |

## Proposed Abstraction Layer

### Core Interfaces

```go
// pkg/storage/storage.go
package storage

import (
    "context"
    "io"
    "time"
)

// DocumentStorage defines the core interface for document operations
type DocumentStorage interface {
    // Document Operations
    GetDocument(ctx context.Context, id string) (*Document, error)
    CreateDocument(ctx context.Context, doc *DocumentCreate) (*Document, error)
    UpdateDocument(ctx context.Context, id string, updates *DocumentUpdate) (*Document, error)
    DeleteDocument(ctx context.Context, id string) error
    ListDocuments(ctx context.Context, folderID string, opts *ListOptions) ([]*Document, error)
    
    // Content Operations
    GetDocumentContent(ctx context.Context, id string) (string, error)
    UpdateDocumentContent(ctx context.Context, id string, content string) error
    ReplaceTextInDocument(ctx context.Context, id string, replacements map[string]string) error
    
    // File Operations
    CopyDocument(ctx context.Context, sourceID, destFolderID, name string) (*Document, error)
    MoveDocument(ctx context.Context, docID, destFolderID string) error
    
    // Folder Operations
    CreateFolder(ctx context.Context, name, parentID string) (*Folder, error)
    GetFolder(ctx context.Context, id string) (*Folder, error)
    ListFolders(ctx context.Context, parentID string) ([]*Folder, error)
    
    // Revision/Version Operations
    ListRevisions(ctx context.Context, docID string) ([]*Revision, error)
    GetRevision(ctx context.Context, docID, revisionID string) (*Revision, error)
}

// PeopleService defines user/people operations
type PeopleService interface {
    GetUser(ctx context.Context, email string) (*User, error)
    SearchUsers(ctx context.Context, query string, fields []string) ([]*User, error)
    GetUserPhoto(ctx context.Context, email string) (string, error)
}

// NotificationService defines email/notification operations
type NotificationService interface {
    SendEmail(ctx context.Context, to []string, from, subject, body string) error
    SendHTMLEmail(ctx context.Context, to []string, from, subject, htmlBody string) error
}

// AuthService defines authentication operations
type AuthService interface {
    ValidateToken(ctx context.Context, token string) (*AuthInfo, error)
    GetUserInfo(ctx context.Context, token string) (*UserInfo, error)
}

// StorageProvider combines all storage-related services
type StorageProvider interface {
    DocumentStorage() DocumentStorage
    PeopleService() PeopleService
    NotificationService() NotificationService
    AuthService() AuthService
}
```

### Data Models (Adapter-Agnostic)

```go
// pkg/storage/types.go
package storage

import "time"

// Document represents a storage-agnostic document
type Document struct {
    ID              string
    Name            string
    Content         string
    MimeType        string
    ParentFolderID  string
    CreatedTime     time.Time
    ModifiedTime    time.Time
    Owner           string
    Permissions     []Permission
    ThumbnailURL    string
    Metadata        map[string]any // Flexible metadata storage
}

type DocumentCreate struct {
    Name           string
    ParentFolderID string
    TemplateID     string // Optional: copy from template
    Content        string
    Metadata       map[string]any
}

type DocumentUpdate struct {
    Name     *string
    Content  *string
    Metadata map[string]any
}

type Folder struct {
    ID           string
    Name         string
    ParentID     string
    CreatedTime  time.Time
    ModifiedTime time.Time
}

type Revision struct {
    ID           string
    DocumentID   string
    ModifiedTime time.Time
    ModifiedBy   string
    Name         string // Custom revision name
}

type User struct {
    Email     string
    Name      string
    GivenName string
    PhotoURL  string
    Metadata  map[string]any
}

type Permission struct {
    Email string
    Role  string // owner, writer, reader
}

type ListOptions struct {
    MimeType     string
    ModifiedAfter *time.Time
    PageSize     int
    PageToken    string
}
```

### Adapter Implementations

#### 1. Google Workspace Adapter

```go
// pkg/storage/adapters/googleworkspace/adapter.go
package googleworkspace

import (
    "github.com/hashicorp-forge/hermes/pkg/storage"
    gw "github.com/hashicorp-forge/hermes/pkg/googleworkspace"
)

// Adapter wraps the existing Google Workspace service
type Adapter struct {
    gwService *gw.Service
    config    *Config
}

type Config struct {
    DocsFolder          string
    DraftsFolder        string
    ShortcutsFolder     string
    TemporaryDraftsFolder string
}

func NewAdapter(gwService *gw.Service, cfg *Config) *Adapter {
    return &Adapter{
        gwService: gwService,
        config:    cfg,
    }
}

// Implement StorageProvider interface
func (a *Adapter) DocumentStorage() storage.DocumentStorage {
    return &documentStorage{adapter: a}
}

func (a *Adapter) PeopleService() storage.PeopleService {
    return &peopleService{adapter: a}
}

func (a *Adapter) NotificationService() storage.NotificationService {
    return &notificationService{adapter: a}
}

func (a *Adapter) AuthService() storage.AuthService {
    return &authService{adapter: a}
}

// documentStorage implements storage.DocumentStorage
type documentStorage struct {
    adapter *Adapter
}

func (ds *documentStorage) GetDocument(ctx context.Context, id string) (*storage.Document, error) {
    // Translate Google Drive API call to storage.Document
    driveFile, err := ds.adapter.gwService.GetFile(id)
    if err != nil {
        return nil, err
    }
    
    // Get document content
    doc, err := ds.adapter.gwService.GetDoc(id)
    if err != nil {
        return nil, err
    }
    
    return translateGoogleDocToStorage(driveFile, doc), nil
}

// ... implement other DocumentStorage methods
```

#### 2. Local Filesystem Adapter

```go
// pkg/storage/adapters/filesystem/adapter.go
package filesystem

import (
    "github.com/hashicorp-forge/hermes/pkg/storage"
)

// Adapter provides local filesystem-based document storage
type Adapter struct {
    basePath      string
    docsPath      string
    draftsPath    string
    metadataStore MetadataStore // Could be JSON files, SQLite, etc.
}

type Config struct {
    BasePath   string
    DocsPath   string
    DraftsPath string
}

func NewAdapter(cfg *Config) (*Adapter, error) {
    return &Adapter{
        basePath:   cfg.BasePath,
        docsPath:   cfg.DocsPath,
        draftsPath: cfg.DraftsPath,
        metadataStore: NewJSONMetadataStore(cfg.BasePath),
    }, nil
}

// Document stored as:
// {basePath}/docs/{id}.md or .html
// {basePath}/docs/{id}.meta.json (metadata)

func (a *Adapter) DocumentStorage() storage.DocumentStorage {
    return &documentStorage{adapter: a}
}

// peopleService could use local user database or LDAP
func (a *Adapter) PeopleService() storage.PeopleService {
    return &localPeopleService{adapter: a}
}

// notificationService could use SMTP or other email service
func (a *Adapter) NotificationService() storage.NotificationService {
    return &smtpNotificationService{adapter: a}
}

type documentStorage struct {
    adapter *Adapter
}

func (ds *documentStorage) GetDocument(ctx context.Context, id string) (*storage.Document, error) {
    // Read from filesystem
    docPath := filepath.Join(ds.adapter.docsPath, id+".md")
    content, err := os.ReadFile(docPath)
    if err != nil {
        return nil, err
    }
    
    // Load metadata
    meta, err := ds.adapter.metadataStore.Get(id)
    if err != nil {
        return nil, err
    }
    
    return &storage.Document{
        ID:           id,
        Name:         meta.Name,
        Content:      string(content),
        MimeType:     "text/markdown",
        ModifiedTime: meta.ModifiedTime,
        // ...
    }, nil
}
```

#### 3. S3/Object Storage Adapter (Future)

```go
// pkg/storage/adapters/s3/adapter.go
package s3

// Documents stored in S3 buckets
// Metadata in S3 object metadata or separate metadata service
```

## Migration Strategy

### Phase 1: Introduce Interfaces (No Breaking Changes)

1. **Create** `pkg/storage/` package with interfaces
2. **Keep** existing `pkg/googleworkspace/` unchanged
3. **Create** Google Workspace adapter that wraps existing service
4. **No changes** to API handlers yet

**Files to Create:**
```
pkg/storage/
├── storage.go          # Core interfaces
├── types.go            # Data models
└── adapters/
    └── googleworkspace/
        ├── adapter.go       # Wrapper around gw.Service
        ├── document.go      # DocumentStorage implementation
        ├── people.go        # PeopleService implementation
        ├── notification.go  # NotificationService implementation
        └── auth.go          # AuthService implementation
```

### Phase 2: Update Server Initialization

```go
// internal/server/server.go
type Server struct {
    Config         *config.Config
    DB             *gorm.DB
    Logger         hclog.Logger
    
    // NEW: Storage abstraction
    StorageProvider storage.StorageProvider
    
    // DEPRECATED: Keep for backward compatibility
    GWService      *gw.Service // Will point to same backend as StorageProvider
    
    // Keep existing fields
    AlgoSearch     *algolia.Client
    AlgoWrite      *algolia.Client
    Jira           *jira.Service
}
```

```go
// internal/cmd/commands/server/server.go
func (c *Command) Run(args []string) int {
    // ... existing setup ...
    
    // Initialize Google Workspace service (existing)
    var goog *gw.Service
    if cfg.GoogleWorkspace.Auth != nil {
        goog = gw.NewFromConfig(cfg.GoogleWorkspace.Auth)
    } else {
        goog = gw.New()
    }
    
    // NEW: Create storage provider
    var storageProvider storage.StorageProvider
    switch cfg.Storage.Provider {
    case "googleworkspace", "": // default
        gwAdapter := googleworkspace.NewAdapter(goog, &googleworkspace.Config{
            DocsFolder:            cfg.GoogleWorkspace.DocsFolder,
            DraftsFolder:          cfg.GoogleWorkspace.DraftsFolder,
            ShortcutsFolder:       cfg.GoogleWorkspace.ShortcutsFolder,
            TemporaryDraftsFolder: cfg.GoogleWorkspace.TemporaryDraftsFolder,
        })
        storageProvider = gwAdapter
    case "filesystem":
        fsAdapter, err := filesystem.NewAdapter(&filesystem.Config{
            BasePath:   cfg.Storage.Filesystem.BasePath,
            DocsPath:   cfg.Storage.Filesystem.DocsPath,
            DraftsPath: cfg.Storage.Filesystem.DraftsPath,
        })
        if err != nil {
            c.UI.Error(fmt.Sprintf("error creating filesystem adapter: %v", err))
            return 1
        }
        storageProvider = fsAdapter
    default:
        c.UI.Error(fmt.Sprintf("unknown storage provider: %s", cfg.Storage.Provider))
        return 1
    }
    
    srv := server.Server{
        Config:          cfg,
        DB:              db,
        Logger:          logger,
        StorageProvider: storageProvider,
        GWService:       goog, // Backward compatibility
        // ...
    }
}
```

### Phase 3: Update API Handlers Incrementally

**Before:**
```go
func DocumentHandler(
    cfg *config.Config,
    l hclog.Logger,
    ar *algolia.Client,
    aw *algolia.Client,
    s *gw.Service,  // OLD
    db *gorm.DB) http.Handler {
    
    // Use s.Drive, s.Docs directly
}
```

**After:**
```go
func DocumentHandler(
    cfg *config.Config,
    l hclog.Logger,
    ar *algolia.Client,
    aw *algolia.Client,
    sp storage.StorageProvider,  // NEW
    db *gorm.DB) http.Handler {
    
    docStorage := sp.DocumentStorage()
    doc, err := docStorage.GetDocument(ctx, docID)
    // ...
}
```

### Phase 4: Update Indexer

```go
// internal/indexer/indexer.go
type Indexer struct {
    // ... existing fields ...
    
    // NEW
    StorageProvider storage.StorageProvider
    
    // DEPRECATED: Keep temporarily for compatibility
    GoogleWorkspaceService *gw.Service
}

func (idx *Indexer) IndexDocuments() error {
    docStorage := idx.StorageProvider.DocumentStorage()
    docs, err := docStorage.ListDocuments(ctx, idx.DocumentsFolderID, &storage.ListOptions{
        MimeType: "application/vnd.google-apps.document",
    })
    // ...
}
```

## Configuration Changes

### New Config Structure

```hcl
// config.hcl

// NEW: Storage configuration
storage {
  // provider can be: "googleworkspace", "filesystem", "s3"
  provider = "googleworkspace"
  
  // Google Workspace specific config (when provider = "googleworkspace")
  googleworkspace {
    docs_folder = "my-docs-folder-id"
    drafts_folder = "my-drafts-folder-id"
    shortcuts_folder = "my-shortcuts-folder-id"
    temporary_drafts_folder = "my-temp-folder-id"
  }
  
  // Filesystem specific config (when provider = "filesystem")
  filesystem {
    base_path = "/var/hermes/storage"
    docs_path = "/var/hermes/storage/docs"
    drafts_path = "/var/hermes/storage/drafts"
  }
  
  // S3 specific config (when provider = "s3")
  s3 {
    bucket = "hermes-documents"
    region = "us-east-1"
    // ...
  }
}

// Keep existing google_workspace config for auth
google_workspace {
  domain = "your-domain.com"
  
  auth {
    client_email = ""
    private_key = ""
    subject = ""
    // ...
  }
}
```

## Benefits of This Approach

### 1. **Backward Compatibility**
- Existing Google Workspace deployments continue working unchanged
- No breaking changes to API
- Gradual migration path

### 2. **Clean Separation of Concerns**
- Storage operations abstracted from business logic
- API handlers don't know about storage implementation
- Easy to swap storage backends

### 3. **Testability**
```go
// pkg/storage/mock/mock.go
type MockStorageProvider struct {
    Documents map[string]*storage.Document
    // ...
}

// In tests:
mockProvider := mock.NewMockStorageProvider()
mockProvider.Documents["doc-123"] = &storage.Document{...}
handler := DocumentHandler(..., mockProvider, ...)
```

### 4. **Multi-Backend Support**
- Use Google Workspace for production
- Use filesystem for development/testing
- Use S3 for specific deployments
- Mix backends (e.g., Google for docs, local for people directory)

### 5. **Performance Optimizations**
- Caching layer between interface and adapter
- Batch operations across multiple storage backends
- Local caching for remote storage

## Challenges & Considerations

### 1. **Feature Parity**
- Google Docs has rich formatting (not all storage supports this)
- **Solution**: Define minimum feature set, use metadata for rich features

### 2. **Real-time Collaboration**
- Google Docs provides real-time editing
- **Solution**: Filesystem/S3 won't support this initially, mark as provider-specific feature

### 3. **Search Integration**
- Currently relies on Google Drive search + Algolia
- **Solution**: Algolia remains primary search, storage provides listing/content

### 4. **Authentication**
- Google Workspace provides OAuth
- **Solution**: Separate auth concerns, use auth interface

### 5. **Permissions Model**
- Google Drive has sophisticated permissions
- **Solution**: Abstract common permission patterns, allow provider-specific extensions

## Implementation Checklist

- [ ] **Phase 1**: Create storage interfaces and types
- [ ] **Phase 1**: Implement Google Workspace adapter (wrapper)
- [ ] **Phase 1**: Add unit tests for adapter
- [ ] **Phase 2**: Update Server struct with StorageProvider
- [ ] **Phase 2**: Update server initialization logic
- [ ] **Phase 2**: Add storage config parsing
- [ ] **Phase 3**: Update API handlers one by one
  - [ ] `DocumentHandler`
  - [ ] `DraftsHandler`
  - [ ] `ReviewHandler`
  - [ ] `MeHandler`
  - [ ] Other v1 handlers
  - [ ] v2 handlers
- [ ] **Phase 4**: Update Indexer to use storage interface
- [ ] **Phase 4**: Update document type handlers (hashicorpdocs)
- [ ] **Phase 5**: Implement filesystem adapter
- [ ] **Phase 5**: Add integration tests with filesystem
- [ ] **Phase 6**: Create mock adapter for testing
- [ ] **Phase 6**: Update all tests to use mock
- [ ] **Phase 7**: Documentation updates
- [ ] **Phase 8**: Migration guide for users

## File Structure Summary

```
pkg/
├── storage/
│   ├── storage.go              # Core interfaces
│   ├── types.go                # Adapter-agnostic data models
│   ├── errors.go               # Common errors
│   ├── adapters/
│   │   ├── googleworkspace/
│   │   │   ├── adapter.go      # Main adapter
│   │   │   ├── document.go     # Document operations
│   │   │   ├── people.go       # People operations
│   │   │   ├── notification.go # Email operations
│   │   │   ├── auth.go         # Auth operations
│   │   │   └── translate.go    # GW types -> storage types
│   │   ├── filesystem/
│   │   │   ├── adapter.go
│   │   │   ├── document.go
│   │   │   ├── metadata.go     # Metadata storage
│   │   │   └── people.go
│   │   ├── s3/
│   │   │   └── adapter.go
│   │   └── mock/
│   │       └── mock.go         # For testing
│   └── cache/
│       └── cache.go            # Optional caching layer
└── googleworkspace/            # Keep existing, wrapped by adapter
    └── ...
```

## Next Steps

1. **Review & Discuss**: Share this proposal with team
2. **Prototype**: Build Phase 1 in a branch to validate approach
3. **Test**: Ensure Google Workspace adapter works identically to current implementation
4. **Iterate**: Refine interfaces based on prototype learnings
5. **Implement**: Roll out phases incrementally
6. **Document**: Create user guide for multi-backend setup

## Questions for Discussion

1. Should we support multiple storage providers simultaneously (e.g., Google for storage, LDAP for people)?
2. How do we handle provider-specific features (e.g., Google Docs comments)?
3. What's the minimum viable feature set for filesystem adapter?
4. Should we provide a migration tool for moving from Google Workspace to filesystem?
5. How do we handle document format conversion (Google Docs ↔ Markdown)?
