package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"github.com/hashicorp-forge/hermes/internal/server"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"gorm.io/gorm"
)

type ProjectGetResponse struct {
	*project
}

type ProjectPatchRequest struct {
	Description *string `json:"description"`
	JiraIssueID *string `json:"jiraIssueID"`
	Status      string  `json:"status"`
	Title       string  `json:"title"`
}

type ProjectsPostRequest struct {
	Description *string `json:"description"`
	JiraIssueID *string `json:"jiraIssueID"`
	Title       string  `json:"title"`
}

type ProjectsGetResponse []project

type ProjectsPostResponse struct {
	ID int `json:"id"`
}

type project struct {
	CreatedTime  int64  `json:"createdTime,omitempty"`
	Creator      string `json:"creator,omitempty"`
	Description  string `json:"description,omitempty"`
	ID           uint   `json:"id"`
	JiraIssueID  string `json:"jiraIssueID,omitempty"`
	ModifiedTime int64  `json:"modifiedTime,omitempty"`
	Status       string `json:"status"`
	Title        string `json:"title"`
}

func ProjectsHandler(srv server.Server) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		logArgs := []any{
			"path", r.URL.Path,
		}

		// Authorize request.
		userEmail := r.Context().Value("userEmail").(string)
		if userEmail == "" {
			srv.Logger.Error("user email not found in request context", logArgs...)
			http.Error(
				w, "No authorization information for request", http.StatusUnauthorized)
			return
		}

		switch r.Method {
		case "GET":
			logArgs = append(logArgs, "method", r.Method)

			// Get all projects from database.
			projs := []models.Project{}
			if err := srv.DB.Find(&projs).Error; err != nil &&
				!errors.Is(err, gorm.ErrRecordNotFound) {
				srv.Logger.Error("error getting projects",
					append([]interface{}{
						"error", err,
					}, logArgs...)...)
				http.Error(
					w, "Error processing request", http.StatusInternalServerError)
				return
			}

			// Build response.
			resp := []project{}
			for _, p := range projs {
				resp = append(resp, project{
					CreatedTime:  p.ProjectCreatedAt.Unix(),
					Creator:      p.Creator.EmailAddress,
					Description:  p.Description,
					ID:           p.ID,
					JiraIssueID:  p.JiraIssueID,
					ModifiedTime: p.ProjectModifiedAt.Unix(),
					Status:       p.Status.ToString(),
					Title:        p.Title,
				})
			}

			// Write response.
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			enc := json.NewEncoder(w)
			if err := enc.Encode(resp); err != nil {
				srv.Logger.Error("error encoding response",
					append([]interface{}{
						"error", err,
					}, logArgs...)...,
				)
				http.Error(
					w, "Error processing request", http.StatusInternalServerError)
				return
			}

		case "POST":
			logArgs = append(logArgs, "method", r.Method)

			// Decode request.
			var req ProjectsPostRequest
			if err := decodeRequest(r, &req); err != nil {
				srv.Logger.Error("error decoding request",
					append([]interface{}{
						"error", err,
					}, logArgs...)...)
				http.Error(
					w, "Bad request", http.StatusBadRequest)
				return
			}

			// Validate request.
			if req.Title == "" {
				http.Error(w, "Bad request: title is required", http.StatusBadRequest)
				return
			}

			// Build project for database.
			proj := models.Project{
				Creator: models.User{
					EmailAddress: userEmail,
				},
				Title: req.Title,
			}
			if req.Description != nil {
				proj.Description = *req.Description
			}
			if req.JiraIssueID != nil {
				proj.JiraIssueID = *req.JiraIssueID
			}

			// Create project.
			if err := proj.Create(srv.DB); err != nil {
				srv.Logger.Error("error creating project",
					append([]interface{}{
						"error", err,
					}, logArgs...)...)
				http.Error(w, "Error creating project", http.StatusInternalServerError)
				return
			}
			logArgs = append(logArgs, "project_id", proj.ID)

			// Write response.
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			resp := &ProjectsPostResponse{
				ID: int(proj.ID),
			}

			enc := json.NewEncoder(w)
			if err := enc.Encode(resp); err != nil {
				srv.Logger.Error("error encoding response",
					append([]interface{}{
						"error", err,
					}, logArgs...)...,
				)
				http.Error(w, "Error creating project",
					http.StatusInternalServerError)
				return
			}

			srv.Logger.Info("created project", logArgs...)

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
	})
}

