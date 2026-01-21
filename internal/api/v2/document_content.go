package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"github.com/hashicorp-forge/hermes/internal/server"
	pkgauth "github.com/hashicorp-forge/hermes/pkg/auth"
	hcd "github.com/hashicorp-forge/hermes/pkg/hashicorpdocs"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp-forge/hermes/pkg/workspace"
	"github.com/hashicorp-forge/hermes/pkg/workspace/adapters/local"
	"google.golang.org/api/docs/v1"
	"gorm.io/gorm"
)

// DocumentContentRequest contains the content to update.
type DocumentContentRequest struct {
	Content string `json:"content"`
}

// DocumentContentResponse contains the document content.
type DocumentContentResponse struct {
	Content string `json:"content"`
}

// DocumentContentHandler handles GET and PUT requests for document content.
// GET /api/v2/documents/:id/content - retrieves document content
// PUT /api/v2/documents/:id/content - updates document content
//
// This endpoint is only available for workspace providers that support content editing.
// Providers must implement the ProviderCapabilities interface and return true from
// SupportsContentEditing() to enable this functionality.
func DocumentContentHandler(srv server.Server) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check if workspace provider supports content editing
		if caps, ok := srv.WorkspaceProvider.(workspace.ProviderCapabilities); !ok || !caps.SupportsContentEditing() {
			srv.Logger.Warn("document content API not supported by workspace provider",
				"path", r.URL.Path,
				"method", r.Method,
			)
			http.Error(w, "Document content editing not supported for this workspace provider",
				http.StatusNotImplemented)
			return
		}

		// Parse document ID from URL
		docID, err := parseDocumentContentURLPath(r.URL.Path)
		if err != nil {
			srv.Logger.Error("error parsing document content URL path",
				"error", err,
				"path", r.URL.Path,
				"method", r.Method,
			)
			http.Error(w, "Bad request", http.StatusBadRequest)
			return
		}

		// Get document from database to verify it exists and check permissions
		model := models.Document{
			GoogleFileID: docID,
		}
		if err := model.Get(srv.DB); err != nil {
			if err == gorm.ErrRecordNotFound {
				srv.Logger.Warn("document record not found",
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docID,
				)
				http.Error(w, "Document not found", http.StatusNotFound)
				return
			}
			srv.Logger.Error("error getting document from database",
				"error", err,
				"path", r.URL.Path,
				"method", r.Method,
				"doc_id", docID,
			)
			http.Error(w, "Error requesting document",
				http.StatusInternalServerError)
			return
		}

		// Get authenticated user's email
		userEmail := pkgauth.MustGetUserEmail(r.Context())

		switch r.Method {
		case "GET":
			handleGetDocumentContent(w, r, srv, docID, userEmail, &model)
		case "PUT":
			handlePutDocumentContent(w, r, srv, docID, userEmail, &model)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})
}

