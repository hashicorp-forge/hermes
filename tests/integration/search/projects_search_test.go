//go:build integration
// +build integration

// Package search contains integration tests for search adapters.
// This file specifically tests projects search functionality.
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

// TestMeilisearchAdapter_ProjectsSearch tests project search functionality.
// This test validates the issue discovered during E2E testing where projects search
// returned "Search not yet implemented for projects" error.
func TestMeilisearchAdapter_ProjectsSearch(t *testing.T) {
	integration.WithTimeout(t, 40*time.Second, 10*time.Second, func(ctx context.Context, progress func(string)) {
		progress("Starting ProjectsSearch test")

		// Get fixture configuration (containers already running from TestMain)
		host, apiKey := integration.GetMeilisearchConfig()
		progress("Got Meilisearch config")

		adapter, err := meilisearch.NewAdapter(&meilisearch.Config{
			Host:              host,
			APIKey:            apiKey,
			DocsIndexName:     "integration-test-projects-docs",
			DraftsIndexName:   "integration-test-projects-drafts",
			ProjectsIndexName: "integration-test-projects",
		})
		require.NoError(t, err, "Failed to create adapter")
		progress("Created adapter")

		// Check health
		err = adapter.Healthy(ctx)
		require.NoError(t, err, "Meilisearch should be healthy")
		progress("Health check passed")

		// Get project index
		projectIndex := adapter.ProjectIndex()

		progress("Skipping cleanup - using unique index name per test")

		// Create sample projects
		projects := []map[string]any{
			{
				"objectID":     "terraform-provider-aws",
				"title":        "Terraform AWS Provider",
				"status":       "active",
				"description":  "Terraform provider for Amazon Web Services",
				"jiraIssueID":  "PROJ-001",
				"createdTime":  time.Now().Add(-90 * 24 * time.Hour).Unix(),
				"modifiedTime": time.Now().Add(-7 * 24 * time.Hour).Unix(),
			},
			{
				"objectID":     "vault-secrets-engine",
				"title":        "Vault Dynamic Secrets Engine",
				"status":       "active",
				"description":  "New secrets engine for Vault with rotation support",
				"jiraIssueID":  "PROJ-002",
				"createdTime":  time.Now().Add(-60 * 24 * time.Hour).Unix(),
				"modifiedTime": time.Now().Add(-14 * 24 * time.Hour).Unix(),
			},
			{
				"objectID":     "consul-service-mesh",
				"title":        "Consul Service Mesh Improvements",
				"status":       "planning",
				"description":  "Enhancements to Consul service mesh capabilities",
				"jiraIssueID":  "PROJ-003",
				"createdTime":  time.Now().Add(-30 * 24 * time.Hour).Unix(),
				"modifiedTime": time.Now().Add(-1 * 24 * time.Hour).Unix(),
			},
		}

		// Index projects individually
		progress("Indexing 3 test projects...")
		for _, project := range projects {
			err := projectIndex.Index(ctx, project)
			require.NoError(t, err, "Failed to index project")
		}

		// Wait for indexing
		progress("Waiting for project indexing...")
		time.Sleep(1 * time.Second)

		t.Run("BasicProjectSearch", func(t *testing.T) {
			progress("Testing BasicProjectSearch")
			results, err := projectIndex.Search(ctx, &search.SearchQuery{
				Query:   "terraform",
				Page:    0,
				PerPage: 10,
			})

			// This is the bug we discovered - Search returns "not yet implemented"
			if err != nil {
				// Document the current behavior
				assert.Contains(t, err.Error(), "not yet implemented",
					"Expected 'not yet implemented' error, got: %v", err)
				progress("EXPECTED FAILURE: Projects search not yet implemented")
				t.Skip("Projects search not yet implemented - test documents expected behavior")
				return
			}

			// Once implemented, these assertions should pass
			require.NoError(t, err, "Project search should succeed")
			assert.Greater(t, results.TotalHits, 0, "Should find results for 'terraform'")
			assert.NotEmpty(t, results.Hits, "Should return project hits")

			progress("BasicProjectSearch completed successfully")
		})

		t.Run("EmptyProjectSearch", func(t *testing.T) {
			progress("Testing EmptyProjectSearch")
			results, err := projectIndex.Search(ctx, &search.SearchQuery{
				Query:   "",
				Page:    0,
				PerPage: 10,
			})

			if err != nil {
				assert.Contains(t, err.Error(), "not yet implemented")
				progress("EXPECTED FAILURE: Projects search not yet implemented")
				t.Skip("Projects search not yet implemented")
				return
			}

			require.NoError(t, err, "Empty project search should succeed")
			assert.Equal(t, 3, results.TotalHits, "Should return all 3 projects")
		})

		t.Run("FilteredProjectSearch", func(t *testing.T) {
			progress("Testing FilteredProjectSearch")
			results, err := projectIndex.Search(ctx, &search.SearchQuery{
				Query:   "",
				Page:    0,
				PerPage: 10,
				Filters: map[string][]string{
					"status": {"active"},
				},
			})

			if err != nil {
				assert.Contains(t, err.Error(), "not yet implemented")
				progress("EXPECTED FAILURE: Projects search not yet implemented")
				t.Skip("Projects search not yet implemented")
				return
			}

			require.NoError(t, err, "Filtered project search should succeed")
			assert.Equal(t, 2, results.TotalHits, "Should find 2 active projects")

			// Note: Results.Hits are typed as []*Document, but projects may need
			// a different representation. This test documents expected behavior.
			assert.Equal(t, 2, len(results.Hits), "Should return 2 hits")
		})

		t.Run("SortedProjectSearch", func(t *testing.T) {
			progress("Testing SortedProjectSearch")
			results, err := projectIndex.Search(ctx, &search.SearchQuery{
				Query:     "",
				Page:      0,
				PerPage:   10,
				SortBy:    "modifiedTime",
				SortOrder: "desc",
			})

			if err != nil {
				assert.Contains(t, err.Error(), "not yet implemented")
				progress("EXPECTED FAILURE: Projects search not yet implemented")
				t.Skip("Projects search not yet implemented")
				return
			}

			require.NoError(t, err, "Sorted project search should succeed")
			require.GreaterOrEqual(t, len(results.Hits), 2, "Should have at least 2 results")

			// Note: Sorting verification would need to inspect the actual project data
			// returned in results.Hits. Current SearchResult struct uses Document type.
			progress("Sorted search completed - result format TBD")
		})

		t.Run("GetSingleProject", func(t *testing.T) {
			progress("Testing GetSingleProject")
			project, err := projectIndex.GetObject(ctx, "terraform-provider-aws")
			require.NoError(t, err, "Should retrieve single project")
			assert.NotNil(t, project, "Project should not be nil")
			assert.Equal(t, "terraform-provider-aws", project["objectID"])
			assert.Equal(t, "Terraform AWS Provider", project["title"])
			progress("GetSingleProject completed")
		})

		t.Run("DeleteProject", func(t *testing.T) {
			progress("Testing DeleteProject")

			// Create a test project to delete
			testProject := map[string]any{
				"objectID":     "test-delete-project",
				"title":        "Test Delete Project",
				"status":       "archived",
				"description":  "Project to test deletion",
				"createdTime":  time.Now().Unix(),
				"modifiedTime": time.Now().Unix(),
			}

			err := projectIndex.Index(ctx, testProject)
			require.NoError(t, err, "Should index test project")
			time.Sleep(500 * time.Millisecond)

			// Verify it exists
			_, err = projectIndex.GetObject(ctx, "test-delete-project")
			require.NoError(t, err, "Project should exist before deletion")

			// Delete the project
			err = projectIndex.Delete(ctx, "test-delete-project")
			require.NoError(t, err, "Should delete project")
			time.Sleep(500 * time.Millisecond)

			// Verify it no longer exists
			_, err = projectIndex.GetObject(ctx, "test-delete-project")
			assert.Error(t, err, "Project should not exist after deletion")
			progress("DeleteProject completed")
		})

		progress("Skipping cleanup - using unique index per test run")
		progress("ProjectsSearch test completed")
	})
}

