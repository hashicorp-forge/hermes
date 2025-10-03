# TODO: Migrate Examples to Integration Test Framework

**Status**: Planned  
**Priority**: Medium  
**Effort**: Small (1 week)  
**Dependencies**: None

## Overview

Convert the example program in `pkg/storage/adapters/localworkspace/examples/main.go` into a structured integration test framework. This will provide:
- Automated verification of storage adapter functionality
- Regression testing for future changes
- Documentation through runnable tests
- CI integration for pre-merge validation

## Current State

### Existing Example
- Location: `pkg/storage/adapters/localworkspace/examples/main.go`
- ~230 lines of manual demonstration code
- Creates temporary directory
- Demonstrates 8 operations:
  1. Create document from scratch
  2. Create draft from template
  3. Update document content
  4. Create folder hierarchy
  5. List documents
  6. Retrieve document
  7. Get subfolder
  8. Move document
- Prints output to console
- Requires manual execution and verification

### Limitations
- Not automated
- No assertions (just prints)
- Not integrated with CI
- No failure detection
- Manual cleanup required
- Not reusable across adapters

## Proposed Structure

```
pkg/storage/adapters/
├── integration_test.go       # Main integration test suite
└── testdata/
    ├── templates/
    │   ├── rfc_template.md
    │   ├── prd_template.md
    │   └── frd_template.md
    └── fixtures/
        ├── documents.json
        └── users.json
```

## Integration Test Framework

### Test Suite Structure
```go
package adapters_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/hashicorp-forge/hermes/pkg/storage"
	"github.com/hashicorp-forge/hermes/pkg/storage/adapters/localworkspace"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// AdapterTestSuite defines tests all storage adapters must pass.
type AdapterTestSuite struct {
	Provider storage.StorageProvider
	TempDir  string
	T        *testing.T
}

// NewAdapterTestSuite creates a test suite for a storage adapter.
func NewAdapterTestSuite(t *testing.T, provider storage.StorageProvider) *AdapterTestSuite {
	tempDir := t.TempDir()
	return &AdapterTestSuite{
		Provider: provider,
		TempDir:  tempDir,
		T:        t,
	}
}

// RunAllTests runs the complete integration test suite.
func (s *AdapterTestSuite) RunAllTests() {
	s.T.Run("DocumentCreation", s.TestDocumentCreation)
	s.T.Run("DocumentRetrieval", s.TestDocumentRetrieval)
	s.T.Run("DocumentUpdate", s.TestDocumentUpdate)
	s.T.Run("DocumentDeletion", s.TestDocumentDeletion)
	s.T.Run("DocumentListing", s.TestDocumentListing)
	s.T.Run("TemplateInstantiation", s.TestTemplateInstantiation)
	s.T.Run("TextReplacement", s.TestTextReplacement)
	s.T.Run("DocumentCopy", s.TestDocumentCopy)
	s.T.Run("DocumentMove", s.TestDocumentMove)
	s.T.Run("FolderOperations", s.TestFolderOperations)
	s.T.Run("SubfolderRetrieval", s.TestSubfolderRetrieval)
	s.T.Run("ConcurrentOperations", s.TestConcurrentOperations)
	s.T.Run("ErrorHandling", s.TestErrorHandling)
}

// TestDocumentCreation tests creating documents.
func (s *AdapterTestSuite) TestDocumentCreation() {
	ctx := context.Background()
	ds := s.Provider.DocumentStorage()

	doc, err := ds.CreateDocument(ctx, &storage.DocumentCreate{
		Name:           "RFC-001: Storage Abstraction",
		ParentFolderID: "docs",
		Content: `# RFC-001: Storage Abstraction Layer

## Summary
This RFC proposes a storage abstraction layer for Hermes.

