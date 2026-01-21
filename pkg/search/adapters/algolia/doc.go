// Package algolia provides an Algolia implementation of the search.Provider interface.
//
// This adapter wraps the Algolia Go client and implements the Hermes search
// abstraction, allowing Hermes to use Algolia as its search backend.
//
// Example usage:
//
//	cfg := &algolia.Config{
//	    AppID:           "YOUR_APP_ID",
//	    WriteAPIKey:     "YOUR_WRITE_KEY",
//	    SearchAPIKey:    "YOUR_SEARCH_KEY",
//	    DocsIndexName:   "hermes_docs",
//	    DraftsIndexName: "hermes_drafts",
//	}
//
//	adapter, err := algolia.NewAdapter(cfg)
//	if err != nil {
//	    log.Fatal(err)
//	}
//
//	// Check health
//	if err := adapter.Healthy(ctx); err != nil {
//	    log.Printf("Algolia unhealthy: %v", err)
//	}
//
//	// Use the adapter
//	docIndex := adapter.DocumentIndex()
//	err = docIndex.Index(ctx, myDoc)
package algolia
