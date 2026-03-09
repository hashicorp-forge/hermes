package sharepointhelper

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

// Group represents a Microsoft distribution list or security group from Graph API
type Group struct {
	ID          string   `json:"id"`
	DisplayName string   `json:"displayName"`
	Mail        string   `json:"mail"`
	GroupTypes  []string `json:"groupTypes"`
}

// GroupsResponse represents the response from Microsoft Graph groups search
type GroupsResponse struct {
	Value []Group `json:"value"`
}

// SearchGroup searches for Microsoft groups
// that match the query using Microsoft Graph API
func (s *Service) SearchGroup(query string, domain string, maxResults int) ([]Group, error) {
	if query == "" {
		return []Group{}, nil
	}

	// Build $search clause for displayName or mail
	// Escape embedded double quotes; @ can remain (will be URL-encoded as %40 in param)
	safe := strings.ReplaceAll(query, "\"", `\\"`)
	searchClause := fmt.Sprintf(`"displayName:%s" OR "mail:%s"`, safe, safe)
	encoded := url.QueryEscape(searchClause)
	searchURL := fmt.Sprintf("https://graph.microsoft.com/v1.0/groups?$search=%s&$top=%d&$select=id,displayName,mail,groupTypes", encoded, maxResults)

	s.Logger.Debug("searching groups via $search", "query", query, "search_clause", searchClause)

	options := &APIOptions{Headers: map[string]string{
		"ConsistencyLevel": "eventual",
		"Content-Type":     "application/json",
	}}

	resp, err := s.InvokeAPIWithOptions("GET", searchURL, nil, options)
	if err != nil {
		return nil, fmt.Errorf("error calling Graph API groups $search: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("groups $search status %d", resp.StatusCode)
	}

	var response GroupsResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("error decoding groups $search response: %w", err)
	}

	var results []Group
	for _, g := range response.Value {
		if g.Mail != "" { // maintain prior filter behavior
			results = append(results, g)
			if maxResults > 0 && len(results) >= maxResults {
				break
			}
		}
	}
	return results, nil
}