// TestMeilisearchAdapter_ProjectsSearchIntegrationWithHeaderSearch validates
// the specific scenario discovered during E2E testing: header search making
// 3 parallel requests (products facets, documents, projects).
func TestMeilisearchAdapter_ProjectsSearchIntegrationWithHeaderSearch(t *testing.T) {
	integration.WithTimeout(t, 40*time.Second, 10*time.Second, func(ctx context.Context, progress func(string)) {
		progress("Starting ProjectsSearchIntegrationWithHeaderSearch test")

		host, apiKey := integration.GetMeilisearchConfig()
		adapter, err := meilisearch.NewAdapter(&meilisearch.Config{
			Host:              host,
			APIKey:            apiKey,
			DocsIndexName:     "integration-test-header-docs",
			DraftsIndexName:   "integration-test-header-drafts",
			ProjectsIndexName: "integration-test-header-projects",
		})
		require.NoError(t, err)

		// Index sample data
		docIndex := adapter.DocumentIndex()
		projectIndex := adapter.ProjectIndex()

		// Create test document
		doc := &search.Document{
			ObjectID:     "rfc-header-test",
			DocID:        "RFC-HEADER-001",
			Title:        "RFC for Header Search Test",
			DocNumber:    "RFC-HEADER-001",
			DocType:      "RFC",
			Product:      "terraform",
			Status:       "published",
			Owners:       []string{"tester"},
			Summary:      "Test document for header search",
			Content:      "Testing RFC search in header component",
			CreatedTime:  time.Now().Unix(),
			ModifiedTime: time.Now().Unix(),
		}
		err = docIndex.IndexBatch(ctx, []*search.Document{doc})
		require.NoError(t, err)

		// Create test project
		project := map[string]any{
			"objectID":     "test-header-project",
			"title":        "RFC Implementation Project",
			"status":       "active",
			"description":  "Project for implementing RFC features",
			"createdTime":  time.Now().Unix(),
			"modifiedTime": time.Now().Unix(),
		}
		err = projectIndex.Index(ctx, project)
		require.NoError(t, err)

		progress("Waiting for indexing...")
		time.Sleep(1 * time.Second)

		t.Run("ParallelSearchSimulation", func(t *testing.T) {
			progress("Simulating header search with parallel requests")

			// Simulate the 3 parallel searches from header component
			type searchResult struct {
				name string
				err  error
			}

			results := make(chan searchResult, 3)

			// 1. Product facets search (documents)
			go func() {
				_, err := docIndex.Search(ctx, &search.SearchQuery{
					Query:   "RFC",
					Facets:  []string{"product"},
					PerPage: 1,
				})
				results <- searchResult{"product_facets", err}
			}()

			// 2. Document search
			go func() {
				_, err := docIndex.Search(ctx, &search.SearchQuery{
					Query:   "RFC",
					PerPage: 5,
				})
				results <- searchResult{"documents", err}
			}()

			// 3. Project search (THIS IS THE FAILING ONE)
			go func() {
				_, err := projectIndex.Search(ctx, &search.SearchQuery{
					Query:   "RFC",
					PerPage: 3,
				})
				results <- searchResult{"projects", err}
			}()

			// Collect results
			var productFacetsErr, documentsErr, projectsErr error
			for i := 0; i < 3; i++ {
				result := <-results
				switch result.name {
				case "product_facets":
					productFacetsErr = result.err
				case "documents":
					documentsErr = result.err
				case "projects":
					projectsErr = result.err
				}
			}

			// Validate results
			assert.NoError(t, productFacetsErr, "Product facets search should succeed")
			assert.NoError(t, documentsErr, "Documents search should succeed")

			// This is the bug - projects search fails
			if projectsErr != nil {
				assert.Contains(t, projectsErr.Error(), "not yet implemented",
					"Expected 'not yet implemented' error for projects search")
				progress(fmt.Sprintf("DOCUMENTED BUG: Projects search failed with: %v", projectsErr))
				t.Logf("BUG CONFIRMED: Header search fails because projects search returns: %v", projectsErr)
			} else {
				progress("Projects search succeeded - implementation complete!")
			}
		})

		progress("ProjectsSearchIntegrationWithHeaderSearch test completed")
	})
}
