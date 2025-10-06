# Provider Interface Extensions - Architectural Change Request

**Status**: Planning  
**Created**: 2025-01-05  
**Priority**: Medium  
**Complexity**: High (Cross-cutting change across 3+ adapters)

## Executive Summary

The current `workspace.Provider` interface is insufficient for several V1 API endpoints that require advanced directory search, complex filtering, and data consistency validation. This document outlines a structured plan to extend the Provider interface in a maintainable and extensible way.

## Current Limitations

### 1. Directory Search Limitations
**Affected**: `internal/api/people.go` POST endpoint (returns 501)

**Current State**:
```go
// workspace.Provider only supports:
SearchPeople(email string, fields string) ([]*people.Person, error)
```

**Original Functionality** (Google Workspace specific):
```go
s.People.SearchDirectoryPeople().
    Query(req.Query).              // Free-text search
    ReadMask("photos,emailAddresses").  // Field selection
    Sources("DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE").  // Source filtering
    Do()
```

**Gap**: Cannot perform directory-wide searches with query strings, only exact email lookups.

### 2. Search Query OR Filters
**Affected**: `internal/api/drafts.go` GET endpoint

**Gap**: Cannot express `WHERE (owners CONTAINS user) OR (contributors CONTAINS user)` in `search.SearchQuery`.

### 3. Data Consistency Validation
**Affected**: Multiple endpoints in `drafts.go`, `documents.go`, `reviews.go`, `approvals.go`

**Gap**: The `compareAlgoliaAndDatabaseDocument()` function needs migration to work with `search.Provider` instead of Algolia-specific structures.

### 4. Subcollection Handlers
**Affected**: Related resources and shareable endpoints in `drafts.go` (return 501)

**Gap**: Handler functions need provider-based implementations.

## Proposed Architecture

### Design Principles

1. **Interface Segregation**: Don't force all adapters to implement features they don't support
2. **Capability Discovery**: Allow runtime detection of advanced features
3. **Graceful Degradation**: Provide fallback behavior when features unavailable
4. **Backward Compatibility**: Existing code continues working unchanged
5. **Adapter Autonomy**: Each adapter can optimize for its backend

### Solution 1: Extended People Service Interface

**Approach**: Add optional advanced search capabilities while keeping basic interface simple.

```go
// In pkg/workspace/provider.go

// PeopleSearchOptions contains advanced search parameters
type PeopleSearchOptions struct {
    Query       string   // Free-text search query
    Fields      []string // Fields to return (e.g., "photos", "emailAddresses")
    Sources     []string // Source types (e.g., "DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE")
    MaxResults  int      // Maximum number of results
    PageToken   string   // Pagination token
}

// Provider interface additions
type Provider interface {
    // ... existing methods ...
    
    // SearchPeople performs simple email-based lookup (existing)
    SearchPeople(email string, fields string) ([]*people.Person, error)
    
    // SearchDirectory performs advanced directory search (NEW)
    // Returns empty slice if adapter doesn't support advanced search
    SearchDirectory(opts PeopleSearchOptions) ([]*people.Person, error)
}

// ProviderCapabilities allows runtime feature detection (NEW)
type ProviderCapabilities interface {
    // SupportsDirectorySearch returns true if SearchDirectory is functional
    SupportsDirectorySearch() bool
    
    // SupportsORFilters returns true if search supports OR filter logic
    SupportsORFilters() bool
}

// Optional interface that providers can implement
type CapableProvider interface {
    Provider
    ProviderCapabilities
}
```

**Adapter Implementation Strategy**:

- **Google Adapter**: Full implementation using `People.SearchDirectoryPeople()`
- **Local Adapter**: Basic implementation searching local people directory
- **Mock Adapter**: Test implementation with configurable responses

**Handler Usage Pattern**:
```go
// In internal/api/people.go POST handler
if capProvider, ok := workspaceProvider.(workspace.CapableProvider); ok {
    if capProvider.SupportsDirectorySearch() {
        results, err := workspaceProvider.SearchDirectory(workspace.PeopleSearchOptions{
            Query: req.Query,
            Fields: []string{"photos", "emailAddresses"},
            Sources: []string{"DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE"},
        })
        // Use results...
    }
}
// Otherwise fall back to 501 or limited functionality
```

### Solution 2: Search Query OR Filter Support

**Approach**: Extend `search.SearchQuery` with filter composition support.

```go
// In pkg/search/search.go

// FilterOperator defines logical operators for filter composition
type FilterOperator string

const (
    FilterOperatorAND FilterOperator = "AND"
    FilterOperatorOR  FilterOperator = "OR"
)

// FilterGroup represents a group of filters with a logical operator
type FilterGroup struct {
    Operator FilterOperator
    Filters  []string
}

// SearchQuery additions
type SearchQuery struct {
    Query     string
    Filters   []string      // Simple filters (implicit AND)
    FilterGroups []FilterGroup  // NEW: Complex filter logic
    Facets    []string
    Page      int
    HitsPerPage int
    SortBy    string
    SortOrder string
}
```