## Motivation
- Support multiple storage backends
- Improve testability
- Enable local development`,
		Owner: "engineer@hashicorp.com",
	})

	require.NoError(s.T, err, "Failed to create document")
	assert.NotEmpty(s.T, doc.ID, "Document ID should be generated")
	assert.Equal(s.T, "RFC-001: Storage Abstraction", doc.Name)
	assert.Equal(s.T, "docs", doc.ParentFolderID)
	assert.Equal(s.T, "engineer@hashicorp.com", doc.Owner)
	assert.NotZero(s.T, doc.CreatedTime, "CreatedTime should be set")
	assert.NotZero(s.T, doc.ModifiedTime, "ModifiedTime should be set")
}

// TestTemplateInstantiation tests creating documents from templates.
func (s *AdapterTestSuite) TestTemplateInstantiation() {
	ctx := context.Background()
	ds := s.Provider.DocumentStorage()

	// Create template
	template, err := ds.CreateDocument(ctx, &storage.DocumentCreate{
		Name:           "RFC Template",
		ParentFolderID: "templates",
		Content: `# {{docType}}-{{number}}: {{title}}

Product: {{product}}
Author: {{author}}
Status: {{status}}

## Summary
[Brief summary here]`,
		Owner: "admin@hashicorp.com",
	})
	require.NoError(s.T, err)

	// Copy template
	draft, err := ds.CopyDocument(ctx, template.ID, "drafts", "RFC-002: API Versioning")
	require.NoError(s.T, err)

	// Replace placeholders
	err = ds.ReplaceTextInDocument(ctx, draft.ID, map[string]string{
		"docType": "RFC",
		"number":  "002",
		"title":   "API Versioning",
		"product": "Terraform",
		"author":  "engineer@hashicorp.com",
		"status":  "Draft",
	})
	require.NoError(s.T, err)

	// Verify content
	updated, err := ds.GetDocument(ctx, draft.ID)
	require.NoError(s.T, err)
	assert.Contains(s.T, updated.Content, "RFC-002: API Versioning")
	assert.Contains(s.T, updated.Content, "Product: Terraform")
	assert.NotContains(s.T, updated.Content, "{{")
}

// TestConcurrentOperations tests thread safety.
func (s *AdapterTestSuite) TestConcurrentOperations() {
	ctx := context.Background()
	ds := s.Provider.DocumentStorage()

	// Create multiple documents concurrently
	numDocs := 10
	errChan := make(chan error, numDocs)

	for i := 0; i < numDocs; i++ {
		go func(index int) {
			_, err := ds.CreateDocument(ctx, &storage.DocumentCreate{
				Name:           fmt.Sprintf("Concurrent Doc %d", index),
				ParentFolderID: "docs",
				Content:        fmt.Sprintf("Content %d", index),
				Owner:          "test@example.com",
			})
			errChan <- err
		}(i)
	}

	// Check all operations succeeded
	for i := 0; i < numDocs; i++ {
		err := <-errChan
		assert.NoError(s.T, err, "Concurrent operation %d failed", i)
	}

	// Verify all documents exist
	docs, err := ds.ListDocuments(ctx, "docs", &storage.ListOptions{
		PageSize: 100,
	})
	require.NoError(s.T, err)
	assert.GreaterOrEqual(s.T, len(docs), numDocs)
}

// TestErrorHandling tests error conditions.
func (s *AdapterTestSuite) TestErrorHandling() {
	ctx := context.Background()
	ds := s.Provider.DocumentStorage()

	s.T.Run("GetNonExistentDocument", func(t *testing.T) {
		_, err := ds.GetDocument(ctx, "non-existent-id")
		assert.Error(t, err)
		assert.ErrorIs(t, err, storage.ErrNotFound)
	})

	s.T.Run("UpdateNonExistentDocument", func(t *testing.T) {
		content := "new content"
		_, err := ds.UpdateDocument(ctx, "non-existent-id", &storage.DocumentUpdate{
			Content: &content,
		})
		assert.Error(t, err)
		assert.ErrorIs(t, err, storage.ErrNotFound)
	})

	s.T.Run("DeleteNonExistentDocument", func(t *testing.T) {
		err := ds.DeleteDocument(ctx, "non-existent-id")
		// Should not error for idempotent delete
		assert.NoError(t, err)
	})

	s.T.Run("CreateWithInvalidData", func(t *testing.T) {
		_, err := ds.CreateDocument(ctx, &storage.DocumentCreate{
			Name:           "", // Invalid: empty name
			ParentFolderID: "docs",
			Content:        "content",
			Owner:          "test@example.com",
		})
		assert.Error(t, err)
		assert.ErrorIs(t, err, storage.ErrInvalidInput)
	})
}

// Additional test methods for other operations...
```

