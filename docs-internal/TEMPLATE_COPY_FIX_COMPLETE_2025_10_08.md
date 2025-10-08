# Template Copy Fix - Complete Analysis
**Date**: October 8, 2025  
**Branch**: jrepp/dev-tidy

## Problem Statement

Document creation was failing in the testing environment with error:
```
error creating draft: error="failed to copy document: resource not found: document with id \"template-rfc\""
```

## Root Cause Analysis

### Issue 1: Template Files Have No Frontmatter ✅ FIXED

**Location**: `pkg/workspace/adapters/local/document_storage.go:GetDocument()`

**Problem**:  
- Template files (e.g., `template-rfc.md`) are stored as plain markdown content without YAML frontmatter
- The `GetDocument()` method calls `metadataStore.GetWithContent()` which requires files to have frontmatter starting with `---`
- When reading template files, `parseFrontmatter()` fails with "missing frontmatter opening '---'" error
- This error gets wrapped and returned as generic "resource not found" error

**Evidence**:
- Created unit test with afero memory filesystem (`template_copy_test.go`)
- Verified `findDocumentPath()` successfully finds template files at `/workspace/templates/template-rfc.md`
- Confirmed error occurs in `GetWithContent()` after findDocumentPath succeeds
- Template files in `./testing/workspace_data/templates/` are plain markdown without frontmatter:
  ```
  # RFC Template
  
  ## Summary
  ...
  ```

**Solution**:  
Modified `GetDocument()` to detect template files and read them as plain content:
```go
// Check if this is a template file (templates don't have frontmatter metadata)
templatesPath := filepath.Join(ds.adapter.basePath, "templates")
if strings.HasPrefix(docPath, templatesPath) {
    // For template files, read as plain content without frontmatter
    content, err := afero.ReadFile(ds.adapter.fs, docPath)
    if err != nil {
        return nil, workspace.NotFoundError("document", id)
    }

    return &workspace.Document{
        ID:             id,
        Name:           id + ".md",
        Content:        string(content),
        MimeType:       "text/markdown",
        // ... minimal metadata for templates
    }, nil
}
```

**Test Validation**:
```bash
$ go test -v ./pkg/workspace/adapters/local -run TestCopyDocument_FromTemplates
=== RUN   TestCopyDocument_FromTemplates
=== RUN   TestCopyDocument_FromTemplates/CopyTemplateToDrafts
    template_copy_test.go:55: Templates directory contains 1 entries
    template_copy_test.go:57:   - template-rfc.md (IsDir: false)
    template_copy_test.go:65: findDocumentPath found: path=/workspace/templates/template-rfc.md
--- PASS: TestCopyDocument_FromTemplates (0.00s)
    --- PASS: TestCopyDocument_FromTemplates/CopyTemplateToDrafts (0.00s)
PASS
ok      github.com/hashicorp-forge/hermes/pkg/workspace/adapters/local  0.444s
```

### Issue 2: API Uses Google Workspace Config for Local Provider ❌ NOT FIXED

**Location**: `internal/api/v2/drafts.go:162`

**Problem**:  
Even when `providers.workspace = "local"`, the API hard-codes Google Workspace folder IDs:
```go
f, err = srv.WorkspaceProvider.CopyFile(
    template, 
    srv.Config.GoogleWorkspace.DraftsFolder,  // ← Hard-coded!
    title)
```

**Config Mismatch**:
```hcl
// In testing/config.hcl
google_workspace {
    drafts_folder = "test-drafts-folder-id"  // ← Google Drive folder ID
}

local_workspace {
    drafts_path = "/app/workspace_data/drafts"  // ← Filesystem path
}

providers {
    workspace = "local"  // ← Using local, but API uses google_workspace config!
}
```

**Impact**:
- API tries to copy template to folder ID `"test-drafts-folder-id"`
- Local workspace has no folder with that ID (folders directory is empty)
- CopyDocument fails because destination folder doesn't exist

**Verification**:
```bash
$ docker compose exec hermes ls -la /app/workspace_data/folders/
total 8
drwxr-xr-x    2 hermes   hermes        4096 Oct  8 03:16 .
drwxr-xr-x    6 hermes   hermes        4096 Oct  8 21:38 ..
# ← Empty! No folder "test-drafts-folder-id"
```

