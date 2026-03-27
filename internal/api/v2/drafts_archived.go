package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	"github.com/hashicorp-forge/hermes/pkg/document"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp/go-hclog"
	"gorm.io/gorm"
)

type draftsArchivedPatchRequest struct {
	Archived *bool `json:"archived"`
}

type draftsArchivedGetResponse struct {
	Archived bool `json:"archived"`
}

func draftsArchivedHandler(
	w http.ResponseWriter,
	r *http.Request,
	docID string,
	doc document.Document,
	cfg config.Config,
	l hclog.Logger,
	algoWrite *algolia.Client,
	db *gorm.DB,
	useSharePoint bool,
) {
	switch r.Method {
	case "GET":
		// Get document from database.
		d := models.NewDocumentByFileID(docID, useSharePoint)
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

		resp := draftsArchivedGetResponse{
			Archived: d.Archived,
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

	case "PATCH":
		// Authorize request (only the document owner is authorized).
		userEmail := r.Context().Value("userEmail").(string)
		if !strings.EqualFold(doc.Owners[0], userEmail) {
			http.Error(w, "Only the document owner can archive documents",
				http.StatusForbidden)
			return
		}

		// Make sure document is a draft (WIP status).
		if doc.Status != "WIP" {
			http.Error(w, "Only draft documents can be archived",
				http.StatusBadRequest)
			return
		}

		// Decode request.
		var req draftsArchivedPatchRequest
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
		if req.Archived == nil {
			l.Warn("bad request: missing required 'archived' field",
				"path", r.URL.Path,
				"method", r.Method,
				"doc_id", docID,
			)
			http.Error(w,
				"Bad request: missing required 'archived' field",
				http.StatusBadRequest)
			return
		}

		// Get document from database.
		doc := models.NewDocumentByFileID(docID, useSharePoint)
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

		// Update Archived for document in the database.
		if err := db.Model(&doc).
			// We need to update using Select because Archived is a boolean.
			Select("Archived").
			Updates(models.Document{Archived: *req.Archived}).
			Error; err != nil {
			l.Error("error updating Archived in the database",
				"error", err,
				"path", r.URL.Path,
				"method", r.Method,
				"doc_id", docID,
			)
			http.Error(w, "Error updating document draft",
				http.StatusInternalServerError)
			return
		}

		l.Info("updated Archived for document",
			"path", r.URL.Path,
			"method", r.Method,
			"doc_id", docID,
			"archived", *req.Archived,
		)

		// Update Algolia in the background.
		go func() {
			// Get updated document from database to get all fields.
			updatedDoc := models.NewDocumentByFileID(docID, useSharePoint)
			if err := updatedDoc.Get(db); err != nil {
				l.Error("error getting updated document from database for Algolia",
					"error", err,
					"doc_id", docID,
				)
				return
			}

			// Get reviews for the document.
			var reviews models.DocumentReviews
			if err := reviews.Find(db, models.DocumentReview{
				Document: models.NewDocumentByFileID(docID, useSharePoint),
			}); err != nil {
				l.Error("error getting reviews for document for Algolia",
					"error", err,
					"doc_id", docID,
				)
				return
			}

			// Get group reviews for the document.
			var groupReviews models.DocumentGroupReviews
			if err := groupReviews.Find(db, models.DocumentGroupReview{
				Document: models.NewDocumentByFileID(docID, useSharePoint),
			}); err != nil {
				l.Error("error getting group reviews for document for Algolia",
					"error", err,
					"doc_id", docID,
				)
				return
			}

			// Convert database model to document.
			convertedDoc, err := document.NewFromDatabaseModel(updatedDoc, reviews, groupReviews)
			if err != nil {
				l.Error("error converting document from database model for Algolia",
					"error", err,
					"doc_id", docID,
				)
				return
			}

			// Convert document to Algolia object.
			docObj, err := convertedDoc.ToAlgoliaObject(true)
			if err != nil {
				l.Error("error converting document to Algolia object",
					"error", err,
					"doc_id", docID,
				)
				return
			}

			// Save updated draft doc object in Algolia.
			res, err := algoWrite.Drafts.SaveObject(docObj)
			if err != nil {
				l.Error("error saving archived status to Algolia",
					"error", err,
					"doc_id", docID,
				)
				return
			}
			err = res.Wait()
			if err != nil {
				l.Error("error waiting for Algolia save operation",
					"error", err,
					"doc_id", docID,
				)
				return
			}

			l.Info("updated Algolia with archived status",
				"doc_id", docID,
				"archived", *req.Archived,
			)
		}()

		w.WriteHeader(http.StatusOK)

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
}
