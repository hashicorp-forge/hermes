package search

// Example demonstrates how to use the search abstraction in Hermes.
//
// This file is for documentation purposes and shows integration patterns.
// It is not compiled as part of the main application.

/*

## Example 1: Creating an Algolia Provider

```go
import (
	"context"
	"log"

	"github.com/hashicorp-forge/hermes/pkg/search"
	"github.com/hashicorp-forge/hermes/pkg/search/adapters/algolia"
)

func createAlgoliaProvider() (search.Provider, error) {
	cfg := &algolia.Config{
		AppID:           "YOUR_APP_ID",
		WriteAPIKey:     "YOUR_WRITE_KEY",
		SearchAPIKey:    "YOUR_SEARCH_KEY",
		DocsIndexName:   "hermes_docs",
		DraftsIndexName: "hermes_drafts",
	}

	provider, err := algolia.NewAdapter(cfg)
	if err != nil {
		return nil, err
	}

	// Verify the backend is healthy
	ctx := context.Background()
	if err := provider.Healthy(ctx); err != nil {
		log.Printf("Warning: Search backend unhealthy: %v", err)
	}

	return provider, nil
}
```

## Example 2: Indexing Documents

```go
func indexDocument(provider search.Provider, docID string) error {
	doc := &search.Document{
		ObjectID:     docID,
		DocID:        docID,
		Title:        "Infrastructure as Code Best Practices",
		DocNumber:    "RFC-042",
		DocType:      "RFC",
		Product:      "Terraform",
		Status:       "Approved",
		Owners:       []string{"alice@example.com"},
		Contributors: []string{"bob@example.com", "charlie@example.com"},
		Approvers:    []string{"dave@example.com"},
		Summary:      "This RFC defines best practices for IaC...",
		Content:      "Full document content goes here...",
		CreatedTime:  1234567890,
		ModifiedTime: 1234567900,
	}

	ctx := context.Background()
	return provider.DocumentIndex().Index(ctx, doc)
}
```

## Example 3: Batch Indexing

```go
func batchIndexDocuments(provider search.Provider, docs []*search.Document) error {
	ctx := context.Background()
	return provider.DocumentIndex().IndexBatch(ctx, docs)
}
```

## Example 4: Searching Documents

```go
func searchDocuments(provider search.Provider, queryText string) (*search.SearchResult, error) {
	query := &search.SearchQuery{
		Query:   queryText,
		Page:    1,
		PerPage: 20,
		Filters: map[string][]string{
			"status": []string{"Approved", "In Review"},
			"product": []string{"Terraform"},
		},
		Facets: []string{"docType", "product", "status", "owners"},
		SortBy: "modifiedTime",
		SortOrder: "desc",
	}

	ctx := context.Background()
	return provider.DocumentIndex().Search(ctx, query)
}
```

## Example 5: Deleting Documents

```go
func deleteDocument(provider search.Provider, docID string) error {
	ctx := context.Background()
	return provider.DocumentIndex().Delete(ctx, docID)
}

func deleteMultipleDocuments(provider search.Provider, docIDs []string) error {
	ctx := context.Background()
	return provider.DocumentIndex().DeleteBatch(ctx, docIDs)
}
```

## Example 6: Working with Drafts

```go
func indexDraft(provider search.Provider, draft *search.Document) error {
	ctx := context.Background()
	return provider.DraftIndex().Index(ctx, draft)
}

func searchDrafts(provider search.Provider, userEmail string) (*search.SearchResult, error) {
	query := &search.SearchQuery{
		Query: "",  // Empty query returns all
		Filters: map[string][]string{
			"owners": []string{userEmail},
		},
		Page:    1,
		PerPage: 50,
	}

	ctx := context.Background()
	return provider.DraftIndex().Search(ctx, query)
}
```

## Example 7: Integration with Existing Server Code

```go
import (
	"net/http"

	"github.com/hashicorp-forge/hermes/pkg/search"
	"github.com/hashicorp-forge/hermes/pkg/search/adapters/algolia"
	"github.com/hashicorp/go-hclog"
)

type Server struct {
	searchProvider search.Provider
	logger         hclog.Logger
}

func NewServer(cfg *algolia.Config, logger hclog.Logger) (*Server, error) {
	provider, err := algolia.NewAdapter(cfg)
	if err != nil {
		return nil, err
	}

	return &Server{
		searchProvider: provider,
		logger:         logger,
	}, nil
}

func (s *Server) SearchDocumentsHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query().Get("q")

		results, err := s.searchProvider.DocumentIndex().Search(r.Context(), &search.SearchQuery{
			Query:   query,
			Page:    1,
			PerPage: 20,
		})

		if err != nil {
			s.logger.Error("search failed", "error", err)
			http.Error(w, "Search failed", http.StatusInternalServerError)
			return
		}

		// Return results...
		_ = results
	})
}
```

## Example 8: Migration from Direct Algolia Usage

**Before (using pkg/algolia directly):**
```go
import "github.com/hashicorp-forge/hermes/pkg/algolia"

func oldIndexDocument(algoClient *algolia.Client, doc interface{}) error {
	_, err := algoClient.Docs.SaveObject(doc)
	return err
}
```

**After (using search abstraction):**
```go
import "github.com/hashicorp-forge/hermes/pkg/search"

func newIndexDocument(provider search.Provider, doc *search.Document) error {
	ctx := context.Background()
	return provider.DocumentIndex().Index(ctx, doc)
}
```

## Example 9: Error Handling

```go
func handleSearchError(err error) {
	if err == nil {
		return
	}

	// Check for specific error types
	switch {
	case errors.Is(err, search.ErrNotFound):
		log.Println("Document not found in search index")
	case errors.Is(err, search.ErrBackendUnavailable):
		log.Println("Search backend is unavailable")
	case errors.Is(err, search.ErrInvalidQuery):
		log.Println("Invalid search query")
	case errors.Is(err, search.ErrIndexingFailed):
		log.Println("Failed to index document")
	default:
		// Check if it's a wrapped search error
		if searchErr, ok := err.(*search.Error); ok {
			log.Printf("Operation %s failed: %v", searchErr.Op, searchErr.Err)
		} else {
			log.Printf("Unknown error: %v", err)
		}
	}
}
```

## Example 10: Testing with the Abstraction

```go
// Create a mock provider for testing
type mockProvider struct {
	documents map[string]*search.Document
}

func (m *mockProvider) DocumentIndex() search.DocumentIndex {
	return &mockDocumentIndex{documents: m.documents}
}

func (m *mockProvider) DraftIndex() search.DraftIndex {
	return &mockDraftIndex{}
}

func (m *mockProvider) Name() string {
	return "mock"
}

func (m *mockProvider) Healthy(ctx context.Context) error {
	return nil
}

// Use in tests
func TestMyFunction(t *testing.T) {
	provider := &mockProvider{
		documents: make(map[string]*search.Document),
	}

	// Test your code that uses the provider
	err := indexDocument(provider, "test-doc")
	if err != nil {
		t.Errorf("indexDocument failed: %v", err)
	}
}
```

*/
