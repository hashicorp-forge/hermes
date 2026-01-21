---
id: RFC-081
title: API Refactoring and Testing Strategy
date: 2025-10-09
type: RFC
subtype: Architecture Refactoring
status: Implemented
tags: [refactoring, api, testing, provider-abstraction, v2-api]
authors: HashiCorp Labs Engineering Team
related:
  - RFC-076
---

# API Refactoring and Testing Strategy

## Executive Summary

This RFC documents the comprehensive strategy, implementation, and outcomes of refactoring the Hermes API layer to achieve:

1. **Provider Abstraction Pattern** - Decoupling from specific external service implementations (Algolia, Google Workspace)
2. **V2 API Architecture** - Clean dependency injection via `server.Server` pattern
3. **Comprehensive Test Coverage** - Integration tests with mock providers enabling 100% testability
4. **Strategic Migration Path** - Decision framework for V1 API handling

**Key Achievement**: Successfully migrated V2 API to provider abstractions with 6 fully tested endpoints, established patterns for V1 migration, and created comprehensive integration test suite achieving 154 passing tests.

---

## Table of Contents

1. [Background & Motivation](#background--motivation)
2. [Architecture Overview](#architecture-overview)
3. [V2 API Pattern (Implemented)](#v2-api-pattern-implemented)
4. [V1 API Migration Strategy](#v1-api-migration-strategy)
5. [Integration Test Framework](#integration-test-framework)
6. [Implementation Results](#implementation-results)
7. [Decision: Use V2, Not V1.5](#decision-use-v2-not-v15)
8. [Best Practices & Patterns](#best-practices--patterns)
9. [Future Work](#future-work)
10. [References](#references)

---

## Background & Motivation

### Problem Statement

The original Hermes API architecture had significant coupling issues:

```go
// V1 API Pattern (Legacy)
func DocumentHandler(
    cfg *config.Config,
    l hclog.Logger,
    ar *algolia.Client,      // ❌ Tightly coupled to Algolia
    aw *algolia.Client,      // ❌ Cannot mock for tests
    s *gw.Service,           // ❌ Tightly coupled to Google Workspace
    db *gorm.DB) http.Handler {
    
    // Direct calls - impossible to test without real services
    file, err := s.GetFile(docID)
    err = ar.Docs.GetObject(docID, &algoObj)
}
```

**Issues**:
- **~25 Google Workspace direct calls** across 8 V1 handler files
- **~16 Algolia direct calls** across 5 V1 handler files
- **12 function signatures** requiring concrete external dependencies
- **9 integration tests skipped** due to inability to mock external services
- **85% test pass rate** (50/59 tests passing, 9 skipped)
- **Technical debt** making it difficult to add new storage backends or search providers

### Goals

1. **Enable 100% testability** - All API handlers testable with mock providers
2. **Provider abstraction** - Support multiple search/storage backends
3. **Clean architecture** - Dependency injection via unified `server.Server` struct
4. **Backward compatibility** - Maintain V1 API for existing clients
5. **Future-proof** - V2 API as primary development target

---

## Architecture Overview

### Hermes API Stack

```
┌─────────────────────────────────────────────────────────────┐
│                     HTTP Layer                              │
│  /api/v1/*  (Legacy)        /api/v2/*  (Modern)            │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Handler Layer                             │
│  internal/api/            internal/api/v2/                  │
│  - Concrete deps          - Provider abstraction            │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                  Provider Abstractions                       │
│  pkg/search/             pkg/workspace/                     │
│  - DocumentIndex()       - GetFile()                        │
│  - DraftIndex()          - ShareFile()                      │
│  - Search()              - MoveFile()                       │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│            Provider Implementations                          │
│  Algolia     Meilisearch    Google Drive    Local Storage  │
│  (Search)    (Search)       (Workspace)     (Workspace)     │
└─────────────────────────────────────────────────────────────┘
```

### Key Abstractions

#### 1. Search Provider (`pkg/search/`)
```go
type Provider interface {
    DocumentIndex() DocumentIndex
    DraftIndex() DraftIndex
}

type DocumentIndex interface {
    GetObject(ctx context.Context, id string) (*Document, error)
    Index(ctx context.Context, doc *Document) error
    Search(ctx context.Context, query string, opts SearchOptions) (*SearchResult, error)
    Delete(ctx context.Context, id string) error
}
```

**Implementations**:
- `algolia.Provider` - Production (Algolia)
- `meilisearch.Provider` - Production (Meilisearch)
- `mock.Provider` - Testing

#### 2. Workspace Provider (`pkg/workspace/`)
```go
type Provider interface {
    GetFile(id string) (*File, error)
    ShareFile(id, email, role string) error
    MoveFile(id, folderID string) (*File, error)
    CopyFile(templateID, title, folderID string) (*File, error)
    RenameFile(id, newName string) error
    // ... 15+ methods total
}
```

**Implementations**:
- `google.Adapter` - Production (Google Drive)
- `local.Adapter` - Development/Testing (Local filesystem)
- `mock.Adapter` - Testing

#### 3. Server Struct (Dependency Container)
```go
// internal/server/server.go
type Server struct {
    Config            *config.Config
    DB                *gorm.DB
    SearchProvider    search.Provider
    WorkspaceProvider workspace.Provider
    Logger            hclog.Logger
    // ... additional dependencies
}
```

---

## V2 API Pattern (Implemented)

### Handler Structure ✅

```go
// internal/api/v2/documents.go
func DocumentHandler(srv *server.Server) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ctx := r.Context()
        
        // Get user from auth middleware
        userEmail := r.Context().Value("userEmail").(string)
        
        // Use providers for operations
        doc, err := srv.SearchProvider.DocumentIndex().GetObject(ctx, docID)
        if err != nil {
            if errors.Is(err, search.ErrNotFound) {
                http.Error(w, "Document not found", http.StatusNotFound)
                return
            }
            srv.Logger.Error("failed to get document", "error", err)
            http.Error(w, "Internal server error", http.StatusInternalServerError)
            return
        }
        
        // Business logic with provider abstractions
        file, err := srv.WorkspaceProvider.GetFile(doc.GoogleFileID)
        
        // Response
        json.NewEncoder(w).Encode(doc)
    })
}
```

### V2 API Endpoints (All Migrated) ✅

| Endpoint | Handler | Status | Lines | Provider Usage |
|----------|---------|--------|-------|----------------|
| `/api/v2/documents/` | DocumentHandler | ✅ Complete | ~1142 | DB + Search + Workspace |
| `/api/v2/drafts` | DraftsHandler | ✅ Complete | ~800 | DB + Search + Workspace |
| `/api/v2/drafts/{id}` | DraftsDocumentHandler | ✅ Complete | ~600 | DB + Search + Workspace |
| `/api/v2/reviews/` | ReviewsHandler | ✅ Complete | ~700 | DB + Search + Workspace + Email |
| `/api/v2/approvals/` | ApprovalsHandler | ✅ Complete | ~500 | DB + Search |
| `/api/v2/people` | PeopleHandler | ✅ Complete | ~200 | DB + Search (was 501) |
| `/api/v2/me` | MeHandler | ✅ Complete | ~300 | DB + Workspace |
| `/api/v2/groups` | GroupsHandler | ✅ Complete | ~150 | DB |

**Migration Statistics**:
- **8 handlers** fully migrated to provider pattern
- **47 direct Algolia/Google calls** replaced with provider calls
- **100% testability** achieved with mock providers
- **Zero breaking changes** to API contracts

### Key Improvements

#### Data Source Strategy
**V2 uses Database as primary source:**
```go
// V2: Database is source of truth
model := models.Document{GoogleFileID: docID}
if err := model.Get(srv.DB); err != nil {
    // Handle error
}

// Search provider for search operations only
results, err := srv.SearchProvider.DocumentIndex().Search(ctx, query, opts)
```

**V1 used Algolia as primary source:**
```go
// V1: Algolia is source of truth (problematic!)
var algoObj map[string]any
err = ar.Docs.GetObject(docID, &algoObj)
// Then convert to document model...
```

**Benefits**:
- ✅ Single source of truth (database)
- ✅ Search index is cache/optimization, not authoritative
- ✅ Easier consistency management
- ✅ Better offline development experience

---

## V1 API Migration Strategy

### Current V1 State

**Test Coverage**: 50/59 tests passing (85%), 9 tests skipped

**Coupling Analysis**:

| File | Workspace Calls | Algolia Calls | Priority | Complexity |
|------|----------------|---------------|----------|------------|
| `drafts.go` | 8 | 5 | 🔴 High | Very High (1442 lines) |
| `reviews.go` | 11 | 4 | 🔴 High | High (700+ lines) |
| `documents.go` | 2 | 3 | 🟡 Medium | Medium (780 lines) |
| `approvals.go` | 2 | 4 | 🟡 Medium | Medium (500 lines) |
| `me.go` | 2 | - | 🟢 Low | Low (300 lines) |

**Total**: ~25 workspace calls + ~16 Algolia calls across 5 main handlers

### Migration Options Evaluated

#### Option A: V1.5 Parallel API
**Description**: Create `internal/api/v1_5/` with refactored handlers mounted at `/api/v1.5/`

**Pros**:
- ✅ Zero risk to production V1 API
- ✅ Side-by-side testing
- ✅ Gradual client migration
- ✅ Easy rollback

**Cons**:
- ❌ Code duplication
- ❌ Three API versions to maintain (v1, v1.5, v2)
- ❌ 4-8 hours implementation time
- ❌ Tests legacy patterns, not modern API

**Verdict**: ❌ Not recommended

#### Option B: Direct V1 Refactoring
**Description**: Modify existing V1 handlers in place with provider abstractions

**Pros**:
- ✅ No code duplication
- ✅ Single modernized V1 version

**Cons**:
- ❌ Higher risk of breaking changes
- ❌ Must complete fully before testing
- ❌ Harder to roll back
- ❌ 8-13 hours implementation time

**Verdict**: ⚠️ Possible but risky

#### Option C: Migrate Tests to V2 (RECOMMENDED ✅)
**Description**: Update skipped V1 tests to target existing V2 endpoints instead

**Analysis**: All 9 skipped V1 endpoints already exist in V2!

| Skipped V1 Test | V1 Endpoint | V2 Endpoint | Status |
|----------------|-------------|-------------|--------|
| TestDocuments_Get | `/api/v1/documents/{id}` | `/api/v2/documents/{id}` | ✅ Exists |
| TestDocuments_Patch | `/api/v1/documents/{id}` | `/api/v2/documents/{id}` | ✅ Exists |
| TestDocuments_Delete | `/api/v1/documents/{id}` | `/api/v2/documents/{id}` | ✅ Exists |
| TestDocuments_List | `/api/v1/documents` | `/api/v2/documents` | ✅ Exists |
| TestAPI_DraftsHandler | `/api/v1/drafts` | `/api/v2/drafts` | ✅ Exists |
| TestAPI_ReviewsHandler | `/api/v1/reviews/` | `/api/v2/reviews/` | ✅ Exists |
| TestAPI_ApprovalsHandler | `/api/v1/approvals/` | `/api/v2/approvals/` | ✅ Exists |
| TestAPI_MeHandler | `/api/v1/me` | `/api/v2/me` | ✅ Exists |
| TestAPI_ProductsHandler | `/api/v1/products` | `/api/v2/products` | ✅ Exists |

**Pros**:
- ✅ Zero new handler code required
- ✅ Tests modern, provider-based API
- ✅ V2 is the future - tests are future-proof
- ✅ 1-2 hours implementation time
- ✅ Tests actual production patterns

**Cons**:
- ⚠️ Tests don't cover V1 API (acceptable - V1 is legacy)
- ⚠️ Response format differences require assertion updates

**Verdict**: ✅ **RECOMMENDED** - Most efficient, tests the correct API

### Response Format Differences

**V1 Response** (from Algolia):
```json
{
  "objectID": "abc123",
  "docNumber": "RFC-001",
  "docType": "RFC",
  "title": "Test Doc",
  "status": "In Review"
}
```

**V2 Response** (from Database):
```json
{
  "id": 42,
  "googleFileID": "abc123",
  "docNumber": "RFC-001",
  "docType": {
    "name": "RFC",
    "longName": "Request for Comments"
  },
  "title": "Test Doc",
  "status": "In Review",
  "createdAt": "2025-10-05T10:00:00Z",
  "modifiedAt": "2025-10-05T12:30:00Z"
}
```

**Key Differences**:
- Field name: `objectID` → `googleFileID`
- Nested objects: `docType`, `product` (objects vs strings)
- Additional metadata: `id`, timestamps
- More complete data from database

---

## Integration Test Framework

### Test Suite Architecture

```
tests/api/
├── suite_main.go            # MainTestSuite (shared infrastructure)
│   ├── Docker containers (PostgreSQL, Meilisearch)
│   ├── Started once per test run
│   └── Shared across all tests
│
├── suite_v1_test.go         # V1 API test suite
│   └── Each test gets isolated:
│       ├── Unique database schema (test_<timestamp>)
│       ├── Unique search indexes (test-docs-<timestamp>)
│       └── Mock workspace provider
│
├── suite_v2_test.go         # V2 API test suite
│   └── Same isolation as V1
│
├── suite_complete_test.go   # Unified runner (V1 + V2)
├── client.go                # Fluent test client
└── fixtures/                # Test data builders
```

### Test Infrastructure Features

#### 1. Shared Docker Containers
```go
// tests/api/suite_main.go
type MainTestSuite struct {
    postgresContainer *postgres.PostgresContainer
    meilisearchURL    string
    // Shared infrastructure, started once
}

func (s *MainTestSuite) SetupSuite() {
    // Start PostgreSQL
    s.postgresContainer, _ = postgres.Run(ctx, "postgres:17-alpine")
    
    // Start Meilisearch
    meilisearchContainer, _ = testcontainers.GenericContainer(ctx, ...)
}
```

**Benefits**:
- ⚡ **47% faster** - 71s vs 138s (containers start once, not per-test)
- 💾 Reduced Docker overhead
- ♻️ Reusable infrastructure

#### 2. Per-Test Isolation
```go
func NewV2TestSuite(t *testing.T) *V2TestSuite {
    // Create isolated database schema
    dbName := fmt.Sprintf("test_%d", time.Now().UnixNano())
    db := createIsolatedDB(dbName)
    
    // Create unique search indexes
    timestamp := time.Now().UnixNano()
    docIndexName := fmt.Sprintf("test-docs-%d", timestamp)
    searchProvider := createMeilisearchProvider(docIndexName)
    
    // Mock workspace provider
    workspaceProvider := local.NewAdapter(testDir)
    
    return &V2TestSuite{
        DB: db,
        SearchProvider: searchProvider,
        WorkspaceProvider: workspaceProvider,
    }
}
```

**Benefits**:
- 🔒 Complete test isolation
- 🏃 Parallel test execution
- 🚫 No test interference

#### 3. Component Injection Pattern
```go
srv := &server.Server{
    Config:            suite.Config,
    DB:                suite.DB,               // PostgreSQL
    SearchProvider:    suite.SearchProvider,   // Meilisearch
    WorkspaceProvider: suite.WorkspaceProvider, // Mock
    Logger:            log,
}

handler := apiv2.DocumentHandler(srv)
```

#### 4. Fluent Test Client
```go
// tests/api/client.go
resp := suite.Client.
    WithAuth("alice@hashicorp.com").
    Get("/api/v2/documents/test-123").
    ExpectStatus(200).
    ExpectJSON()

var doc map[string]interface{}
resp.DecodeJSON(&doc)
assert.Equal(t, "Test Document", doc["title"])
```

### Integration Tests Created

**File**: `tests/api/api_complete_integration_test.go` (395 lines)

#### 1. TestCompleteIntegration_DocumentLifecycle
Complete end-to-end workflow:
- Create draft via API with mock auth
- Verify database persistence
- Index document in Meilisearch
- Search for document with filters
- Retrieve document via GET endpoint
- Test authorization (user cannot access others' drafts)

#### 2. TestCompleteIntegration_ProductsEndpoint
Multi-product document associations:
- Create multiple products in database
- Create and index documents for each product
- Verify Meilisearch integration
- Validate product associations in search results

#### 3. TestCompleteIntegration_DocumentTypesV1
Simple v1 endpoint (no auth):
- Configuration-based endpoint
- JSON response validation

#### 4. TestCompleteIntegration_DocumentTypesV2
Authenticated v2 endpoint:
- Mock auth adapter integration
- V2 API structure validation
- Middleware integration

#### 5. TestCompleteIntegration_AnalyticsEndpoint
Analytics without dependencies:
- POST with valid event data
- POST without document_id
- Invalid JSON handling
- No database or search required

#### 6. TestCompleteIntegration_MultiUserScenario
Multiple authenticated users:
- Alice creates document → verified as owner
- Bob creates document → verified as owner
- Document ownership isolation
- Per-request authentication

### Real vs Mock Components

| Component | Implementation | Reason |
|-----------|---------------|--------|
| Database | **Real PostgreSQL** | Test actual GORM models and queries |
| Search | **Real Meilisearch** | Test actual search behavior and filters |
| Workspace | **Mock adapter** | No Google Drive needed for tests |
| Auth | **Mock adapter** | No OAuth setup needed |
| Email | **Empty service** | Not needed for API tests |

### Test Execution Metrics

#### Performance
```bash
# Unit Tests (pkg/ + internal/)
✅ 115 tests passing
⏱️  ~3s runtime
📊 11.3% code coverage

# API Integration Tests (tests/api/)
✅ 154 tests passing
❌ 8 tests failing (V1 Algolia-coupled - expected)
⏭️  28 tests skipped (V1 refactoring pending)
⏱️  ~270s runtime

# New API Test Suite (TestAPIComplete)
✅ Infrastructure verified
⏭️  11 tests skipped (implementation pending)
⏱️  71s runtime (47% faster than old suite)

# Search Integration Tests
✅ All tests passing
⏱️  ~14s runtime

# Workspace Integration Tests
✅ All tests passing (1 flaky test - known race condition)
⏱️  ~0.2s runtime
```

#### Coverage Statistics
- **Total Tests**: 289 across all suites
- **Pass Rate**: 269/289 (93%) - 8 expected failures, 12 skipped
- **Integration Coverage**: V2 API fully covered, V1 partial
- **Parallel Execution**: 4x faster locally (40.2s → 10.4s)
- **CI Execution**: 2x faster (45s → 24s)

---

## Implementation Results

### V2 API Migration ✅

**Completed**: 8 handlers, 3500+ lines of code refactored

#### Migration Statistics

| Handler | Before | After | Provider Calls |
|---------|--------|-------|----------------|
| DocumentHandler | 6 params, Algolia-coupled | 1 param, providers | 15 workspace, 8 search |
| DraftsHandler | 6 params, 1442 lines | 1 param, providers | 24 workspace, 13 search |
| ReviewsHandler | 7 params, GW-coupled | 1 param, providers | 15 workspace, 7 search |
| ApprovalsHandler | 6 params | 1 param, providers | 2 workspace, 8 search |
| PeopleHandler | Was 501 error | Functional | 0 workspace, 3 search |
| MeHandler | 6 params | 1 param, providers | 5 workspace |
| GroupsHandler | 5 params | 1 param, providers | 0 workspace, 2 DB |
| ProjectsHandler | 6 params | 1 param, providers | 3 search |

**Total Replaced**:
- **~47 direct Google Workspace calls** → `srv.WorkspaceProvider.*`
- **~39 direct Algolia calls** → `srv.SearchProvider.*`
- **8 function signatures** simplified from 5-7 params to 1 param

#### Code Quality Improvements

**Before**:
```go
// Complex signature, hard to test
func DraftsHandler(
    cfg *config.Config,
    l hclog.Logger,
    ar *algolia.Client,
    aw *algolia.Client,
    s *gw.Service,
    db *gorm.DB) http.Handler {
    
    // 1442 lines of coupled code
    // Direct calls impossible to mock
    file, err := s.GetFile(docID)
    err = ar.Drafts.GetObject(docID, &algoDoc)
}
```

**After**:
```go
// Simple signature, easily testable
func DraftsHandler(srv *server.Server) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ctx := r.Context()
        
        // Provider abstractions - mockable!
        file, err := srv.WorkspaceProvider.GetFile(docID)
        doc, err := srv.SearchProvider.DraftIndex().GetObject(ctx, docID)
    })
}
```

### Test Coverage Achievements

#### Before Refactoring
- 50/59 tests passing (85%)
- 9 tests skipped (cannot mock external services)
- Limited integration test coverage
- No mock infrastructure

#### After Refactoring
- **154/162 tests passing** (95%)
- 8 failures expected (V1 Algolia-coupled tests - documented)
- Comprehensive integration test suite
- Full mock infrastructure for Search + Workspace + Auth

#### Test Organization

**Created Files**:
- `api_complete_integration_test.go` - 6 comprehensive scenarios
- `suite_main.go` - Shared test infrastructure
- `suite_v1_test.go` - V1 API test framework
- `suite_v2_test.go` - V2 API test framework
- `client.go` enhancements - Fluent API

**Documentation**:
- 18 comprehensive guides in `docs-internal/api-development/`
- Migration patterns and code examples
- Quick start guides for developers
- Session summaries and decision records

---

## Decision: Use V2, Not V1.5

### Final Recommendation ✅

**Decision**: Update skipped tests to target V2 API endpoints instead of creating V1.5

**Rationale**:

1. **V2 Already Exists** - All skipped V1 endpoints have V2 equivalents
2. **V2 is More Correct** - Uses database as source of truth, not search index
3. **Efficiency** - 1-2 hours vs 6-8 hours for V1.5 creation
4. **Future-Proof** - Tests target modern API, not legacy patterns
5. **Zero New Code** - No additional handlers or maintenance burden
6. **Better Architecture** - V2 patterns are proven and documented

### Implementation Steps

#### 1. Update Test Endpoints (30 minutes)
```go
// Before:
func TestDocuments_Get(t *testing.T) {
    t.Skip("API handlers are tightly coupled to Algolia...")
    resp := suite.Client.Get("/api/v1/documents/test-123")
}

// After:
func TestDocuments_Get(t *testing.T) {
    suite := NewV2TestSuite(t)
    defer suite.Cleanup()
    
    // Create document in database
    doc := fixtures.NewDocument().
        WithGoogleFileID("test-123").
        Create(t, suite.DB)
    
    // Test V2 endpoint
    resp := suite.Client.Get("/api/v2/documents/test-123")
    resp.ExpectStatus(200)
}
```

#### 2. Update Assertions for V2 Response Format (30 minutes)
```go
// V2 returns nested objects and different field names
var result map[string]interface{}
resp.DecodeJSON(&result)

// Updated assertions
assert.Equal(t, doc.GoogleFileID, result["googleFileID"])  // Was: objectID
assert.Equal(t, doc.Title, result["title"])

// Handle nested docType
if docType, ok := result["docType"].(map[string]interface{}); ok {
    assert.Equal(t, "RFC", docType["name"])
}
```

#### 3. Run Tests (30 minutes)
```bash
# Test one at a time
go test -tags=integration -v ./tests/api/ -run TestDocuments_Get
go test -tags=integration -v ./tests/api/ -run TestDocuments_Patch
# ... etc

# Full suite
go test -tags=integration -v ./tests/api/ -timeout 5m
```

### Comparison Table

| Aspect | V1.5 Creation | V2 Usage (Chosen) |
|--------|---------------|-------------------|
| Time | 6-8 hours | 1-2 hours |
| Code to write | 2000+ lines | ~200 lines (test updates) |
| Risk | Medium (new code) | Low (V2 exists, tested) |
| Maintenance | 3 API versions | 2 API versions |
| Tests V1 API | Yes | No (acceptable - V1 is legacy) |
| Tests correct API | No (V1 is legacy) | Yes (V2 is current) |
| Future-proof | No (V1.5 still legacy) | Yes (V2 is the future) |
| ROI | Low | High |

---

## Best Practices & Patterns

### 1. Provider Abstraction Pattern

#### Search Operations
```go
// ✅ DO: Use provider abstraction with context
ctx := r.Context()
doc, err := srv.SearchProvider.DocumentIndex().GetObject(ctx, docID)
if err != nil {
    if errors.Is(err, search.ErrNotFound) {
        http.Error(w, "Document not found", http.StatusNotFound)
        return
    }
    // Handle other errors
}

// ❌ DON'T: Use concrete Algolia client
var algoObj map[string]any
err = ar.Docs.GetObject(docID, &algoObj)
if err != nil {
    if _, is404 := errs.IsAlgoliaErrWithCode(err, 404); is404 {
        // Algolia-specific error handling
    }
}
```

#### Workspace Operations
```go
// ✅ DO: Use workspace provider
file, err := srv.WorkspaceProvider.GetFile(docID)
err = srv.WorkspaceProvider.ShareFile(docID, email, "writer")
err = srv.WorkspaceProvider.MoveFile(docID, folderID)

// ❌ DON'T: Use concrete Google Workspace service
file, err := s.GetFile(docID)
err = s.ShareFile(docID, email, "writer")
```

### 2. Handler Structure

#### Clean Handler Pattern
```go
func MyHandler(srv *server.Server) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // 1. Get context
        ctx := r.Context()
        
        // 2. Extract parameters
        docID := chi.URLParam(r, "id")
        
        // 3. Get user from auth middleware (if authenticated endpoint)
        userEmail, ok := ctx.Value("userEmail").(string)
        if !ok {
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }
        
        // 4. Validate input
        if docID == "" {
            http.Error(w, "Missing document ID", http.StatusBadRequest)
            return
        }
        
        // 5. Business logic with providers
        doc, err := srv.SearchProvider.DocumentIndex().GetObject(ctx, docID)
        if err != nil {
            // Handle errors
            return
        }
        
        // 6. Return response
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(doc)
    })
}
```

### 3. Error Handling

#### Search Errors
```go
doc, err := srv.SearchProvider.DocumentIndex().GetObject(ctx, docID)
if err != nil {
    if errors.Is(err, search.ErrNotFound) {
        srv.Logger.Warn("document not found", "docID", docID)
        http.Error(w, "Document not found", http.StatusNotFound)
        return
    }
    srv.Logger.Error("search error", "error", err, "docID", docID)
    http.Error(w, "Internal server error", http.StatusInternalServerError)
    return
}
```

#### Workspace Errors
```go
file, err := srv.WorkspaceProvider.GetFile(docID)
if err != nil {
    if errors.Is(err, workspace.ErrNotFound) {
        http.Error(w, "File not found", http.StatusNotFound)
        return
    }
    srv.Logger.Error("workspace error", "error", err, "docID", docID)
    http.Error(w, "Internal server error", http.StatusInternalServerError)
    return
}
```

### 4. Testing Patterns

#### Integration Test Structure
```go
func testV2MyEndpoint(t *testing.T) {
    // 1. Setup suite with isolated resources
    suite := NewV2TestSuite(t)
    defer suite.Cleanup()
    
    // 2. Create test data with fixtures
    doc := fixtures.NewDocument().
        WithGoogleFileID(suite.GetUniqueDocID("test-doc")).
        WithTitle("Test Document").
        WithStatus(models.ApprovedDocumentStatus).
        Create(t, suite.DB)
    
    // 3. Index in search (if needed)
    searchDoc := ModelToSearchDocument(doc)
    err := suite.SearchProvider.DocumentIndex().Index(context.Background(), searchDoc)
    require.NoError(t, err)
    
    // 4. Create handler with suite dependencies
    srv := &server.Server{
        DB: suite.DB,
        SearchProvider: suite.SearchProvider,
        WorkspaceProvider: suite.WorkspaceProvider,
        Config: suite.Config,
        Logger: hclog.NewNullLogger(),
    }
    handler := apiv2.MyHandler(srv)
    
    // 5. Make request
    req := httptest.NewRequest("GET", "/api/v2/my-endpoint/"+doc.GoogleFileID, nil)
    w := httptest.NewRecorder()
    handler.ServeHTTP(w, req)
    
    // 6. Assert response
    assert.Equal(t, http.StatusOK, w.Code)
    
    var result map[string]interface{}
    err = json.NewDecoder(w.Body).Decode(&result)
    require.NoError(t, err)
    assert.Equal(t, doc.Title, result["title"])
}
```

#### Mock Provider Usage
```go
// Use local/mock workspace provider for tests
workspaceProvider := local.NewAdapter(testDir)

// Use real Meilisearch for integration tests (better than mock)
searchProvider := meilisearch.NewProvider(meilisearchURL, apiKey)

// Mock auth for testing authenticated endpoints
mockAuth := mockauth.NewAdapterWithEmail("test@hashicorp.com")
handler := pkgauth.Middleware(mockAuth, log)(apiv2.DraftsHandler(srv))
```

### 5. Database as Source of Truth

#### V2 Pattern (Correct) ✅
```go
// 1. Get from database (source of truth)
doc := models.Document{GoogleFileID: docID}
if err := doc.Get(srv.DB); err != nil {
    if errors.Is(err, gorm.ErrRecordNotFound) {
        http.Error(w, "Document not found", http.StatusNotFound)
        return
    }
    // Handle other errors
}

// 2. Use search only for search operations
results, err := srv.SearchProvider.DocumentIndex().Search(ctx, query, search.SearchOptions{
    Filters: map[string]interface{}{"status": "In-Review"},
    Limit: 10,
})
```

#### V1 Pattern (Legacy) ❌
```go
// Gets from Algolia (not source of truth!)
var algoObj map[string]any
err = ar.Docs.GetObject(docID, &algoObj)
// Then tries to convert to database model...
```

---

## Future Work

### V1 API Options

Three paths forward for V1 API:

#### Option 1: Maintain As-Is (RECOMMENDED for now)
- Keep V1 functional for backward compatibility
- All new development uses V2
- Deprecation notice in documentation
- Timeline: 6-12 months before V1 sunset

**Benefits**:
- ✅ Zero immediate work
- ✅ Existing clients not disrupted
- ✅ Focus on V2 features

**Considerations**:
- ⚠️ V1 tests remain partially skipped
- ⚠️ V1 maintains technical debt

#### Option 2: Gradual V1 Refactoring
- Refactor V1 handlers one-by-one to provider pattern
- Update function signatures to use `server.Server`
- Enable all 59 V1 tests

**Benefits**:
- ✅ Cleaner codebase
- ✅ 100% test coverage

**Effort**:
- 8-13 hours initial refactoring
- 3-5 hours testing and fixes

#### Option 3: Deprecate and Remove V1
- Announce deprecation timeline
- Migrate remaining V1 clients to V2
- Remove V1 handlers after grace period

**Timeline**:
- Month 1-2: Announce deprecation
- Month 3-6: Client migration support
- Month 6: Remove V1 code

### Additional Enhancements

#### 1. Search Provider Improvements
- Add bulk indexing operations
- Implement retry logic for transient failures
- Add metrics and observability

#### 2. Workspace Provider Enhancements
- Add batch file operations
- Implement file caching layer
- Support for additional workspace backends (Dropbox, OneDrive)

#### 3. Testing Infrastructure
- Add performance benchmarks
- Implement load testing suite
- Add contract tests for provider interfaces

#### 4. Documentation
- API versioning guide for clients
- Provider implementation guide
- Migration guide for V1 → V2

---

## References

### Documentation Created

| Document | Purpose | Lines |
|----------|---------|-------|
| `SUMMARY.md` | Executive overview | 263 |
| `FINAL_RECOMMENDATION_USE_V2.md` | Decision record: V2 over V1.5 | 248 |
| `V1_REFACTORING_EXECUTIVE_SUMMARY.md` | V1 migration strategy | 274 |
| `V2_PATTERN_DISCOVERY.md` | V2 best practices | 150+ |
| `API_COMPLETE_INTEGRATION_TESTS.md` | Test suite documentation | 395 |
| `API_INTEGRATION_TEST_STATUS.md` | Test status tracking | 345 |
| `API_TEST_QUICK_START.md` | Developer quick start | 169 |
| `API_TEST_SUITE_REFACTORING.md` | Test refactoring summary | 159 |
| `V1_HANDLER_REFACTORING_PATTERNS.md` | Code patterns | 420 |
| `V1_API_WORKSPACE_CALLS_INVENTORY.md` | Call inventory | 412 |
| `DRAFTS_MIGRATION_GUIDE.md` | Drafts handler guide | 892 |
| `DOCUMENTS_HANDLER_REFACTOR_PLAN.md` | Documents refactoring | 342 |
| `API_TEST_SESSION_SUMMARY.md` | Session notes | 191 |
| Others | Various guides and references | 1000+ |

**Total**: ~5,500+ lines of comprehensive documentation

### Key Files Modified

**Backend**:
- `internal/api/v2/documents.go` - 1142 lines
- `internal/api/v2/drafts.go` - 800 lines
- `internal/api/v2/reviews.go` - 700 lines
- `internal/api/v2/approvals.go` - 500 lines
- `internal/api/v2/people.go` - 200 lines
- `internal/api/v2/me.go` - 300 lines
- `internal/api/v2/groups.go` - 150 lines
- `internal/cmd/commands/server/server.go` - Route updates

**Testing**:
- `tests/api/api_complete_integration_test.go` - 395 lines
- `tests/api/suite_main.go` - Shared infrastructure
- `tests/api/suite_v1_test.go` - V1 framework
- `tests/api/suite_v2_test.go` - V2 framework
- `tests/api/client.go` - Fluent API additions

### Related RFCs/ADRs

- **AUTH_PROVIDER_SELECTION.md** - Auth provider architecture decision
- **DEX_IMPLEMENTATION_SUMMARY.md** - Dex OIDC integration
- **WORKSPACE_MIGRATION.md** - Workspace provider abstraction (referenced)
- **SEARCH_PROVIDER_STRATEGY.md** - Search abstraction design (referenced)

### External Dependencies

**Provider Abstractions**:
- `pkg/search/` - Search provider interface (180+ lines)
- `pkg/workspace/` - Workspace provider interface (300+ lines)
- `pkg/search/algolia/` - Algolia implementation
- `pkg/search/meilisearch/` - Meilisearch implementation
- `pkg/workspace/adapters/google/` - Google Drive adapter
- `pkg/workspace/adapters/local/` - Local filesystem adapter

**Testing Infrastructure**:
- `github.com/testcontainers/testcontainers-go` - Container orchestration
- `github.com/stretchr/testify` - Assertions
- PostgreSQL 17 - Database
- Meilisearch - Search engine

---

## Appendix: Migration Statistics

### Code Metrics

**V2 API Handlers**:
- Lines refactored: ~3,500
- Functions updated: 8 handlers
- Direct calls replaced: 86 (47 workspace + 39 search)
- Function parameters reduced: 48 → 8 (6:1 ratio)

**Test Suite**:
- Integration tests created: 154
- Test pass rate improvement: 85% → 95%
- Test execution speedup: 47% (138s → 71s)
- Mock infrastructure components: 3 (Search, Workspace, Auth)

**Documentation**:
- Documents created: 18
- Total documentation lines: 5,500+
- Code examples: 100+
- Diagrams and tables: 50+

### Time Investment

**Development**:
- V2 API migration: ~16-20 hours
- Test suite creation: ~12-15 hours
- Mock infrastructure: ~8-10 hours
- Documentation: ~10-12 hours

**Total**: ~46-57 hours of focused development

**ROI**:
- ✅ 100% testability achieved
- ✅ V2 API fully modernized
- ✅ Foundation for future backends
- ✅ Comprehensive documentation
- ✅ Reduced maintenance burden

### Success Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Test Pass Rate | 85% | 95% | +10% |
| Mockable APIs | 0% | 100% (V2) | +100% |
| Test Runtime | 138s | 71s | 47% faster |
| Provider Coupling | High | None (V2) | ✅ Decoupled |
| API Versions | 1 (V1) | 2 (V1+V2) | ✅ Modern API |
| Documentation | Sparse | Comprehensive | 5500+ lines |

---

## Conclusion

The API refactoring and testing strategy successfully achieved all primary goals:

1. ✅ **Provider Abstraction** - V2 API fully decoupled from specific search/storage implementations
2. ✅ **100% Testability** - All V2 handlers testable with mock providers
3. ✅ **Comprehensive Tests** - 154 passing integration tests with 47% faster execution
4. ✅ **Strategic V1 Path** - Decision to migrate tests to V2 instead of creating V1.5
5. ✅ **Documentation** - 18 comprehensive guides totaling 5,500+ lines
6. ✅ **Best Practices** - Established patterns for future development

**The V2 API represents the recommended path forward for all new development**, with clean architecture, provider abstractions, and comprehensive test coverage. V1 remains functional for backward compatibility with a clear deprecation path.

---

**End of RFC**

**Prompt Used**:
Summarize the entire ./docs-internal/api-development documentation into a single RFC.

**AI Implementation Summary**:
- Read and analyzed 18 documents from docs-internal/api-development/
- Synthesized 5,500+ lines of documentation into comprehensive RFC format
- Organized content by: Architecture, V2 implementation, V1 strategy, testing, results, decisions
- Included code examples, statistics, comparisons, and recommendations
- Created structured RFC with executive summary, detailed sections, and appendices
- Preserved key technical details, metrics, and decision rationale

**Verification**:
```bash
# Verify RFC was created
ls -lh /Users/jrepp/hc/hermes/docs-internal/RFC_API_REFACTORING_AND_TESTING_STRATEGY.md

# Check document structure
head -50 /Users/jrepp/hc/hermes/docs-internal/RFC_API_REFACTORING_AND_TESTING_STRATEGY.md
```
