package api

import (
pkgauth "github.com/hashicorp-forge/hermes/pkg/auth"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/hashicorp-forge/hermes/internal/server"
	"github.com/hashicorp-forge/hermes/pkg/document"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"gorm.io/gorm"
)

type ProjectRelatedResourcesGetResponse struct {
	ExternalLinks   []ProjectRelatedResourcesGetResponseExternalLink   `json:"externalLinks,omitempty"`
	HermesDocuments []ProjectRelatedResourcesGetResponseHermesDocument `json:"hermesDocuments,omitempty"`
}

type ProjectRelatedResourcesGetResponseExternalLink struct {
	Name      string `json:"name"`
	URL       string `json:"url"`
	SortOrder int    `json:"sortOrder"`
}

type ProjectRelatedResourcesGetResponseHermesDocument struct {
	GoogleFileID   string   `json:"googleFileID"`
	Title          string   `json:"title"`
	CreatedTime    int64    `json:"createdTime"`
	DocumentType   string   `json:"documentType"`
	DocumentNumber string   `json:"documentNumber"`
	ModifiedTime   int64    `json:"modifiedTime"`
	Owners         []string `json:"owners"`
	Product        string   `json:"product"`
	SortOrder      int      `json:"sortOrder"`
	Status         string   `json:"status"`
	Summary        string   `json:"summary"`
}

type ProjectRelatedResourcesPutRequest struct {
	ExternalLinks   []ProjectRelatedResourcesPutRequestExternalLink   `json:"externalLinks,omitempty"`
	HermesDocuments []ProjectRelatedResourcesPutRequestHermesDocument `json:"hermesDocuments,omitempty"`
}

type ProjectRelatedResourcesPutRequestExternalLink struct {
	Name      string `json:"name"`
	URL       string `json:"url"`
	SortOrder int    `json:"sortOrder"`
}

type ProjectRelatedResourcesPutRequestHermesDocument struct {
	GoogleFileID string `json:"googleFileID"`
	SortOrder    int    `json:"sortOrder"`
}

