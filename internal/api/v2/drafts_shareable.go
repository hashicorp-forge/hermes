package api

import (
	"encoding/json"
	"net/http"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	"github.com/hashicorp-forge/hermes/pkg/document"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp/go-hclog"
	"gorm.io/gorm"
)

type draftsShareablePutRequest struct {
	IsShareable *bool `json:"isShareable"`
}

type draftsShareableGetResponse struct {
	IsShareable bool `json:"isShareable"`
}

func draftsShareableHandler(
	w http.ResponseWriter,
	r *http.Request,
	docID string,
	doc document.Document,
	cfg config.Config,
	l hclog.Logger,
	algoRead *algolia.Client,
	db *gorm.DB,
) {
	switch r.Method {
	case "GET":
		// Get document from database.
		d := models.Document{
			FileID: docID,
		}
		if err := d.Get(db); err != nil {
			l.Error("error getting document from database",
				"error", err,
				"path", r.URL.Path,
				"method", r.Method,
				"doc_id", docID,
			)
			http.Error(w, "Error accessing document",
				http.StatusInternalServerError)
			return
		}

		resp := draftsShareableGetResponse{
			IsShareable: d.ShareableAsDraft,
		}

		// Write response.
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		enc := json.NewEncoder(w)
		if err := enc.Encode(resp); err != nil {
			l.Error("error encoding response",
				"error", err,
				"doc_id", docID,
			)
			http.Error(w, "Error building response", http.StatusInternalServerError)
			return
		}

	case "PUT":
		// Authorize request (only the document owner is authorized).
		userEmail := r.Context().Value("userEmail").(string)
		if doc.Owners[0] != userEmail {
			l.Warn("unauthorized attempt to change draft shareable settings",
				"method", r.Method,
				"path", r.URL.Path,
				"doc_id", docID,
				"user_email", userEmail,
				"owner", doc.Owners[0])
			http.Error(w, "Only the document owner can change shareable settings",
				http.StatusForbidden)
			return
		}

		// Decode request.
		var req draftsShareablePutRequest
		if err := decodeRequest(r, &req); err != nil {
			l.Error("error decoding request",
				"error", err,
				"path", r.URL.Path,
				"method", r.Method,
				"doc_id", docID,
			)
			http.Error(w, "Bad request", http.StatusBadRequest)
			return
		}

		// Validate request.
		if req.IsShareable == nil {
			l.Warn("bad request: missing required 'isShareable' field",
				"path", r.URL.Path,
				"method", r.Method,
				"doc_id", docID,
			)
			http.Error(w,
				"Bad request: missing required 'isShareable' field",
				http.StatusBadRequest)
			return
		}

		// Get document from database.
		doc := models.Document{
			FileID: docID,
		}
		if err := doc.Get(db); err != nil {
			l.Error("error getting document from database",
				"error", err,
				"path", r.URL.Path,
				"method", r.Method,
				"doc_id", docID,
			)
			http.Error(w, "Error accessing document",
				http.StatusInternalServerError)
			return
		}

		// TODO : Enable the access to organisation when isShareable is true.

		// Update ShareableAsDraft for document in the database.
		if err := db.Model(&doc).
			// We need to update using Select because ShareableAsDraft is a
			// boolean.
			Select("ShareableAsDraft").
			Updates(models.Document{ShareableAsDraft: *req.IsShareable}).
			Error; err != nil {
			l.Error("error updating ShareableAsDraft in the database",
				"error", err,
				"path", r.URL.Path,
				"method", r.Method,
				"doc_id", docID,
			)
			http.Error(w, "Error updating document draft",
				http.StatusInternalServerError)
			return
		}

		l.Info("updated ShareableAsDraft for document",
			"path", r.URL.Path,
			"method", r.Method,
			"doc_id", docID,
			"shareable_as_draft", doc.ShareableAsDraft,
		)

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
}
