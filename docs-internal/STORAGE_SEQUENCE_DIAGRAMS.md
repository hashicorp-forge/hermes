# Storage Abstraction - Sequence Diagrams

This document contains sequence diagrams showing the flow of operations through the storage abstraction layer.

## Document Creation Flow

```mermaid
sequenceDiagram
    participant Client as API Client
    participant Handler as DocumentHandler
    participant Server as Server
    participant Provider as StorageProvider
    participant Adapter as Filesystem Adapter
    participant FS as Filesystem
    participant Meta as MetadataStore

    Client->>Handler: POST /api/v2/documents
    Handler->>Server: Get StorageProvider
    Server-->>Handler: StorageProvider
    Handler->>Provider: DocumentStorage()
    Provider-->>Handler: DocumentStorage impl
    
    Handler->>Adapter: CreateDocument(ctx, docCreate)
    Adapter->>Adapter: generateID()
    Adapter->>Adapter: getDocumentPath(id, isDraft)
    
    alt Copy from Template
        Adapter->>Adapter: GetDocument(templateID)
        Adapter->>FS: Read template content
        FS-->>Adapter: template content
    end
    
    Adapter->>FS: WriteFile(docPath, content)
    FS-->>Adapter: success
    
    Adapter->>Meta: Set(id, metadata)
    Meta->>FS: WriteFile(metaPath, json)
    FS-->>Meta: success
    Meta-->>Adapter: success
    
    Adapter-->>Handler: Document
    Handler-->>Client: 201 Created + Document JSON
```

## Document Retrieval Flow

```mermaid
sequenceDiagram
    participant Client as API Client
    participant Handler as DocumentHandler
    participant Provider as StorageProvider
    participant Adapter as Filesystem Adapter
    participant Meta as MetadataStore
    participant FS as Filesystem

    Client->>Handler: GET /api/v2/documents/{id}
    Handler->>Provider: DocumentStorage()
    Provider-->>Handler: DocumentStorage impl
    
    Handler->>Adapter: GetDocument(ctx, id)
    
    Adapter->>Meta: Get(id)
    Meta->>FS: ReadFile(metaPath)
    FS-->>Meta: JSON metadata
    Meta->>Meta: Unmarshal JSON
    Meta-->>Adapter: DocumentMetadata
    
    Adapter->>Adapter: getDocumentPath(id, isDraft)
    Adapter->>FS: ReadFile(docPath)
    FS-->>Adapter: content
    
    Adapter->>Adapter: Build Document from metadata + content
    Adapter-->>Handler: Document
    Handler-->>Client: 200 OK + Document JSON
```

## Document List with Multiple Filters

```mermaid
sequenceDiagram
    participant Client as API Client
    participant Handler as DocumentHandler
    participant Adapter as Filesystem Adapter
    participant Meta as MetadataStore
    participant FS as Filesystem

    Client->>Handler: GET /api/v2/documents?folder=docs&modifiedAfter=...
    Handler->>Adapter: ListDocuments(ctx, folderID, opts)
    
    Adapter->>Meta: List()
    Meta->>FS: ReadDir(metadataPath)
    FS-->>Meta: file list
    
    loop For each metadata file
        Meta->>FS: ReadFile(metaFile)
        FS-->>Meta: JSON data
        Meta->>Meta: Unmarshal DocumentMetadata
    end
    
    Meta-->>Adapter: []DocumentMetadata
    
    loop For each metadata
        Adapter->>Adapter: Filter by folderID
        Adapter->>Adapter: Filter by trashed
        Adapter->>Adapter: Filter by modifiedAfter
        alt Matches all filters
            Adapter->>Adapter: Add to results
        end
        Adapter->>Adapter: Check pageSize limit
    end
    
    Adapter-->>Handler: []Document
    Handler-->>Client: 200 OK + Documents JSON
```

## Storage Provider Initialization

```mermaid
sequenceDiagram
    participant Main as main.go
    participant ServerCmd as Server Command
    participant Config as Config
    participant FSAdapter as Filesystem Adapter
    participant Meta as MetadataStore
    participant FS as Filesystem
    participant Server as Server Struct

    Main->>ServerCmd: Run(args)
    ServerCmd->>Config: Load config.hcl
    Config-->>ServerCmd: Config
    
    alt storage.provider == "filesystem"
        ServerCmd->>FSAdapter: NewAdapter(config)
        FSAdapter->>FS: MkdirAll(docsPath)
        FSAdapter->>FS: MkdirAll(draftsPath)
        FSAdapter->>FS: MkdirAll(foldersPath)
        FSAdapter->>Meta: NewMetadataStore(basePath)
        Meta->>FS: MkdirAll(metadataPath)
        Meta-->>FSAdapter: MetadataStore
        FSAdapter-->>ServerCmd: Adapter
    else storage.provider == "googleworkspace"
        ServerCmd->>ServerCmd: Create GW Adapter (wraps existing)
    end
    
    ServerCmd->>Server: New(config, storageProvider, ...)
    Server-->>ServerCmd: Server
    
    ServerCmd->>Server: Start HTTP server
```

