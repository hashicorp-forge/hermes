package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"

	"github.com/hashicorp-forge/hermes/internal/jira"
	"github.com/hashicorp-forge/hermes/internal/server"
)

type JiraIssuePickerGetResponse []JiraIssuePickerGetResponseIssue

type JiraIssuePickerGetResponseIssue struct {
	Key            string `json:"key"`
	IssueTypeImage string `json:"issueTypeImage"`
	Summary        string `json:"summary"`
	URL            string `json:"url"`
}

// JiraIssuePickerHandler proxies Jira issue picker API requests.
func JiraIssuePickerHandler(srv server.Server) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log := srv.Logger
		logArgs := []any{
			"path", r.URL.Path,
		}

		// Authorize request.
		userEmail := r.Context().Value("userEmail").(string)
		if userEmail == "" {
			log.Error("user email not found in request context", logArgs...)
			http.Error(
				w, "No authorization information for request", http.StatusUnauthorized)
			return
		}

		// Respond with error if Jira is not enabled.
		if srv.Jira == nil || srv.Config.Jira == nil || !srv.Config.Jira.Enabled {
			log.Warn("Jira not enabled", logArgs...)
			http.Error(
				w, "Jira has not been enabled", http.StatusUnprocessableEntity)
			return
		}

		switch r.Method {
		case "GET":
			logArgs = append(logArgs, "method", r.Method)

			// Get "query" query parameter.
			query := r.URL.Query().Get("query")

			// Parse Jira URL.
			jiraURL, err := url.Parse(srv.Jira.URL)
			if err != nil {
				// This shouldn't happen because we check this when creating the Jira
				// service.
				log.Error("error parsing Jira URL",
					append([]interface{}{
						"error", err,
					}, logArgs...)...)
				http.Error(w, "Error processing request",
					http.StatusInternalServerError)
				return
			}

			// Build URL for HTTP request.
			jiraIssuePickerURL := *jiraURL
			jiraIssuePickerURL.Path = path.Join(
				jiraURL.Path,
				"rest/api/3/issue/picker",
			)
			q := jiraIssuePickerURL.Query()
			q.Add("currentJQL", fmt.Sprintf(`text ~ "%s"`, query))
			q.Add("query", query)
			jiraIssuePickerURL.RawQuery = q.Encode()

			resp, err := executeJiraRequest(jiraIssuePickerURL.String(), srv)
			if err != nil {
				log.Error("error executing issue picker request",
					append([]interface{}{
						"error", err,
					}, logArgs...)...)
				http.Error(w, "Error processing request",
					http.StatusInternalServerError)
				return
			}
			defer resp.Body.Close()

			// Only write the response body if the response was successful.
			if resp.StatusCode >= 200 && resp.StatusCode <= 299 {
				respBody, err := io.ReadAll(resp.Body)
				if err != nil {
					log.Error("error reading body of issue picker response",
						append([]interface{}{
							"error", err,
						}, logArgs...)...)
					http.Error(w, "Error processing request",
						http.StatusInternalServerError)
					return
				}

				var jiraAPIResp jira.APIResponseIssuePickerGet
				if err := json.Unmarshal(respBody, &jiraAPIResp); err != nil {
					log.Error("error unmarshaling issue picker response",
						append([]interface{}{
							"error", err,
						}, logArgs...)...)
					http.Error(w, "Error processing request",
						http.StatusInternalServerError)
					return
				}

				// Build response.
				issues := []JiraIssuePickerGetResponseIssue{}
				for _, sec := range jiraAPIResp.Sections {
					// We only want "Current Search" results.
					if sec.ID == "cs" {
						for _, iss := range sec.Issues {
							// Build issue URL.
							issueURL := *jiraURL
							issueURL.Path = path.Join(
								jiraURL.Path,
								"browse",
								iss.Key,
							)

							issues = append(issues, JiraIssuePickerGetResponseIssue{
								Key:            iss.Key,
								IssueTypeImage: iss.Img,
								Summary:        iss.SummaryText,
								URL:            issueURL.String(),
							})
						}
					}
				}

				// Write response.
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusOK)
				enc := json.NewEncoder(w)
				if err := enc.Encode(issues); err != nil {
					log.Error("error encoding response",
						append([]interface{}{
							"error", err,
						}, logArgs...)...,
					)
					http.Error(
						w, "Error processing request", http.StatusInternalServerError)
					return
				}
			} else {
				log.Error("received bad status code in Jira response",
					append([]interface{}{
						"error", err,
						"status_code", resp.StatusCode,
					}, logArgs...)...)
				http.Error(w, "Error processing request",
					http.StatusInternalServerError)
				return
			}

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
	})
}
