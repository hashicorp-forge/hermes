# TODO: Build Comprehensive API Test Suite

**Status**: Planned  
**Priority**: High  
**Effort**: Large (4-5 weeks)  
**Dependencies**: TODO_API_STORAGE_MIGRATION.md (for storage abstraction)

## Overview

Build a comprehensive, well-organized test suite for the Hermes API that covers:
- All HTTP endpoints (v1 and v2)
- Authentication and authorization scenarios
- Database state management
- Integration with storage providers
- Error handling and edge cases
- Performance characteristics

## Current State

### Existing Tests
- `internal/api/documents_test.go` - Basic document endpoint tests
- `internal/api/helpers_test.go` - Test helpers
- Tests are ad-hoc, not comprehensive
- No standardized testing framework
- Limited coverage of edge cases

### Gaps
- No v2 API tests
- Missing authorization tests
- No performance tests
- Incomplete error handling coverage
- No load testing
- Missing integration scenarios

## Proposed Structure

```
tests/
├── api/
│   ├── suite.go              # Test suite framework
│   ├── fixtures/             # Test data fixtures
│   │   ├── documents.go
│   │   ├── users.go
│   │   ├── products.go
│   │   └── projects.go
│   ├── helpers/              # Test utilities
│   │   ├── assert.go         # Custom assertions
│   │   ├── client.go         # HTTP test client
│   │   ├── database.go       # DB test helpers
│   │   └── storage.go        # Storage mock helpers
│   ├── v1/                   # V1 API tests
│   │   ├── documents_test.go
│   │   ├── drafts_test.go
│   │   ├── reviews_test.go
│   │   ├── approvals_test.go
│   │   ├── people_test.go
│   │   ├── products_test.go
│   │   ├── projects_test.go
│   │   └── me_test.go
│   ├── v2/                   # V2 API tests
│   │   ├── documents_test.go
│   │   ├── drafts_test.go
│   │   └── reviews_test.go
│   ├── auth/                 # Authentication tests
│   │   ├── google_test.go
│   │   ├── okta_test.go
│   │   └── permissions_test.go
│   ├── integration/          # Cross-feature tests
│   │   ├── document_workflow_test.go
│   │   ├── review_workflow_test.go
│   │   └── publish_workflow_test.go
│   └── performance/          # Performance tests
│       ├── benchmarks_test.go
│       └── load_test.go
└── README.md                 # Test suite documentation
```

## Test Suite Framework

### Base Test Suite
```go
package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/internal/server"
	"github.com/hashicorp-forge/hermes/pkg/storage"
	"gorm.io/gorm"
)

// Suite provides a complete test environment for API tests.
type Suite struct {
	Server   *httptest.Server
	Client   *Client
	DB       *gorm.DB
	Storage  storage.StorageProvider
	Config   *config.Config
	T        *testing.T
}

// NewSuite creates a new test suite with a fresh database and mock storage.
func NewSuite(t *testing.T, opts ...Option) *Suite {
	// Create test database
	db := setupTestDB(t)
	
	// Create mock storage provider
	storage := setupMockStorage(t)
	
	// Create test server
	cfg := defaultTestConfig()
	srv := server.New(cfg, db, storage)
	testServer := httptest.NewServer(srv)
	
	// Create test client
	client := NewClient(testServer.URL)
	
	suite := &Suite{
		Server:  testServer,
		Client:  client,
		DB:      db,
		Storage: storage,
		Config:  cfg,
		T:       t,
	}
	
	// Apply options
	for _, opt := range opts {
		opt(suite)
	}
	
	return suite
}

// Cleanup tears down the test environment.
func (s *Suite) Cleanup() {
	s.Server.Close()
	cleanupTestDB(s.T, s.DB)
}

// Option configures the test suite.
type Option func(*Suite)

// WithRealStorage uses a real storage backend instead of mocks.
func WithRealStorage() Option {
	return func(s *Suite) {
		s.Storage = setupRealStorage(s.T)
	}
}

// WithUser sets up an authenticated user for tests.
func WithUser(email string) Option {
	return func(s *Suite) {
		s.Client.SetAuth(email)
	}
}
```

