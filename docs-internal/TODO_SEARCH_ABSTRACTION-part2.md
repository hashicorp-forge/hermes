
## Phase 2: Meilisearch Integration (Week 2-3)

### 2.1 Add Meilisearch to Docker Compose

**File**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:17.1-alpine
    environment:
      POSTGRES_DB: hermes
      POSTGRES_USER: hermes
      POSTGRES_PASSWORD: hermes
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hermes"]
      interval: 5s
      timeout: 5s
      retries: 5

  meilisearch:
    image: getmeili/meilisearch:v1.5
    environment:
      MEILI_ENV: development
      MEILI_MASTER_KEY: masterKey123
      MEILI_NO_ANALYTICS: true
    ports:
      - "7700:7700"
    volumes:
      - meilisearch_data:/meili_data
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:7700/health"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  meilisearch_data:
```

**Makefile additions:**

```makefile
.PHONY: docker/meilisearch/start
docker/meilisearch/start:
	@echo "Starting Meilisearch..."
	docker-compose up -d meilisearch
	@echo "Waiting for Meilisearch to be ready..."
	@until curl -s http://localhost:7700/health > /dev/null; do sleep 1; done
	@echo "Meilisearch is ready at http://localhost:7700"

.PHONY: docker/meilisearch/stop
docker/meilisearch/stop:
	@echo "Stopping Meilisearch..."
	docker-compose stop meilisearch

.PHONY: docker/meilisearch/clear
docker/meilisearch/clear:
	@echo "Stopping and removing Meilisearch data..."
	docker-compose down -v meilisearch

.PHONY: docker/dev/start
docker/dev/start:
	@echo "Starting development environment (PostgreSQL + Meilisearch)..."
	docker-compose up -d
	@echo "Waiting for services to be ready..."
	@until docker-compose ps | grep -q "Up (healthy).*postgres"; do sleep 1; done
	@until docker-compose ps | grep -q "Up (healthy).*meilisearch"; do sleep 1; done
	@echo "Development environment ready!"
	@echo "  PostgreSQL: localhost:5432"
	@echo "  Meilisearch: http://localhost:7700"

.PHONY: docker/dev/stop
docker/dev/stop:
	@echo "Stopping development environment..."
	docker-compose down
```

**Task List:**
- [ ] Add Meilisearch service to `docker-compose.yml`
- [ ] Configure environment variables
- [ ] Add health checks
- [ ] Create Makefile targets
- [ ] Test docker-compose setup
- [ ] Document setup in README

### 2.2 Implement Meilisearch Adapter

**File**: `pkg/search/adapters/meilisearch/adapter.go`

```go
package meilisearch

import (
	"context"
	"fmt"
	"time"
	
	"github.com/meilisearch/meilisearch-go"
	"github.com/hashicorp-forge/hermes/pkg/search"
)

// Adapter implements search.Provider for Meilisearch.
type Adapter struct {
	client     *meilisearch.Client
	docsIndex  string
	draftsIndex string
}

// Config contains Meilisearch configuration.
type Config struct {
	Host           string // e.g., "http://localhost:7700"
	APIKey         string // Master key
	DocsIndexName  string
	DraftsIndexName string
}

// NewAdapter creates a new Meilisearch search adapter.
func NewAdapter(cfg *Config) (*Adapter, error) {
	if cfg.Host == "" {
		return nil, fmt.Errorf("meilisearch host required")
	}
	
	client := meilisearch.NewClient(meilisearch.ClientConfig{
		Host:   cfg.Host,
		APIKey: cfg.APIKey,
	})
	
	adapter := &Adapter{
		client:      client,
		docsIndex:   cfg.DocsIndexName,
		draftsIndex: cfg.DraftsIndexName,
	}
	
	// Initialize indexes with settings
	if err := adapter.initializeIndexes(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to initialize indexes: %w", err)
	}
	
	return adapter, nil
}

// initializeIndexes sets up index configuration.
func (a *Adapter) initializeIndexes(ctx context.Context) error {
	// Create/update documents index
	docsIdx := a.client.Index(a.docsIndex)
	
	// Configure searchable attributes
	_, err := docsIdx.UpdateSearchableAttributes(&[]string{
		"title",
		"docNumber",
		"summary",
		"content",
		"owners",
		"contributors",
	})
	if err != nil {
		return err
	}
	
	// Configure filterable attributes
	_, err = docsIdx.UpdateFilterableAttributes(&[]string{
		"product",
		"docType",
		"status",
		"owners",
		"createdTime",
		"modifiedTime",
	})
	if err != nil {
		return err
	}
	
	// Configure sortable attributes
	_, err = docsIdx.UpdateSortableAttributes(&[]string{
		"createdTime",
		"modifiedTime",
		"title",
	})
	if err != nil {
		return err
	}
	
	// Repeat for drafts index
	draftsIdx := a.client.Index(a.draftsIndex)
	// ... same configuration
	
	return nil
}

// DocumentIndex returns the document search interface.
func (a *Adapter) DocumentIndex() search.DocumentIndex {
	return &documentIndex{
		client: a.client,
		index:  a.docsIndex,
	}
}

// DraftIndex returns the draft search interface.
func (a *Adapter) DraftIndex() search.DraftIndex {
	return &draftIndex{
		client: a.client,
		index:  a.draftsIndex,
	}
}

// Name returns the provider name.
func (a *Adapter) Name() string {
	return "meilisearch"
}

// Healthy checks if Meilisearch is accessible.
func (a *Adapter) Healthy(ctx context.Context) error {
	health, err := a.client.Health()
	if err != nil {
		return fmt.Errorf("meilisearch health check failed: %w", err)
	}
	if health.Status != "available" {
		return fmt.Errorf("meilisearch status: %s", health.Status)
	}
	return nil
}