## Multi-Adapter Comparison

```mermaid
sequenceDiagram
    participant Client
    participant Handler
    participant Provider as StorageProvider Interface
    
    Note over Provider: Same interface for all adapters
    
    rect rgb(200, 220, 255)
    Note right of Provider: Google Workspace Adapter
    participant GWAdapter as GW Adapter
    participant GWService as googleworkspace.Service
    participant DriveAPI as Google Drive API
    
    Handler->>GWAdapter: GetDocument(id)
    GWAdapter->>GWService: GetFile(id)
    GWService->>DriveAPI: HTTP GET
    DriveAPI-->>GWService: Drive File
    GWAdapter->>GWService: GetDoc(id)
    GWService->>DriveAPI: HTTP GET
    DriveAPI-->>GWService: Google Doc
    GWAdapter->>GWAdapter: Translate to storage.Document
    GWAdapter-->>Handler: storage.Document
    end
    
    rect rgb(200, 255, 220)
    Note right of Provider: Filesystem Adapter
    participant FSAdapter as FS Adapter
    participant FSMeta as MetadataStore
    participant Filesystem as Filesystem
    
    Handler->>FSAdapter: GetDocument(id)
    FSAdapter->>FSMeta: Get(id)
    FSMeta->>Filesystem: ReadFile(meta.json)
    Filesystem-->>FSMeta: JSON
    FSMeta-->>FSAdapter: Metadata
    FSAdapter->>Filesystem: ReadFile(doc.md)
    Filesystem-->>FSAdapter: Content
    FSAdapter->>FSAdapter: Build storage.Document
    FSAdapter-->>Handler: storage.Document
    end
    
    Note over Client,Filesystem: Handler code unchanged - works with any adapter!
```

## Text Replacement Operation

```mermaid
sequenceDiagram
    participant Handler as ReviewHandler
    participant Adapter as Filesystem Adapter
    participant FS as Filesystem

    Handler->>Adapter: ReplaceTextInDocument(id, {"product": "Terraform"})
    
    Adapter->>Adapter: GetDocumentContent(id)
    Adapter->>FS: ReadFile(docPath)
    FS-->>Adapter: "Product: {{product}}\nStatus: {{status}}"
    
    loop For each replacement
        Adapter->>Adapter: Replace "{{product}}" with "Terraform"
    end
    
    Note over Adapter: Content: "Product: Terraform\nStatus: {{status}}"
    
    Adapter->>Adapter: UpdateDocumentContent(id, newContent)
    Adapter->>FS: WriteFile(docPath, newContent)
    FS-->>Adapter: success
    Adapter-->>Handler: success
```

## Folder Operations

```mermaid
sequenceDiagram
    participant Handler as Handler
    participant Adapter as Filesystem Adapter
    participant FS as Filesystem

    Handler->>Adapter: GetSubfolder(parentID, "RFC")
    Adapter->>Adapter: ListFolders(parentID)
    
    Adapter->>FS: ReadDir(foldersPath)
    FS-->>Adapter: folder files
    
    loop For each folder file
        Adapter->>FS: ReadFile(folder.json)
        FS-->>Adapter: folder JSON
        Adapter->>Adapter: Unmarshal
        alt folder.ParentID == parentID
            Adapter->>Adapter: Add to results
        end
    end
    
    Adapter->>Adapter: Find folder with name "RFC"
    
    alt Found
        Adapter-->>Handler: Folder
    else Not Found
        Adapter->>Adapter: CreateFolder("RFC", parentID)
        Adapter->>Adapter: generateID()
        Adapter->>FS: WriteFile(newFolder.json)
        FS-->>Adapter: success
        Adapter-->>Handler: New Folder
    end
```

## Document Copy Operation

