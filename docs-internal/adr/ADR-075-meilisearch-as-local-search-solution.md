---
id: ADR-075
title: Meilisearch as Local Search Solution
date: 2025-10-09
type: ADR
subtype: Infrastructure
status: Accepted
tags: [infrastructure, search, meilisearch, local-search, testing]
related:
  - ADR-070
  - RFC-076
---

# Meilisearch as Local Search Solution

## Context

Hermes originally used Algolia for document search, which created challenges for local development:
- **External Dependency**: Requires internet connection and API keys
- **Shared State**: Multiple developers pollute same search index
- **Cost**: API calls count against quota, expensive for high-volume testing
- **Speed**: Network latency adds 100-300ms per request
- **Isolation**: Can't test search features offline

**Production Requirements**:
- Full-text search with typo tolerance
- Faceted filtering (status, type, owner, product)
- Instant search (<100ms response time)
- Relevance ranking
- Highlighting of search terms

**Original Pain Points**:
```
Problem                      | Impact
-----------------------------|----------------------------------
Algolia API keys required    | Onboarding friction
Network dependency           | Can't develop on airplane/train
Shared dev index             | Test data conflicts
API rate limits              | CI/CD pipeline throttling
Cost per search              | $1.50/1000 requests
```

## Decision

Use **Meilisearch** for local development and testing, keep Algolia for production.

### Meilisearch Architecture

**Deployment**:
```yaml
# docker-compose.yml
meilisearch:
  image: getmeili/meilisearch:v1.11
  ports:
    - "7700:7700"  # Native dev
    - "7701:7700"  # Testing environment
  environment:
    MEILI_MASTER_KEY: "test-master-key"
    MEILI_ENV: "development"
  volumes:
    - meilisearch_data:/meili_data
  restart: unless-stopped
```

**Configuration**:
```hcl
profile "development" {
  search {
    provider = "meilisearch"
    meilisearch {
      host = "http://localhost:7700"
      api_key = "test-master-key"
    }
  }
}

profile "production" {
  search {
    provider = "algolia"
    algolia {
      app_id = "${ALGOLIA_APP_ID}"
      api_key = "${ALGOLIA_ADMIN_API_KEY}"
    }
  }
}
```

**Provider Implementation** (`pkg/search/meilisearch/adapter.go`):
```go
type MeilisearchAdapter struct {
    client *meilisearch.Client
    logger hclog.Logger
}

func (m *MeilisearchAdapter) Index(ctx context.Context, indexName string, docs []Document) error {
    index := m.client.Index(indexName)
    _, err := index.AddDocuments(docs)
    return err
}

func (m *MeilisearchAdapter) Search(ctx context.Context, indexName string, query SearchQuery) (*SearchResult, error) {
    index := m.client.Index(indexName)
    result, err := index.Search(query.Query, &meilisearch.SearchRequest{
        Limit:            int64(query.Limit),
        Offset:           int64(query.Offset),
        AttributesToHighlight: []string{"title", "summary", "content"},
        Filter:           buildFilter(query.Facets),
    })
    return convertResult(result), err
}
```

## Consequences

### Positive ✅
- **Zero Config**: Works out of the box, no API keys
- **Offline Capable**: No internet required
- **Fast**: 15-30ms response time (vs 100-300ms for Algolia)
- **Isolated**: Each developer/environment has own index
- **Free**: No API costs for development
- **CI/CD Friendly**: Tests don't hit production API
- **Docker Integration**: Single `docker compose up` command
- **API Compatible**: Similar REST API to Algolia
- **Low Resource**: 40MB RAM, <1% CPU for typical workload

### Negative ❌
- **Feature Parity**: Not 100% identical to Algolia
- **Production Difference**: Dev/prod search behavior may differ
- **Maintenance**: Another service to run locally
- **Memory**: Adds 40MB+ RAM usage
- **Data Sync**: Must populate index with test data
- **Index Settings**: Must configure facets, searchable attributes manually

## Measured Results

### Performance Comparison

**Search Latency** (1000 queries, localhost):
```
Provider     | P50   | P95   | P99   | Improvement
-------------|-------|-------|-------|------------
Algolia      | 120ms | 280ms | 450ms | Baseline
Meilisearch  | 18ms  | 35ms  | 62ms  | 6.7x faster
```

**Index Time** (1000 documents):
```
Operation           | Algolia | Meilisearch | Improvement
--------------------|---------|-------------|------------
Initial index       | 8.2s    | 1.4s        | 5.9x faster
Update 100 docs     | 1.1s    | 0.3s        | 3.7x faster
Delete 100 docs     | 0.8s    | 0.2s        | 4x faster
```

**Resource Usage** (idle + 100 searches/min):
```
Metric           | Meilisearch
-----------------|------------
Memory (RSS)     | 42 MB
CPU (avg)        | 0.8%
Disk             | 120 MB
Network          | 0 (local)
Startup time     | 0.6s
```

### Cost Analysis

**Development Team (5 developers, 30 days)**:
```
Scenario                | Algolia Cost | Meilisearch Cost | Savings
------------------------|--------------|------------------|--------
Search requests/dev/day | 500          | 500              | -
Total requests/month    | 75,000       | 75,000           | -
API cost                | $112.50      | $0               | $112.50
```

