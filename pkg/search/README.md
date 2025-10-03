# Search Abstraction

This package provides an abstraction layer for search operations in Hermes, enabling support for multiple search backends through a common interface.

## Overview

The search abstraction allows Hermes to work with different search providers (e.g., Algolia, Meilisearch) without changing the application code. This provides several benefits:

- **Flexibility**: Switch between search backends without code changes
- **Local Development**: Use local search engines without external API keys
- **Cost Optimization**: Choose between managed and self-hosted search
- **Testing**: Easy to mock or use local search for tests
- **Future-Proof**: Add new search providers without refactoring

## Architecture

The abstraction consists of three main interfaces:

### Provider
The main interface that provides access to document and draft search operations:

```go
type Provider interface {
    DocumentIndex() DocumentIndex
    DraftIndex() DraftIndex
    Name() string
    Healthy(ctx context.Context) error
}
```

### DocumentIndex
Handles operations on published documents:

```go
type DocumentIndex interface {
    Index(ctx context.Context, doc *Document) error
    IndexBatch(ctx context.Context, docs []*Document) error
    Delete(ctx context.Context, docID string) error
    DeleteBatch(ctx context.Context, docIDs []string) error
    Search(ctx context.Context, query *SearchQuery) (*SearchResult, error)
    GetFacets(ctx context.Context, facetNames []string) (*Facets, error)
    Clear(ctx context.Context) error
}
```

### DraftIndex
Handles operations on draft documents (same methods as DocumentIndex):

```go
type DraftIndex interface {
    Index(ctx context.Context, doc *Document) error
    IndexBatch(ctx context.Context, docs []*Document) error
    Delete(ctx context.Context, docID string) error
    DeleteBatch(ctx context.Context, docIDs []string) error
    Search(ctx context.Context, query *SearchQuery) (*SearchResult, error)
    GetFacets(ctx context.Context, facetNames []string) (*Facets, error)
    Clear(ctx context.Context) error
}
```

## Adapters

### Algolia Adapter

The Algolia adapter implements the search abstraction using Algolia as the backend.

**Example Usage:**

```go
import (
    "context"
    "github.com/hashicorp-forge/hermes/pkg/search/adapters/algolia"
)

cfg := &algolia.Config{
    AppID:           "YOUR_APP_ID",
    WriteAPIKey:     "YOUR_WRITE_KEY",
    SearchAPIKey:    "YOUR_SEARCH_KEY",
    DocsIndexName:   "hermes_docs",
    DraftsIndexName: "hermes_drafts",
}

provider, err := algolia.NewAdapter(cfg)
if err != nil {
    log.Fatal(err)
}

// Check health
if err := provider.Healthy(context.Background()); err != nil {
    log.Printf("Search backend unhealthy: %v", err)
}

// Index a document
doc := &search.Document{
    ObjectID:  "doc-123",
    DocID:     "doc-123",
    Title:     "My RFC",
    DocNumber: "RFC-001",
    DocType:   "RFC",
    Product:   "Terraform",
    Status:    "Approved",
    Owners:    []string{"user@example.com"},
    Content:   "Document content...",
}

err = provider.DocumentIndex().Index(context.Background(), doc)
if err != nil {
    log.Printf("Failed to index document: %v", err)
}

// Search documents
results, err := provider.DocumentIndex().Search(context.Background(), &search.SearchQuery{
    Query:   "terraform",
    Page:    1,
    PerPage: 10,
    Filters: map[string][]string{
        "product": []string{"terraform"},
        "status":  []string{"approved"},
    },
})
```

### Future Adapters

The abstraction is designed to support additional adapters:

- **Meilisearch Adapter** (planned): For local development and self-hosted search
- **Elasticsearch Adapter** (future): For enterprise deployments
- **Mock Adapter** (future): For testing without external dependencies

## Data Types

### Document

Represents a searchable document with all necessary metadata:

```go
type Document struct {
    ObjectID     string
    DocID        string
    Title        string
    DocNumber    string
    DocType      string
    Product      string
    Status       string
    Owners       []string
    Contributors []string
    Approvers    []string
    Summary      string
    Content      string
    CreatedTime  int64
    ModifiedTime int64
    CustomFields map[string]interface{}
    IndexedAt    time.Time
}
```

### SearchQuery

Defines search parameters:

```go
type SearchQuery struct {
    Query            string
    Page             int
    PerPage          int
    Filters          map[string][]string
    Facets           []string
    SortBy           string
    SortOrder        string
    HighlightPreTag  string
    HighlightPostTag string
}
```

### SearchResult

Contains search results:

```go
type SearchResult struct {
    Hits       []*Document
    TotalHits  int
    Page       int
    PerPage    int
    TotalPages int
    Facets     *Facets
    QueryTime  time.Duration
}
```

## Error Handling

The package provides standard error types:

- `ErrNotFound`: Document not found in index
- `ErrInvalidQuery`: Malformed search query
- `ErrBackendUnavailable`: Search backend not accessible
- `ErrIndexingFailed`: Document indexing failed

Errors are wrapped in a `search.Error` type that provides context:

```go
type Error struct {
    Op  string // Operation that failed
    Err error  // Underlying error
    Msg string // Additional context
}
```

## Testing

Run tests with:

```bash
# Unit tests
go test ./pkg/search/...

# With coverage
go test ./pkg/search/... -cover

# Verbose output
go test ./pkg/search/... -v
```

## Implementation Status

### Completed ✅
- Core interfaces defined
- Algolia adapter created
- Basic CRUD operations
- Unit tests
- Documentation

### In Progress 🚧
- Full search implementation with filters and facets
- Batch operations optimization
- Integration tests with real Algolia

### Planned 📋
- Meilisearch adapter
- Mock adapter for testing
- Migration guide from direct Algolia usage
- Performance benchmarks
- Extended query capabilities

## Migration Path

For existing code using `pkg/algolia` directly:

1. The existing `pkg/algolia` package remains unchanged
2. New code should use `pkg/search` with the Algolia adapter
3. Gradually migrate existing code to use the abstraction
4. Once migration is complete, consider deprecating direct Algolia usage

## References

- [TODO_SEARCH_ABSTRACTION.md](../../docs-internal/TODO_SEARCH_ABSTRACTION.md) - Full implementation plan
- [Algolia Go Client](https://github.com/algolia/algoliasearch-client-go)
- [Meilisearch](https://www.meilisearch.com/) - Future adapter target