func ProjectHandler(srv server.Server) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		logArgs := []any{
			"path", r.URL.Path,
		}

		// Authorize request.
		userEmail := r.Context().Value("userEmail").(string)
		if userEmail == "" {
			srv.Logger.Error("user email not found in request context", logArgs...)
			http.Error(
				w, "No authorization information for request", http.StatusUnauthorized)
			return
		}

		// Parse project ID and subpath.
		projectRegex := regexp.MustCompile(
			`^\/api\/v2\/projects\/([0-9A-Za-z_\-]+)$`)
		projectRelatedResourcesRegex := regexp.MustCompile(
			`^\/api\/v2\/projects\/([0-9A-Za-z_\-]+)\/related-resources$`)
		switch {
		case projectRelatedResourcesRegex.MatchString(r.URL.Path):
			projectID, err := getProjectIDFromPath(
				r.URL.Path, projectRelatedResourcesRegex)
			if err != nil {
				srv.Logger.Warn("error getting project ID from path",
					append([]interface{}{
						"error", err,
					}, logArgs...)...)
				http.Error(w, "Project not found", http.StatusNotFound)
				return
			}

			projectsResourceRelatedResourcesHandler(srv, w, r, projectID)
			return

		case projectRegex.MatchString(r.URL.Path):
			projectID, err := getProjectIDFromPath(r.URL.Path, projectRegex)
			if err != nil {
				srv.Logger.Warn("error getting project ID from path",
					append([]interface{}{
						"error", err,
					}, logArgs...)...)
				http.Error(w, "Project not found", http.StatusNotFound)
				return
			}
			logArgs = append(logArgs, "project_id", projectID)

			switch r.Method {
			case "PATCH":
				logArgs = append(logArgs, "method", r.Method)

				// Decode request.
				var req ProjectPatchRequest
				if err := decodeRequest(r, &req); err != nil {
					srv.Logger.Error("error decoding request",
						append([]interface{}{
							"error", err,
						}, logArgs...)...)
					http.Error(
						w, "Bad request", http.StatusBadRequest)
					return
				}

				// Validate request.
				if req.Status != "" {
					switch strings.ToLower(req.Status) {
					case "active":
					case "archived":
					case "complete":
					default:
						http.Error(w,
							"Bad request: invalid status"+
								` (valid values are "active", "archived", "complete")`,
							http.StatusBadRequest)
						return
					}
				}
				if req.Title == "" {
					http.Error(
						w, "Bad request: title cannot be empty", http.StatusBadRequest)
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

				// Build project patch.
				patch := models.Project{
					Model: gorm.Model{
						ID: uint(projectID),
					},
				}
				if req.Description != nil {
					patch.Description = *req.Description
				}
				if req.JiraIssueID != nil {
					patch.JiraIssueID = *req.JiraIssueID
				}
				if req.Status != "" {
					switch strings.ToLower(req.Status) {
					case "active":
						patch.Status = models.ActiveProjectStatus
					case "archived":
						patch.Status = models.ArchivedProjectStatus
					case "complete":
						patch.Status = models.CompletedProjectStatus
					}
				}
				patch.Title = req.Title

				// Update project in the database.
				if err := patch.Update(srv.DB); err != nil {
					srv.Logger.Error("error updating project",
						append([]interface{}{
							"error", err,
						}, logArgs...)...)
					http.Error(
						w, "Error updating project", http.StatusInternalServerError)
					return
				}

				srv.Logger.Info("updated project", logArgs...)

			default:
				w.WriteHeader(http.StatusMethodNotAllowed)
				return
			}

		default:
			srv.Logger.Warn("path not found", logArgs...)
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
	})
}

// getProjectIDFromPath returns the project ID from a request path and
// corresponding regular expression.
func getProjectIDFromPath(path string, re *regexp.Regexp) (uint, error) {
	matches := re.FindStringSubmatch(path)
	if len(matches) != 2 {
		return 0,
			fmt.Errorf(
				"wrong number of string submatches for resource URL path: %d",
				len(matches),
			)
	}
	projectIDStr := matches[1]

	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		return 0,
			fmt.Errorf("error convering project ID to integer: %w", err)
	}

	return uint(projectID), nil
}