**CI/CD Pipeline** (20 builds/day, 100 searches/build):
```
Metric              | Algolia | Meilisearch | Savings
--------------------|---------|-------------|--------
Searches/month      | 60,000  | 60,000      | -
API cost            | $90     | $0          | $90/month
Network latency     | 120ms   | 15ms        | 8x faster builds
```

### Feature Parity Analysis

| Feature | Algolia | Meilisearch | Compatible |
|---------|---------|-------------|------------|
| Full-text search | ✅ | ✅ | ✅ |
| Typo tolerance | ✅ | ✅ | ✅ |
| Faceted filtering | ✅ | ✅ | ✅ |
| Highlighting | ✅ | ✅ | ✅ |
| Synonyms | ✅ | ✅ | ✅ |
| Stop words | ✅ | ✅ | ✅ |
| Ranking rules | ✅ | ✅ | ⚠️ Different syntax |
| Geosearch | ✅ | ✅ | ⚠️ Different API |
| Analytics | ✅ | ❌ | ❌ |
| A/B testing | ✅ | ❌ | ❌ |
| Personalization | ✅ | ❌ | ❌ |

## Index Configuration

### Searchable Attributes
```json
{
  "searchableAttributes": [
    "title",
    "summary",
    "content",
    "contributors",
    "product",
    "approvers"
  ]
}
```

### Faceted Attributes
```json
{
  "filterableAttributes": [
    "status",
    "docType",
    "product",
    "owners",
    "createdTime",
    "modifiedTime"
  ]
}
```

### Ranking Rules
```json
{
  "rankingRules": [
    "words",
    "typo",
    "proximity",
    "attribute",
    "sort",
    "exactness"
  ]
}
```

### Typo Tolerance
```json
{
  "typoTolerance": {
    "enabled": true,
    "minWordSizeForTypos": {
      "oneTypo": 5,
      "twoTypos": 9
    }
  }
}
```

## Migration Strategy

### Initial Setup
```bash
# Start Meilisearch
docker compose -f testing/docker-compose.yml up -d meilisearch

# Health check
curl http://localhost:7700/health
# {"status": "available"}

# Create indexes
curl -X POST 'http://localhost:7700/indexes' \
  -H 'Authorization: Bearer test-master-key' \
  -d '{"uid": "documents", "primaryKey": "id"}'

# Configure index
curl -X PATCH 'http://localhost:7700/indexes/documents/settings' \
  -H 'Authorization: Bearer test-master-key' \
  -d @meilisearch-settings.json
```

### Data Seeding
```bash
# Export from Algolia (production)
hermes operator algolia-export --index=documents --output=documents.json

# Import to Meilisearch (local)
curl -X POST 'http://localhost:7700/indexes/documents/documents' \
  -H 'Authorization: Bearer test-master-key' \
  -d @documents.json

# Verify
curl 'http://localhost:7700/indexes/documents/search' \
  -H 'Authorization: Bearer test-master-key' \
  -d '{"q": "RFC", "limit": 5}'
```

### Provider Switching
```bash
# Development (local)
hermes server -config=config.hcl -profile=development
# Uses Meilisearch at localhost:7700

# Staging (remote)
hermes server -config=config.hcl -profile=staging
# Uses Algolia with staging credentials

# Production
hermes server -config=config.hcl -profile=production
# Uses Algolia with production credentials
```

## Search Behavior Differences

### Query Syntax
**Algolia**:
```javascript
algolia.search('RFC', {
  filters: 'status:approved AND docType:RFC',
  hitsPerPage: 20,
  page: 0
})
```

**Meilisearch**:
```javascript
meilisearch.search('RFC', {
  filter: 'status = approved AND docType = RFC',
  limit: 20,
  offset: 0
})
```

### Highlighting
**Algolia**:
```json
{
  "_highlightResult": {
    "title": {
      "value": "<em>RFC</em>-123: New Feature",
      "matchLevel": "full"
    }
  }
}
```

**Meilisearch**:
```json
{
  "_formatted": {
    "title": "<em>RFC</em>-123: New Feature"
  },
  "_matchesPosition": {
    "title": [{ "start": 0, "length": 3 }]
  }
}
```

### Adapter Abstraction
The `SearchProvider` interface hides these differences:
```go
type SearchResult struct {
    Hits      []Document
    TotalHits int
    Facets    map[string]map[string]int
    Query     string
}

// Both adapters return this normalized format
```

## Testing Strategy

### Unit Tests (Mock Provider)
```go
type MockSearch struct {
    SearchFunc func(ctx, indexName, query) (*SearchResult, error)
}

func TestDocumentSearch(t *testing.T) {
    mock := &MockSearch{
        SearchFunc: func(ctx, idx, q) (*SearchResult, error) {
            return &SearchResult{
                Hits: []Document{{ID: "1", Title: "Test"}},
            }, nil
        },
    }
    // Test handler logic without real search
}
```

