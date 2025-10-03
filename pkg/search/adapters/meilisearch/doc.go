/*
Package meilisearch provides a Meilisearch implementation of the search.Provider interface.

Meilisearch is an open-source, lightweight, and fast search engine that can be used
as an alternative to Algolia for local development and self-hosted deployments.

Example usage:

	adapter, err := meilisearch.NewAdapter(&meilisearch.Config{
		Host:            "http://localhost:7700",
		APIKey:          "masterKey123",
		DocsIndexName:   "hermes-documents",
		DraftsIndexName: "hermes-drafts",
	})
	if err != nil {
		log.Fatal(err)
	}

	// Use the adapter with the search.Provider interface
	docIndex := adapter.DocumentIndex()
	result, err := docIndex.Search(ctx, &search.SearchQuery{
		Query:   "terraform",
		Page:    0,
		PerPage: 20,
	})
*/
package meilisearch
