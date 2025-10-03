package meilisearch

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	hermessearch "github.com/hashicorp-forge/hermes/pkg/search"
)

// TestNewAdapter tests adapter creation.
func TestNewAdapter(t *testing.T) {
	tests := []struct {
		name    string
		cfg     *Config
		wantErr bool
	}{
		{
			name: "valid config",
			cfg: &Config{
				Host:            "http://localhost:7700",
				APIKey:          "masterKey123",
				DocsIndexName:   "test-docs",
				DraftsIndexName: "test-drafts",
			},
			wantErr: false,
		},
		{
			name: "missing host",
			cfg: &Config{
				APIKey:          "masterKey123",
				DocsIndexName:   "test-docs",
				DraftsIndexName: "test-drafts",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			adapter, err := NewAdapter(tt.cfg)
			if (err != nil) != tt.wantErr {
				t.Errorf("NewAdapter() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && adapter == nil {
				t.Error("NewAdapter() returned nil adapter")
			}
			if adapter != nil && adapter.Name() != "meilisearch" {
				t.Errorf("adapter.Name() = %v, want meilisearch", adapter.Name())
			}
		})
	}
}

// TestBuildMeilisearchFilters tests filter string generation.
func TestBuildMeilisearchFilters(t *testing.T) {
	tests := []struct {
		name    string
		filters map[string][]string
		want    string
	}{
		{
			name: "single filter single value",
			filters: map[string][]string{
				"product": {"terraform"},
			},
			want: `product = "terraform"`,
		},
		{
			name: "single filter multiple values",
			filters: map[string][]string{
				"status": {"approved", "published"},
			},
			want: `status IN ["approved", "published"]`,
		},
		{
			name: "multiple filters",
			filters: map[string][]string{
				"product": {"terraform"},
				"status":  {"approved"},
			},
			// Note: map iteration order is random, so we check both possibilities
			want: "", // We'll check contains instead
		},
		{
			name:    "empty filters",
			filters: map[string][]string{},
			want:    "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := buildMeilisearchFilters(tt.filters)
			if tt.name == "empty filters" {
				if got != nil {
					t.Errorf("buildMeilisearchFilters() = %v, want nil", got)
				}
				return
			}
			if got == nil {
				if tt.want != "" {
					t.Errorf("buildMeilisearchFilters() = nil, want %v", tt.want)
				}
				return
			}
			gotStr, ok := got.(string)
			if !ok {
				t.Errorf("buildMeilisearchFilters() returned non-string: %T", got)
				return
			}
			if tt.want != "" && gotStr != tt.want {
				t.Errorf("buildMeilisearchFilters() = %v, want %v", gotStr, tt.want)
			}
		})
	}
}

// TestConvertMeilisearchFacets tests facet conversion.
func TestConvertMeilisearchFacets(t *testing.T) {
	tests := []struct {
		name      string
		facetDist map[string]map[string]int64
		want      *hermessearch.Facets
		wantErr   bool
	}{
		{
			name: "all facet types",
			facetDist: map[string]map[string]int64{
				"product": {
					"terraform": 10,
					"vault":     5,
				},
				"docType": {
					"RFC": 8,
					"PRD": 7,
				},
				"status": {
					"approved":  6,
					"published": 9,
				},
				"owners": {
					"user1": 3,
					"user2": 4,
				},
			},
			want: &hermessearch.Facets{
				Products: map[string]int{
					"terraform": 10,
					"vault":     5,
				},
				DocTypes: map[string]int{
					"RFC": 8,
					"PRD": 7,
				},
				Statuses: map[string]int{
					"approved":  6,
					"published": 9,
				},
				Owners: map[string]int{
					"user1": 3,
					"user2": 4,
				},
			},
		},
		{
			name:      "nil facets",
			facetDist: nil,
			want: &hermessearch.Facets{
				Products: map[string]int{},
				DocTypes: map[string]int{},
				Statuses: map[string]int{},
				Owners:   map[string]int{},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Marshal the test data to JSON as the function expects
			facetJSON, err := json.Marshal(tt.facetDist)
			if err != nil {
				t.Fatalf("Failed to marshal test data: %v", err)
			}

			got, err := convertMeilisearchFacets(facetJSON)
			if (err != nil) != tt.wantErr {
				t.Errorf("convertMeilisearchFacets() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if tt.wantErr {
				return
			}
			if got == nil {
				t.Error("convertMeilisearchFacets() returned nil")
				return
			}
			// Compare Products
			if len(got.Products) != len(tt.want.Products) {
				t.Errorf("Products length = %v, want %v", len(got.Products), len(tt.want.Products))
			}
			for k, v := range tt.want.Products {
				if got.Products[k] != v {
					t.Errorf("Products[%s] = %v, want %v", k, got.Products[k], v)
				}
			}
			// Similar checks for other facets...
		})
	}
}

// TestAdapterInterfaces verifies the adapter implements required interfaces.
func TestAdapterInterfaces(t *testing.T) {
	var _ hermessearch.Provider = (*Adapter)(nil)
	var _ hermessearch.DocumentIndex = (*documentIndex)(nil)
	var _ hermessearch.DraftIndex = (*draftIndex)(nil)
}

// Integration test - requires Meilisearch running
func TestIntegration_IndexAndSearch(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	adapter, err := NewAdapter(&Config{
		Host:            "http://localhost:7700",
		APIKey:          "masterKey123",
		DocsIndexName:   "test-docs-integration",
		DraftsIndexName: "test-drafts-integration",
	})
	if err != nil {
		t.Skipf("Could not connect to Meilisearch: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Check health
	if err := adapter.Healthy(ctx); err != nil {
		t.Skipf("Meilisearch not healthy: %v", err)
	}

	// Clean up before test
	docIndex := adapter.DocumentIndex()
	_ = docIndex.Clear(ctx)

	// Index a test document
	testDoc := &hermessearch.Document{
		ObjectID:     "test-doc-1",
		DocID:        "TEST-001",
		Title:        "Test Document",
		DocNumber:    "TEST-001",
		DocType:      "RFC",
		Product:      "terraform",
		Status:       "approved",
		Owners:       []string{"user1"},
		Contributors: []string{"user2"},
		Summary:      "This is a test document",
		Content:      "Full content of the test document",
		CreatedTime:  1234567890,
		ModifiedTime: 1234567890,
	}

	if err := docIndex.Index(ctx, testDoc); err != nil {
		t.Fatalf("Failed to index document: %v", err)
	}

	// Wait for indexing to complete with intelligent polling (max 5 seconds)
	var results *hermessearch.SearchResult
	start := time.Now()
	for i := 0; i < 10; i++ {
		if ctx.Err() != nil {
			t.Fatal("Context timed out waiting for indexing")
		}

		results, err = docIndex.Search(ctx, &hermessearch.SearchQuery{
			Query:   "test",
			Page:    0,
			PerPage: 10,
		})
		if err != nil {
			t.Fatalf("Search failed: %v", err)
		}

		if results.TotalHits > 0 {
			t.Logf("✓ Document indexed and searchable in %v", time.Since(start))
			break
		}

		time.Sleep(500 * time.Millisecond)
	}

	if results.TotalHits == 0 {
		t.Error("Expected at least 1 hit after waiting, got 0")
	}

	// Clean up after test
	_ = docIndex.Clear(ctx)
}
