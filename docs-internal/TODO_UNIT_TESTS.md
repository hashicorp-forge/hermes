# TODO: Additional Unit Test Coverage

**Status**: In Progress (tests/api/ @ 11.8%)  
**Priority**: Medium  
**Effort**: Medium (2-3 weeks)  
**Dependencies**: None

## 🤖 Agent Workflow Available

**NEW**: Systematic workflow for AI agents to improve test coverage iteratively.

- **Quick Start**: See `AGENT_QUICK_REFERENCE.md` (one-page guide)
- **Full Workflow**: See `AGENT_WORKFLOW_TEST_COVERAGE.md` (comprehensive process)
- **Current Targets**: See `COVERAGE_OPPORTUNITIES.md` (prioritized list)

These documents provide copy-paste ready commands, decision trees, and prompts for AI agents to continue coverage improvements autonomously.

## Overview

Expand unit test coverage across the codebase to improve reliability, catch regressions early, and support refactoring efforts. Current coverage is good for models but sparse in business logic and utilities.

**Progress**: `tests/api/` unit coverage improved from 8.5% → 11.8%, ModelToSearchDocument at 100%.

## Current State

### Well-Tested Areas ✅
- `pkg/models/*` - Comprehensive database model tests (28+ test suites)
- `pkg/hashicorpdocs/rfc_test.go` - RFC parsing tests
- `internal/api/documents_test.go`, `helpers_test.go` - Some API handler tests
- `internal/helpers/helpers_test.go` - Helper function tests

### Under-Tested Areas ⚠️

#### pkg/ Packages (0% coverage)
- [ ] `pkg/algolia/` - Algolia client and proxy
  - Test search query building
  - Test index operations (mock Algolia API)
  - Test error handling
  - Test pagination

- [ ] `pkg/document/` - Document operations
  - Test `replace_header.go` logic
  - Test document transformation
  - Test error cases

- [ ] `pkg/googleworkspace/` (now `pkg/storage/adapters/google/`)
  - Test helper functions
  - Test OAuth flow
  - Test API error handling
  - Test rate limiting/backoff
  - Mock Google API responses

- [ ] `pkg/hashicorpdocs/` - Document type handlers
  - Test PRD header replacement
  - Test FRD header replacement
  - Test locked document detection
  - Test common functions

- [ ] `pkg/links/` - Short link generation
  - Test redirect logic
  - Test link generation
  - Test data encoding/decoding

- [ ] `pkg/storage/` - Storage abstraction
  - Test interface compliance
  - Test error handling
  - Test type conversions

- [ ] `pkg/storage/adapters/localworkspace/` - Local storage
  - Test adapter operations
  - Test frontmatter parsing
  - Test metadata operations
  - Test file operations
  - Test concurrent access

#### internal/ Packages (Sparse coverage)

**API Handlers** (High Priority)
- [ ] `internal/api/analytics.go`
  - Test event tracking
  - Test data aggregation

- [ ] `internal/api/approvals.go`
  - Test approval workflow
  - Test state transitions
  - Test error cases

- [ ] `internal/api/document_types.go`
  - Test CRUD operations
  - Test custom fields

- [ ] `internal/api/drafts.go`
  - Test draft creation
  - Test publishing workflow
  - Test shareable links

- [ ] `internal/api/me.go`
  - Test user profile retrieval
  - Test preferences
  - Test error handling

- [ ] `internal/api/people.go`
  - Test search functionality
  - Test filtering
  - Test pagination

- [ ] `internal/api/products.go`
  - Test product management
  - Test associations

- [ ] `internal/api/reviews.go`
  - Test review creation
  - Test status updates
  - Test notifications

- [ ] `internal/api/v2/*` - V2 API handlers
  - Test all v2 endpoints
  - Test backward compatibility
  - Test new features

**Authentication & Authorization**
- [ ] `internal/auth/auth.go`
  - Test authentication flow
  - Test token validation
  - Test error cases

- [ ] `internal/auth/google/google.go`
  - Test Google OAuth integration
  - Test token exchange
  - Mock Google responses

- [ ] `internal/auth/oktaalb/oktaalb.go`
  - Test Okta integration
  - Test JWT validation

**Configuration**
- [ ] `internal/config/config.go`
  - Test config parsing
  - Test validation
  - Test defaults
  - Test environment overrides

- [ ] `internal/config/helpers.go`
  - Test utility functions

**Database**
- [ ] `internal/db/db.go`
  - Test connection handling
  - Test migrations
  - Test error handling

**Email**
- [ ] `internal/email/email.go`
  - Test template rendering
  - Test email sending (mock SMTP)
  - Test error handling

**Indexer**
- [ ] `internal/indexer/indexer.go`
  - Test document indexing flow
  - Test error handling
  - Test batch operations
  - Mock Algolia calls

- [ ] `internal/indexer/refresh_docs_headers.go`
  - Test header refresh logic
  - Test document type detection

- [ ] `internal/indexer/refresh_drafts_headers.go`
  - Test draft header refresh

- [ ] `internal/indexer/refresh_headers.go`
  - Test common refresh logic

**Jira Integration**
- [ ] `internal/jira/service.go`
  - Test API integration
  - Test error handling
  - Mock Jira API responses

