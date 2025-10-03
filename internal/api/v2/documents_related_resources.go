package api

import (
pkgauth "github.com/hashicorp-forge/hermes/pkg/auth"
	"encoding/json"
	"net/http"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	"github.com/hashicorp-forge/hermes/pkg/document"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp/go-hclog"
	"gorm.io/gorm"
)

type relatedResourcesPutRequest struct {
	ExternalLinks   []externalLinkRelatedResourcePutRequest   `json:"externalLinks,omitempty"`
	HermesDocuments []hermesDocumentRelatedResourcePutRequest `json:"hermesDocuments,omitempty"`
}

type externalLinkRelatedResourcePutRequest struct {
	Name      string `json:"name"`
	URL       string `json:"url"`
	SortOrder int    `json:"sortOrder"`
}

type hermesDocumentRelatedResourcePutRequest struct {
	GoogleFileID string `json:"googleFileID"`
	SortOrder    int    `json:"sortOrder"`
}

type relatedResourcesGetResponse struct {
	ExternalLinks   []externalLinkRelatedResourceGetResponse   `json:"externalLinks,omitempty"`
	HermesDocuments []hermesDocumentRelatedResourceGetResponse `json:"hermesDocuments,omitempty"`
}

type externalLinkRelatedResourceGetResponse struct {
	Name      string `json:"name"`
	URL       string `json:"url"`
	SortOrder int    `json:"sortOrder"`
}

type hermesDocumentRelatedResourceGetResponse struct {
	GoogleFileID   string `json:"googleFileID"`
	Title          string `json:"title"`
	DocumentType   string `json:"documentType"`
	DocumentNumber string `json:"documentNumber"`
	SortOrder      int    `json:"sortOrder"`
}

func documentsResourceRelatedResourcesHandler(
	w http.ResponseWriter,
	r *http.Request,
	docID string,
	doc document.Document,
	cfg *config.Config,
	l hclog.Logger,
	algoRead *algolia.Client,
	db *gorm.DB,
) {
	switch r.Method {
	case "GET":
		d := models.Document{
			GoogleFileID: docID,
		}
		if err := d.Get(db); err != nil {
			l.Error("error getting document from database",
				"error", err,
				"path", r.URL.Path,
				"method", r.Method,
				"doc_id", docID,
			)
			http.Error(w, "Error accessing document resources",
				http.StatusInternalServerError)
			return
		}

		// Get typed related resources.
		elrrs, hdrrs, err := d.GetRelatedResources(db)
		if err != nil {
			l.Error("error getting related resources",
				"error", err,
				"path", r.URL.Path,
				"method", r.Method,
				"doc_id", docID,
			)
			http.Error(w, "Error accessing document",
				http.StatusInternalServerError)
			return
		}

		// Build response.
		resp := relatedResourcesGetResponse{
			ExternalLinks:   []externalLinkRelatedResourceGetResponse{},
			HermesDocuments: []hermesDocumentRelatedResourceGetResponse{},
		}
		// Add external link related resources.
		for _, elrr := range elrrs {
			if err := elrr.Get(db); err != nil {
				l.Error("error getting external link related resource from database",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docID,
				)
				http.Error(w, "Error accessing document",
					http.StatusInternalServerError)
				return
			}

			resp.ExternalLinks = append(resp.ExternalLinks,
				externalLinkRelatedResourceGetResponse{
					Name:      elrr.Name,
					URL:       elrr.URL,
					SortOrder: elrr.RelatedResource.SortOrder,
				})
		}
		// Add Hermes document related resources.
		for _, hdrr := range hdrrs {
			// Get document object from Algolia.
			var algoObj map[string]any
			err = algoRead.Docs.GetObject(hdrr.Document.GoogleFileID, &algoObj)
			if err != nil {
				l.Error("error getting related resource document from Algolia",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docID,
					"target_doc_id", hdrr.Document.GoogleFileID,
				)
				http.Error(w, "Error accessing document",
					http.StatusInternalServerError)
				return
			}

			// Convert Algolia object to a document.
			doc, err := document.NewFromAlgoliaObject(
				algoObj, cfg.DocumentTypes.DocumentType)
			if err != nil {
				l.Error("error converting Algolia object to document type",
					"error", err,
					"doc_id", docID,
				)
				http.Error(w, "Error accessing draft document",
					http.StatusInternalServerError)
				return
			}

			resp.HermesDocuments = append(
				resp.HermesDocuments,
				hermesDocumentRelatedResourceGetResponse{
					GoogleFileID:   hdrr.Document.GoogleFileID,
					Title:          doc.Title,
					DocumentType:   doc.DocType,
					DocumentNumber: doc.DocNumber,
					SortOrder:      hdrr.RelatedResource.SortOrder,
				})
		}

		// Write response.
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		enc := json.NewEncoder(w)
		err = enc.Encode(resp)
		if err != nil {
			l.Error("error encoding response",
				"error", err,
				"doc_id", docID,
			)
			http.Error(w, "Error accessing document", http.StatusInternalServerError)
			return
		}

	case "POST":
		fallthrough
	case "PUT":
		// Authorize request (only the document owner can replace related
		// resources).
		userEmail := pkgauth.MustGetUserEmail(r.Context())
		if doc.Owners[0] != userEmail {
			http.Error(w, "Not a document owner", http.StatusUnauthorized)
			return
		}

		// Decode request.
		var req relatedResourcesPutRequest
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

		// Build external link related resources for database model.
		elrrs := []models.DocumentRelatedResourceExternalLink{}
		for _, elrr := range req.ExternalLinks {
			elrrs = append(elrrs, models.DocumentRelatedResourceExternalLink{
				RelatedResource: models.DocumentRelatedResource{
					Document: models.Document{
						GoogleFileID: docID,
					},
					SortOrder: elrr.SortOrder,
				},
				Name: elrr.Name,
				URL:  elrr.URL,
			})
		}

		// Build Hermes document related resources for database model.
		hdrrs := []models.DocumentRelatedResourceHermesDocument{}
		for _, hdrr := range req.HermesDocuments {
			hdrrs = append(hdrrs, models.DocumentRelatedResourceHermesDocument{
				RelatedResource: models.DocumentRelatedResource{
					Document: models.Document{
						GoogleFileID: docID,
					},
					SortOrder: hdrr.SortOrder,
				},
				Document: models.Document{
					GoogleFileID: hdrr.GoogleFileID,
				},
			})
		}

		// Replace related resources for document.
		doc := models.Document{
			GoogleFileID: docID,
		}
		if err := doc.ReplaceRelatedResources(db, elrrs, hdrrs); err != nil {
			l.Error("error replacing related resources for document",
				"error", err,
				"path", r.URL.Path,
				"method", r.Method,
				"doc_id", docID,
			)
			http.Error(w, "Error accessing document", http.StatusInternalServerError)
			return
		}

		l.Info("replaced related resources for document",
			"path", r.URL.Path,
			"method", r.Method,
			"doc_id", docID,
		)

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
}
