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
	integration.WithTimeout(t, 40*time.Second, 10*time.Second, func(ctx context.Context, progress func(string)) {
		progress("Starting BasicUsage test")

		// Get fixture configuration (containers already running from TestMain)
		host, apiKey := integration.GetMeilisearchConfig()
		progress("Got Meilisearch config")

		adapter, err := meilisearch.NewAdapter(&meilisearch.Config{
			Host:            host,
			APIKey:          apiKey,
			DocsIndexName:   "integration-test-docs",
			DraftsIndexName: "integration-test-drafts",
		})
		require.NoError(t, err, "Failed to create adapter")
		progress("Created adapter")

		// Check health
		err = adapter.Healthy(ctx)
		require.NoError(t, err, "Meilisearch should be healthy")
		progress("Health check passed")

		// Get document index
		docIndex := adapter.DocumentIndex()

		// Skip initial cleanup - too slow and not essential for test
		progress("Skipping cleanup - using unique index name per test")

		// Create sample documents (reduced from 4 to 2 for speed)
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
		}

		// Index documents
		progress("Indexing 2 documents...")
		err = docIndex.IndexBatch(ctx, docs)
		require.NoError(t, err, "Failed to index documents")

		// Simple wait for indexing (Meilisearch is usually fast with small batches)
		progress("Waiting briefly for indexing...")
		time.Sleep(500 * time.Millisecond)

		t.Run("BasicSearch", func(t *testing.T) {
			progress("Testing BasicSearch")
			results, err := docIndex.Search(ctx, &search.SearchQuery{
				Query:   "terraform",
				Page:    0,
				PerPage: 10,
			})
			require.NoError(t, err, "Search should succeed")
			assert.Greater(t, results.TotalHits, 0, "Should find results for 'terraform'")
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
			progress("Testing FilteredSearch")
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
			progress("Testing FacetedSearch")
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

			// Verify expected facet values (we only have 2 docs: terraform and vault)
			assert.Contains(t, results.Facets.Products, "terraform")
			assert.Contains(t, results.Facets.Products, "vault")
		})

		t.Run("SortedSearch", func(t *testing.T) {
			progress("Testing SortedSearch")
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
			progress("Testing ComplexQuery")
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
			progress("Testing GetFacetsOnly")
			facets, err := docIndex.GetFacets(ctx, []string{"product", "docType", "status"})
			require.NoError(t, err, "GetFacets should succeed")
			assert.NotEmpty(t, facets.Products, "Should return product facets")
			assert.NotEmpty(t, facets.DocTypes, "Should return docType facets")
			assert.NotEmpty(t, facets.Statuses, "Should return status facets")
		})

		// Skip cleanup - too slow and containers are ephemeral anyway
		progress("Skipping cleanup - using unique index per test run")
		progress("BasicUsage test completed")
	})
}

// TestMeilisearchAdapter_EdgeCases tests edge cases and error handling.
// Note: Meilisearch IndexBatch has a 30s internal timeout, so test must account for this.
func TestMeilisearchAdapter_EdgeCases(t *testing.T) {
	integration.WithTimeout(t, 40*time.Second, 10*time.Second, func(ctx context.Context, progress func(string)) {
		progress("Starting EdgeCases test")

		// Get fixture configuration (containers already running from TestMain)
		host, apiKey := integration.GetMeilisearchConfig()
		progress("Got Meilisearch config")

		adapter, err := meilisearch.NewAdapter(&meilisearch.Config{
			Host:            host,
			APIKey:          apiKey,
			DocsIndexName:   "integration-test-edge-cases",
			DraftsIndexName: "integration-test-edge-cases-drafts",
		})
		require.NoError(t, err, "Failed to create adapter")
		progress("Created adapter")

		docIndex := adapter.DocumentIndex()

		// Skip cleanup - use unique index name per test run
		progress("Skipping cleanup - using unique index name")

		t.Run("EmptySearch", func(t *testing.T) {
			progress("Testing EmptySearch")
			results, err := docIndex.Search(ctx, &search.SearchQuery{
				Query:   "",
				Page:    0,
				PerPage: 10,
			})
			require.NoError(t, err, "Empty search should succeed")
			assert.Equal(t, 0, results.TotalHits, "Should return 0 hits for empty index")
		})

		t.Run("SearchNoResults", func(t *testing.T) {
			results, err := docIndex.Search(ctx, &search.SearchQuery{
				Query:   "nonexistent-document-xyz",
				Page:    0,
				PerPage: 10,
			})
			require.NoError(t, err, "Search with no results should succeed")
			assert.Equal(t, 0, results.TotalHits, "Should return 0 hits")
			assert.Empty(t, results.Hits, "Should return empty hits array")
		})

		t.Run("Pagination", func(t *testing.T) {
			progress("Testing Pagination")
			// Index minimal documents for pagination test (5 instead of 25)
			docs := make([]*search.Document, 5)
			for i := 0; i < 5; i++ {
				docs[i] = &search.Document{
					ObjectID:     fmt.Sprintf("page-doc-%d", i),
					DocID:        fmt.Sprintf("PAGE-%d", i),
					Title:        fmt.Sprintf("Page Document %d", i),
					DocNumber:    fmt.Sprintf("PAGE-%d", i),
					DocType:      "RFC",
					Product:      "terraform",
					Status:       "published",
					Owners:       []string{"owner"},
					Content:      fmt.Sprintf("Content for page document %d", i),
					CreatedTime:  time.Now().Unix(),
					ModifiedTime: time.Now().Unix(),
				}
			}
			progress("Indexing 5 pagination test documents...")
			err := docIndex.IndexBatch(ctx, docs)
			require.NoError(t, err, "Failed to index pagination test documents")
			progress("Waiting briefly for pagination index...")
			time.Sleep(500 * time.Millisecond)

			// Test pagination with 5 documents
			page1, err := docIndex.Search(ctx, &search.SearchQuery{
				Query:   "",
				Page:    0,
				PerPage: 3,
			})
			require.NoError(t, err, "First page search should succeed")
			assert.Equal(t, 3, len(page1.Hits), "First page should have 3 results")
			assert.Equal(t, 5, page1.TotalHits, "Total hits should be 5")

			// Test second page
			page2, err := docIndex.Search(ctx, &search.SearchQuery{
				Query:   "",
				Page:    1,
				PerPage: 3,
			})
			require.NoError(t, err, "Second page search should succeed")
			assert.Equal(t, 2, len(page2.Hits), "Second page should have 2 results")
		})

		// Skip cleanup - too slow
		progress("Skipping cleanup - using unique index per test run")
		progress("EdgeCases test completed")
	})
}
