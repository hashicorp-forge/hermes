# Refactoring DraftsHandler and DocumentHandler to Use WorkspaceProvider

**Date**: October 3, 2025  
**Goal**: Eliminate direct Google Workspace API calls from handlers, use WorkspaceProvider abstraction

## Current State Analysis

### DraftsHandler Google Dependencies

The `DraftsHandler` currently has these Google Workspace dependencies:

1. **Document Creation** (Lines 136-207):
   - Creates JWT config for user impersonation
   - Creates Google Drive service with impersonated credentials
   - Calls `srv.GWService.CopyFile()` directly
   - Uses `*drive.File` return type

2. **Header Replacement** (Line 294):
   ```go
   doc.ReplaceHeader(srv.Config.BaseURL, true, srv.GWService)
   ```
   - Directly passes GWService to document method
   - Uses Google Docs API to update document content

3. **Already Abstracted**:
   - ✅ `srv.WorkspaceProvider.MoveFile()` 
   - ✅ `srv.WorkspaceProvider.CopyFile()`
   - ✅ `srv.WorkspaceProvider.SearchPeople()`
   - ✅ `srv.WorkspaceProvider.ShareFile()`
   - ✅ `srv.WorkspaceProvider.GetFile()`
   - ✅ `srv.WorkspaceProvider.DeleteFile()`
   - ✅ `srv.WorkspaceProvider.RenameFile()`

### DocumentHandler Google Dependencies

The `DocumentHandler` has these Google Workspace dependencies:

1. **Get File Metadata** (Line 183):
   ```go
   file, err := srv.GWService.GetFile(docID)
   ```
   - Gets modified time
   - Should use `srv.WorkspaceProvider.GetFile()`

2. **Header Replacement** (Various places):
   - Similar to DraftsHandler
   - Needs abstraction

## Refactoring Strategy

### Phase 1: Add Missing Methods to WorkspaceProvider Interface

The `WorkspaceProvider` interface needs these additional methods:

```go
// In pkg/workspace/provider.go

type Provider interface {
    // ... existing methods ...
    
    // CreateFileAsUser creates a file impersonating a specific user
    CreateFileAsUser(srcTemplateID, destFolderID, name, userEmail string) (*drive.File, error)
    
    // UpdateDocumentContent updates document content (for header replacement)
    UpdateDocumentContent(docID string, updates map[string]string) error
    
    // Or more specific:
    ReplaceDocumentHeader(docID, baseURL string, isDraft bool, headerData map[string]string) error
}
```

### Phase 2: Implement in Google Adapter

Update `pkg/workspace/adapters/google/*.go` to implement new methods.

### Phase 3: Implement in Mock Adapter  

Update `pkg/workspace/adapters/mock/adapter.go` to implement new methods for testing.

### Phase 4: Refactor DraftsHandler

Replace Google-specific code with WorkspaceProvider calls.

### Phase 5: Refactor DocumentHandler

Replace Google-specific code with WorkspaceProvider calls.

### Phase 6: Remove GWService from Server Struct

Once no handlers use `srv.GWService`, remove it:
- `internal/server/server.go` - Remove `GWService` field
- Mark as deprecated first, then remove

## Detailed Refactoring Plan

### Issue 1: User Impersonation for Document Creation

**Current Code**:
```go
if srv.Config.GoogleWorkspace.Auth != nil &&
    srv.Config.GoogleWorkspace.Auth.CreateDocsAsUser {
    // Create JWT config
    // Create new Drive service with impersonation
    // Copy file as user
}
```

**Solution Options**:

**Option A**: Add `CreateFileAsUser` to WorkspaceProvider
```go
// WorkspaceProvider interface
CreateFileAsUser(templateID, destFolder, name, userEmail string) (*drive.File, error)

// Google adapter implementation  
func (a *Adapter) CreateFileAsUser(templateID, destFolder, name, userEmail string) (*drive.File, error) {
    // Create impersonated service
    // Copy file
    // Return result
}

// Mock adapter implementation
func (m *MockAdapter) CreateFileAsUser(templateID, destFolder, name, userEmail string) (*drive.File, error) {
    return &drive.File{
        Id:          m.generateID(),
        Name:        name,
        CreatedTime: time.Now().Format(time.RFC3339Nano),
    }, nil
}
```

**Option B**: Add configuration to `CopyFile` method
```go
type CopyFileOptions struct {
    TemplateID   string
    DestFolder   string
    Name         string
    ImpersonateUser string // If non-empty, impersonate this user
}

CopyFileWithOptions(opts *CopyFileOptions) (*drive.File, error)
```

**Recommendation**: **Option A** - Explicit method is clearer and easier to test.

### Issue 2: Document Header Replacement

**Current Code**:
```go
// In document package
func (d *Document) ReplaceHeader(baseURL string, isDraft bool, s *gw.Service) error {
    // Uses s.GetDoc()
    // Uses s.UpdateDoc()
    // Google Docs API specific
}
```