// handleGetDocumentContent handles GET requests to retrieve document content.
func handleGetDocumentContent(
	w http.ResponseWriter,
	r *http.Request,
	srv server.Server,
	docID string,
	userEmail string,
	model *models.Document,
) {
	// Check if this is a local workspace provider
	if localProvider, ok := srv.WorkspaceProvider.(*local.ProviderAdapter); ok {
		// Get content through local workspace document storage
		content, err := localProvider.GetAdapter().DocumentStorage().GetDocumentContent(context.Background(), docID)
		if err != nil {
			srv.Logger.Error("error getting document content from local workspace",
				"error", err,
				"doc_id", docID,
			)
			http.Error(w, "Error retrieving document content",
				http.StatusInternalServerError)
			return
		}

		resp := DocumentContentResponse{
			Content: content,
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		if err := json.NewEncoder(w).Encode(resp); err != nil {
			srv.Logger.Error("error encoding document content response",
				"error", err,
				"doc_id", docID,
			)
		}
		return
	}

	// Fallback: Try to get content from Google Docs
	doc, err := srv.WorkspaceProvider.GetDoc(docID)
	if err != nil {
		srv.Logger.Error("error getting document content",
			"error", err,
			"doc_id", docID,
		)
		http.Error(w, "Error retrieving document content",
			http.StatusInternalServerError)
		return
	}

	// Extract text content from Google Docs structure
	content := extractTextFromGoogleDoc(doc)

	resp := DocumentContentResponse{
		Content: content,
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		srv.Logger.Error("error encoding document content response",
			"error", err,
			"doc_id", docID,
		)
	}
}

// handlePutDocumentContent handles PUT requests to update document content.
func handlePutDocumentContent(
	w http.ResponseWriter,
	r *http.Request,
	srv server.Server,
	docID string,
	userEmail string,
	model *models.Document,
) {
	// Authorize: only owner and contributors can edit content
	if !isOwnerOrContributor(userEmail, model) {
		srv.Logger.Warn("unauthorized document content update attempt",
			"user", userEmail,
			"doc_id", docID,
		)
		http.Error(w, "Unauthorized", http.StatusForbidden)
		return
	}

	// Check if document is locked
	locked, err := hcd.IsLocked(docID, srv.DB, srv.WorkspaceProvider, srv.Logger)
	if err != nil {
		srv.Logger.Error("error checking document locked status",
			"error", err,
			"doc_id", docID,
		)
		http.Error(w, "Error getting document status", http.StatusInternalServerError)
		return
	}
	if locked {
		http.Error(w, "Document is locked", http.StatusLocked)
		return
	}

	// Decode request
	var req DocumentContentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		srv.Logger.Error("error decoding document content request",
			"error", err,
			"doc_id", docID,
		)
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	// Check if this is a local workspace provider
	if localProvider, ok := srv.WorkspaceProvider.(*local.ProviderAdapter); ok {
		// Update content through local workspace
		err := localProvider.GetAdapter().DocumentStorage().UpdateDocumentContent(context.Background(), docID, req.Content)
		if err != nil {
			srv.Logger.Error("error updating document content",
				"error", err,
				"doc_id", docID,
			)
			http.Error(w, "Error updating document content",
				http.StatusInternalServerError)
			return
		}

		srv.Logger.Info("updated document content via local workspace provider",
			"doc_id", docID,
			"user", userEmail,
		)

		// Note: Re-indexing for search happens via the background indexer service
	} else {
		// Google Docs format is not supported for content editing
		srv.Logger.Error("document content update not supported for Google workspace provider",
			"doc_id", docID,
		)
		http.Error(w, "Content editing not supported for Google workspace documents",
			http.StatusNotImplemented)
		return
	}

	// Return success
	w.WriteHeader(http.StatusOK)
	resp := map[string]string{"status": "success"}
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		srv.Logger.Error("error encoding response",
			"error", err,
			"doc_id", docID,
		)
	}
}

// parseDocumentContentURLPath extracts the document ID from /api/v2/documents/:id/content
func parseDocumentContentURLPath(path string) (string, error) {
	re := regexp.MustCompile(`^/api/v2/documents/([0-9A-Za-z_\-]+)/content$`)
	matches := re.FindStringSubmatch(path)
	if len(matches) != 2 {
		return "", fmt.Errorf("invalid document content URL path")
	}
	return matches[1], nil
}

// isOwnerOrContributor checks if the user is the owner or a contributor
func isOwnerOrContributor(userEmail string, doc *models.Document) bool {
	// Check owner
	if doc.Owner != nil && doc.Owner.EmailAddress == userEmail {
		return true
	}

	// Check contributors
	for _, contributor := range doc.Contributors {
		if contributor.EmailAddress == userEmail {
			return true
		}
	}

	return false
}

// extractTextFromGoogleDoc extracts plain text content from a Google Docs document
func extractTextFromGoogleDoc(doc *docs.Document) string {
	var content strings.Builder

	if doc.Body == nil {
		return ""
	}

	for _, element := range doc.Body.Content {
		if element.Paragraph != nil {
			for _, textElement := range element.Paragraph.Elements {
				if textElement.TextRun != nil {
					content.WriteString(textElement.TextRun.Content)
				}
			}
		}
	}

	return content.String()
}
