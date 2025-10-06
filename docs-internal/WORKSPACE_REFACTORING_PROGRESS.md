# Workspace Provider Refactoring - Session Progress

**Date**: October 3, 2025  
**Goal**: Refactor DraftsHandler and DocumentHandler to use WorkspaceProvider abstraction

## ✅ Phase 1: Add CreateFileAsUser Method - COMPLETE

### Changes Made

1. **Updated WorkspaceProvider Interface** (`pkg/workspace/provider.go`)
   - Added `CreateFileAsUser(templateID, destFolderID, name, userEmail string) (*drive.File, error)` method
   - This method handles user impersonation for document creation

2. **Implemented in Google Adapter** (`pkg/workspace/adapters/google/`)
   - Added `Config` field to `Service` struct to store auth configuration
   - Updated `NewFromConfig()` to store config in service
   - Updated `New()` to set Config to nil (OAuth2-based creation)
   - Implemented `CreateFileAsUser()` in `drive_helpers.go`:
     - Creates JWT config for user impersonation
     - Creates impersonated Drive service
     - Copies template as the impersonated user
     - Returns created file metadata

3. **Implemented in Mock Adapter** (`pkg/workspace/adapters/mock/adapter.go`)
   - Added `CreateFileAsUser()` method
   - Delegates to `CopyFile()` for mock testing
   - Provides interface completeness without external dependencies

### Code Changes

#### Before (DraftsHandler):
```go
if srv.Config.GoogleWorkspace.Auth != nil &&
    srv.Config.GoogleWorkspace.Auth.CreateDocsAsUser {
    // Create JWT config
    conf := &jwt.Config{...}
    client := conf.Client(ctx)
    
    // Create new Drive service with impersonation
    copyTemplateSvc := *srv.GWService
    copyTemplateSvc.Drive, err = drive.NewService(ctx, option.WithHTTPClient(client))
    
    // Copy file
    f, err = copyTemplateSvc.CopyFile(template, title, tempFolder)
    
    // Move to final location
    _, err = srv.WorkspaceProvider.MoveFile(f.Id, draftsFolder)
}
```

#### After (Simplified):
```go
if srv.Config.GoogleWorkspace.Auth != nil &&
    srv.Config.GoogleWorkspace.Auth.CreateDocsAsUser {
    // Copy file as user using workspace provider
    f, err = srv.WorkspaceProvider.CreateFileAsUser(
        template, tempFolder, title, userEmail)
    
    // Move to final location  
    _, err = srv.WorkspaceProvider.MoveFile(f.Id, draftsFolder)
}
```

## 🔄 Phase 2: Refactor DraftsHandler - IN PROGRESS

### Next Steps

1. **Update DraftsHandler POST endpoint**
   - Replace direct GWService usage with WorkspaceProvider.CreateFileAsUser()
   - Simplify user impersonation logic
   - Remove JWT config creation from handler

2. **Test the refactoring**
   - Run `TestCompleteIntegration_DocumentLifecycle`
   - Verify document creation works with mock adapter
   - Ensure no regressions

### Files to Update

- `internal/api/v2/drafts.go` (Lines 130-210)
  - Replace user impersonation code block
  - Use `srv.WorkspaceProvider.CreateFileAsUser()` if CreateDocsAsUser is enabled
  - Keep existing `srv.WorkspaceProvider.CopyFile()` for service account creation

## 📋 Phase 3: Document Header Replacement - TODO

This is the next major refactoring task after DraftsHandler.

### Issue

Current code:
```go
doc.ReplaceHeader(srv.Config.BaseURL, true, srv.GWService)
```

This passes `srv.GWService` directly to document methods, which:
- Uses Google Docs API directly
- Prevents testing without Google Workspace
- Couples document logic to Google implementation

### Solution

Add methods to WorkspaceProvider:
- `GetDocumentContent(docID string) (string, error)`
- `UpdateDocumentContent(docID string, replacements map[string]string) error`

Then update `document.ReplaceHeader()` to use WorkspaceProvider.

## 📊 Benefits So Far

### ✅ Achieved

1. **Cleaner Abstraction**
   - User impersonation logic moved to adapter layer
   - Handlers don't need to know about JWT configs or Google APIs
   - Single method call instead of 10+ lines of setup code

2. **Better Testability**
   - Mock adapter can simulate user impersonation
   - No need for real Google Workspace credentials in tests
   - Easier to test error conditions

3. **Easier Maintenance**
   - All Google-specific logic in one place
   - Changes to auth mechanism only affect adapter
   - Clear separation of concerns

### 🎯 Still To Do

1. **Complete DraftsHandler Refactoring**
   - Update POST endpoint to use new method
   - Remove old impersonation code
   - Test thoroughly

2. **Document Header Replacement**
   - Add document content methods to provider
   - Implement in Google adapter
   - Implement in mock adapter
   - Update all handlers

3. **DocumentHandler Refactoring**
   - Replace `srv.GWService.GetFile()` with `srv.WorkspaceProvider.GetFile()`
   - Update header replacement calls
   - Test thoroughly

4. **Remove GWService Dependency**
   - Mark GWService as deprecated
   - Migrate all remaining usages
   - Remove from Server struct

## 🧪 Testing Strategy

### Unit Tests
- ✅ Mock adapter implements interface correctly
- ✅ Can create files without Google Workspace
- ⏭️ Handler logic can be tested with mock

### Integration Tests
- ⏭️ Update `TestCompleteIntegration_DocumentLifecycle`
- ⏭️ Verify document creation with mock workspace
- ⏭️ Test both service account and user impersonation paths

### Validation
- ⏭️ Run existing integration tests
- ⏭️ Ensure no breaking changes
- ⏭️ Verify Google adapter still works in production

## 📝 Documentation

### Updated Files
- `docs-internal/WORKSPACE_REFACTORING_STRATEGY.md` - Overall strategy
- `docs-internal/WORKSPACE_REFACTORING_PROGRESS.md` - This file

### Code Documentation
- ✅ Added GoDoc comments to new methods
- ✅ Documented interface changes
- ✅ Added implementation notes

## 🚀 Quick Commands

```bash
# Run API integration tests
cd tests/api
go test -tags=integration -v -run TestCompleteIntegration

# Run just document lifecycle test
go test -tags=integration -v -run TestCompleteIntegration_DocumentLifecycle

# Check for compilation errors
cd /Users/jrepp/hc/hermes
go build ./...
```

## 📌 Key Decisions

1. **Stored Config in Service Struct**
   - Allows CreateFileAsUser to access auth credentials
   - Avoids passing config through every method call
   - Maintains clean interface

2. **Mock Delegates to CopyFile**
   - Keeps mock implementation simple
   - Could be enhanced later to track user ownership
   - Sufficient for current testing needs

3. **Keeping drive.File Return Type**
   - Didn't create FileInfo abstraction yet
   - Minimizes changes in this phase
   - Can refactor later if needed

## ⏭️ Immediate Next Actions

1. ✅ Add CreateFileAsUser to WorkspaceProvider interface
2. ✅ Implement in Google adapter
3. ✅ Implement in mock adapter
4. **⏭️ Update DraftsHandler to use new method**
5. **⏭️ Test with integration tests**
6. **⏭️ Commit and document changes**

After that, move to Phase 3: Document Header Replacement.