### Test Client
```go
package api

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"testing"
)

// Client wraps http.Client with test-friendly methods.
type Client struct {
	BaseURL string
	client  *http.Client
	auth    string
}

// NewClient creates a new test client.
func NewClient(baseURL string) *Client {
	return &Client{
		BaseURL: baseURL,
		client:  &http.Client{},
	}
}

// SetAuth sets the authentication token.
func (c *Client) SetAuth(email string) {
	c.auth = email // Simplified for tests
}

// Get performs a GET request.
func (c *Client) Get(t *testing.T, path string) *Response {
	req, err := http.NewRequest("GET", c.BaseURL+path, nil)
	if err != nil {
		t.Fatal(err)
	}
	
	if c.auth != "" {
		req.Header.Set("X-Auth-User", c.auth)
	}
	
	resp, err := c.client.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	
	return &Response{Response: resp, T: t}
}

// Post performs a POST request with JSON body.
func (c *Client) Post(t *testing.T, path string, body interface{}) *Response {
	jsonBody, err := json.Marshal(body)
	if err != nil {
		t.Fatal(err)
	}
	
	req, err := http.NewRequest("POST", c.BaseURL+path, bytes.NewReader(jsonBody))
	if err != nil {
		t.Fatal(err)
	}
	
	req.Header.Set("Content-Type", "application/json")
	if c.auth != "" {
		req.Header.Set("X-Auth-User", c.auth)
	}
	
	resp, err := c.client.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	
	return &Response{Response: resp, T: t}
}

// Response wraps http.Response with test assertions.
type Response struct {
	*http.Response
	T *testing.T
}

// AssertStatus asserts the response status code.
func (r *Response) AssertStatus(expected int) *Response {
	if r.StatusCode != expected {
		body, _ := io.ReadAll(r.Body)
		r.T.Fatalf("Expected status %d, got %d. Body: %s", expected, r.StatusCode, body)
	}
	return r
}

// DecodeJSON decodes the response body as JSON.
func (r *Response) DecodeJSON(v interface{}) *Response {
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		r.T.Fatal(err)
	}
	return r
}
```

### Fixtures
```go
package fixtures

import (
	"testing"
	"time"
	
	"github.com/hashicorp-forge/hermes/pkg/models"
	"gorm.io/gorm"
)

// DocumentBuilder builds test documents.
type DocumentBuilder struct {
	doc *models.Document
}

// NewDocument creates a new document builder.
func NewDocument() *DocumentBuilder {
	return &DocumentBuilder{
		doc: &models.Document{
			GoogleFileID:    generateID(),
			Title:           "Test Document",
			DocumentType:    models.DocumentType{Name: "RFC"},
			Status:          models.StatusWIP,
			DocumentCreated: time.Now(),
			DocumentModified: time.Now(),
		},
	}
}

// WithTitle sets the document title.
func (b *DocumentBuilder) WithTitle(title string) *DocumentBuilder {
	b.doc.Title = title
	return b
}

// WithStatus sets the document status.
func (b *DocumentBuilder) WithStatus(status models.DocumentStatus) *DocumentBuilder {
	b.doc.Status = status
	return b
}

// Create saves the document to the database.
func (b *DocumentBuilder) Create(t *testing.T, db *gorm.DB) *models.Document {
	if err := db.Create(b.doc).Error; err != nil {
		t.Fatal(err)
	}
	return b.doc
}

// Build returns the document without saving.
func (b *DocumentBuilder) Build() *models.Document {
	return b.doc
}
```

## Test Coverage Plan

### V1 API Endpoints

#### Documents (`/api/v1/documents`)
- [ ] **GET /api/v1/documents/:id**
  - [ ] Successfully retrieves document
  - [ ] Returns 404 for non-existent document
  - [ ] Returns 403 for unauthorized access
  - [ ] Includes related resources
  - [ ] Includes custom fields
  - [ ] Handles draft documents

- [ ] **POST /api/v1/documents**
  - [ ] Successfully creates document
  - [ ] Validates required fields
  - [ ] Handles document type templates
  - [ ] Sets default status
  - [ ] Creates in correct folder
  - [ ] Handles custom fields
  - [ ] Returns error for invalid data

- [ ] **PATCH /api/v1/documents/:id**
  - [ ] Successfully updates document
  - [ ] Validates update data
  - [ ] Updates modified timestamp
  - [ ] Handles partial updates
  - [ ] Returns 404 for non-existent document
  - [ ] Returns 403 for unauthorized update

- [ ] **DELETE /api/v1/documents/:id**
  - [ ] Successfully deletes document
  - [ ] Returns 404 for non-existent document
  - [ ] Returns 403 for unauthorized delete
  - [ ] Handles cascade deletes (reviews, etc.)

- [ ] **GET /api/v1/documents**
  - [ ] Lists documents with pagination
  - [ ] Filters by product
  - [ ] Filters by status
  - [ ] Filters by owner
  - [ ] Sorts results
  - [ ] Returns empty array for no results

