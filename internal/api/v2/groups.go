package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/hashicorp-forge/hermes/internal/server"
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
		userEmail := r.Context().Value("userEmail").(string)
		if userEmail == "" {
			srv.Logger.Error("user email not found in request context", logArgs...)
			http.Error(
				w, "No authorization information in request", http.StatusUnauthorized)
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

			// Retrieve groups.
			groups, err := srv.GWService.AdminDirectory.Groups.List().
				Domain(srv.Config.GoogleWorkspace.Domain).
				MaxResults(10).
				Query(fmt.Sprintf("email:%s*", req.Query)).
				Do()
			if err != nil {
				srv.Logger.Error("error searching groups",
					append([]interface{}{
						"error", err,
					}, logArgs...)...)
				http.Error(w, fmt.Sprintf("Error searching groups: %q", err),
					http.StatusInternalServerError)
				return
			}

			// Build response, stripping all attributes except email and name.
			resp := make(GroupsPostResponse, len(groups.Groups))
			for i, group := range groups.Groups {
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