// documentIndex implements search.DocumentIndex.
type documentIndex struct {
	client *meilisearch.Client
	index  string
}

func (di *documentIndex) Index(ctx context.Context, doc *search.Document) error {
	idx := di.client.Index(di.index)
	
	task, err := idx.AddDocuments([]interface{}{doc}, "objectID")
	if err != nil {
		return &search.Error{
			Op:  "Index",
			Err: search.ErrIndexingFailed,
			Msg: err.Error(),
		}
	}
	
	// Wait for indexing to complete (optional, configurable)
	_, err = di.client.WaitForTask(task.TaskUID, 5000) // 5 second timeout
	if err != nil {
		return fmt.Errorf("indexing task failed: %w", err)
	}
	
	return nil
}

func (di *documentIndex) Search(ctx context.Context, query *search.SearchQuery) (*search.SearchResult, error) {
	idx := di.client.Index(di.index)
	
	// Build Meilisearch request
	req := &meilisearch.SearchRequest{
		Limit:  int64(query.PerPage),
		Offset: int64(query.Page * query.PerPage),
	}
	
	// Add filters
	if len(query.Filters) > 0 {
		filters := buildMeilisearchFilters(query.Filters)
		req.Filter = filters
	}
	
	// Add facets
	if len(query.Facets) > 0 {
		req.Facets = query.Facets
	}
	
	// Add sorting
	if query.SortBy != "" {
		sort := query.SortBy
		if query.SortOrder == "desc" {
			sort += ":desc"
		} else {
			sort += ":asc"
		}
		req.Sort = []string{sort}
	}
	
	// Execute search
	start := time.Now()
	resp, err := idx.Search(query.Query, req)
	if err != nil {
		return nil, &search.Error{
			Op:  "Search",
			Err: err,
		}
	}
	queryTime := time.Since(start)
	
	// Convert results
	hits := make([]*search.Document, len(resp.Hits))
	for i, hit := range resp.Hits {
		doc, err := convertMeilisearchHit(hit)
		if err != nil {
			continue // Skip invalid hits
		}
		hits[i] = doc
	}
	
	// Convert facets
	facets := convertMeilisearchFacets(resp.FacetDistribution)
	
	result := &search.SearchResult{
		Hits:       hits,
		TotalHits:  int(resp.EstimatedTotalHits),
		Page:       query.Page,
		PerPage:    query.PerPage,
		TotalPages: int(resp.EstimatedTotalHits) / query.PerPage,
		Facets:     facets,
		QueryTime:  queryTime,
	}
	
	return result, nil
}

// Helper functions
func buildMeilisearchFilters(filters map[string][]string) interface{} {
	// Convert to Meilisearch filter syntax
	// Example: product = "terraform" AND status IN ["approved", "published"]
	var filterParts []string
	for key, values := range filters {
		if len(values) == 1 {
			filterParts = append(filterParts, fmt.Sprintf("%s = %q", key, values[0]))
		} else {
			valueList := make([]string, len(values))
			for i, v := range values {
				valueList[i] = fmt.Sprintf("%q", v)
			}
			filterParts = append(filterParts, fmt.Sprintf("%s IN [%s]", key, strings.Join(valueList, ", ")))
		}
	}
	return strings.Join(filterParts, " AND ")
}

// ... implement other methods
```

### 3.2 Update Server Configuration

**File**: `configs/config.hcl` additions

```hcl
# Search configuration
search {
  provider = "meilisearch"  # or "algolia"
  
  meilisearch {
    host            = "http://localhost:7700"
    api_key         = "masterKey123"
    docs_index      = "hermes-documents"
    drafts_index    = "hermes-drafts"
  }
  
  algolia {
    app_id          = "${HERMES_ALGOLIA_APP_ID}"
    search_api_key  = "${HERMES_ALGOLIA_SEARCH_API_KEY}"
    write_api_key   = "${HERMES_ALGOLIA_WRITE_API_KEY}"
    docs_index      = "docs"
    drafts_index    = "drafts"
  }
}

# Workspace API configuration
workspace {
  enabled = true  # Enable local workspace API
  prefix  = "/api/v1/workspace"
}
```

**File**: `internal/cmd/commands/server/server.go` updates

```go
// Initialize search provider
var searchProvider search.Provider
switch cfg.Search.Provider {
case "meilisearch":
	searchProvider, err = meilisearch.NewAdapter(&meilisearch.Config{
		Host:            cfg.Search.Meilisearch.Host,
		APIKey:          cfg.Search.Meilisearch.APIKey,
		DocsIndexName:   cfg.Search.Meilisearch.DocsIndex,
		DraftsIndexName: cfg.Search.Meilisearch.DraftsIndex,
	})
case "algolia":
	searchProvider, err = algolia.NewAdapter(&algolia.Config{
		AppID:           cfg.Search.Algolia.AppID,
		SearchAPIKey:    cfg.Search.Algolia.SearchAPIKey,
		WriteAPIKey:     cfg.Search.Algolia.WriteAPIKey,
		DocsIndexName:   cfg.Search.Algolia.DocsIndex,
		DraftsIndexName: cfg.Search.Algolia.DraftsIndex,
	})
default:
	return fmt.Errorf("unknown search provider: %s", cfg.Search.Provider)
}
```


### Development (Meilisearch + LocalWorkspace)
```hcl
storage {
  provider = "localworkspace"
  localworkspace {
    base_path = "./storage"
  }
}

search {
  provider = "meilisearch"
  meilisearch {
    host = "http://localhost:7700"
    api_key = "masterKey123"
    docs_index = "hermes-documents"
    drafts_index = "hermes-drafts"
  }
}

workspace {
  enabled = true
  prefix = "/api/v1/workspace"
}
```