**Adapter Implementation**:

- **Meilisearch**: Translate to filter syntax: `owners = "user@example.com" OR contributors = "user@example.com"`
- **Algolia**: Translate to facet filters with OR operator
- **Mock**: In-memory filtering with OR logic

**Handler Usage**:
```go
// In internal/api/drafts.go GET handler
searchQuery := &search.SearchQuery{
    Query: "*",
    FilterGroups: []search.FilterGroup{
        {
            Operator: search.FilterOperatorOR,
            Filters: []string{
                fmt.Sprintf("owners:%s", userEmail),
                fmt.Sprintf("contributors:%s", userEmail),
            },
        },
    },
    // ... other params
}
```

### Solution 3: Data Consistency Validation Framework

**Approach**: Create adapter-agnostic document comparison utilities.

```go
// In internal/api/helpers.go

// DocumentConsistencyChecker validates documents across storage layers
type DocumentConsistencyChecker struct {
    searchProvider    search.Provider
    db                *gorm.DB
    logger            hclog.Logger
}

// CheckOptions configures consistency validation
type CheckOptions struct {
    ValidateOwners       bool
    ValidateContributors bool
    ValidateProduct      bool
    ValidateReviews      bool
    StrictMode           bool  // Return error vs. log warning
}

// CheckDocumentConsistency validates a document across search and database
func (c *DocumentConsistencyChecker) CheckDocumentConsistency(
    ctx context.Context,
    docID string,
    opts CheckOptions,
) error {
    // 1. Get document from search index
    searchDoc, err := c.searchProvider.DocumentIndex().GetObject(ctx, docID)
    if err != nil {
        return fmt.Errorf("search index lookup failed: %w", err)
    }
    
    // 2. Get document from database
    var dbDoc models.Document
    if err := c.db.Where("google_file_id = ?", docID).
        Preload("Product").
        Preload("DocumentReviews").
        First(&dbDoc).Error; err != nil {
        return fmt.Errorf("database lookup failed: %w", err)
    }
    
    // 3. Validate owners
    if opts.ValidateOwners && len(searchDoc.Owners) == 0 {
        return fmt.Errorf("document %s missing owners in search index", docID)
    }
    
    // 4. Validate contributors
    if opts.ValidateContributors && len(searchDoc.Contributors) == 0 {
        c.logger.Warn("document missing contributors", "doc_id", docID)
    }
    
    // 5. Validate product association
    if opts.ValidateProduct {
        if searchDoc.Product == "" {
            return fmt.Errorf("document %s missing product", docID)
        }
        if dbDoc.Product == nil {
            return fmt.Errorf("document %s missing product in database", docID)
        }
    }
    
    // 6. Compare reviews
    if opts.ValidateReviews {
        // Compare searchDoc review data with dbDoc.DocumentReviews
        // Implementation details...
    }
    
    return nil
}
```

**Handler Integration**:
```go
// In internal/api/drafts.go POST handler (after document creation)
checker := &DocumentConsistencyChecker{
    searchProvider: searchProvider,
    db:             db,
    logger:         l,
}

if err := checker.CheckDocumentConsistency(ctx, f.Id, CheckOptions{
    ValidateOwners:  true,
    ValidateProduct: true,
    StrictMode:      false,  // Log warnings, don't fail request
}); err != nil {
    l.Warn("document consistency check failed", "error", err, "doc_id", f.Id)
}
```

### Solution 4: Subcollection Handler Migration

**Approach**: Create provider-based handler functions with clear signatures.

```go
// In internal/api/drafts.go or new file internal/api/subcollections.go

// documentsResourceRelatedResourcesHandler handles related resources subcollection
func documentsResourceRelatedResourcesHandler(
    w http.ResponseWriter,
    r *http.Request,
    docID string,
    doc document.Document,
    cfg *config.Config,
    l hclog.Logger,
    searchProvider search.Provider,
    workspaceProvider workspace.Provider,
    db *gorm.DB,
) {
    // Migration from Algolia-based implementation
    // Query database for related resources instead of Algolia internal index
    var relatedResources []models.RelatedResource
    if err := db.Where("document_id = ?", docID).Find(&relatedResources).Error; err != nil {
        l.Error("error fetching related resources", "error", err, "doc_id", docID)
        http.Error(w, "Error fetching related resources", http.StatusInternalServerError)
        return
    }
    
    // Convert to API response format
    // ... implementation
}

// draftsShareableHandler handles shareable drafts
func draftsShareableHandler(
    w http.ResponseWriter,
    r *http.Request,
    docID string,
    doc document.Document,
    cfg config.Config,
    l hclog.Logger,
    searchProvider search.Provider,
    workspaceProvider workspace.Provider,
    db *gorm.DB,
) {
    // Check if document is marked shareable in database
    var dbDoc models.Document
    if err := db.Where("google_file_id = ?", docID).First(&dbDoc).Error; err != nil {
        l.Error("error fetching document", "error", err, "doc_id", docID)
        http.Error(w, "Error fetching document", http.StatusInternalServerError)
        return
    }
    
    // Return shareable status
    response := map[string]bool{"shareable": dbDoc.ShareableAsDraft}
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}
```