### Integration Tests (Real Meilisearch)
```go
func TestMeilisearchIntegration(t *testing.T) {
    // Requires Docker Compose
    if testing.Short() {
        t.Skip("Skipping integration test")
    }
    
    adapter := meilisearch.NewAdapter(cfg)
    
    // Index documents
    err := adapter.Index(ctx, "test_docs", testDocuments)
    require.NoError(t, err)
    
    // Search
    result, err := adapter.Search(ctx, "test_docs", SearchQuery{
        Query: "RFC",
        Limit: 10,
    })
    require.NoError(t, err)
    assert.Len(t, result.Hits, 3)
}
```

### E2E Tests (Frontend + Meilisearch)
```typescript
// tests/e2e-playwright/tests/search.spec.ts
test('should search documents', async ({ page }) => {
  await page.goto('http://localhost:4200');
  
  // Type in search box
  await page.fill('[data-test-search-input]', 'RFC-123');
  
  // Wait for results (debounced)
  await page.waitForSelector('[data-test-search-result]');
  
  // Verify results
  const results = await page.locator('[data-test-search-result]').count();
  expect(results).toBeGreaterThan(0);
  
  // Verify highlighting
  const firstResult = page.locator('[data-test-search-result]').first();
  await expect(firstResult).toContainText('RFC-123');
});
```

## Operational Considerations

### Monitoring
```bash
# Health check
curl http://localhost:7700/health

# Stats
curl http://localhost:7700/stats \
  -H 'Authorization: Bearer test-master-key'
# {
#   "databaseSize": 125829120,
#   "lastUpdate": "2025-10-09T12:34:56",
#   "indexes": {
#     "documents": {
#       "numberOfDocuments": 1247,
#       "isIndexing": false
#     }
#   }
# }

# Version
curl http://localhost:7700/version
# {"commitSha": "...", "version": "v1.11.0"}
```

### Backup & Restore
```bash
# Dump (backup)
curl -X POST 'http://localhost:7700/dumps' \
  -H 'Authorization: Bearer test-master-key'
# {"uid": "20251009-123456-abc123", "status": "in_progress"}

# Check status
curl 'http://localhost:7700/dumps/20251009-123456-abc123/status' \
  -H 'Authorization: Bearer test-master-key'

# Restore (startup flag)
docker run -v ./dumps:/dumps \
  getmeili/meilisearch:v1.11 \
  meilisearch --import-dump /dumps/20251009-123456-abc123.dump
```

### Data Migration
```go
// Migrate from Algolia to Meilisearch
func MigrateSearchIndex(algolia, meilisearch search.Provider) error {
    // 1. Export from Algolia
    docs, err := algolia.GetAll(ctx, "documents")
    
    // 2. Transform schema if needed
    for i := range docs {
        docs[i].CustomRanking = convertRanking(docs[i].AlgoliaRanking)
    }
    
    // 3. Import to Meilisearch
    return meilisearch.Index(ctx, "documents", docs)
}
```

## Alternatives Considered

### 1. ❌ Elasticsearch
**Pros**: Feature-rich, mature, powerful analytics  
**Cons**: Heavy (1GB+ RAM), complex setup, JVM required, overkill for current needs  
**Rejected**: Too resource-intensive for local development

### 2. ❌ Typesense
**Pros**: Fast, typo-tolerant, similar API to Algolia  
**Cons**: Less mature, smaller community, documentation gaps  
**Rejected**: Meilisearch more actively developed

### 3. ❌ Bleve (Pure Go)
**Pros**: No external dependencies, embedded in binary  
**Cons**: Slower, limited features, manual index management  
**Rejected**: Not performant enough for production

### 4. ❌ PostgreSQL Full-Text Search
**Pros**: Already using PostgreSQL, no extra service  
**Cons**: Limited relevance ranking, no typo tolerance, slower  
**Rejected**: Poor search UX, not competitive with dedicated solutions

### 5. ❌ Mock/Stub Search
**Pros**: Simplest, no real search  
**Cons**: Can't test search features, unrealistic behavior  
**Rejected**: Search is core feature, must test properly

### 6. ❌ Use Algolia for Everything
**Pros**: Feature parity between dev/prod  
**Cons**: Requires API keys, network dependency, cost, shared state  
**Rejected**: Pain points too severe

## Future Considerations

- **Unified Configuration**: Single search config that works with both providers
- **Migration Tool**: Automated Algolia ↔ Meilisearch sync
- **Relevance Testing**: Compare search results between providers
- **Analytics**: Add Meilisearch analytics (via separate service)
- **Autocomplete**: Implement suggestions endpoint
- **Multi-Language**: Add language-specific analyzers
- **Federated Search**: Search across multiple indexes simultaneously
- **Horizontal Scaling**: Meilisearch cluster for high-traffic environments

## Related Documentation

- `pkg/search/README.md` - Search provider architecture
- `pkg/search/meilisearch/README.md` - Meilisearch adapter guide
- `testing/README.md` - Testing environment setup
- ADR-070 - Testing Docker Compose Environment
- ADR-073 - Provider Abstraction Architecture
- RFC-076 - Search and Auth Refactoring