**Solution**:

Add methods to WorkspaceProvider:
```go
// Get document content structure
GetDocumentContent(docID string) (*DocumentContent, error)

// Update document content
UpdateDocumentContent(docID string, replacements map[string]string) error
```

Then refactor `ReplaceHeader` to use WorkspaceProvider:
```go
func (d *Document) ReplaceHeader(baseURL string, isDraft bool, wp workspace.Provider) error {
    // Use wp.GetDocumentContent()
    // Use wp.UpdateDocumentContent()
}
```

### Issue 3: Return Types (*drive.File)

**Current Issue**: Methods return `*drive.File` which is Google-specific.

**Solution**: 

Create workspace-agnostic types:
```go
// In pkg/workspace/types.go

type FileInfo struct {
    ID           string
    Name         string
    CreatedTime  time.Time
    ModifiedTime time.Time
    Owner        string
    MimeType     string
    // Add other commonly needed fields
}

// Helper to convert from Google Drive File
func FileInfoFromDriveFile(f *drive.File) (*FileInfo, error) {
    created, err := time.Parse(time.RFC3339Nano, f.CreatedTime)
    // ...
    return &FileInfo{
        ID:          f.Id,
        Name:        f.Name,
        CreatedTime: created,
        // ...
    }, nil
}
```

Update methods:
```go
CopyFile(srcID, destFolderID, name string) (*FileInfo, error)
GetFile(fileID string) (*FileInfo, error)
MoveFile(fileID, destFolderID string) (*FileInfo, error)
```

## Implementation Order

1. ✅ **Document Current State** (this file)
2. **Add FileInfo type** to `pkg/workspace/types.go`
3. **Add CreateFileAsUser** method to WorkspaceProvider interface
4. **Add Document Content methods** to WorkspaceProvider interface
5. **Implement in Google adapter** (`pkg/workspace/adapters/google/`)
6. **Implement in Mock adapter** (`pkg/workspace/adapters/mock/`)
7. **Update DraftsHandler** to use new methods
8. **Update DocumentHandler** to use new methods
9. **Refactor document.ReplaceHeader** to use WorkspaceProvider
10. **Run tests** to validate refactoring
11. **Mark GWService as deprecated** in server.Server
12. **Update all other handlers** that still use GWService
13. **Remove GWService** from server.Server

## Testing Strategy

### Unit Tests
- Test each new WorkspaceProvider method in isolation
- Mock adapter should return predictable values

### Integration Tests
- Use `TestCompleteIntegration_*` tests as validation
- Should pass without requiring Google Workspace
- All tests should use WorkspaceProvider

### Migration Validation
- Run existing integration tests during refactoring
- Ensure no regressions
- Verify mock adapter works correctly

## Benefits

### After Refactoring

1. **✅ Tests Don't Need Google Workspace**
   - All API tests can use mock workspace provider
   - Faster test execution
   - No external dependencies

2. **✅ Easier to Add Storage Backends**
   - Could add S3 backend
   - Could add local filesystem backend
   - Could add other document storage systems

3. **✅ Cleaner Architecture**
   - Handlers don't know about Google APIs
   - Single abstraction layer
   - Easier to maintain

4. **✅ Better Testing**
   - Mock different scenarios easily
   - Test error handling
   - Test edge cases without hitting APIs

## Risks & Mitigation

### Risk 1: Breaking Changes

**Mitigation**:
- Keep GWService in Server struct initially
- Mark as deprecated
- Gradual migration
- Remove only after all usages migrated

### Risk 2: Incomplete Abstraction

**Mitigation**:
- Start with high-value operations (file creation, header replacement)
- Add methods as needed
- Document what's abstracted and what's not

### Risk 3: Complex Google Docs API

**Mitigation**:
- Document content structure abstraction is complex
- May need Google-specific helpers initially
- Can refactor incrementally

## Next Steps

1. **Review this strategy** with team/stakeholders
2. **Start with Phase 1**: Add FileInfo type and new methods to interface
3. **Implement Phase 2**: Google adapter implementation
4. **Implement Phase 3**: Mock adapter implementation
5. **Test thoroughly** before touching handlers
6. **Refactor handlers** one at a time
7. **Validate with integration tests**

## Questions to Answer

1. Should we use `*drive.File` or create `FileInfo` type?
   - **Recommendation**: Create `FileInfo` - more flexible long-term

2. How to handle Google Docs API specifics (header replacement)?
   - **Recommendation**: Add generic document content methods, Google adapter implements Google-specific logic

3. Should we refactor all handlers at once or incrementally?
   - **Recommendation**: Incrementally - less risk, easier to validate

4. What about other handlers that use GWService?
   - **Recommendation**: Audit all usages, create comprehensive list, migrate systematically
