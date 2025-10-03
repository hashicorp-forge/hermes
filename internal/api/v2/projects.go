package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/hashicorp-forge/hermes/internal/server"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	pkgauth "github.com/hashicorp-forge/hermes/pkg/auth"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"gorm.io/gorm"
)

const (
	defaultHitsPerPage        = 24
	MaxRecentlyViewedProjects = 10
)

type ProjectGetResponse struct {
	project
}

type ProjectPatchRequest struct {
	Description *string `json:"description"`
	JiraIssueID *string `json:"jiraIssueID"`
	Status      *string `json:"status"`
	Title       *string `json:"title"`
}

type ProjectsPostRequest struct {
	Description *string `json:"description"`
	JiraIssueID *string `json:"jiraIssueID"`
	Title       string  `json:"title"`
}

type ProjectsGetResponse struct {
	NumPages int       `json:"numPages"`
	Page     int       `json:"page"`
	Projects []project `json:"projects"`
}

type ProjectsPostResponse struct {
	ID int `json:"id"`
}

type project struct {
	CreatedTime  int64    `json:"createdTime,omitempty"`
	Creator      string   `json:"creator,omitempty"`
	Description  *string  `json:"description,omitempty"`
	ID           uint     `json:"id"`
	JiraIssueID  *string  `json:"jiraIssueID,omitempty"`
	ModifiedTime int64    `json:"modifiedTime,omitempty"`
	Products     []string `json:"products,omitempty"`
	Status       string   `json:"status"`
	Title        string   `json:"title"`
}

