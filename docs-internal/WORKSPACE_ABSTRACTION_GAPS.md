# Workspace Abstraction - Discovered Gaps

**Date**: October 3, 2025  
**Context**: Migration from explicit Google Workspace dependencies to workspace.Provider abstraction  
**Goal**: Enable local filesystem-based workspace for testing and development

## Overview

During the migration of API handlers from direct Google Workspace Service usage to the workspace.Provider interface, we discovered several operations that are **outside the scope** of simple file/permission management and require additional abstraction layers.

## Current State

### ✅ Successfully Abstracted (workspace.Provider)

The following operations are now cleanly abstracted and work with the Provider interface:

- **File Operations**: `GetFile()`, `CopyFile()`, `MoveFile()`, `DeleteFile()`, `RenameFile()`
- **Permission Management**: `ShareFile()`, `ListPermissions()`, `DeletePermission()`
- **People/Directory Search**: `SearchPeople()`
- **Folder Operations**: `GetSubfolder()`

**Status**: Mock implementation complete. Ready for local filesystem implementation with afero.

### ❌ Gaps Requiring Additional Abstraction

The following operations still require Google-specific APIs and are **not yet abstracted**:

## 1. Document Content Manipulation (Google Docs API)

**Current Usage**: `doc.ReplaceHeader()` in multiple handlers

**Google-Specific Methods**:
- `gw.Service.GetDoc(fileID)` - Returns `*docs.Document` with structured content
- Document structure parsing (tables, paragraphs, text runs)
- Batch update operations on document content

**Example Locations**:
```
internal/api/v2/drafts.go:287  - ReplaceHeader on draft creation
internal/api/v2/drafts.go:1539 - ReplaceHeader on draft patch
pkg/document/replace_header.go:46 - Main implementation
```

**Local Workspace Equivalent**:
- Markdown/plaintext header templates
- Simple find-and-replace in text files
- No structured document manipulation needed

**Proposed Abstraction**: `DocumentProvider` interface
```go
type DocumentProvider interface {
    UpdateDocumentHeader(fileID string, metadata map[string]string) error
    GetDocumentContent(fileID string) (string, error)
}
```

## 2. Document Locking Based on Suggestions (Google Docs API)

**Current Usage**: `hcd.IsLocked()` in PATCH handler

**Google-Specific Methods**:
- `gw.Service.GetDoc(fileID)` - Get full document structure
- Parse document for pending suggestions/comments
- Check tables, cells, paragraphs for `SuggestedDeletionIds`, `SuggestedInsertionIds`, etc.

**Example Location**:
```
internal/api/v2/drafts.go:1114
pkg/hashicorpdocs/locked.go:15 - Main implementation
```

**Local Workspace Equivalent**:
- Not applicable - filesystem doesn't have "suggestions"
    let's add a new suggestions markdown file that is associated to the original

- Could implement simple file lock mechanism
    use a document state property in frontmatter to indicate the lock status, how does the application want to determine locked/unlocked status, is it based on workflow state?


## 3. Service Account Impersonation

**Current Usage**: Template copying as user (drafts.go:151)

**Google-Specific Methods**:
- JWT-based service account impersonation
- User context switching for Drive operations
- OAuth2 token exchange

**Example Location**:
```go
conf := &jwt.Config{
    Email:    srv.Config.GoogleWorkspace.Auth.ClientEmail,
    Subject:  userEmail, // Impersonate user
    // ...
}
client := conf.Client(ctx)
```

**Local Workspace Equivalent**:
- User identification via headers/auth store user information in frontmatter
- No impersonation needed - just use filesystem permissions - wrap the function at the provider and allow the local version to simulate it
- Template copying can be done directly


## 4. Email Sending (Gmail API)

**Current Usage**: `email.SendNewOwnerEmail()` in PATCH handler

**Google-Specific Methods**:
- Gmail API for sending emails
- Requires Google Workspace service

**Example Location**:
```
internal/api/v2/drafts.go:1510
internal/email/email.go - Email sending logic
```

**Local Workspace Equivalent**:
just create an outbox folder and drop email with metadata into a file

## 5. Shareable Draft Handler

