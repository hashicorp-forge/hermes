package local

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/hashicorp-forge/hermes/pkg/search"
	"github.com/hashicorp-forge/hermes/pkg/workspace"
	"github.com/hashicorp/go-hclog"
	"github.com/spf13/afero"
)

// DocumentIndexer handles indexing of local documents into the search provider.
type DocumentIndexer struct {
	adapter        *Adapter
	searchProvider search.Provider
	logger         hclog.Logger
}

// NewDocumentIndexer creates a new document indexer.
func NewDocumentIndexer(adapter *Adapter, searchProvider search.Provider, logger hclog.Logger) *DocumentIndexer {
	if logger == nil {
		logger = hclog.NewNullLogger()
	}

	return &DocumentIndexer{
		adapter:        adapter,
		searchProvider: searchProvider,
		logger:         logger,
	}
}

// IndexAll indexes all documents from the filesystem into the search provider.
// This should be called on startup to ensure search index is synchronized with filesystem.
func (di *DocumentIndexer) IndexAll(ctx context.Context) error {
	di.logger.Info("starting document indexing", "base_path", di.adapter.basePath)

	// Index published documents
	if err := di.indexDirectory(ctx, di.adapter.docsPath, false); err != nil {
		return fmt.Errorf("failed to index docs: %w", err)
	}

	// Index draft documents
	if err := di.indexDirectory(ctx, di.adapter.draftsPath, true); err != nil {
		return fmt.Errorf("failed to index drafts: %w", err)
	}

	di.logger.Info("document indexing completed")
	return nil
}

// indexDirectory recursively indexes all documents in a directory.
func (di *DocumentIndexer) indexDirectory(ctx context.Context, dirPath string, isDraft bool) error {
	// Check if directory exists
	if _, err := di.adapter.fs.Stat(dirPath); err != nil {
		di.logger.Warn("directory does not exist, skipping", "path", dirPath)
		return nil
	}

	files, err := afero.ReadDir(di.adapter.fs, dirPath)
	if err != nil {
		return fmt.Errorf("failed to read directory %s: %w", dirPath, err)
	}

	indexType := "docs"
	if isDraft {
		indexType = "drafts"
	}

	indexed := 0
	skipped := 0

	for _, file := range files {
		if file.IsDir() {
			// Check if this is a directory-based document (contains metadata.json)
			metadataPath := filepath.Join(dirPath, file.Name(), "metadata.json")
			if _, err := di.adapter.fs.Stat(metadataPath); err == nil {
				// This is a directory-based document
				if err := di.indexDocument(ctx, file.Name(), isDraft); err != nil {
					di.logger.Error("failed to index directory document",
						"path", file.Name(),
						"type", indexType,
						"error", err,
					)
					skipped++
					continue
				}
				indexed++
			}
			// Skip other directories
			continue
		}

		// Handle single-file documents (.md files)
		if filepath.Ext(file.Name()) == ".md" {
			docID := strings.TrimSuffix(file.Name(), ".md")
			if err := di.indexDocument(ctx, docID, isDraft); err != nil {
				di.logger.Error("failed to index single-file document",
					"path", file.Name(),
					"type", indexType,
					"error", err,
				)
				skipped++
				continue
			}
			indexed++
		}
	}

	di.logger.Info("directory indexing completed",
		"path", dirPath,
		"type", indexType,
		"indexed", indexed,
		"skipped", skipped,
	)

	return nil
}

// indexDocument indexes a single document into the appropriate search index.
func (di *DocumentIndexer) indexDocument(ctx context.Context, docID string, isDraft bool) error {
	// Get document from filesystem
	doc, err := di.adapter.DocumentStorage().GetDocument(ctx, docID)
	if err != nil {
		return fmt.Errorf("failed to get document: %w", err)
	}

	// Convert to search document
	searchDoc := workspaceDocumentToSearchDocument(doc)

	// Index into appropriate index
	if isDraft {
		return di.searchProvider.DraftIndex().Index(ctx, searchDoc)
	}
	return di.searchProvider.DocumentIndex().Index(ctx, searchDoc)
}

// workspaceDocumentToSearchDocument converts a workspace.Document to search.Document.
// This extracts metadata and content into the format expected by the search provider.
func workspaceDocumentToSearchDocument(doc *workspace.Document) *search.Document {
	searchDoc := &search.Document{
		ObjectID:     doc.ID,
		DocID:        doc.ID,
		Title:        doc.Name,
		Content:      doc.Content,
		CreatedTime:  doc.CreatedTime.Unix(),
		ModifiedTime: doc.ModifiedTime.Unix(),
		CustomFields: make(map[string]interface{}),
	}

	// Extract metadata fields
	if doc.Metadata != nil {
		// Standard Hermes document fields
		if docType, ok := doc.Metadata["docType"].(string); ok {
			searchDoc.DocType = docType
		}
		if docNumber, ok := doc.Metadata["docNumber"].(string); ok {
			searchDoc.DocNumber = docNumber
		}
		if product, ok := doc.Metadata["product"].(string); ok {
			searchDoc.Product = product
		}
		if status, ok := doc.Metadata["status"].(string); ok {
			searchDoc.Status = status
		}
		if summary, ok := doc.Metadata["summary"].(string); ok {
			searchDoc.Summary = summary
		}

		// Array fields
		if owners, ok := doc.Metadata["owners"].([]interface{}); ok {
			searchDoc.Owners = interfaceSliceToStringSlice(owners)
		} else if owner := doc.Owner; owner != "" {
			searchDoc.Owners = []string{owner}
		}

		if contributors, ok := doc.Metadata["contributors"].([]interface{}); ok {
			searchDoc.Contributors = interfaceSliceToStringSlice(contributors)
		}
		if approvers, ok := doc.Metadata["approvers"].([]interface{}); ok {
			searchDoc.Approvers = interfaceSliceToStringSlice(approvers)
		}

		// Store remaining metadata as custom fields
		for key, value := range doc.Metadata {
			switch key {
			case "docType", "docNumber", "product", "status", "summary",
				"owners", "contributors", "approvers":
				// Already extracted
				continue
			default:
				searchDoc.CustomFields[key] = value
			}
		}
	}

	// Fallback for owner if not in metadata
	if len(searchDoc.Owners) == 0 && doc.Owner != "" {
		searchDoc.Owners = []string{doc.Owner}
	}

	return searchDoc
}

// interfaceSliceToStringSlice converts []interface{} to []string.
func interfaceSliceToStringSlice(input []interface{}) []string {
	result := make([]string, 0, len(input))
	for _, item := range input {
		if str, ok := item.(string); ok {
			result = append(result, str)
		}
	}
	return result
}