#### Drafts (`/api/v1/drafts`)
- [ ] **POST /api/v1/drafts**
  - [ ] Creates draft from template
  - [ ] Sets draft status
  - [ ] Creates in drafts folder

- [ ] **POST /api/v1/drafts/:id/publish**
  - [ ] Publishes draft to document
  - [ ] Moves to correct folder
  - [ ] Updates status
  - [ ] Sends notifications

- [ ] **GET /api/v1/drafts/:id/shareable-url**
  - [ ] Generates shareable link
  - [ ] Sets correct permissions
  - [ ] Returns valid URL

#### Reviews (`/api/v1/reviews`)
- [ ] **POST /api/v1/reviews**
  - [ ] Creates review request
  - [ ] Sends notifications
  - [ ] Sets pending status

- [ ] **PATCH /api/v1/reviews/:id**
  - [ ] Updates review status
  - [ ] Handles approve/reject
  - [ ] Validates reviewer authorization

- [ ] **GET /api/v1/reviews/:id**
  - [ ] Retrieves review details
  - [ ] Includes reviewer info
  - [ ] Shows status history

#### Products, Projects, People (Similar patterns)
- [ ] CRUD operations
- [ ] Validation
- [ ] Authorization
- [ ] Pagination/filtering

### V2 API Endpoints
- [ ] Test v2 equivalents
- [ ] Verify backward compatibility
- [ ] Test new v2-specific features

### Authentication & Authorization
- [ ] **Google OAuth**
  - [ ] Successful authentication
  - [ ] Token validation
  - [ ] Token refresh
  - [ ] Invalid token handling

- [ ] **Okta Integration**
  - [ ] JWT validation
  - [ ] Group membership
  - [ ] Role mapping

- [ ] **Permissions**
  - [ ] Document owner permissions
  - [ ] Reviewer permissions
  - [ ] Admin permissions
  - [ ] Product team permissions

### Integration Workflows
- [ ] **Document Creation → Review → Approval → Publish**
  - [ ] Complete workflow
  - [ ] Notifications at each step
  - [ ] State transitions
  - [ ] Error recovery

- [ ] **Draft → Edit → Publish**
  - [ ] Template instantiation
  - [ ] Content updates
  - [ ] Publishing flow

- [ ] **Search Integration**
  - [ ] Document indexed after creation
  - [ ] Search returns created documents
  - [ ] Filters work correctly

### Performance Tests
- [ ] **Benchmarks**
  - [ ] Document retrieval speed
  - [ ] List operations with pagination
  - [ ] Search performance

- [ ] **Load Tests**
  - [ ] Concurrent document creation
  - [ ] Concurrent reads
  - [ ] Database connection pooling

## Implementation Plan

### Phase 1: Foundation (Week 1)
- [ ] Create test suite framework
- [ ] Build test client utilities
- [ ] Set up fixture builders
- [ ] Create mock storage provider
- [ ] Document testing patterns

### Phase 2: V1 Core Endpoints (Week 2)
- [ ] Documents endpoints
- [ ] Drafts endpoints
- [ ] Reviews endpoints
- [ ] Error handling tests

### Phase 3: V1 Supporting Endpoints (Week 3)
- [ ] Products endpoints
- [ ] Projects endpoints
- [ ] People endpoints
- [ ] Me endpoints (profile, subscriptions, etc.)

### Phase 4: V2 API & Auth (Week 4)
- [ ] V2 endpoints
- [ ] Authentication tests
- [ ] Authorization tests
- [ ] Permission matrix tests

### Phase 5: Integration & Performance (Week 5)
- [ ] Workflow tests
- [ ] Performance benchmarks
- [ ] Load tests
- [ ] Documentation

## Success Criteria

- [ ] >90% endpoint coverage
- [ ] All happy paths tested
- [ ] All error paths tested
- [ ] All authorization scenarios tested
- [ ] Tests run in <2 minutes
- [ ] Zero flaky tests
- [ ] Clear test failure messages
- [ ] Documented test patterns
- [ ] CI integration
- [ ] Coverage reports

## Related TODOs

- TODO_API_STORAGE_MIGRATION.md - Storage abstraction enables better testing
- TODO_UNIT_TESTS.md - Unit tests complement integration tests
- TODO_INTEGRATION_TESTS.md - Example migration to proper framework

## Notes

- Use httptest for all API tests
- Mock external dependencies (Algolia, Google APIs)
- Test with both mock and real storage providers
- Separate fast unit-style API tests from slow integration tests
- Generate API documentation from tests
- Keep tests readable and maintainable
- Focus on behavior, not implementation