## Implementation Plan

### Phase 1: Foundation (1-2 weeks)
**Goal**: Extend interfaces without breaking existing code

1. Add `PeopleSearchOptions` struct to `pkg/workspace/provider.go`
2. Add `SearchDirectory()` method to `Provider` interface with default no-op implementations
3. Add `ProviderCapabilities` interface and helper functions
4. Update all adapters to implement new method (return empty slice for basic adapters)
5. Add comprehensive unit tests for new interfaces

**Deliverables**:
- Updated `Provider` interface
- Capability detection helpers
- All adapters compile and pass existing tests

### Phase 2: Google Adapter Implementation (1 week)
**Goal**: Full-featured implementation for production use

1. Implement `SearchDirectory()` in Google adapter using `People.SearchDirectoryPeople()`
2. Implement `SupportsDirectorySearch()` returning true
3. Add integration tests with real Google Workspace API (or mocked)
4. Performance testing and optimization

**Deliverables**:
- Fully functional Google adapter
- Integration test coverage
- Performance benchmarks

### Phase 3: Search Query Enhancement (1 week)
**Goal**: Support OR filters in search operations

1. Extend `search.SearchQuery` with `FilterGroups` and `FilterOperator`
2. Update Meilisearch adapter to translate OR filters
3. Update Mock adapter for testing
4. Add search query builder helpers for common patterns

**Deliverables**:
- Enhanced search query structure
- Meilisearch OR filter support
- Test coverage for complex queries

### Phase 4: Handler Migrations (2 weeks)
**Goal**: Enable all currently-disabled endpoints

1. Migrate `people.go` POST handler to use `SearchDirectory()`
2. Migrate `drafts.go` GET handler to use OR filters
3. Implement subcollection handlers with provider pattern
4. Create `DocumentConsistencyChecker` utility
5. Update all data consistency check locations

**Deliverables**:
- All 501 endpoints functional
- Data consistency validation working
- Integration tests for all migrated endpoints

### Phase 5: Documentation & Cleanup (3 days)
**Goal**: Ensure maintainability

1. Update provider interface documentation
2. Create adapter implementation guide
3. Add examples for common patterns
4. Remove all FIXME comments
5. Performance audit and optimization

**Deliverables**:
- Comprehensive documentation
- Implementation examples
- Performance report

## Testing Strategy

### Unit Tests
- Each new interface method has isolated tests
- Mock adapters with configurable behavior
- Edge case coverage (empty results, errors, etc.)

### Integration Tests
- End-to-end tests for each migrated endpoint
- Tests with real Meilisearch instance
- Tests with mock workspace provider

### Regression Tests
- Ensure existing functionality unchanged
- Verify backward compatibility
- Performance benchmarks show no degradation

## Success Criteria

1. ✅ All 501 endpoints return proper responses
2. ✅ No breaking changes to existing API contracts
3. ✅ All adapters implement core interfaces
4. ✅ Test coverage >80% for new code
5. ✅ Documentation complete and reviewed
6. ✅ Performance within 10% of baseline

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Google API changes break adapter | High | Abstract Google-specific code, version pinning |
| OR filters not supported in search backend | Medium | Fallback to multiple queries + merge results |
| Performance degradation with complex queries | Medium | Implement caching, query optimization |
| Breaking changes to existing code | High | Comprehensive regression testing, feature flags |

## Future Extensions

Once this foundation is in place, consider:

1. **Batch Operations**: Support bulk document operations
2. **Advanced Caching**: Provider-level caching for common queries
3. **Query Builder**: Fluent API for constructing complex queries
4. **Async Operations**: Support for long-running operations
5. **Audit Logging**: Track all provider operations for compliance

## References

- Original Algolia implementation: `internal/api/people.go` (git history)
- Current Provider interface: `pkg/workspace/provider.go`
- Search abstraction: `pkg/search/search.go`
- Related ADRs: (to be created)

## Approval & Sign-off

- [ ] Technical Review
- [ ] Architecture Review
- [ ] Security Review
- [ ] Performance Review
- [ ] Documentation Review

---

**Next Steps**: Create tracking issues for each phase, assign ownership, schedule kickoff meeting.
