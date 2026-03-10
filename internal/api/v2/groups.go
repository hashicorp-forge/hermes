package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/hashicorp-forge/hermes/internal/server"
	"github.com/hashicorp-forge/hermes/pkg/sharepointhelper"
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

// GroupsHandler returns information about groups (Microsoft or Google).
func GroupsHandler(srv server.Server) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		logArgs := []any{
			"method", r.Method,
			"path", r.URL.Path,
		}

		// Authorize request.
		userEmail := r.Context().Value("userEmail").(string)
		if userEmail == "" {
			srv.Logger.Error("user email not found in request context", logArgs...)
			http.Error(
				w, "No authorization information in request", http.StatusUnauthorized)
			return
		}

		// Respond with error if group approvals are not enabled.
		if srv.SharePoint != nil {
			if srv.Config.SharePoint.GroupApprovals == nil ||
				!srv.Config.SharePoint.GroupApprovals.Enabled {
				srv.Logger.Warn("group approvals not enabled", logArgs...)
				http.Error(w,
					"Group approvals have not been enabled", http.StatusUnprocessableEntity)
				return
			}
		} else {
			if srv.Config.GoogleWorkspace.GroupApprovals == nil ||
				!srv.Config.GoogleWorkspace.GroupApprovals.Enabled {
				http.Error(w,
					"Group approvals have not been enabled", http.StatusUnprocessableEntity)
				return
			}
		}

		switch r.Method {
		case http.MethodPost:
			handleGroupsPost(srv, w, r, logArgs)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
	})
}

// handleGroupsPost processes POST requests for group search.
func handleGroupsPost(srv server.Server, w http.ResponseWriter, r *http.Request, logArgs []any) {
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

	if srv.SharePoint != nil {
		handleGroupsPostSharePoint(srv, w, query, logArgs)
	} else {
		handleGroupsPostGoogle(srv, w, query, logArgs)
	}
}

// handleGroupsPostSharePoint handles group search using Microsoft Graph.
func handleGroupsPostSharePoint(srv server.Server, w http.ResponseWriter, query string, logArgs []any) {
	var (
		allGroups            []sharepointhelper.Group
		err                  error
		groups, prefixGroups []sharepointhelper.Group
		maxNonPrefixGroups   = maxGroupResults
	)

	// Retrieve groups with prefix, if configured.
	searchPrefix := ""
	if srv.Config.SharePoint.GroupApprovals != nil &&
		srv.Config.SharePoint.GroupApprovals.SearchPrefix != "" {
		searchPrefix = srv.Config.SharePoint.GroupApprovals.SearchPrefix
	}
	if searchPrefix != "" {
		maxNonPrefixGroups = maxGroupResults - maxPrefixGroupResults

		prefixQuery := fmt.Sprintf(
			"%s%s", searchPrefix, query)
		prefixGroups, err = srv.SharePoint.SearchGroup(
			prefixQuery, srv.Config.SharePoint.Domain, maxPrefixGroupResults)
		if err != nil {
			srv.Logger.Error("error searching groups with prefix",
				append([]interface{}{
					"error", err,
				}, logArgs...)...)
			http.Error(w, fmt.Sprintf("Error searching groups: %q", err),
				http.StatusInternalServerError)
			return
		}
	}

	// Retrieve groups without prefix.
	groups, err = srv.SharePoint.SearchGroup(
		query, srv.Config.SharePoint.Domain, maxNonPrefixGroups)
	if err != nil {
		srv.Logger.Error("error searching groups without prefix",
			append([]interface{}{
				"error", err,
			}, logArgs...)...)
		http.Error(w, fmt.Sprintf("Error searching groups: %q", err),
			http.StatusInternalServerError)
		return
	}

	allGroups = concatSPGroupSlicesAndRemoveDuplicates(
		prefixGroups, groups)

	// Build response.
	resp := make(GroupsPostResponse, len(allGroups))
	for i, group := range allGroups {
		resp[i] = GroupsPostResponseGroup{
			Email: group.Mail,
			Name:  group.DisplayName,
		}
	}

	writeGroupsResponse(srv, w, resp, logArgs)
}