**Feature Flags**
- [ ] `internal/pkg/doctypes/`
  - Test document type detection
  - Test type-specific logic

- [ ] `internal/pkg/featureflags/`
  - Test flag evaluation
  - Test default values

**Server**
- [ ] `internal/server/server.go`
  - Test server initialization
  - Test middleware setup
  - Test error handling

**Datadog**
- [ ] `internal/datadog/datadog.go`
  - Test metrics emission
  - Test tracing
  - Mock Datadog client

## Testing Strategy

### Unit Test Patterns

#### 1. Table-Driven Tests
```go
func TestDocumentValidation(t *testing.T) {
	tests := []struct {
		name    string
		input   *Document
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid document",
			input: &Document{
				ID:    "123",
				Name:  "Test Doc",
				Owner: "user@example.com",
			},
			wantErr: false,
		},
		{
			name: "missing ID",
			input: &Document{
				Name:  "Test Doc",
				Owner: "user@example.com",
			},
			wantErr: true,
			errMsg:  "ID is required",
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateDocument(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateDocument() error = %v, wantErr %v", err, tt.wantErr)
			}
			if tt.wantErr && err != nil && !strings.Contains(err.Error(), tt.errMsg) {
				t.Errorf("Expected error containing %q, got %q", tt.errMsg, err.Error())
			}
		})
	}
}
```

#### 2. Mock External Services
```go
// Create mock implementations
type mockAlgoliaClient struct {
	searchFunc func(query string) ([]Document, error)
}

func (m *mockAlgoliaClient) Search(query string) ([]Document, error) {
	if m.searchFunc != nil {
		return m.searchFunc(query)
	}
	return nil, nil
}

// Use in tests
func TestDocumentSearch(t *testing.T) {
	mock := &mockAlgoliaClient{
		searchFunc: func(query string) ([]Document, error) {
			return []Document{{ID: "1", Name: "Test"}}, nil
		},
	}
	
	results, err := SearchDocuments(mock, "test query")
	// assertions...
}
```

#### 3. Test Helpers
```go
// Create reusable test data builders
func newTestDocument(t *testing.T, opts ...func(*Document)) *Document {
	t.Helper()
	doc := &Document{
		ID:    generateTestID(),
		Name:  "Test Document",
		Owner: "test@example.com",
	}
	for _, opt := range opts {
		opt(doc)
	}
	return doc
}

// Use in tests
func TestSomething(t *testing.T) {
	doc := newTestDocument(t, func(d *Document) {
		d.Name = "Custom Name"
	})
	// ...
}
```

### Coverage Goals

| Package Type | Current | Target | Priority |
|--------------|---------|--------|----------|
| Models | ~90% | 95% | Low (already good) |
| API Handlers | ~20% | 80% | High |
| Business Logic | ~10% | 75% | High |
| Utilities | ~30% | 80% | Medium |
| Integrations | ~5% | 60% | Medium |

## Implementation Plan

### Week 1: Core Business Logic
- [ ] `pkg/document/` tests
- [ ] `pkg/hashicorpdocs/` tests
- [ ] `pkg/links/` tests
- [ ] `pkg/storage/` tests

### Week 2: API Handlers (Part 1)
- [ ] `internal/api/documents.go` tests
- [ ] `internal/api/drafts.go` tests
- [ ] `internal/api/reviews.go` tests

### Week 3: API Handlers (Part 2) & Integrations
- [ ] `internal/api/people.go` tests
- [ ] `internal/api/products.go` tests
- [ ] `internal/algolia/` tests
- [ ] `internal/indexer/` tests

### Week 4: Infrastructure & Polish
- [ ] `internal/auth/` tests
- [ ] `internal/config/` tests
- [ ] `internal/email/` tests
- [ ] Coverage report generation
- [ ] Documentation

## Tools & Infrastructure

### Test Utilities to Create
- [ ] Mock storage provider factory
- [ ] Test database helpers (extend existing)
- [ ] Mock HTTP client
- [ ] Mock Algolia client
- [ ] Mock Google API client
- [ ] Test data fixtures
- [ ] Assertion helpers

### CI Integration
- [ ] Add coverage reporting to CI
- [ ] Set coverage thresholds
- [ ] Block PRs below threshold
- [ ] Generate coverage badges

### Documentation
- [ ] Testing guidelines in `CONTRIBUTING.md`
- [ ] Mock usage examples
- [ ] Test data management guide

## Success Criteria

- [ ] Overall code coverage >75%
- [ ] All public APIs have tests
- [ ] Critical paths have >90% coverage
- [ ] Tests run in <30 seconds (unit only)
- [ ] Zero flaky tests
- [ ] All tests documented with comments

## Related TODOs

- TODO_API_STORAGE_MIGRATION.md - Handler refactoring will need new tests
- TODO_API_TEST_SUITE.md - Integration testing complements unit tests
- TODO_INTEGRATION_TESTS.md - End-to-end test framework

## Notes

- Focus on high-value tests first (critical paths, bug-prone areas)
- Avoid testing implementation details
- Test behavior, not structure
- Keep tests fast and isolated
- Use mocks liberally for external dependencies
- Document test intent clearly
