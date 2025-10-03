//go:build integration
// +build integration

// Package search contains integration tests for search adapters.
// These tests use testcontainers-go to automatically start required services.
//
// Usage:
//
//	go test -tags=integration ./tests/integration/search/...
package search

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/hashicorp-forge/hermes/pkg/search"
	"github.com/hashicorp-forge/hermes/pkg/search/adapters/meilisearch"
	"github.com/hashicorp-forge/hermes/tests/integration"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestMeilisearchAdapter_BasicUsage demonstrates basic usage of the Meilisearch adapter.
func TestMeilisearchAdapter_BasicUsage(t *testing.T) {
	ctx := context.Background()

	// Get fixture configuration (containers already running from TestMain)
	host, apiKey := integration.GetMeilisearchConfig()
	adapter, err := meilisearch.NewAdapter(&meilisearch.Config{
		Host:            host,
		APIKey:          apiKey,
		DocsIndexName:   "integration-test-docs",
		DraftsIndexName: "integration-test-drafts",
	})
	require.NoError(t, err, "Failed to create adapter") // Check health
	err = adapter.Healthy(ctx)
	require.NoError(t, err, "Meilisearch should be healthy")

	// Get document index
	docIndex := adapter.DocumentIndex()

	// Clear any existing data
	err = docIndex.Clear(ctx)
	require.NoError(t, err, "Failed to clear index")

	// Create sample documents
	docs := []*search.Document{
		{
			ObjectID:     "rfc-001",
			DocID:        "RFC-001",
			Title:        "Terraform Provider Plugin Protocol",
			DocNumber:    "RFC-001",
			DocType:      "RFC",
			Product:      "terraform",
			Status:       "approved",
			Owners:       []string{"alice"},
			Contributors: []string{"bob", "charlie"},
			Summary:      "Proposal for new provider plugin protocol",
			Content:      "This RFC proposes a new protocol for Terraform provider plugins that improves performance and adds new capabilities.",
			CreatedTime:  time.Now().Add(-30 * 24 * time.Hour).Unix(),
			ModifiedTime: time.Now().Add(-7 * 24 * time.Hour).Unix(),
		},
		{
			ObjectID:     "prd-001",
			DocID:        "PRD-001",
			Title:        "Vault Dynamic Secrets Manager",
			DocNumber:    "PRD-001",
			DocType:      "PRD",
			Product:      "vault",
			Status:       "published",
			Owners:       []string{"bob"},
			Contributors: []string{"alice"},
			Summary:      "Product requirements for dynamic secrets manager",
			Content:      "The dynamic secrets manager will allow users to generate temporary credentials on-demand with automatic rotation.",
			CreatedTime:  time.Now().Add(-60 * 24 * time.Hour).Unix(),
			ModifiedTime: time.Now().Add(-14 * 24 * time.Hour).Unix(),
		},
		{
			ObjectID:     "rfc-002",
			DocID:        "RFC-002",
			Title:        "Terraform Cloud Run Tasks API",
			DocNumber:    "RFC-002",
			DocType:      "RFC",
			Product:      "terraform",
			Status:       "draft",
			Owners:       []string{"charlie"},
			Contributors: []string{"alice"},
			Summary:      "API design for run tasks integration",
			Content:      "This RFC describes the API for integrating external systems with Terraform Cloud run tasks.",
			CreatedTime:  time.Now().Add(-10 * 24 * time.Hour).Unix(),
			ModifiedTime: time.Now().Add(-2 * 24 * time.Hour).Unix(),
		},
		{
			ObjectID:     "prd-002",
			DocID:        "PRD-002",
			Title:        "Consul Service Mesh Gateway",
			DocNumber:    "PRD-002",
			DocType:      "PRD",
			Product:      "consul",
			Status:       "approved",
			Owners:       []string{"alice"},
			Contributors: []string{"bob", "charlie", "diane"},
			Summary:      "Service mesh gateway requirements",
			Content:      "Requirements for implementing a service mesh gateway in Consul to enable cross-datacenter communication.",
			CreatedTime:  time.Now().Add(-45 * 24 * time.Hour).Unix(),
			ModifiedTime: time.Now().Add(-5 * 24 * time.Hour).Unix(),
		},
	}

	// Index documents
	err = docIndex.IndexBatch(ctx, docs)
	require.NoError(t, err, "Failed to index documents")

	// Wait for indexing to complete
	time.Sleep(500 * time.Millisecond)

	t.Run("BasicSearch", func(t *testing.T) {
		results, err := docIndex.Search(ctx, &search.SearchQuery{
			Query:   "terraform",
			Page:    0,
			PerPage: 10,
		})
		require.NoError(t, err, "Search should succeed")
		assert.Greater(t, results.TotalHits, int64(0), "Should find results for 'terraform'")
		assert.NotEmpty(t, results.Hits, "Should return document hits")

		// Verify results contain terraform documents
		foundTerraform := false
		for _, doc := range results.Hits {
			if doc.Product == "terraform" {
				foundTerraform = true
				break
			}
		}
		assert.True(t, foundTerraform, "Results should include terraform documents")
	})

	t.Run("FilteredSearch", func(t *testing.T) {
		results, err := docIndex.Search(ctx, &search.SearchQuery{
			Query:   "",
			Page:    0,
			PerPage: 10,
			Filters: map[string][]string{
				"product": {"terraform"},
				"status":  {"approved"},
			},
		})
		require.NoError(t, err, "Filtered search should succeed")

		// All results should match filters
		for _, doc := range results.Hits {
			assert.Equal(t, "terraform", doc.Product, "All results should be terraform products")
			assert.Equal(t, "approved", doc.Status, "All results should have approved status")
		}
	})

	t.Run("FacetedSearch", func(t *testing.T) {
		results, err := docIndex.Search(ctx, &search.SearchQuery{
			Query:   "",
			Page:    0,
			PerPage: 10,
			Facets:  []string{"product", "docType", "status"},
		})
		require.NoError(t, err, "Faceted search should succeed")
		assert.NotNil(t, results.Facets, "Should return facets")
		assert.NotEmpty(t, results.Facets.Products, "Should have product facets")
		assert.NotEmpty(t, results.Facets.DocTypes, "Should have docType facets")
		assert.NotEmpty(t, results.Facets.Statuses, "Should have status facets")

		// Verify expected facet values
		assert.Contains(t, results.Facets.Products, "terraform")
		assert.Contains(t, results.Facets.Products, "vault")
		assert.Contains(t, results.Facets.Products, "consul")
	})

	t.Run("SortedSearch", func(t *testing.T) {
		results, err := docIndex.Search(ctx, &search.SearchQuery{
			Query:     "",
			Page:      0,
			PerPage:   10,
			SortBy:    "modifiedTime",
			SortOrder: "desc",
		})
		require.NoError(t, err, "Sorted search should succeed")
		require.GreaterOrEqual(t, len(results.Hits), 2, "Should have at least 2 results to verify sorting")

		// Verify results are sorted by modification time descending
		for i := 0; i < len(results.Hits)-1; i++ {
			assert.GreaterOrEqual(t, results.Hits[i].ModifiedTime, results.Hits[i+1].ModifiedTime,
				"Results should be sorted by modifiedTime descending")
		}
	})

	t.Run("ComplexQuery", func(t *testing.T) {
		results, err := docIndex.Search(ctx, &search.SearchQuery{
			Query:   "API",
			Page:    0,
			PerPage: 10,
			Filters: map[string][]string{
				"product": {"terraform", "vault"},
				"status":  {"approved", "published", "draft"},
			},
			SortBy:    "createdTime",
			SortOrder: "desc",
		})
		require.NoError(t, err, "Complex search should succeed")

		// Verify filters are applied
		for _, doc := range results.Hits {
			assert.Contains(t, []string{"terraform", "vault"}, doc.Product,
				"Product should match filter")
			assert.Contains(t, []string{"approved", "published", "draft"}, doc.Status,
				"Status should match filter")
		}
	})

	t.Run("GetFacetsOnly", func(t *testing.T) {
		facets, err := docIndex.GetFacets(ctx, []string{"product", "docType", "status"})
		require.NoError(t, err, "GetFacets should succeed")
		assert.NotEmpty(t, facets.Products, "Should return product facets")
		assert.NotEmpty(t, facets.DocTypes, "Should return docType facets")
		assert.NotEmpty(t, facets.Statuses, "Should return status facets")
	})

	// Cleanup
	err = docIndex.Clear(ctx)
	assert.NoError(t, err, "Cleanup should succeed")
}