func ProjectsHandler(srv server.Server) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		logArgs := []any{
			"path", r.URL.Path,
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

			// Get query parameters.
			q := r.URL.Query()
			hitsPerPageParam := q.Get("hitsPerPage")
			pageParam := q.Get("page")
			statusParam := q.Get("status")
			titleParam := q.Get("title")

			// Set default values for page and hitsPerPage parameters.
			page := 1
			hitsPerPage := defaultHitsPerPage

			// Parse page parameter.
			if pageParam != "" {
				p, err := strconv.Atoi(pageParam)
				if err != nil {
					http.Error(w, "Invalid page parameter", http.StatusBadRequest)
					return
				}
				page = p
			}

			// Parse perPage parameter.
			if hitsPerPageParam != "" {
				hpp, err := strconv.Atoi(hitsPerPageParam)
				if err != nil {
					http.Error(w, "Invalid hitsPerPage parameter", http.StatusBadRequest)
					return
				}
				hitsPerPage = hpp
			}

			// Build status condition for database query.
			var cond models.Project
			if statusParam != "" {
				if statusFilter, ok := models.ParseProjectStatusString(
					statusParam,
				); ok {
					cond = models.Project{
						Status: statusFilter,
					}
				} else {
					http.Error(w, "Invalid status", http.StatusUnprocessableEntity)
					return
				}
			}

			// Get projects from database.
			projs := []models.Project{}
			offset := (page - 1) * hitsPerPage
			if err := srv.DB.
				Where("title ILIKE ?", fmt.Sprintf("%%%s%%", titleParam)).
				Offset(offset).
				Limit(hitsPerPage).
				Find(&projs, cond).
				Error; err != nil &&
				!errors.Is(err, gorm.ErrRecordNotFound) {
				srv.Logger.Error("error getting projects",
					append([]interface{}{
						"error", err,
					}, logArgs...)...)
				http.Error(
					w, "Error processing request", http.StatusInternalServerError)
				return
			}

			// Calculate total number of pages.
			var totalProjects int64
			if err := srv.DB.
				Model(&models.Project{}).
				Where("title ILIKE ?", fmt.Sprintf("%%%s%%", titleParam)).
				Where(&cond).
				Count(&totalProjects).
				Error; err != nil {
				srv.Logger.Error("error getting total number of projects",
					append([]interface{}{
						"error", err,
					}, logArgs...)...)
				http.Error(
					w, "Error processing request", http.StatusInternalServerError)
				return
			}
			totalPages := int(
				math.Ceil(float64(totalProjects) / float64(hitsPerPage)))

			// Build response.
			projResp := []project{}
			for _, p := range projs {
				// Get products for the project.
				products, err := getProductsForProject(p, srv.DB)
				if err != nil {
					srv.Logger.Error("error getting products for project",
						append([]interface{}{
							"error", err,
							"project_id", p.ID,
						}, logArgs...)...)
					http.Error(
						w, "Error processing request", http.StatusInternalServerError)
					return
				}

				projResp = append(projResp, project{
					CreatedTime:  p.ProjectCreatedAt.Unix(),
					Creator:      p.Creator.EmailAddress,
					Description:  p.Description,
					ID:           p.ID,
					JiraIssueID:  p.JiraIssueID,
					ModifiedTime: p.ProjectModifiedAt.Unix(),
					Products:     products,
					Status:       p.Status.String(),
					Title:        p.Title,
				})
			}
			resp := ProjectsGetResponse{
				NumPages: totalPages,
				Page:     page,
				Projects: projResp,
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
				Description: req.Description,
				JiraIssueID: req.JiraIssueID,
				Title:       req.Title,
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

			srv.Logger.Info("created project",
				append([]interface{}{
					"user", userEmail,
				}, logArgs...)...)

			// Request post-processing.
			go func() {
				// Save project in Algolia.
				if err := saveProjectInAlgolia(proj, srv.AlgoWrite); err != nil {
					srv.Logger.Error("error saving project in Algolia",
						append([]interface{}{
							"error", err,
						}, logArgs...)...,
					)
					return
				}
			}()

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
		userEmail := pkgauth.MustGetUserEmail(r.Context())
		if userEmail == "" {
			srv.Logger.Error("user email not found in request context", logArgs...)
			http.Error(
				w, "No authorization information for request", http.StatusUnauthorized)
			return
		}

		// Parse project ID and subpath.
		projectRegex := regexp.MustCompile(
			`^\/api\/v\d+\/projects\/([0-9A-Za-z_\-]+)$`)
		projectRelatedResourcesRegex := regexp.MustCompile(
			`^\/api\/v\d+\/projects\/([0-9A-Za-z_\-]+)\/related-resources$`)
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
			case "GET":
				logArgs = append(logArgs, "method", r.Method)
				now := time.Now()

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

				// Get products for the project.
				products, err := getProductsForProject(proj, srv.DB)
				if err != nil {
					srv.Logger.Error("error getting products for project",
						append([]interface{}{
							"error", err,
						}, logArgs...)...)
					http.Error(
						w, "Error processing request", http.StatusInternalServerError)
					return
				}

				// Build response.
				resp := ProjectGetResponse{
					project: project{
						CreatedTime:  proj.ProjectCreatedAt.Unix(),
						Creator:      proj.Creator.EmailAddress,
						Description:  proj.Description,
						ID:           proj.ID,
						JiraIssueID:  proj.JiraIssueID,
						ModifiedTime: proj.ProjectModifiedAt.Unix(),
						Products:     products,
						Status:       proj.Status.String(),
						Title:        proj.Title,
					},
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

				// Request post-processing.
				go func() {
					// Update recently viewed projects if this is a frontend view event.
					// The Add-To-Recently-Viewed header is set in the request from the
					// frontend to differentiate between project views and requests to
					// only retrieve project metadata.
					if r.Header.Get("Add-To-Recently-Viewed") != "" {
						if err := updateRecentlyViewedProjects(
							userEmail, proj, srv.DB, now,
						); err != nil {
							srv.Logger.Error("error updating recently viewed projects",
								append([]interface{}{
									"error", err,
								}, logArgs...)...,
							)
						}
					}
				}()

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
				if req.Status != nil {
					switch strings.ToLower(*req.Status) {
					case "active":
					case "archived":
					case "completed":
					default:
						http.Error(w,
							"Bad request: invalid status"+
								` (valid values are "active", "archived", "completed")`,
							http.StatusBadRequest)
						return
					}
				}
				if req.Title != nil && *req.Title == "" {
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
					Description: req.Description,
					JiraIssueID: req.JiraIssueID,
				}
				if req.Status != nil {
					switch strings.ToLower(*req.Status) {
					case "active":
						patch.Status = models.ActiveProjectStatus
					case "archived":
						patch.Status = models.ArchivedProjectStatus
					case "completed":
						patch.Status = models.CompletedProjectStatus
					}
				}
				if req.Title != nil {
					patch.Title = *req.Title
				}

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

				// Log success.
				reqJSON, err := json.Marshal(req)
				if err != nil {
					srv.Logger.Warn("error marshaling request to JSON",
						append([]interface{}{
							"error", err,
						}, logArgs...)...)
				}
				srv.Logger.Info("updated project",
					append([]interface{}{
						"request", string(reqJSON),
						"user", userEmail,
					}, logArgs...)...)

				// Request post-processing.
				go func() {
					// Save project in Algolia.
					if err := saveProjectInAlgolia(patch, srv.AlgoWrite); err != nil {
						srv.Logger.Error("error saving project in Algolia",
							append([]interface{}{
								"error", err,
							}, logArgs...)...,
						)
						return
					}
				}()

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

// getProductsForProject returns a slice of unique products for all Hermes
// document related resources associated with the project.
func getProductsForProject(proj models.Project, db *gorm.DB) ([]string, error) {
	var productNames []string
	err := db.Raw(`
		SELECT DISTINCT p.name
		FROM products p
		INNER JOIN documents d ON p.id = d.product_id
		INNER JOIN project_related_resource_hermes_documents prrhd ON d.id = prrhd.document_id
		INNER JOIN project_related_resources prr ON prrhd.id = prr.related_resource_id
		WHERE prr.project_id = ? AND prr.related_resource_type = 'project_related_resource_hermes_documents'
		`, proj.ID).Scan(&productNames).Error
	if err != nil {
		return nil, fmt.Errorf("error getting products for project: %w", err)
	}

	return productNames, nil
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

// saveProjectInAlgolia saves a project in Algolia.
func saveProjectInAlgolia(
	proj models.Project,
	algoClient *algolia.Client,
) error {
	// Convert project to Algolia object.
	projObj := map[string]any{
		"createdTime":  proj.ProjectCreatedAt.Unix(),
		"creator":      proj.Creator.EmailAddress,
		"description":  proj.Description,
		"jiraIssueID":  proj.JiraIssueID,
		"modifiedTime": proj.ProjectModifiedAt.Unix(),
		"objectID":     fmt.Sprintf("%d", proj.ID),
		"status":       proj.Status.String(),
		"title":        proj.Title,
	}

	// Save project in Algolia.
	res, err := algoClient.Projects.SaveObject(projObj)
	if err != nil {
		return fmt.Errorf("error saving object: %w", err)
	}
	err = res.Wait()
	if err != nil {
		return fmt.Errorf("error waiting for save: %w", err)
	}

	return nil
}

// updateRecentlyViewedProjects updates the recently viewed projects for a user
// with the provided email address, using the project ID and viewed-at time for
// a project view event.
func updateRecentlyViewedProjects(
	userEmail string, proj models.Project, db *gorm.DB, viewedAt time.Time) error {
	// Find or create user.
	u := models.User{
		EmailAddress: userEmail,
	}
	if err := u.FirstOrCreate(db); err != nil {
		return fmt.Errorf("error finding or creating user: %w", err)
	}

	// Find recently viewed projects for user.
	var projs []models.Project
	if err := db.
		Joins("JOIN recently_viewed_projects ON recently_viewed_projects.project_id = projects.id").
		Where("recently_viewed_projects.user_id = ?", u.ID).
		Order("recently_viewed_projects.viewed_at DESC").
		Limit(MaxRecentlyViewedProjects).
		Find(&projs).Error; err != nil {
		return fmt.Errorf("error getting recently viewed projects: %w", err)
	}

	// If recently viewed projects doesn't already contain this project, add it to
	// recently viewed projects and update the user.
	found := false
	for _, p := range projs {
		if p.ID == proj.ID {
			found = true
			break
		}
	}
	if !found {
		// Prepend project to recently viewed projects.
		projs = append([]models.Project{proj}, projs...)

		// Limit to MaxRecentlyViewedProjects.
		if len(projs) > MaxRecentlyViewedProjects {
			projs = projs[:MaxRecentlyViewedProjects]
		}

		// Update user.
		u.RecentlyViewedProjects = projs
		if err := u.Upsert(db); err != nil {
			return fmt.Errorf("error upserting user: %w", err)
		}
	}

	// Update ViewedAt time for this project.
	viewedProj := models.RecentlyViewedProject{
		UserID:    int(u.ID),
		ProjectID: int(proj.ID),
		ViewedAt:  viewedAt,
	}
	if err := db.Updates(&viewedProj).Error; err != nil {
		return fmt.Errorf(
			"error updating recently viewed project in database: %w", err)
	}

	return nil
}