```mermaid
sequenceDiagram
    participant Client
    participant DraftHandler as DraftsHandler
    participant Adapter as Filesystem Adapter
    participant FS as Filesystem
    participant Meta as MetadataStore

    Client->>DraftHandler: POST /api/v2/drafts (from template)
    DraftHandler->>Adapter: CopyDocument(templateID, draftsFolder, newName)
    
    Adapter->>Adapter: GetDocument(templateID)
    
    Note over Adapter: GetDocument flow (see above)
    Adapter->>Meta: Get(templateID)
    Meta-->>Adapter: Template metadata
    Adapter->>FS: ReadFile(templatePath)
    FS-->>Adapter: Template content
    
    Adapter->>Adapter: CreateDocument(newName, draftsFolder, content)
    Adapter->>Adapter: generateID() -> newID
    Adapter->>FS: WriteFile(newDocPath, content)
    FS-->>Adapter: success
    Adapter->>Meta: Set(newID, newMetadata)
    Meta-->>Adapter: success
    
    Adapter-->>DraftHandler: New Document
    DraftHandler-->>Client: 201 Created
```

## Error Handling Flow

```mermaid
sequenceDiagram
    participant Client
    participant Handler
    participant Adapter as Filesystem Adapter
    participant FS as Filesystem

    Client->>Handler: GET /api/v2/documents/invalid-id
    Handler->>Adapter: GetDocument(ctx, "invalid-id")
    
    Adapter->>FS: ReadFile(metadataPath)
    FS-->>Adapter: os.ErrNotExist
    
    Adapter->>Adapter: Check if os.IsNotExist(err)
    Adapter->>Adapter: Return storage.NotFoundError("document", "invalid-id")
    
    Adapter-->>Handler: error: ErrNotFound
    
    Handler->>Handler: Check errors.Is(err, storage.ErrNotFound)
    Handler->>Handler: Map to HTTP 404
    Handler-->>Client: 404 Not Found
    
    Note over Client,FS: Consistent error handling across all adapters
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        API Layer                             │
│  DocumentHandler, DraftsHandler, ReviewHandler, etc.        │
└─────────────────────┬───────────────────────────────────────┘
                      │ Uses
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Storage Abstraction Layer                       │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         StorageProvider Interface                   │    │
│  │  • DocumentStorage()                                │    │
│  │  • PeopleService()                                  │    │
│  │  • NotificationService()                            │    │
│  │  • AuthService()                                    │    │
│  └────────────────────────────────────────────────────┘    │
└───────────┬─────────────────────────┬──────────────────────┘
            │                         │
            ▼                         ▼
┌──────────────────────┐   ┌──────────────────────────┐
│ Google Workspace     │   │  Filesystem Adapter      │
│     Adapter          │   │                          │
├──────────────────────┤   ├──────────────────────────┤
│ • Wraps GW Service   │   │ • Local files (.md)      │
│ • Translates types   │   │ • JSON metadata          │
│ • Drive API          │   │ • Directory structure    │
│ • Docs API           │   │ • users.json             │
│ • People API         │   │ • SMTP notifications     │
│ • Gmail API          │   │ • Token-based auth       │
└──────────┬───────────┘   └────────┬─────────────────┘
           │                        │
           ▼                        ▼
┌──────────────────────┐   ┌──────────────────────────┐
│  Google Cloud APIs   │   │   Operating System       │
│  • Drive v3          │   │   • File I/O             │
│  • Docs v1           │   │   • Directory ops        │
│  • Gmail v1          │   │   • JSON marshal         │
│  • People v1         │   │                          │
└──────────────────────┘   └──────────────────────────┘
```

## Key Benefits Illustrated

### 1. Same Handler Code, Different Backends

```go
// Handler code (unchanged)
func DocumentHandler(srv server.Server) http.Handler {
    docStorage := srv.StorageProvider.DocumentStorage()
    doc, err := docStorage.GetDocument(ctx, id)
    // ... works with any adapter!
}
```

### 2. Easy Testing with Mock Adapter

```mermaid
sequenceDiagram
    participant Test as Unit Test
    participant Handler
    participant Mock as Mock Adapter

    Test->>Mock: Setup test data
    Mock->>Mock: documents["test-id"] = testDoc
    Test->>Handler: Initialize with MockAdapter
    Test->>Handler: GET document
    Handler->>Mock: GetDocument("test-id")
    Mock-->>Handler: testDoc (from memory)
    Handler-->>Test: Response
    Test->>Test: Assert response
```

### 3. Gradual Migration Path

```
Phase 1: Create interfaces         ✓ No changes to handlers
Phase 2: Wrap Google Workspace     ✓ Still using Google APIs
Phase 3: Migrate handlers           ✓ One at a time
Phase 4: Add filesystem option      ✓ Choose per deployment
```