**Current Usage**: `draftsShareableHandler()` requires full Google service

**Example Location**:
```
internal/api/v2/drafts.go:772
```

**Analysis Needed**: Determine what Google-specific operations this uses

## Implementation Priority

### Phase 1: Local Workspace with Afero (Current Focus)

**Goal**: Implement full local filesystem workspace that passes all Provider interface tests

**Approach**:
1. Use `afero` package for filesystem abstraction
2. Support both real filesystem and in-memory FS (for tests)
3. Implement all Provider interface methods
4. File metadata stored as JSON sidecar files (`.meta.json`)
5. Permissions stored in metadata
6. People directory as simple JSON file

**Test Strategy**:
- Create comprehensive workspace provider test suite
- Run against both mock and local workspace implementations
- Cover all Provider interface methods
- Test edge cases (missing files, permission conflicts, etc.)

### Phase 2: Document Provider Abstraction (Future)

**Goal**: Abstract document content operations

**Options**:
1. **Markdown-based**: Store docs as Markdown, use templating for headers
2. **HTML-based**: Store as HTML with structured headers
3. **Plugin-based**: Allow different backends (Google Docs, Markdown, etc.)

### Phase 3: Optional Features (Future)

**Goal**: Implement remaining gaps as needed

- Email provider abstraction
- Document locking mechanism
- Service account/user context handling

## Local Workspace Design

### Directory Structure
```
workspace_root/
├── files/
│   ├── <file-id>/
│   │   ├── content        # Actual file content
│   │   └── .meta.json     # File metadata (name, mimeType, createdTime, etc.)
├── permissions/
│   └── <file-id>.json     # Permissions for each file
├── folders/
│   └── folders.json       # Folder hierarchy mapping
└── people/
    └── directory.json     # People directory (for SearchPeople)
```

### Metadata Format (`.meta.json`)
```json
{
  "id": "file-123",
  "name": "My Document",
  "mimeType": "text/markdown",
  "parents": ["folder-456"],
  "createdTime": "2025-10-03T15:30:00Z",
  "modifiedTime": "2025-10-03T16:45:00Z",
  "owners": ["user@example.com"]
}
```

### Permissions Format (`permissions/<file-id>.json`)
```json
[
  {
    "id": "perm-1",
    "type": "user",
    "emailAddress": "user@example.com",
    "role": "writer"
  }
]
```

## Testing Strategy

### Test Suite Structure
```
pkg/workspace/provider_test.go         # Interface compliance tests
pkg/workspace/adapters/local/
  ├── adapter.go                       # Local implementation
  ├── adapter_test.go                  # Local-specific tests
  └── testdata/                        # Test fixtures
pkg/workspace/adapters/mock/
  ├── adapter.go                       # Mock implementation (existing)
  └── adapter_test.go                  # Mock-specific tests
```

### Test Categories

1. **File Operations Tests**
   - Create, read, update, delete files
   - Copy files across folders
   - Move files
   - Rename files
   - Handle missing files

2. **Permission Tests**
   - Share files with users
   - List permissions
   - Remove permissions
   - Handle duplicate permissions
   - Permission inheritance

3. **Folder Tests**
   - Get subfolders
   - Create folder hierarchy
   - Move files between folders

4. **People Directory Tests**
   - Search people by email
   - Return user metadata
   - Handle missing users

5. **Concurrency Tests**
   - Concurrent file operations
   - Race condition handling
   - File locking

6. **Edge Cases**
   - Invalid file IDs
   - Missing metadata
   - Corrupted data
   - Disk space issues (for real FS)

## Next Steps

1. ✅ Document gaps discovered
2. 🔄 Create workspace provider test suite (provider_test.go)
3. ⏳ Implement local workspace with afero
4. ⏳ Wire local workspace into test fixtures
5. ⏳ Update API tests to use local workspace
6. ⏳ Address remaining gaps (document provider, etc.)

## References

- Workspace Provider Interface: `pkg/workspace/provider.go`
- Mock Implementation: `pkg/workspace/adapters/mock/adapter.go`
- Google Adapter: `pkg/workspace/adapters/google/service.go`
- Afero Package: https://github.com/spf13/afero
