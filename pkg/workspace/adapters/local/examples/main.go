package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/hashicorp-forge/hermes/pkg/storage"
)

func main() {
	// Create temporary storage directory
	storageDir := filepath.Join(os.TempDir(), "hermes-example")
	if err := os.MkdirAll(storageDir, 0755); err != nil {
		log.Fatal(err)
	}
	defer os.RemoveAll(storageDir) // Cleanup

	fmt.Printf("Using storage directory: %s\n\n", storageDir)

	// Create filesystem adapter
	adapter, err := localworkspace.NewAdapter(&localworkspace.Config{
		BasePath: storageDir,
	})
	if err != nil {
		log.Fatalf("Failed to create adapter: %v", err)
	}

	// Get document storage
	docStorage := adapter.DocumentStorage()
	ctx := context.Background()

	// Example 1: Create a document from scratch
	fmt.Println("=== Example 1: Create Document ===")
	doc1, err := docStorage.CreateDocument(ctx, &storage.DocumentCreate{
		Name:           "RFC-001: Storage Abstraction",
		ParentFolderID: "docs",
		Content: `# RFC-001: Storage Abstraction Layer

## Summary
This RFC proposes a storage abstraction layer for Hermes.

## Motivation
- Support multiple storage backends
- Improve testability
- Enable local development

## Design
...`,
		Owner: "engineer@hashicorp.com",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Created document: %s (ID: %s)\n", doc1.Name, doc1.ID)

	// Example 2: Create a draft document from template
	fmt.Println("\n=== Example 2: Create Draft from Template ===")

	// First create a template
	template, err := docStorage.CreateDocument(ctx, &storage.DocumentCreate{
		Name:           "RFC Template",
		ParentFolderID: "templates",
		Content: `# {{docType}}-{{number}}: {{title}}

Product: {{product}}
Author: {{author}}
Status: {{status}}

## Summary
[Brief summary here]

## Motivation
[Why is this needed?]

## Design
[How will this work?]`,
		Owner: "admin@hashicorp.com",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Created template: %s\n", template.Name)

	// Copy template to create a new draft
	draft, err := docStorage.CopyDocument(ctx, template.ID, "drafts", "RFC-002: API Versioning")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Created draft from template: %s (ID: %s)\n", draft.Name, draft.ID)

	// Replace template placeholders
	err = docStorage.ReplaceTextInDocument(ctx, draft.ID, map[string]string{
		"docType": "RFC",
		"number":  "002",
		"title":   "API Versioning",
		"product": "Terraform",
		"author":  "engineer@hashicorp.com",
		"status":  "Draft",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Replaced template placeholders")

	// Example 3: Update document content
	fmt.Println("\n=== Example 3: Update Document ===")
	newContent := `# RFC-002: API Versioning

Product: Terraform
Author: engineer@hashicorp.com
Status: In Review

## Summary
This RFC proposes a versioning strategy for our REST API.

## Motivation
- Breaking changes need to be managed
- Clients need stability guarantees
- We need a clear deprecation policy

## Design
We will use URL-based versioning: /api/v1, /api/v2, etc.`

	updated, err := docStorage.UpdateDocument(ctx, draft.ID, &storage.DocumentUpdate{
		Content: &newContent,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Updated document content (modified: %s)\n", updated.ModifiedTime.Format("2006-01-02 15:04:05"))

	// Example 4: Create folder hierarchy
	fmt.Println("\n=== Example 4: Create Folder Hierarchy ===")
	rfcFolder, err := docStorage.CreateFolder(ctx, "RFC", "root")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Created folder: %s\n", rfcFolder.Name)

	productFolder, err := docStorage.CreateFolder(ctx, "Terraform", rfcFolder.ID)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Created subfolder: %s under %s\n", productFolder.Name, rfcFolder.Name)

	// Example 5: List documents
	fmt.Println("\n=== Example 5: List Documents ===")
	docs, err := docStorage.ListDocuments(ctx, "docs", &storage.ListOptions{
		PageSize: 10,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Found %d documents in 'docs' folder:\n", len(docs))
	for i, doc := range docs {
		fmt.Printf("  %d. %s (ID: %s, Modified: %s)\n",
			i+1, doc.Name, doc.ID, doc.ModifiedTime.Format("2006-01-02 15:04:05"))
	}

	// Example 6: Get document with content
	fmt.Println("\n=== Example 6: Retrieve Document ===")
	retrieved, err := docStorage.GetDocument(ctx, doc1.ID)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Retrieved: %s\n", retrieved.Name)
	fmt.Printf("Owner: %s\n", retrieved.Owner)
	fmt.Printf("Created: %s\n", retrieved.CreatedTime.Format("2006-01-02 15:04:05"))
	fmt.Printf("Content preview: %s...\n", retrieved.Content[:50])

	// Example 7: Search for subfolder
	fmt.Println("\n=== Example 7: Get Subfolder ===")
	sub, err := docStorage.GetSubfolder(ctx, rfcFolder.ID, "Terraform")
	if err != nil {
		log.Fatal(err)
	}
	if sub != nil {
		fmt.Printf("Found subfolder: %s (ID: %s)\n", sub.Name, sub.ID)
	} else {
		fmt.Println("Subfolder not found")
	}

	// Example 8: Move document
	fmt.Println("\n=== Example 8: Move Document ===")
	err = docStorage.MoveDocument(ctx, draft.ID, "docs")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Moved draft to docs folder\n")

	movedDoc, err := docStorage.GetDocument(ctx, draft.ID)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Document is now in folder: %s\n", movedDoc.ParentFolderID)

	fmt.Println("\n=== Summary ===")
	fmt.Printf("Storage directory: %s\n", storageDir)
	fmt.Println("Directory structure:")
	filepath.Walk(storageDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(storageDir, path)
		if rel == "." {
			return nil
		}
		indent := ""
		for i := 0; i < len(filepath.SplitList(rel))-1; i++ {
			indent += "  "
		}
		if info.IsDir() {
			fmt.Printf("%s📁 %s/\n", indent, info.Name())
		} else {
			fmt.Printf("%s📄 %s\n", indent, info.Name())
		}
		return nil
	})

	fmt.Println("\n✅ All examples completed successfully!")
}
