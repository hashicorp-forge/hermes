# Meilisearch Adapter

This package provides a Meilisearch implementation of the `search.Provider` interface for Hermes.

## Overview

Meilisearch is an open-source, lightweight, and fast search engine that can be used as an alternative to Algolia for local development and self-hosted deployments.

## Features

- **Full-text search** with relevance ranking
- **Faceted filtering** (product, docType, status, owners)
- **Sorting** by createdTime, modifiedTime, or title
- **Batch operations** for efficient indexing
- **Health checks** for monitoring

## Configuration

```go
adapter, err := meilisearch.NewAdapter(&meilisearch.Config{
    Host:            "http://localhost:7700",
    APIKey:          "masterKey123",
    DocsIndexName:   "hermes-documents",
    DraftsIndexName: "hermes-drafts",
})
```

## Usage

### Indexing Documents

```go
docIndex := adapter.DocumentIndex()

// Index a single document
doc := &search.Document{
    ObjectID:     "doc-123",
    DocID:        "RFC-001",
    Title:        "API Design Guidelines",
    DocNumber:    "RFC-001",
    DocType:      "RFC",
    Product:      "terraform",
    Status:       "approved",
    Owners:       []string{"user1"},
    Contributors: []string{"user2", "user3"},
    Summary:      "Guidelines for API design",
    Content:      "Full document content...",
    CreatedTime:  time.Now().Unix(),
    ModifiedTime: time.Now().Unix(),
}

err := docIndex.Index(ctx, doc)
```

### Searching Documents

```go
// Basic search
results, err := docIndex.Search(ctx, &search.SearchQuery{
    Query:   "API design",
    Page:    0,
    PerPage: 20,
})

// Search with filters
results, err := docIndex.Search(ctx, &search.SearchQuery{
    Query:   "terraform",
    Page:    0,
    PerPage: 20,
    Filters: map[string][]string{
        "product": {"terraform"},
        "status":  {"approved", "published"},
    },
    Facets: []string{"product", "docType", "status"},
})

// Search with sorting
results, err := docIndex.Search(ctx, &search.SearchQuery{
    Query:     "latest",
    Page:      0,
    PerPage:   20,
    SortBy:    "modifiedTime",
    SortOrder: "desc",
})
```

### Batch Operations

```go
// Index multiple documents at once
docs := []*search.Document{doc1, doc2, doc3}
err := docIndex.IndexBatch(ctx, docs)

// Delete multiple documents
docIDs := []string{"doc-1", "doc-2", "doc-3"}
err := docIndex.DeleteBatch(ctx, docIDs)
```

### Getting Facets

```go
facets, err := docIndex.GetFacets(ctx, []string{"product", "docType", "status"})
// Returns counts for each facet value
```

## Development Setup

### Using Docker Compose

Start Meilisearch:
```bash
make docker/meilisearch/start
```

Stop Meilisearch:
```bash
make docker/meilisearch/stop
```

Clear Meilisearch data:
```bash
make docker/meilisearch/clear
```

### Start Full Development Environment

Start both PostgreSQL and Meilisearch:
```bash
make docker/dev/start
```

Stop all services:
```bash
make docker/dev/stop
```

### Access Meilisearch UI

Once started, you can access the Meilisearch dashboard at:
http://localhost:7700

Use the master key `masterKey123` for authentication during development.

## Index Configuration

The adapter automatically configures indexes with the following settings:

### Searchable Attributes
- `title`
- `docNumber`
- `summary`
- `content`
- `owners`
- `contributors`

### Filterable Attributes
- `product`
- `docType`
- `status`
- `owners`
- `contributors`
- `approvers`
- `createdTime`
- `modifiedTime`

### Sortable Attributes
- `createdTime`
- `modifiedTime`
- `title`

## Testing

Run unit tests (no Meilisearch required):
```bash
go test -short ./pkg/search/adapters/meilisearch/...
```

Run integration tests (requires Meilisearch running):
```bash
# Start Meilisearch first
make docker/meilisearch/start

# Run all tests
go test ./pkg/search/adapters/meilisearch/...
```

## Filter Syntax

Filters are specified as a map of field names to arrays of values:

```go
Filters: map[string][]string{
    "product": {"terraform"},           // Single value: product = "terraform"
    "status":  {"approved", "published"}, // Multiple values: status IN ["approved", "published"]
}
```

This translates to Meilisearch filter syntax:
```
product = "terraform" AND status IN ["approved", "published"]
```

## Performance Considerations

- **Batch operations**: Use `IndexBatch` and `DeleteBatch` for bulk operations
- **Pagination**: Use appropriate `PerPage` values (20-50 recommended)
- **Filtering**: Filterable attributes must be configured before filtering
- **Sorting**: Sortable attributes must be configured before sorting
- **Facets**: Facet computation adds minimal overhead

## Comparison with Algolia

| Feature | Meilisearch | Algolia |
|---------|-------------|---------|
| **Hosting** | Self-hosted or cloud | Cloud only |
| **Cost** | Free (self-hosted) | Usage-based pricing |
| **Setup** | Docker container | API keys |
| **Performance** | Very fast (<50ms) | Very fast (<10ms) |
| **Features** | Core search features | Advanced features |
| **Use Case** | Development, self-hosted | Production, managed |

## Troubleshooting

### Connection refused
Ensure Meilisearch is running:
```bash
curl http://localhost:7700/health
```

Expected response:
```json
{"status":"available"}
```

### Slow indexing
- Use batch operations for multiple documents
- Increase wait timeouts if needed
- Check Meilisearch resource allocation

### Search returns no results
- Verify documents are indexed: Check Meilisearch dashboard
- Check searchable attributes configuration
- Try empty query to see all documents

### Filter not working
- Ensure field is in `filterableAttributes`
- Verify filter syntax matches field names
- Check case sensitivity

## Further Reading

- [Meilisearch Documentation](https://www.meilisearch.com/docs)
- [Meilisearch Go SDK](https://github.com/meilisearch/meilisearch-go)
- [Search Abstraction Design](../../README.md)
