package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"regexp"
	"time"

	"github.com/hashicorp-forge/hermes/internal/jira"
	"github.com/hashicorp-forge/hermes/internal/server"
	pkgauth "github.com/hashicorp-forge/hermes/pkg/auth"
)

type JiraIssueGetResponse struct {
	Assignee       string `json:"assignee,omitempty"`
	AssigneeAvatar string `json:"assigneeAvatar,omitempty"`
	IssueType      string `json:"issueType"`
	IssueTypeImage string `json:"issueTypeImage"`
	Key            string `json:"key"`
	Priority       string `json:"priority"`
	PriorityImage  string `json:"priorityImage"`
	Project        string `json:"project"`
	Reporter       string `json:"reporter"`
	Status         string `json:"status"`
	Summary        string `json:"summary"`
	URL            string `json:"url"`
}

// JiraIssueHandler proxies Jira issue API requests.
func JiraIssueHandler(srv server.Server) http.Handler {
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

		// Parse Jira issue ID.
		jiraIssueRegex := regexp.MustCompile(
			`^\/api\/v\d+\/jira\/issues\/([0-9A-Za-z_\-]+)$`)
		if jiraIssueRegex.MatchString(r.URL.Path) {
			issueID, err := getJiraIssueIDFromPath(r.URL.Path, jiraIssueRegex)
			if err != nil {
				log.Warn("error getting Jira issue ID from path",
					append([]interface{}{
						"error", err,
					}, logArgs...)...)
				http.Error(w, "Jira issue not found", http.StatusNotFound)
				return
			}
			logArgs = append(logArgs, "jira_issue_id", issueID)

			switch r.Method {
			case "GET":
				logArgs = append(logArgs, "method", r.Method)

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
				jiraIssueURL := *jiraURL
				jiraIssueURL.Path = path.Join(
					jiraURL.Path,
					fmt.Sprintf("rest/api/3/issue/%s", issueID),
				)
				q := jiraIssueURL.Query()
				q.Add("fields",
					"assignee,issuetype,key,priority,project,reporter,status,summary")
				jiraIssueURL.RawQuery = q.Encode()

				resp, err := executeJiraRequest(jiraIssueURL.String(), srv)
				if err != nil {
					log.Error("error executing Jira request",
						append([]interface{}{
							"error", err,
						}, logArgs...)...)
					http.Error(w, "Error processing request",
						http.StatusInternalServerError)
					return
				}
				defer resp.Body.Close()

				switch {
				case resp.StatusCode >= 200 && resp.StatusCode <= 299:
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

					var jiraAPIResp jira.APIResponseIssueGet
					if err := json.Unmarshal(respBody, &jiraAPIResp); err != nil {
						log.Error("error unmarshaling issue response",
							append([]interface{}{
								"error", err,
							}, logArgs...)...)
						http.Error(w, "Error processing request",
							http.StatusInternalServerError)
						return
					}

					// Build issue URL.
					issueURL := *jiraURL
					issueURL.Path = path.Join(
						jiraURL.Path,
						"browse",
						jiraAPIResp.Key,
					)

					resp := JiraIssueGetResponse{
						Assignee:       jiraAPIResp.Fields.Assignee.DisplayName,
						AssigneeAvatar: jiraAPIResp.Fields.Assignee.AvatarURLs.FourtyEightByFourtyEight,
						IssueType:      jiraAPIResp.Fields.IssueType.Name,
						IssueTypeImage: jiraAPIResp.Fields.IssueType.IconURL,
						Key:            jiraAPIResp.Key,
						Priority:       jiraAPIResp.Fields.Priority.Name,
						PriorityImage:  jiraAPIResp.Fields.Priority.IconURL,
						Project:        jiraAPIResp.Fields.Project.Name,
						Reporter:       jiraAPIResp.Fields.Reporter.DisplayName,
						Status:         jiraAPIResp.Fields.Status.Name,
						Summary:        jiraAPIResp.Fields.Summary,
						URL:            issueURL.String(),
					}

					// Write response.
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusOK)
					enc := json.NewEncoder(w)
					if err := enc.Encode(resp); err != nil {
						log.Error("error encoding response",
							append([]interface{}{
								"error", err,
							}, logArgs...)...,
						)
						http.Error(
							w, "Error processing request", http.StatusInternalServerError)
						return
					}

				case resp.StatusCode == http.StatusNotFound:
					log.Warn("issue not found", logArgs...)
					http.Error(w, "Not found", http.StatusNotFound)
					return

				default:
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
		} else {
			log.Warn("path not found", logArgs...)
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
	})
}

func executeJiraRequest(url string, srv server.Server) (*http.Response, error) {
	// Create HTTP request.
	client := &http.Client{
		Timeout: time.Second * 10,
	}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating HTTP request: %w", err)
	}

	// Add authorization to request.
	req.SetBasicAuth(
		srv.Jira.User,
		srv.Jira.APIToken,
	)

	// Execute HTTP request.
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error executing HTTP request: %w", err)
	}

	return resp, nil
}

// getJiraIssueIDFromPath returns the Jira issue ID from a request path and
// corresponding regular expression.
func getJiraIssueIDFromPath(path string, re *regexp.Regexp) (string, error) {
	matches := re.FindStringSubmatch(path)
	if len(matches) != 2 {
		return "",
			fmt.Errorf(
				"wrong number of string submatches for resource URL path: %d",
				len(matches),
			)
	}
	return matches[1], nil
}
