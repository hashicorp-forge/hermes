package search

// ProviderType represents the type of search provider.
type ProviderType string

const (
	// ProviderTypeAlgolia represents the Algolia search provider.
	ProviderTypeAlgolia ProviderType = "algolia"

	// ProviderTypeMeilisearch represents the Meilisearch provider.
	ProviderTypeMeilisearch ProviderType = "meilisearch"
)

// Factory functions should be called from adapter packages directly to avoid import cycles.
//
// Example usage:
//
//	import "github.com/hashicorp-forge/hermes/pkg/search/adapters/algolia"
//
//	adapter, err := algolia.NewAdapter(cfg)  // Returns search.ProxyProvider
//	if err != nil {
//	    // handle error
//	}
//
//	// Use the adapter through the search.Provider interface
//	docIndex := adapter.DocumentIndex()
//	err = docIndex.Index(ctx, doc)
//
// For read-only operations:
//
//	adapter, err := algolia.NewSearchAdapter(cfg)  // Returns search.ProxyProvider
//	if err != nil {
//	    // handle error
//	}
//
// For proxy handler (frontend API access):
//
//	proxyHandler := adapter.ProxyHandler(logger)
//	router.Handle("/1/indexes/", proxyHandler)