func projectsResourceRelatedResourcesHandler(
	srv server.Server,
	w http.ResponseWriter,
	r *http.Request,
	projectID uint,
) {
	logArgs := []any{
		"path", r.URL.Path,
		"project_id", projectID,
	}

	// Authorize request.
	userEmail := pkgauth.MustGetUserEmail(r.Context())
	if userEmail == "" {
		srv.Logger.Error("user email not found in request context", logArgs...)
		http.Error(
			w, "No authorization information for request", http.StatusUnauthorized)
		return
	}

	switch r.Method {
	case "GET":
		logArgs = append(logArgs, "method", r.Method)

		// Get project's typed related resources.
		proj := models.Project{
			Model: gorm.Model{
				ID: projectID,
			},
		}
		elrrs, hdrrs, err := proj.GetRelatedResources(srv.DB)
		if err != nil {
			srv.Logger.Error("error getting related resources",
				append([]interface{}{
					"error", err,
				}, logArgs...)...)
			http.Error(
				w, "Error processing request", http.StatusInternalServerError)
			return
		}

		// Build response.
		resp := ProjectRelatedResourcesGetResponse{
			ExternalLinks:   []ProjectRelatedResourcesGetResponseExternalLink{},
			HermesDocuments: []ProjectRelatedResourcesGetResponseHermesDocument{},
		}
		// Add external link related resources.
		for _, elrr := range elrrs {
			resp.ExternalLinks = append(resp.ExternalLinks,
				ProjectRelatedResourcesGetResponseExternalLink{
					Name:      elrr.Name,
					URL:       elrr.URL,
					SortOrder: elrr.RelatedResource.SortOrder,
				})
		}
		// Add Hermes document related resources.
		for _, hdrr := range hdrrs {
			logArgs = append(logArgs, "document_id", hdrr.Document.GoogleFileID)
			// Convert database model to a document. We don't need document review
			// data for this endpoint.
			doc, err := document.NewFromDatabaseModel(
				hdrr.Document, models.DocumentReviews{}, models.DocumentGroupReviews{})
			if err != nil {
				srv.Logger.Error("error converting database model to document type",
					append([]interface{}{
						"error", err,
					}, logArgs...)...)
				http.Error(
					w, "Error processing request", http.StatusInternalServerError)
				return
			}

			resp.HermesDocuments = append(
				resp.HermesDocuments,
				ProjectRelatedResourcesGetResponseHermesDocument{
					GoogleFileID:   doc.ObjectID,
					Title:          doc.Title,
					CreatedTime:    doc.CreatedTime,
					DocumentType:   doc.DocType,
					DocumentNumber: doc.DocNumber,
					ModifiedTime:   doc.ModifiedTime,
					Owners:         doc.Owners,
					Product:        doc.Product,
					SortOrder:      hdrr.RelatedResource.SortOrder,
					Status:         doc.Status,
					Summary:        doc.Summary,
				})
		}

		// Write response.
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		enc := json.NewEncoder(w)
		err = enc.Encode(resp)
		if err != nil {
			srv.Logger.Error("error encoding response",
				append([]interface{}{
					"error", err,
				}, logArgs...)...)
			http.Error(
				w, "Error processing request", http.StatusInternalServerError)
			return
		}

	case "POST":
		fallthrough
	case "PUT":
		logArgs = append(logArgs, "method", r.Method)

		// Decode request.
		var req ProjectRelatedResourcesPutRequest
		if err := decodeRequest(r, &req); err != nil {
			srv.Logger.Error("error decoding request",
				append([]interface{}{
					"error", err,
				}, logArgs...)...)
			http.Error(
				w, "Bad request", http.StatusBadRequest)
			return
		}

		// Get project.
		proj := models.Project{}
		if err := proj.Get(srv.DB, projectID); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				srv.Logger.Warn("project not found", logArgs...)
				http.Error(w, "Project not found", http.StatusNotFound)
				return
			} else {
				srv.Logger.Error("error getting project from database",
					append([]interface{}{
						"error", err,
					}, logArgs...)...)
				http.Error(
					w, "Error processing request", http.StatusInternalServerError)
				return
			}
		}

		// Build external link related resources for database model.
		elrrs := []models.ProjectRelatedResourceExternalLink{}
		for _, elrr := range req.ExternalLinks {
			elrrs = append(elrrs, models.ProjectRelatedResourceExternalLink{
				RelatedResource: models.ProjectRelatedResource{
					ProjectID: uint(projectID),
					SortOrder: elrr.SortOrder,
				},
				Name: elrr.Name,
				URL:  elrr.URL,
			})
		}

		// Build Hermes document related resources for database model.
		hdrrs := []models.ProjectRelatedResourceHermesDocument{}
		for _, hdrr := range req.HermesDocuments {
			hdrrs = append(hdrrs, models.ProjectRelatedResourceHermesDocument{
				RelatedResource: models.ProjectRelatedResource{
					ProjectID: projectID,
					SortOrder: hdrr.SortOrder,
				},
				Document: models.Document{
					GoogleFileID: hdrr.GoogleFileID,
				},
			})
		}

		// Replace related resources for project.
		if err := proj.ReplaceRelatedResources(srv.DB, elrrs, hdrrs); err != nil {
			srv.Logger.Error("error replacing related resources for document",
				append([]interface{}{
					"error", err,
				}, logArgs...)...)
			http.Error(
				w, "Error processing request", http.StatusInternalServerError)
			return
		}

		// Log success.
		reqJSON, err := json.Marshal(req)
		if err != nil {
			srv.Logger.Warn("error marshaling request to JSON",
				append([]interface{}{
					"error", err,
				}, logArgs...)...)
		}
		srv.Logger.Info("replaced related resources for project",
			append([]interface{}{
				"request", string(reqJSON),
				"user", userEmail,
			}, logArgs...)...)

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
}