// handleGroupsPostGoogle handles group search using Google Admin Directory.
func handleGroupsPostGoogle(srv server.Server, w http.ResponseWriter, query string, logArgs []any) {
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
		prefixGroups, err = srv.GWService.AdminDirectory.Groups.List().
			Domain(srv.Config.GoogleWorkspace.Domain).
			MaxResults(int64(maxPrefixGroupResults)).
			Query(fmt.Sprintf("email:%s*", prefixQuery)).
			Do()
		if err != nil {
			srv.Logger.Error("error searching groups with prefix",
				append([]interface{}{
					"error", err,
				}, logArgs...)...)
			http.Error(w, fmt.Sprintf("Error searching groups: %q", err),
				http.StatusInternalServerError)
			return
		}
	}

	// Retrieve groups without prefix.
	groups, err = srv.GWService.AdminDirectory.Groups.List().
		Domain(srv.Config.GoogleWorkspace.Domain).
		MaxResults(int64(maxNonPrefixGroups)).
		Query(fmt.Sprintf("email:%s*", query)).
		Do()
	if err != nil {
		srv.Logger.Error("error searching groups without prefix",
			append([]interface{}{
				"error", err,
			}, logArgs...)...)
		http.Error(w, fmt.Sprintf("Error searching groups: %q", err),
			http.StatusInternalServerError)
		return
	}

	var prefixGroupsList []*admin.Group
	if prefixGroups != nil {
		prefixGroupsList = prefixGroups.Groups
	}
	allGroups = concatGoogleGroupSlicesAndRemoveDuplicates(
		prefixGroupsList, groups.Groups)

	// Build response.
	resp := make(GroupsPostResponse, len(allGroups))
	for i, group := range allGroups {
		resp[i] = GroupsPostResponseGroup{
			Email: group.Email,
			Name:  group.Name,
		}
	}

	writeGroupsResponse(srv, w, resp, logArgs)
}

// writeGroupsResponse writes the groups response.
func writeGroupsResponse(srv server.Server, w http.ResponseWriter, resp GroupsPostResponse, logArgs []any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	enc := json.NewEncoder(w)
	err := enc.Encode(resp)
	if err != nil {
		srv.Logger.Error("error encoding groups response",
			append([]interface{}{
				"error", err,
			}, logArgs...)...)
		http.Error(w, "Error searching groups",
			http.StatusInternalServerError)
		return
	}
}

// concatSPGroupSlicesAndRemoveDuplicates concatenates two SharePoint group slices
// and removes any duplicate elements from the result.
func concatSPGroupSlicesAndRemoveDuplicates(
	slice1, slice2 []sharepointhelper.Group) []sharepointhelper.Group {
	uniqueMap := make(map[string]sharepointhelper.Group)
	result := []sharepointhelper.Group{}

	for _, g := range slice1 {
		if g.Mail != "" {
			uniqueMap[g.Mail] = g
		}
	}
	for _, g := range slice2 {
		if g.Mail != "" {
			uniqueMap[g.Mail] = g
		}
	}

	for _, v := range uniqueMap {
		result = append(result, v)
	}

	return result
}

// concatGoogleGroupSlicesAndRemoveDuplicates concatenates two Google group slices
// and removes any duplicate elements from the result.
func concatGoogleGroupSlicesAndRemoveDuplicates(
	slice1, slice2 []*admin.Group) []*admin.Group {
	uniqueMap := make(map[string]*admin.Group)
	result := []*admin.Group{}

	for _, g := range slice1 {
		if g != nil {
			uniqueMap[g.Email] = g
		}
	}
	for _, g := range slice2 {
		if g != nil {
			uniqueMap[g.Email] = g
		}
	}

	for _, v := range uniqueMap {
		result = append(result, v)
	}

	return result
}
