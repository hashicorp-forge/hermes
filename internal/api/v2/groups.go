package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/hashicorp-forge/hermes/internal/server"
	"github.com/hashicorp-forge/hermes/pkg/sharepointhelper"
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

// GroupsHandler returns information about Microsoft Distribution Lists.
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
		if srv.Config.SharePoint.GroupApprovals == nil ||
			!srv.Config.SharePoint.GroupApprovals.Enabled {
			srv.Logger.Warn("group approvals not enabled", logArgs...)
			http.Error(w,
				"Group approvals have not been enabled", http.StatusUnprocessableEntity)
			return
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

	allGroups = concatGroupSlicesAndRemoveDuplicates(
		prefixGroups, groups)

	// Build response, stripping all attributes except email and name.
	resp := make(GroupsPostResponse, len(allGroups))
	for i, group := range allGroups {
		resp[i] = GroupsPostResponseGroup{
			Email: group.Mail,
			Name:  group.DisplayName,
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
}

// concatGroupSlicesAndRemoveDuplicates concatenates two group slices and
// removes any duplicate elements from the result.
func concatGroupSlicesAndRemoveDuplicates(
	slice1, slice2 []sharepointhelper.Group) []sharepointhelper.Group {
	uniqueMap := make(map[string]sharepointhelper.Group)
	result := []sharepointhelper.Group{}

	// Add elements from both slices to the map.
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

	// Add all unique elements from the map to the result slice.
	for _, v := range uniqueMap {
		result = append(result, v)
	}

	return result
}