// TestMeilisearchAdapter_EdgeCases tests edge cases and error handling.
func TestMeilisearchAdapter_EdgeCases(t *testing.T) {
	ctx := context.Background()

	// Get fixture configuration (containers already running from TestMain)
	host, apiKey := integration.GetMeilisearchConfig()
	adapter, err := meilisearch.NewAdapter(&meilisearch.Config{
		Host:            host,
		APIKey:          apiKey,
		DocsIndexName:   "integration-test-edge-cases",
		DraftsIndexName: "integration-test-edge-cases-drafts",
	})
	require.NoError(t, err, "Failed to create adapter")

	docIndex := adapter.DocumentIndex()

	// Clear index
	err = docIndex.Clear(ctx)
	require.NoError(t, err, "Failed to clear index")

	t.Run("EmptySearch", func(t *testing.T) {
		results, err := docIndex.Search(ctx, &search.SearchQuery{
			Query:   "",
			Page:    0,
			PerPage: 10,
		})
		require.NoError(t, err, "Empty search should succeed")
		assert.Equal(t, int64(0), results.TotalHits, "Should return 0 hits for empty index")
	})

	t.Run("SearchNoResults", func(t *testing.T) {
		results, err := docIndex.Search(ctx, &search.SearchQuery{
			Query:   "nonexistent-document-xyz",
			Page:    0,
			PerPage: 10,
		})
		require.NoError(t, err, "Search with no results should succeed")
		assert.Equal(t, int64(0), results.TotalHits, "Should return 0 hits")
		assert.Empty(t, results.Hits, "Should return empty hits array")
	})

	t.Run("Pagination", func(t *testing.T) {
		// Index multiple documents for pagination test
		docs := make([]*search.Document, 25)
		for i := 0; i < 25; i++ {
			docs[i] = &search.Document{
				ObjectID:     fmt.Sprintf("doc-%d", i),
				DocID:        fmt.Sprintf("DOC-%d", i),
				Title:        fmt.Sprintf("Document %d", i),
				DocNumber:    fmt.Sprintf("DOC-%d", i),
				DocType:      "RFC",
				Product:      "terraform",
				Status:       "published",
				Owners:       []string{"owner"},
				Content:      fmt.Sprintf("Content for document %d", i),
				CreatedTime:  time.Now().Unix(),
				ModifiedTime: time.Now().Unix(),
			}
		}
		err := docIndex.IndexBatch(ctx, docs)
		require.NoError(t, err, "Failed to index pagination test documents")
		time.Sleep(500 * time.Millisecond)

		// Test first page
		page1, err := docIndex.Search(ctx, &search.SearchQuery{
			Query:   "",
			Page:    0,
			PerPage: 10,
		})
		require.NoError(t, err, "First page search should succeed")
		assert.Equal(t, 10, len(page1.Hits), "First page should have 10 results")
		assert.Equal(t, int64(25), page1.TotalHits, "Total hits should be 25")

		// Test second page
		page2, err := docIndex.Search(ctx, &search.SearchQuery{
			Query:   "",
			Page:    1,
			PerPage: 10,
		})
		require.NoError(t, err, "Second page search should succeed")
		assert.Equal(t, 10, len(page2.Hits), "Second page should have 10 results")

		// Test last page
		page3, err := docIndex.Search(ctx, &search.SearchQuery{
			Query:   "",
			Page:    2,
			PerPage: 10,
		})
		require.NoError(t, err, "Third page search should succeed")
		assert.Equal(t, 5, len(page3.Hits), "Third page should have 5 results")
	})

	// Cleanup
	err = docIndex.Clear(ctx)
	assert.NoError(t, err, "Cleanup should succeed")
}