**Needed Fix** (not implemented):
API should use provider-appropriate configuration:
```go
var draftsFolder string
if srv.Config.Providers.Workspace == "local" {
    // For local, use "" or "drafts" as folder ID
    draftsFolder = "" // Creates in drafts directory
} else {
    // For Google Workspace, use configured folder ID
    draftsFolder = srv.Config.GoogleWorkspace.DraftsFolder
}

f, err = srv.WorkspaceProvider.CopyFile(template, draftsFolder, title)
```

## Files Modified

### pkg/workspace/adapters/local/document_storage.go
- Added template file detection in `GetDocument()`
- Templates read as plain content without frontmatter parsing
- **Status**: ✅ Complete, tested

### pkg/workspace/adapters/local/adapter.go  
- Updated `findDocumentPath()` to check templates directory
- Changed error message to include templates path for debugging
- **Status**: ✅ Complete, tested

### pkg/workspace/adapters/local/template_copy_test.go (NEW)
- Created comprehensive test using afero memory filesystem
- Tests template copying from templates directory to other folders
- Validates content preservation and metadata handling
- **Status**: ✅ Complete, all tests passing

## Test Results

### Unit Tests ✅
```bash
$ go test ./pkg/workspace/adapters/local -run "TestCopyDocument|TestProviderCompliance_CopyFile"
=== RUN   TestProviderCompliance_CopyFile
--- PASS: TestProviderCompliance_CopyFile (0.00s)
=== RUN   TestProviderCompliance_CopyFile_ErrorCases
--- PASS: TestProviderCompliance_CopyFile_ErrorCases (0.00s)
=== RUN   TestCopyDocument_FromTemplates
--- PASS: TestCopyDocument_FromTemplates (0.00s)
PASS
ok      github.com/hashicorp-forge/hermes/pkg/workspace/adapters/local  0.237s
```

### Integration Tests (Testing Environment) ❌
Document creation still fails due to Issue 2 (folder ID mismatch)

## Next Steps

1. **Fix API folder ID handling** - Update `internal/api/v2/drafts.go` to use correct folder configuration based on provider type

2. **Update config** - Either:
   - Create the `test-drafts-folder-id` folder in local workspace, OR
   - Change API to use empty string `""` for local workspace drafts folder

3. **Run E2E tests** - After fixing folder ID issue, validate full document creation flow

## Key Learnings

1. **Use afero for tests**: Memory filesystem enables fast, isolated testing without temp directories

2. **Template files are special**: Unlike regular documents, they don't have metadata and should be treated as read-only content sources

3. **Provider-agnostic APIs**: API handlers need to adapt configuration based on active provider (local vs Google Workspace)

## Commit Message

```
fix(local): handle template files without frontmatter in GetDocument

Template files (template-rfc.md, template-prd.md, etc.) are stored as
plain markdown content without YAML frontmatter metadata. This caused
GetDocument() to fail when trying to copy templates because
metadataStore.GetWithContent() expects frontmatter starting with `---`.

Changes:
- Modified GetDocument() to detect template files by path prefix
- Template files are read as plain content without frontmatter parsing
- Added comprehensive tests using afero memory filesystem

**Prompt Used**:
look for a test of copy file in the local adapter, you should use afero
and a memory file system to validate that it works

**AI Implementation Summary**:
- Created template_copy_test.go with afero.NewMemMapFs()
- Test revealed templates don't have frontmatter (root cause)
- Fixed GetDocument() to handle template files specially  
- All CopyDocument and template tests now passing

**Verification**:
- go test ./pkg/workspace/adapters/local -run TestCopyDocument: ✅ PASS
- go test ./pkg/workspace/adapters/local -run TestProviderCompliance_CopyFile: ✅ PASS
- Unit tests validate template copying with memory filesystem

Note: Separate issue identified where API uses GoogleWorkspace.DraftsFolder
even for local provider. This needs separate fix in internal/api/v2/drafts.go
```

## References

- Original issue: Document creation failing with "resource not found: template-rfc"
- Test file: `pkg/workspace/adapters/local/template_copy_test.go`
- Fixed files: `document_storage.go`, `adapter.go`
- Related docs: `docs-internal/INTEGRATION_TEST_FINDINGS_2025_10_08.md`
