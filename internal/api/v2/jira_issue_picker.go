package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"regexp"
	"strings"

	"github.com/hashicorp-forge/hermes/internal/jira"
	"github.com/hashicorp-forge/hermes/internal/server"
	pkgauth "github.com/hashicorp-forge/hermes/pkg/auth"
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
		userEmail, ok := pkgauth.GetUserEmail(r.Context())
		if !ok || userEmail == "" {
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

			var jiraAPIResp jira.APIResponseIssuePickerGet

			// If query starts with the Jira browse URL or looks like a Jira issue
			// key, try to get the issue directly and return appropriate fields.
			var issueKey string
			issueRE := regexp.MustCompile(`^[A-Za-z]+\-[0-9]+$`)
			jiraBrowseURL := jiraURL.Scheme + "://" + jiraURL.Host + "/browse"
			if strings.HasPrefix(query, jiraBrowseURL) {
				query = strings.ReplaceAll(query, jiraBrowseURL+"/", "")
				if issueRE.MatchString(query) {
					issueKey = query
				}
			} else if issueRE.MatchString(query) {
				issueKey = query
			}
			if issueKey != "" {
				// Build URL for HTTP request.
				jiraGetIssueURL := *jiraURL
				jiraGetIssueURL.Path = path.Join(
					jiraURL.Path,
					fmt.Sprintf("rest/api/3/issue/%s", issueKey),
				)
				q := jiraGetIssueURL.Query()
				q.Add("fields",
					"assignee,issuetype,key,priority,project,reporter,status,summary")
				jiraGetIssueURL.RawQuery = q.Encode()

				resp, err := executeJiraRequest(jiraGetIssueURL.String(), srv)
				if err != nil {
					log.Error("error executing Jira request",
						append([]interface{}{
							"error", err,
							"url", jiraGetIssueURL.String(),
						}, logArgs...)...)
					http.Error(w, "Error processing request",
						http.StatusInternalServerError)
					return
				}
				defer resp.Body.Close()

				if resp.StatusCode >= 200 && resp.StatusCode <= 299 {
					respBody, err := io.ReadAll(resp.Body)
					if err != nil {
						log.Error("error reading body of response",
							append([]interface{}{
								"error", err,
							}, logArgs...)...)
						http.Error(w, "Error processing request",
							http.StatusInternalServerError)
						return
					}

					var jiraGetIssueResp jira.APIResponseIssueGet
					if err := json.Unmarshal(respBody, &jiraGetIssueResp); err != nil {
						log.Error("error unmarshaling issue response",
							append([]interface{}{
								"error", err,
							}, logArgs...)...)
						http.Error(w, "Error processing request",
							http.StatusInternalServerError)
						return
					}

					// Build a fake issue picker API response.
					jiraAPIResp = jira.APIResponseIssuePickerGet{
						Sections: []jira.APIResponseIssuePickerGetSection{
							{
								ID: "cs",
								Issues: []jira.APIResponseIssuePickerGetSectionIssue{
									{
										Img:         jiraGetIssueResp.Fields.IssueType.IconURL,
										Key:         jiraGetIssueResp.Key,
										SummaryText: jiraGetIssueResp.Fields.Summary,
									},
								},
								Label: "Current Search",
							},
						},
					}
				}
			} else {
				// Actually use the Jira issue picker API.

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

					if err := json.Unmarshal(respBody, &jiraAPIResp); err != nil {
						log.Error("error unmarshaling issue picker response",
							append([]interface{}{
								"error", err,
							}, logArgs...)...)
						http.Error(w, "Error processing request",
							http.StatusInternalServerError)
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

						// If the issue type image URL is relative, make it absolute.
						if strings.HasPrefix(iss.Img, "/") {
							iss.Img = jiraURL.Scheme + "://" + jiraURL.Host + iss.Img
						}

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

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
	})
}
