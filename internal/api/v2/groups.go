package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/hashicorp-forge/hermes/internal/server"
	pkgauth "github.com/hashicorp-forge/hermes/pkg/auth"
	admin "google.golang.org/api/admin/directory/v1"
)

const (
	// maxGroupResults is the maximum total number of group results to return.
	maxGroupResults = 20

	// maxPrefixGroupResults is the maximum number of group results to return that
	// use the groups prefix, if configured.
	maxPrefixGroupResults = 10
)

type GroupsPostRequest struct {
	Query string `json:"query,omitempty"`
}

type GroupsPostResponse []GroupsPostResponseGroup

type GroupsPostResponseGroup struct {
	Email string `json:"email,omitempty"`
	Name  string `json:"name,omitempty"`
}

// GroupsHandler returns information about Google Groups.
func GroupsHandler(srv server.Server) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		logArgs := []any{
			"method", r.Method,
			"path", r.URL.Path,
		}

		// Authorize request.
		userEmail, ok := pkgauth.GetUserEmail(r.Context())
		if !ok || userEmail == "" {
			srv.Logger.Error("user email not found in request context", logArgs...)
			http.Error(
				w, "No authorization information in request", http.StatusUnauthorized)
			return
		}

		// Respond with error if group approvals are not enabled.
		if srv.Config.GoogleWorkspace.GroupApprovals == nil ||
			!srv.Config.GoogleWorkspace.GroupApprovals.Enabled {
			http.Error(w,
				"Group approvals have not been enabled", http.StatusUnprocessableEntity)
			return
		}

		switch r.Method {
		case "POST":
			// Decode request.
			req := &GroupsPostRequest{}
			if err := decodeRequest(r, &req); err != nil {
				srv.Logger.Warn("error decoding request",
					append([]interface{}{
						"error", err,
					}, logArgs...)...)
				http.Error(w, fmt.Sprintf("Bad request: %q", err),
					http.StatusBadRequest)
				return
			}

			// Sanitize query.
			query := req.Query
			query = strings.ReplaceAll(query, " ", "-")

			var (
				allGroups            []*admin.Group
				err                  error
				groups, prefixGroups *admin.Groups
				maxNonPrefixGroups   = maxGroupResults
			)

			// Retrieve groups with prefix, if configured.
			searchPrefix := ""
			if srv.Config.GoogleWorkspace.GroupApprovals != nil &&
				srv.Config.GoogleWorkspace.GroupApprovals.SearchPrefix != "" {
				searchPrefix = srv.Config.GoogleWorkspace.GroupApprovals.SearchPrefix
			}
			if searchPrefix != "" {
				maxNonPrefixGroups = maxGroupResults - maxPrefixGroupResults

				prefixQuery := fmt.Sprintf(
					"%s%s", searchPrefix, query)
				groupsResult, err := srv.WorkspaceProvider.ListGroups(
					srv.Config.GoogleWorkspace.Domain,
					fmt.Sprintf("email:%s*", prefixQuery),
					maxPrefixGroupResults,
				)
				if err != nil {
					srv.Logger.Error("error searching groups with prefix",
						append([]interface{}{
							"error", err,
						}, logArgs...)...)
					http.Error(w, fmt.Sprintf("Error searching groups: %q", err),
						http.StatusInternalServerError)
					return
				}
				prefixGroups = &admin.Groups{Groups: groupsResult}
			}

			// Retrieve groups without prefix.
			groupsResult, err := srv.WorkspaceProvider.ListGroups(
				srv.Config.GoogleWorkspace.Domain,
				fmt.Sprintf("email:%s*", query),
				int64(maxNonPrefixGroups),
			)
			if err != nil {
				srv.Logger.Error("error searching groups without prefix",
					append([]interface{}{
						"error", err,
					}, logArgs...)...)
				http.Error(w, fmt.Sprintf("Error searching groups: %q", err),
					http.StatusInternalServerError)
				return
			}
			groups = &admin.Groups{Groups: groupsResult}

			allGroups = concatGroupSlicesAndRemoveDuplicates(
				prefixGroups.Groups, groups.Groups)

			// Build response, stripping all attributes except email and name.
			resp := make(GroupsPostResponse, len(allGroups))
			for i, group := range allGroups {
				resp[i] = GroupsPostResponseGroup{
					Email: group.Email,
					Name:  group.Name,
				}
			}

			// Write response.
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			enc := json.NewEncoder(w)
			err = enc.Encode(resp)
			if err != nil {
				srv.Logger.Error("error encoding groups response",
					append([]interface{}{
						"error", err,
					}, logArgs...)...)
				http.Error(w, "Error searching groups",
					http.StatusInternalServerError)
				return
			}

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
	})
}

// concatGroupSlicesAndRemoveDuplicates concatenates two group slices and
// removes any duplicate elements from the result.
func concatGroupSlicesAndRemoveDuplicates(
	slice1, slice2 []*admin.Group) []*admin.Group {
	uniqueMap := make(map[string]*admin.Group)
	result := []*admin.Group{}

	// Add elements from both slices to the map.
	for _, g := range slice1 {
		uniqueMap[g.Email] = g
	}
	for _, g := range slice2 {
		uniqueMap[g.Email] = g
	}

	// Add all unique elements from the map to the result slice.
	for _, v := range uniqueMap {
		result = append(result, v)
	}

	return result
}
