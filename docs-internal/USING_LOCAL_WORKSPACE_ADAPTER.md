# Using Local Workspace Adapter for Testing

## Overview

The local workspace adapter (`pkg/workspace/adapters/local`) provides a filesystem-based alternative to Google Workspace for testing and development. This eliminates the need for Google Workspace credentials and allows faster, more isolated testing.

## When to Use Local vs Mock Adapters

### Mock Adapter (`pkg/workspace/adapters/mock`)
**Best for**: Unit tests and simple integration tests
- ✅ In-memory storage (fastest)
- ✅ No filesystem dependencies
- ✅ Easy to set up test data programmatically
- ✅ Good for testing API handlers in isolation
- ❌ No persistence between tests
- ❌ Simpler than real filesystem behavior

### Local Adapter (`pkg/workspace/adapters/local`)
**Best for**: Integration tests closer to production
- ✅ Real filesystem operations
- ✅ Tests actual file I/O patterns
- ✅ Can inspect files manually during debugging
- ✅ Supports document templates and complex workflows
- ❌ Slower than mock (disk I/O)
- ❌ Requires cleanup of test directories

### Google Adapter (`pkg/workspace/adapters/google`)
**Best for**: Production and end-to-end tests
- ✅ Real Google Workspace integration
- ✅ Tests actual API interactions
- ❌ Requires credentials
- ❌ Slowest (network calls)
- ❌ Can hit rate limits

## Using Local Adapter in Tests

### Basic Setup

```go
import (
    "os"
    "path/filepath"
    "testing"
    
    "github.com/hashicorp-forge/hermes/pkg/workspace/adapters/local"
)

func TestWithLocalWorkspace(t *testing.T) {
    // Create temporary directory for test
    tempDir := t.TempDir() // Automatically cleaned up after test
    
    // Configure local adapter
    cfg := &local.Config{
        BasePath:   tempDir,
        DocsPath:   filepath.Join(tempDir, "docs"),
        DraftsPath: filepath.Join(tempDir, "drafts"),
        FoldersPath: filepath.Join(tempDir, "folders"),
        FileSystem: local.NewOSFileSystem(), // Use real OS filesystem
    }
    
    // Create adapter
    adapter, err := local.NewAdapter(cfg)
    if err != nil {
        t.Fatalf("Failed to create local adapter: %v", err)
    }
    
    // Use adapter in your test
    // adapter.CreateFile(...)
    // adapter.GetFile(...)
}
```

### Using with Test Suite

```go
// In tests/api/suite.go - add option for local workspace

// WithLocalWorkspace configures the suite to use local filesystem storage.
func WithLocalWorkspace(basePath string) Option {
    return func(s *Suite) error {
        cfg := &local.Config{
            BasePath:   basePath,
            DocsPath:   filepath.Join(basePath, "docs"),
            DraftsPath: filepath.Join(basePath, "drafts"),
            FoldersPath: filepath.Join(basePath, "folders"),
            FileSystem: local.NewOSFileSystem(),
        }
        
        adapter, err := local.NewAdapter(cfg)
        if err != nil {
            return fmt.Errorf("failed to create local adapter: %w", err)
        }
        
        s.WorkspaceProvider = adapter
        return nil
    }
}

// Usage in test:
func TestWithLocalStorage(t *testing.T) {
    tempDir := t.TempDir()
    suite := NewSuite(t, WithLocalWorkspace(tempDir))
    defer suite.Cleanup()
    
    // Test code...
}
```

### Current V2 Drafts Tests - Why Mock is Better

The V2 Drafts tests (`tests/api/v2_drafts_test.go`) currently use the **mock adapter**, which is the right choice because:

1. **Fast**: No disk I/O overhead
2. **Simple setup**: Just chain `.WithFile()` and `.WithDocument()` calls
3. **Isolated**: Each test gets fresh state
4. **API-focused**: Tests verify API handler logic, not filesystem operations

Example from the fixed tests:

```go
// Setup mock workspace with the file and document
mockWorkspace := mock.NewAdapter().
    WithFile(draft.GoogleFileID, "[TEST-???] Test Draft", "application/vnd.google-apps.document").
    WithDocument(draft.GoogleFileID, &docs.Document{
        DocumentId: draft.GoogleFileID,
        Title:      "[TEST-???] Test Draft",
        Body:       &docs.Body{Content: []*docs.StructuralElement{}},
    })
```

This is **much simpler** than using the local adapter for these tests because:
- No need to create temp directories
- No need to write actual markdown files
- No need to manage metadata stores
- Test data is declared inline

## When Local Adapter Would Be Better

Use the local adapter when you need to test:

1. **Document creation workflows**
   - Creating documents from templates
   - File naming and organization
   - Directory structure management

2. **Complex file operations**
   - Bulk imports from filesystem
   - Backup/restore operations
   - Migration between storage types

3. **Filesystem integration**
   - Watching for file changes
   - Syncing with external systems
   - Testing actual file I/O performance

## Comparing Test Approaches

### Current (Mock) - Best for API tests
```go
mock.NewAdapter().
    WithFile("file-123", "Document Title", "application/vnd.google-apps.document").
    WithDocument("file-123", &docs.Document{...})
```

### Local - Better for filesystem tests
```go
localAdapter, _ := local.NewAdapter(&local.Config{BasePath: tempDir})
docStorage := localAdapter.DocumentStorage()
fileID, _ := docStorage.CreateDocument("My Doc", "RFC", false)
file, _ := localAdapter.GetFile(fileID)
```

### Google - Best for E2E tests
```go
googleService, _ := gw.NewService(ctx, credentials)
googleAdapter := gw.NewAdapter(googleService)
file, _ := googleAdapter.GetFile("real-google-file-id")
```

## Recommendation for V2 Drafts Tests

**Keep using the mock adapter!** The fixes applied (adding `WithDocument()` and checking `objectID` instead of `id`) are the right approach because:

1. ✅ Tests run in 1.6-2.0 seconds (local would be 3-5 seconds)
2. ✅ No filesystem cleanup needed
3. ✅ Easy to set up test data
4. ✅ Tests the API handler logic, which is what matters
5. ✅ Can run in parallel without conflicts

The local adapter shines for different use cases - primarily when you need to test the actual filesystem integration layer itself.

## Summary

| Aspect | Mock | Local | Google |
|--------|------|-------|--------|
| Speed | Fastest | Fast | Slow |
| Setup | Easiest | Medium | Complex |
| Isolation | Perfect | Good | Poor |
| Realistic | Low | Medium | High |
| **Use for** | **API tests** | **FS tests** | **E2E tests** |

**For API integration tests like V2 Drafts**: Use Mock ✅  
**For document storage tests**: Use Local  
**For full system tests**: Use Google (or skip if no credentials)
