// Package search provides an abstraction layer for search operations in Hermes.
//
// This package defines interfaces for search providers, allowing Hermes to work
// with different search backends (e.g., Algolia, Meilisearch) through a common
// interface. This abstraction enables:
//
//   - Multiple search backend support
//   - Local development without external search service dependencies
//   - Easier testing with mock or local search implementations
//   - Cost optimization by allowing self-hosted search options
//
// The main interface is Provider, which provides access to DocumentIndex and
// DraftIndex for searching published documents and drafts respectively.
//
// Example usage:
//
//	provider, err := algolia.NewAdapter(cfg)
//	if err != nil {
//	    log.Fatal(err)
//	}
//
//	// Index a document
//	doc := &search.Document{
//	    ObjectID: "doc-123",
//	    Title: "My Document",
//	    Content: "Document content...",
//	}
//	err = provider.DocumentIndex().Index(ctx, doc)
//
//	// Search for documents
//	results, err := provider.DocumentIndex().Search(ctx, &search.SearchQuery{
//	    Query: "terraform",
//	    Filters: map[string][]string{
//	        "product": []string{"terraform"},
//	    },
//	})
package search