### Test for Each Adapter
```go
// Test localworkspace adapter
func TestLocalWorkspaceAdapter(t *testing.T) {
	adapter, err := localworkspace.NewAdapter(&localworkspace.Config{
		BasePath: t.TempDir(),
	})
	require.NoError(t, err)

	suite := NewAdapterTestSuite(t, adapter)
	suite.RunAllTests()
}

// Test Google adapter (when implemented)
func TestGoogleAdapter(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping Google adapter test in short mode")
	}

	// Only run if credentials available
	if os.Getenv("GOOGLE_APPLICATION_CREDENTIALS") == "" {
		t.Skip("Google credentials not available")
	}

	adapter, err := google.NewAdapter(/* config */)
	require.NoError(t, err)

	suite := NewAdapterTestSuite(t, adapter)
	suite.RunAllTests()
}
```

## Test Coverage

### Operations to Test
- [x] Document CRUD
  - [ ] Create document
  - [ ] Get document
  - [ ] Update document (content, metadata)
  - [ ] Delete document
  - [ ] List documents
  - [ ] List with filters (owner, parent, status)

- [x] Template Operations
  - [ ] Copy document
  - [ ] Replace text placeholders
  - [ ] Create from template

- [x] Folder Operations
  - [ ] Create folder
  - [ ] Get folder
  - [ ] Get subfolder
  - [ ] List subfolders

- [x] Document Movement
  - [ ] Move between folders
  - [ ] Move draft to published

- [x] Frontmatter Handling (localworkspace)
  - [ ] Parse frontmatter
  - [ ] Serialize frontmatter
  - [ ] Handle missing frontmatter
  - [ ] Handle malformed frontmatter

- [x] Concurrency
  - [ ] Concurrent reads
  - [ ] Concurrent writes
  - [ ] Race condition prevention

- [x] Error Handling
  - [ ] Not found errors
  - [ ] Invalid input errors
  - [ ] Permission errors (if applicable)
  - [ ] Concurrent modification errors

## Implementation Plan

### Day 1: Framework Setup
- [ ] Create integration_test.go
- [ ] Define AdapterTestSuite
- [ ] Set up test helpers
- [ ] Add testdata fixtures

### Day 2: Core Operations
- [ ] TestDocumentCreation
- [ ] TestDocumentRetrieval
- [ ] TestDocumentUpdate
- [ ] TestDocumentDeletion

### Day 3: Advanced Operations
- [ ] TestDocumentListing
- [ ] TestTemplateInstantiation
- [ ] TestTextReplacement
- [ ] TestDocumentCopy
- [ ] TestDocumentMove

### Day 4: Folders & Concurrency
- [ ] TestFolderOperations
- [ ] TestSubfolderRetrieval
- [ ] TestConcurrentOperations

### Day 5: Error Handling & Polish
- [ ] TestErrorHandling
- [ ] Add performance benchmarks
- [ ] Documentation
- [ ] CI integration

## CI Integration

### Makefile Target
```makefile
.PHONY: test/integration
test/integration:
	@echo "Running integration tests..."
	go test -v -tags=integration ./pkg/storage/adapters/... -timeout=5m

.PHONY: test/integration/short
test/integration/short:
	@echo "Running integration tests (short mode)..."
	go test -v -tags=integration -short ./pkg/storage/adapters/... -timeout=2m
```

### GitHub Actions
```yaml
- name: Run Integration Tests
  run: make test/integration/short
  env:
    GOOGLE_APPLICATION_CREDENTIALS: ${{ secrets.GCP_CREDENTIALS }}
```

## Success Criteria

- [ ] All example operations converted to tests
- [ ] Tests pass for localworkspace adapter
- [ ] Tests are reusable for future adapters
- [ ] Tests run in <2 minutes
- [ ] No flaky tests
- [ ] Clear test failure messages
- [ ] Integrated with CI
- [ ] Documentation updated

## Related TODOs

- TODO_API_STORAGE_MIGRATION.md - API handlers will use these adapters
- TODO_UNIT_TESTS.md - Unit tests for individual functions
- TODO_API_TEST_SUITE.md - API-level integration tests

## Notes

- Keep tests adapter-agnostic where possible
- Use build tags for slow tests (`//go:build integration`)
- Provide both short and full test modes
- Document expected behavior clearly
- Test with realistic data volumes
- Consider property-based testing for edge cases
