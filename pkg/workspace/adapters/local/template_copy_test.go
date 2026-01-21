package local

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/spf13/afero"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// createTestAdapterWithMemFS creates an adapter with in-memory filesystem for testing.
func createTestAdapterWithMemFS(t *testing.T) *Adapter {
	t.Helper()

	fs := afero.NewMemMapFs()
	cfg := &Config{
		BasePath:   "/workspace",
		FileSystem: fs,
	}
	require.NoError(t, cfg.Validate())

	adapter, err := NewAdapter(cfg)
	require.NoError(t, err)
	return adapter
}

// TestCopyDocument_FromTemplates tests copying documents from the templates directory.
func TestCopyDocument_FromTemplates(t *testing.T) {
	ctx := context.Background()

	t.Run("CopyTemplateToDrafts", func(t *testing.T) {
		adapter := createTestAdapterWithMemFS(t)
		docStorage := adapter.DocumentStorage()

		// Create templates directory and template file
		templatesDir := filepath.Join(adapter.basePath, "templates")
		require.NoError(t, adapter.fs.MkdirAll(templatesDir, 0755))

		templatePath := filepath.Join(templatesDir, "template-rfc.md")
		templateContent := "# RFC Template\n\n## Summary\nTemplate for RFC documents."

		// Write template file
		require.NoError(t, afero.WriteFile(adapter.fs, templatePath, []byte(templateContent), 0644))

		// Verify template file exists
		exists, err := afero.Exists(adapter.fs, templatePath)
		require.NoError(t, err)
		require.True(t, exists, "Template file should exist at %s", templatePath)

		// List templates directory
		entries, err := afero.ReadDir(adapter.fs, templatesDir)
		require.NoError(t, err)
		t.Logf("Templates directory contains %d entries", len(entries))
		for _, entry := range entries {
			t.Logf("  - %s (IsDir: %v)", entry.Name(), entry.IsDir())
		}

		// Try to manually check if findDocumentPath works
		docPath, isDraft, isDir, err := adapter.findDocumentPath("template-rfc")
		if err != nil {
			t.Logf("findDocumentPath error: %v", err)
		} else {
			t.Logf("findDocumentPath found: path=%s, isDraft=%v, isDir=%v", docPath, isDraft, isDir)
		}

		// Create drafts folder
		draftsFolder, err := docStorage.CreateFolder(ctx, "Test Drafts", "")
		require.NoError(t, err)

		// Copy template to drafts
		copied, err := docStorage.CopyDocument(ctx, "template-rfc", draftsFolder.ID, "My RFC Document")
		if err != nil {
			t.Logf("CopyDocument error: %v", err)
		}
		require.NoError(t, err, "Failed to copy template")

		// Verify copied document
		assert.NotEqual(t, "template-rfc", copied.ID, "Copied document should have new ID")
		assert.Equal(t, "My RFC Document", copied.Name)
		assert.Equal(t, draftsFolder.ID, copied.ParentFolderID)
		assert.Equal(t, templateContent, copied.Content, "Content should match template")
	})
}
