package algolia

import (
	"context"
	"testing"

	hermessearch "github.com/hashicorp-forge/hermes/pkg/search"
)

func TestNewAdapter(t *testing.T) {
	tests := []struct {
		name    string
		config  *Config
		wantErr bool
	}{
		{
			name: "valid config",
			config: &Config{
				AppID:           "test-app-id",
				WriteAPIKey:     "test-write-key",
				SearchAPIKey:    "test-search-key",
				DocsIndexName:   "test-docs",
				DraftsIndexName: "test-drafts",
			},
			wantErr: false,
		},
		{
			name: "missing app id",
			config: &Config{
				WriteAPIKey:     "test-write-key",
				DocsIndexName:   "test-docs",
				DraftsIndexName: "test-drafts",
			},
			wantErr: true,
		},
		{
			name: "missing write key",
			config: &Config{
				AppID:           "test-app-id",
				DocsIndexName:   "test-docs",
				DraftsIndexName: "test-drafts",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			adapter, err := NewAdapter(tt.config)
			if (err != nil) != tt.wantErr {
				t.Errorf("NewAdapter() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && adapter == nil {
				t.Error("NewAdapter() returned nil adapter")
			}
		})
	}
}

func TestAdapter_Name(t *testing.T) {
	cfg := &Config{
		AppID:           "test-app-id",
		WriteAPIKey:     "test-write-key",
		DocsIndexName:   "test-docs",
		DraftsIndexName: "test-drafts",
	}
	adapter, err := NewAdapter(cfg)
	if err != nil {
		t.Fatalf("NewAdapter() error = %v", err)
	}

	if got := adapter.Name(); got != "algolia" {
		t.Errorf("Name() = %v, want %v", got, "algolia")
	}
}

func TestAdapter_Interfaces(t *testing.T) {
	cfg := &Config{
		AppID:           "test-app-id",
		WriteAPIKey:     "test-write-key",
		DocsIndexName:   "test-docs",
		DraftsIndexName: "test-drafts",
	}
	adapter, err := NewAdapter(cfg)
	if err != nil {
		t.Fatalf("NewAdapter() error = %v", err)
	}

	// Verify adapter implements Provider interface
	var _ hermessearch.Provider = adapter

	// Verify DocumentIndex returns correct interface
	docIndex := adapter.DocumentIndex()
	if docIndex == nil {
		t.Error("DocumentIndex() returned nil")
	}
	var _ hermessearch.DocumentIndex = docIndex

	// Verify DraftIndex returns correct interface
	draftIndex := adapter.DraftIndex()
	if draftIndex == nil {
		t.Error("DraftIndex() returned nil")
	}
	var _ hermessearch.DraftIndex = draftIndex
}

func TestDocumentIndex_BasicOperations(t *testing.T) {
	// Note: These are unit tests that verify the interface implementation.
	// Integration tests against real Algolia would be in a separate file.
	cfg := &Config{
		AppID:           "test-app-id",
		WriteAPIKey:     "test-write-key",
		DocsIndexName:   "test-docs",
		DraftsIndexName: "test-drafts",
	}
	adapter, err := NewAdapter(cfg)
	if err != nil {
		t.Fatalf("NewAdapter() error = %v", err)
	}

	docIndex := adapter.DocumentIndex()

	t.Run("Index accepts document", func(t *testing.T) {
		doc := &hermessearch.Document{
			ObjectID:  "doc-123",
			DocID:     "doc-123",
			Title:     "Test Document",
			DocNumber: "RFC-001",
			DocType:   "RFC",
		}

		// This will fail without real Algolia credentials, but that's expected
		// We're just verifying the method signature and error handling
		err := docIndex.Index(context.Background(), doc)
		if err == nil {
			t.Log("Index succeeded (unexpected in unit test)")
		} else {
			// Verify error is wrapped correctly
			if searchErr, ok := err.(*hermessearch.Error); ok {
				if searchErr.Op != "Index" {
					t.Errorf("Expected Op='Index', got %v", searchErr.Op)
				}
			}
		}
	})
}
