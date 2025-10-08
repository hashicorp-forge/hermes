package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/hashicorp-forge/hermes/internal/server"
	pkgauth "github.com/hashicorp-forge/hermes/pkg/auth"
	"github.com/hashicorp-forge/hermes/pkg/search"
)

// SearchHandler provides a unified search API endpoint that proxies to the
// configured SearchProvider (Algolia, Meilisearch, etc).
//
// This endpoint is designed to replace direct Algolia client calls from the frontend,
// allowing the backend to control search access and support multiple search providers.
//
// Endpoints:
//   - POST /api/v2/search/{index} - Search an index with query and filters
//
// The index parameter can be: "docs", "drafts", "internal", or "projects"
func SearchHandler(srv server.Server) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Only support POST for search operations
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Extract index name from URL path
		// Expected format: /api/v2/search/{index}
		indexName, parseErr := parseSearchIndexFromURLPath(r.URL.Path)
		if parseErr != nil || indexName == "" {
			srv.Logger.Error("invalid search path",
				"path", r.URL.Path,
				"method", r.Method,
			)
			http.Error(w, "Invalid search path, expected /api/v2/search/{index}",
				http.StatusBadRequest)
			return
		}

		// Authorize request - extract user email from context
		userEmail, ok := pkgauth.GetUserEmail(r.Context())
		if !ok || userEmail == "" {
			srv.Logger.Error("no user email found in request context",
				"method", r.Method,
				"path", r.URL.Path,
			)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Parse search request from JSON body
		var searchReq SearchRequest
		if err := json.NewDecoder(r.Body).Decode(&searchReq); err != nil {
			srv.Logger.Error("error decoding search request",
				"error", err,
				"method", r.Method,
				"path", r.URL.Path,
			)
			http.Error(w, "Invalid search request body", http.StatusBadRequest)
			return
		}

		// Convert search request to SearchProvider query
		searchQuery := &search.SearchQuery{
			Query:     searchReq.Query,
			Page:      searchReq.Page,
			PerPage:   searchReq.HitsPerPage,
			Filters:   convertFiltersToMap(searchReq.Filters),
			Facets:    searchReq.Facets,
			SortBy:    searchReq.SortBy,
			SortOrder: searchReq.SortOrder,
		}

		// Determine which index to search
		var resp *search.SearchResult
		var err error

		switch indexName {
		case "docs", "documents":
			resp, err = srv.SearchProvider.DocumentIndex().Search(r.Context(), searchQuery)
		case "drafts":
			resp, err = srv.SearchProvider.DraftIndex().Search(r.Context(), searchQuery)
		case "projects":
			resp, err = srv.SearchProvider.ProjectIndex().Search(r.Context(), searchQuery)
		default:
			srv.Logger.Error("unsupported index name",
				"index", indexName,
				"method", r.Method,
				"path", r.URL.Path,
			)
			http.Error(w, "Unsupported index name", http.StatusBadRequest)
			return
		}

		if err != nil {
			srv.Logger.Error("error executing search",
				"error", err,
				"index", indexName,
				"query", searchReq.Query,
				"method", r.Method,
				"path", r.URL.Path,
				"user_email", userEmail,
			)
			http.Error(w, "Error executing search", http.StatusInternalServerError)
			return
		}

		// Return search response as JSON
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)

		if err := json.NewEncoder(w).Encode(resp); err != nil {
			srv.Logger.Error("error encoding search response",
				"error", err,
				"method", r.Method,
				"path", r.URL.Path,
			)
			// Response already started, can't send error to client
			return
		}

		srv.Logger.Info("search executed successfully",
			"index", indexName,
			"query", searchReq.Query,
			"hits", len(resp.Hits),
			"method", r.Method,
			"path", r.URL.Path,
			"user_email", userEmail,
		)
	})
}

// SearchRequest represents the JSON search request from the frontend
type SearchRequest struct {
	Query       string      `json:"query"`
	Page        int         `json:"page"`
	HitsPerPage int         `json:"hitsPerPage"`
	Filters     interface{} `json:"filters"` // Can be string or array
	Facets      []string    `json:"facets"`
	SortBy      string      `json:"sortBy"`
	SortOrder   string      `json:"sortOrder"`
	// Optional Algolia-specific fields for compatibility
	AttributesToRetrieve  []string `json:"attributesToRetrieve,omitempty"`
	AttributesToHighlight []string `json:"attributesToHighlight,omitempty"`
}

// convertFiltersToMap converts Algolia-style filter strings or arrays to a map
// Supports both:
// - String format: "status:In-Review AND docType:RFC"
// - Array format: ["status:In-Review", "docType:RFC"]
func convertFiltersToMap(filters interface{}) map[string][]string {
	result := make(map[string][]string)

	switch f := filters.(type) {
	case string:
		// Parse string filter format
		parts := strings.Split(f, " AND ")
		for _, part := range parts {
			part = strings.TrimSpace(part)
			if idx := strings.Index(part, ":"); idx > 0 {
				key := part[:idx]
				value := strings.Trim(part[idx+1:], "'\"")
				result[key] = append(result[key], value)
			}
		}
	case []interface{}:
		// Parse array filter format
		for _, item := range f {
			if str, ok := item.(string); ok {
				if idx := strings.Index(str, ":"); idx > 0 {
					key := str[:idx]
					value := strings.Trim(str[idx+1:], "'\"")
					result[key] = append(result[key], value)
				}
			}
		}
	}

	return result
}

// parseSearchIndexFromURLPath extracts the index name from the URL path.
// Expected format: /api/v2/search/{index}
func parseSearchIndexFromURLPath(path string) (string, error) {
	pathParts := strings.Split(strings.Trim(path, "/"), "/")
	if len(pathParts) < 4 {
		return "", nil
	}
	return pathParts[3], nil
}

// Helper function to parse page number from query parameter
func parsePageNumber(pageStr string) int {
	if pageStr == "" {
		return 0
	}
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 0 {
		return 0
	}
	return page
}
