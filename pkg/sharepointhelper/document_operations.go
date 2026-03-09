package sharepointhelper

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// CopyFileResponse represents the response from the Microsoft Graph API when copying a file.
type CopyFileResponse struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	WebURL        string `json:"webUrl"`
	CreatedAt     string `json:"createdDateTime"`
	LastModified  string `json:"lastModifiedDateTime"`
	FileExtension string `json:"fileExtension"`
}

// Permission represents a SharePoint permission
// Permission related structs

type GrantedTo struct {
	User UserDetails `json:"user"`
}

type UserDetails struct {
	DisplayName string `json:"displayName"`
	Email       string `json:"email"`
	ID          string `json:"id"`
}

type Permission struct {
	ID        string    `json:"id"`
	GrantedTo GrantedTo `json:"grantedTo"`
	Role      []string  `json:"roles"`
}

// groupMetadata holds selected Microsoft Graph group properties for classification.
type groupMetadata struct {
	ID              string   `json:"id"`
	Mail            string   `json:"mail"`
	DisplayName     string   `json:"displayName"`
	MailEnabled     bool     `json:"mailEnabled"`
	SecurityEnabled bool     `json:"securityEnabled"`
	GroupTypes      []string `json:"groupTypes"`
}

// --------------x------------------

// SharePermissionResponse represents the response from the Microsoft Graph API when setting permissions.
type SharePermissionResponse struct {
	ID          string   `json:"id"`
	InviteEmail string   `json:"inviteEmail"`
	Roles       []string `json:"roles"`
}

// CopyFile copies a template file to create a new document in SharePoint
// folderPath can be a folder name or path like "/DraftDocuments" or "DraftDocuments"
func (s *Service) CopyFile(templateID, fileName, folderPath string) (*CopyFileResponse, error) {
	// First, resolve the folder path to get the folder ID
	folderID, err := s.ResolveFolderPath(folderPath)
	if err != nil {
		return nil, fmt.Errorf("error resolving folder path '%s': %w", folderPath, err)
	}

	s.Logger.Debug("resolved folder path", "path", folderPath, "folder_id", folderID)

	// Construct the Microsoft Graph API URL for copying a file
	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s/copy",
		s.SiteID, s.DriveID, templateID)

	// Prepare the request body
	body := map[string]interface{}{
		"name": fileName,
		"parentReference": map[string]string{
			"driveId": s.DriveID,
			"id":      folderID, // Use the resolved folder ID
		},
		// Add conflict behavior to rename the file if it already exists
		"@microsoft.graph.conflictBehavior": "rename",
	}

	jsonBody, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("error marshaling request body: %w", err)
	}

	// Log the request details
	s.Logger.Debug("initiating SharePoint file copy", "template_id", templateID, "file_name", fileName, "folder_path", folderPath)

	// Make the authenticated request using InvokeAPI
	resp, err := s.InvokeAPI("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("error making copy request to SharePoint: %w", err)
	}
	defer resp.Body.Close()

	// Check for a successful response
	if resp.StatusCode != http.StatusAccepted && resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to copy file: %s, %s", resp.Status, string(body))
	}

	// Graph API copy operation is asynchronous, so we need to check the Location header
	// to monitor the status of the operation
	monitorURL := resp.Header.Get("Location")
	if monitorURL == "" {
		return nil, fmt.Errorf("no Location header found in copy response")
	}

	// Poll the monitor URL until the operation completes
	fileID, err := s.monitorCopyOperation(monitorURL)
	if err != nil {
		// Check if this is a "nameAlreadyExists" error
		if strings.Contains(err.Error(), "nameAlreadyExists") {
			s.Logger.Warn("file already exists, attempting to find existing file", "file_name", fileName)

			// Try to find the existing file by name in the destination folder
			existingFile, findErr := s.FindFileByName(folderPath, fileName)
			if findErr != nil {
				// If we can't find the existing file, return the original error
				return nil, fmt.Errorf("file already exists but couldn't locate it: %w", err)
			}

			s.Logger.Info("found existing file instead of copying", "file_id", existingFile.ID, "file_name", fileName)
			return existingFile, nil
		}

		// For any other error, return it
		return nil, err
	}

	// Get file details
	fileDetails, err := s.GetFileDetails(fileID)
	if err != nil {
		return nil, err
	}

	return fileDetails, nil
}

// FindFileByName searches for a file by name in the specified folder
// folderPath can be a folder ID or a path like "/DraftDocuments"
func (s *Service) FindFileByName(folderPath, fileName string) (*CopyFileResponse, error) {
	// Resolve the folder path to a folder ID
	folderID, err := s.ResolveFolderPath(folderPath)
	if err != nil {
		return nil, fmt.Errorf("error resolving folder path '%s': %w", folderPath, err)
	}

	// Construct the Microsoft Graph API URL to list items in the folder
	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s/children",
		s.SiteID, s.DriveID, folderID)

	resp, err := s.InvokeAPI("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error calling Graph API to find file: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to list folder contents: %s, %s", resp.Status, string(body))
	}

	// Parse the response
	var folderContents struct {
		Value []CopyFileResponse `json:"value"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&folderContents); err != nil {
		return nil, fmt.Errorf("error decoding folder contents: %w", err)
	}

	// Look for the file with the matching name
	for _, file := range folderContents.Value {
		if file.Name == fileName {
			return &file, nil
		}
	}

	return nil, fmt.Errorf("file with name '%s' not found in folder", fileName)
}

// monitorCopyOperation polls the monitor URL until the copy operation completes
func (s *Service) monitorCopyOperation(monitorURL string) (string, error) {
	maxAttempts := 30 // Increase from 10 to 30 attempts

	s.Logger.Debug("monitoring SharePoint copy operation", "monitor_url", monitorURL)

	for i := 0; i < maxAttempts; i++ {
		// Add a small delay before each attempt to give SharePoint time to process
		if i > 0 {
			time.Sleep(2 * time.Second)
		}

		req, err := http.NewRequest("GET", monitorURL, nil)
		if err != nil {
			return "", fmt.Errorf("error creating monitor request: %w", err)
		}
		// Important: Do NOT set Authorization header for the monitor URL
		// The monitor URL is a special URL that doesn't require authorization

		resp, err := s.httpClient.Do(req)
		if err != nil {
			s.Logger.Warn("error on copy monitor attempt", "attempt", i+1, "max_attempts", maxAttempts, "error", err)
			continue // Try again rather than failing immediately
		}

		defer resp.Body.Close()

		body, _ := io.ReadAll(resp.Body)

		if resp.StatusCode == http.StatusOK {
			// Operation completed
			var result struct {
				ResourceID string `json:"resourceId"`
			}

			// Reset the reader for JSON decoding
			resp.Body = io.NopCloser(bytes.NewBuffer(body))

			if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
				s.Logger.Warn("error decoding copy monitor response", "error", err)
				// Try again rather than failing immediately
				continue
			}

			if result.ResourceID == "" {
				// Continue without logging - this is normal during operation progress
				continue
			}

			// Operation completed successfully
			s.Logger.Info("SharePoint copy operation completed", "resource_id", result.ResourceID)
			return result.ResourceID, nil

		} else if resp.StatusCode == http.StatusAccepted {
			// Operation still in progress - continue without logging
			continue
		} else if resp.StatusCode == http.StatusConflict {
			// This is likely a duplicate request or name conflict
			s.Logger.Warn("conflict detected in copy operation", "attempt", i+1, "message", "This may indicate a duplicate file")

			// Try to extract resource ID from the error response if available
			var errResponse struct {
				Error struct {
					Code    string `json:"code"`
					Message string `json:"message"`
				} `json:"error"`
			}

			if err := json.Unmarshal(body, &errResponse); err == nil && errResponse.Error.Code == "nameAlreadyExists" {
				s.Logger.Info("name already exists error detected, will continue with existing file")

				// We need to return something to indicate we should proceed with the existing file
				// For now, return an error that can be recognized
				return "", fmt.Errorf("nameAlreadyExists: %s", string(body))
			}

			// Other conflict type, retry
			continue
		} else {
			// Any other error status - log but continue retrying
			s.Logger.Warn("unexpected status from copy monitor URL", "status_code", resp.StatusCode, "status", resp.Status)
			// Try again rather than failing immediately
			continue
		}
	}

	return "", fmt.Errorf("copy operation timed out after %d attempts", maxAttempts)
}

// GetFileDetails retrieves details of a file by its ID
func (s *Service) GetFileDetails(fileID string) (*CopyFileResponse, error) {
	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s",
		s.SiteID, s.DriveID, fileID)

	resp, err := s.InvokeAPI("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error calling Graph API for file details: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to get file details: %s, %s", resp.Status, string(body))
	}

	var fileDetails CopyFileResponse
	if err := json.NewDecoder(resp.Body).Decode(&fileDetails); err != nil {
		return nil, fmt.Errorf("error decoding file details response: %w", err)
	}

	return &fileDetails, nil
}

type inviteRecipient struct {
	Email    string `json:"email,omitempty"`
	ObjectID string `json:"objectId,omitempty"`
}

func normalizeShareRoles(role string) ([]string, error) {
	switch role {
	case "reader":
		return []string{"read"}, nil
	case "writer":
		return []string{"write"}, nil
	default:
		return nil, fmt.Errorf("invalid role: %s", role)
	}
}

func (s *Service) shareFileWithRecipients(fileID, role string, recipients []inviteRecipient, sendInvitation bool) error {
	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s/invite",
		s.SiteID, s.DriveID, fileID)

	roles, err := normalizeShareRoles(role)
	if err != nil {
		return err
	}

	body := map[string]interface{}{
		"recipients":     recipients,
		"roles":          roles,
		"requireSignIn":  true,
		"sendInvitation": sendInvitation,
	}

	jsonBody, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("error marshaling request body: %w", err)
	}

	resp, err := s.InvokeAPI("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return fmt.Errorf("error calling Graph API to share file: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to share file: %s, %s", resp.Status, string(body))
	}

	return nil
}

// ShareFile shares a file with a user with the specified role.
func (s *Service) ShareFile(fileID, userEmail, role string) error {
	recipient := inviteRecipient{Email: userEmail}
	return s.shareFileWithRecipients(fileID, role, []inviteRecipient{recipient}, true)
}

// ShareFile shares a file with multiple users with the specified role.
func (s *Service) ShareFileWithMultipleUsers(fileID, role string, userEmails []string) error {
	recipients := make([]inviteRecipient, 0, len(userEmails))
	for _, email := range userEmails {
		recipients = append(recipients, inviteRecipient{Email: email})
	}

	return s.shareFileWithRecipients(fileID, role, recipients, true)
}

// ShareFileWithGroupMembers shares a file with all (transitive) members of a
// Microsoft 365 group, distribution list, or mail-enabled security group
// identified by its email address. It expands the group membership via the
// Graph API recurssively and then reuses ShareFileWithMultipleUsers in batches.
// Limitations / Notes:
//   - Service principals / devices are ignored; only user objects with a
//     resolvable mail or userPrincipalName are considered.
//   - Large groups are processed in batches (size 50) to honor Graph invite
//     endpoint limits.
//   - If a member has no mail attribute, userPrincipalName is used.
func (s *Service) ShareFileWithGroupMembers(fileID, groupEmail, role string) error {
	if groupEmail == "" {
		return fmt.Errorf("groupEmail cannot be empty")
	}

	meta, err := s.resolveGroupByEmail(groupEmail)
	if err != nil {
		return fmt.Errorf("failed to resolve group '%s': %w", groupEmail, err)
	}

	memberEmails, err := s.enumerateGroupMemberEmails(meta.ID)
	if err != nil {
		return fmt.Errorf("failed to enumerate members for group '%s': %w", groupEmail, err)
	}
	if len(memberEmails) == 0 {
		s.Logger.Warn("group has no resolvable members to share with", "group", groupEmail)
		return nil
	}

	const batchSize = 50
	if len(memberEmails) <= batchSize {
		if err := s.ShareFileWithMultipleUsers(fileID, role, memberEmails); err != nil {
			return fmt.Errorf("error sharing file with group '%s' members: %w", groupEmail, err)
		}
		s.Logger.Debug("completed sharing of group members", "group", groupEmail, "total_members", len(memberEmails))
		return nil
	}

	for i := 0; i < len(memberEmails); i += batchSize {
		end := i + batchSize
		if end > len(memberEmails) {
			end = len(memberEmails)
		}
		batch := memberEmails[i:end]
		if err := s.ShareFileWithMultipleUsers(fileID, role, batch); err != nil {
			return fmt.Errorf("error sharing file with group '%s' members batch %d: %w", groupEmail, i/batchSize, err)
		}
	}
	s.Logger.Info("completed sequential sharing of group members", "group", groupEmail, "total_members", len(memberEmails), "batches", (len(memberEmails)+batchSize-1)/batchSize)
	return nil
}

// GetGroupMemberEmails returns all unique (transitive) member email identifiers
// for the Microsoft 365 group / distribution list
func (s *Service) GetGroupMemberEmails(groupEmail string) ([]string, error) {
	if strings.TrimSpace(groupEmail) == "" {
		return nil, fmt.Errorf("groupEmail cannot be empty")
	}
	meta, err := s.resolveGroupIdentifier(groupEmail)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve group '%s': %w", groupEmail, err)
	}
	emails, err := s.enumerateGroupMemberEmails(meta.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to enumerate members for group '%s': %w", groupEmail, err)
	}
	return emails, nil
}

// enumerateGroupMemberEmails returns a de-duplicated slice of user email identifiers (mail or UPN)
// for all members of the given group, expanding nested groups recursively using the /members endpoint.
func (s *Service) enumerateGroupMemberEmails(rootGroupID string) ([]string, error) {
	if strings.TrimSpace(rootGroupID) == "" {
		return nil, fmt.Errorf("groupID cannot be empty")
	}
	type directoryObject struct {
		ID                string `json:"id"`
		Mail              string `json:"mail"`
		UserPrincipalName string `json:"userPrincipalName"`
		ODataType         string `json:"@odata.type"`
	}
	queue := []string{rootGroupID}
	visitedGroups := map[string]struct{}{strings.ToLower(rootGroupID): {}}
	uniqEmails := map[string]struct{}{}
	var emails []string
	for len(queue) > 0 {
		gid := queue[0]
		queue = queue[1:]
		membersURL := fmt.Sprintf("https://graph.microsoft.com/v1.0/groups/%s/members", gid)
		for membersURL != "" {
			mr, err := s.InvokeAPI("GET", membersURL, nil)
			if err != nil {
				return nil, fmt.Errorf("invoke members (group %s): %w", gid, err)
			}
			if mr.StatusCode != http.StatusOK {
				body, _ := io.ReadAll(mr.Body)
				mr.Body.Close()
				return nil, fmt.Errorf("members returned %s for group %s: %s", mr.Status, gid, string(body))
			}
			var page struct {
				Value    []directoryObject `json:"value"`
				NextLink string            `json:"@odata.nextLink"`
			}
			if err := json.NewDecoder(mr.Body).Decode(&page); err != nil {
				mr.Body.Close()
				return nil, fmt.Errorf("decode members page (group %s): %w", gid, err)
			}
			mr.Body.Close()
			for _, obj := range page.Value {
				if strings.EqualFold(obj.ODataType, "#microsoft.graph.group") {
					lowered := strings.ToLower(obj.ID)
					if _, seen := visitedGroups[lowered]; !seen && lowered != "" {
						visitedGroups[lowered] = struct{}{}
						queue = append(queue, obj.ID)
					}
					continue
				}
				email := obj.Mail
				if email == "" {
					email = obj.UserPrincipalName
				}
				if strings.TrimSpace(email) == "" {
					continue
				}
				key := strings.ToLower(strings.TrimSpace(email))
				if _, exists := uniqEmails[key]; exists {
					continue
				}
				uniqEmails[key] = struct{}{}
				emails = append(emails, email)
			}
			membersURL = page.NextLink
		}
	}
	s.Logger.Debug("enumerated group members recursively", "group_id", rootGroupID, "member_count", len(emails))
	return emails, nil
}

func (s *Service) resolveGroupIdentifier(groupIdentifier string) (*groupMetadata, error) {
	if strings.TrimSpace(groupIdentifier) == "" {
		return nil, fmt.Errorf("group identifier cannot be empty")
	}

	if meta, err := s.resolveGroupByEmail(groupIdentifier); err == nil {
		return meta, nil
	}

	return s.resolveGroupByDisplayName(groupIdentifier)
}

func (s *Service) resolveGroupByDisplayName(displayName string) (*groupMetadata, error) {
	if strings.TrimSpace(displayName) == "" {
		return nil, fmt.Errorf("group displayName cannot be empty")
	}

	filterExpr := fmt.Sprintf("displayName eq '%s'", displayName)
	lookupURL := fmt.Sprintf("https://graph.microsoft.com/v1.0/groups?$filter=%s&$select=id,displayName,mail,mailEnabled,securityEnabled,groupTypes", url.QueryEscape(filterExpr))

	resp, err := s.InvokeAPI("GET", lookupURL, nil)
	if err != nil {
		return nil, fmt.Errorf("group displayName lookup failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("group displayName lookup returned %s: %s", resp.Status, string(body))
	}

	var result struct {
		Value []groupMetadata `json:"value"`
	}
	if decErr := json.NewDecoder(resp.Body).Decode(&result); decErr != nil {
		return nil, fmt.Errorf("error decoding group displayName response: %w", decErr)
	}

	for _, g := range result.Value {
		if strings.EqualFold(g.DisplayName, displayName) {
			return &g, nil
		}
	}
	if len(result.Value) > 0 {
		return &result.Value[0], nil
	}

	return nil, fmt.Errorf("group with display name '%s' not found", displayName)
}

// resolveGroupByEmail resolves group metadata (id + classification fields) by email.
// It first tries an encoded $filter on the mail attribute, then falls back to $search.
func (s *Service) resolveGroupByEmail(groupEmail string) (*groupMetadata, error) {
	if strings.TrimSpace(groupEmail) == "" {
		return nil, fmt.Errorf("groupEmail cannot be empty")
	}
	filterExpr := fmt.Sprintf("mail eq '%s'", groupEmail)
	lookupURL := fmt.Sprintf("https://graph.microsoft.com/v1.0/groups?$filter=%s&$select=id,displayName,mail,mailEnabled,securityEnabled,groupTypes", url.QueryEscape(filterExpr))

	// Try filter first
	if resp, err := s.InvokeAPI("GET", lookupURL, nil); err == nil && resp != nil {
		defer resp.Body.Close()
		if resp.StatusCode == http.StatusOK {
			var result struct {
				Value []groupMetadata `json:"value"`
			}
			if decErr := json.NewDecoder(resp.Body).Decode(&result); decErr == nil {
				if len(result.Value) > 0 {
					return &result.Value[0], nil
				}
			}
		}
	}

	// Fallback to search (requires ConsistencyLevel header)
	searchURL := fmt.Sprintf("https://graph.microsoft.com/v1.0/groups?$search=\"mail:%s\"&$select=id,displayName,mail,mailEnabled,securityEnabled,groupTypes", groupEmail)
	options := &APIOptions{Headers: map[string]string{"ConsistencyLevel": "eventual"}}
	resp, err := s.InvokeAPIWithOptions("GET", searchURL, nil, options)
	if err != nil {
		return nil, fmt.Errorf("group search failed: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("group search returned %s: %s", resp.Status, string(body))
	}
	var searchResult struct {
		Value []groupMetadata `json:"value"`
	}
	if decErr := json.NewDecoder(resp.Body).Decode(&searchResult); decErr != nil {
		return nil, fmt.Errorf("error decoding group search response: %w", decErr)
	}
	// Attempt exact mail match first
	for _, g := range searchResult.Value {
		if strings.EqualFold(g.Mail, groupEmail) {
			return &g, nil
		}
	}
	if len(searchResult.Value) > 0 {
		return &searchResult.Value[0], nil
	}
	return nil, fmt.Errorf("group with email '%s' not found", groupEmail)
}

// ShareFileWithGroupOrMembers attempts to share a file directly with the group
// (so future membership changes are honored automatically). If the Graph API
// rejects the recipient (common for pure Distribution Lists that are not
// security principals), it falls back to expanding the group membership and
// sharing with individual members (snapshot approach).
// This gives the best of both worlds: dynamic permissions when possible, and
// functional access otherwise.
func (s *Service) ShareFileWithGroupOrMembers(fileID, groupEmail, role string) error {
	meta, err := s.resolveGroupIdentifier(groupEmail)
	if err != nil {
		return fmt.Errorf("failed to resolve group metadata: %w", err)
	}

	// If it's a classic Distribution List (mail-enabled, not security, not Unified),
	// skip direct share attempt and immediately expand members (DLs aren't security principals).
	if isDistributionListGroup(meta) {
		s.Logger.Debug("distribution list detected; expanding members instead of direct share", "group", groupEmail, "id", meta.ID)
		if err := s.ShareFileWithGroupMembers(fileID, groupEmail, role); err != nil {
			return fmt.Errorf("member expansion failed for distribution list '%s': %w", groupEmail, err)
		}
		return nil
	}

	// Non-DL path: attempt direct group share first, then fallback to member expansion.
	shareTarget := groupEmail
	if meta.Mail != "" {
		shareTarget = meta.Mail
	}

	if err := s.ShareFile(fileID, shareTarget, role); err == nil {
		s.Logger.Debug("shared file directly with non-DL group", "group", groupEmail, "id", meta.ID)
		return nil
	} else {
		s.Logger.Info("direct group share failed; falling back to member expansion", "group", groupEmail, "error", err)
		if expErr := s.ShareFileWithGroupMembers(fileID, groupEmail, role); expErr != nil {
			return fmt.Errorf("fallback member expansion failed for group '%s': %w (original direct error: %v)", groupEmail, expErr, err)
		}
		return nil
	}
}

// isDistributionListGroup returns true if the group behaves like a classic Distribution List:
// mailEnabled = true, securityEnabled = false, groupTypes does NOT contain "Unified".
func isDistributionListGroup(m *groupMetadata) bool {
	if m == nil {
		return false
	}
	if !m.MailEnabled || m.SecurityEnabled { // must be mail-enabled and NOT security enabled
		return false
	}
	for _, gt := range m.GroupTypes {
		if strings.EqualFold(gt, "Unified") { // M365 group
			return false
		}
	}
	return true
}

// GrantGroupsReadAccess grants file access to multiple groups without sending email notifications.
// If a group cannot be resolved by its identifier, it tries the display name from the provided map.
// Returns the list of successfully granted group identifiers.
func (s *Service) GrantGroupsReadAccess(fileID, role string, groupIdentifiers []string, displayNameMap map[string]string) ([]string, error) {
	if len(groupIdentifiers) == 0 {
		return nil, nil
	}

	seenGroups := make(map[string]struct{})
	recipients := make([]inviteRecipient, 0, len(groupIdentifiers))
	successfulGroups := make([]string, 0, len(groupIdentifiers))

	for _, groupIdentifier := range groupIdentifiers {
		identifier := strings.TrimSpace(groupIdentifier)
		if identifier == "" {
			continue
		}

		normalizedKey := strings.ToLower(identifier)
		if _, exists := seenGroups[normalizedKey]; exists {
			continue
		}
		seenGroups[normalizedKey] = struct{}{}

		groupMeta := s.resolveGroupWithRetry(identifier, displayNameMap)
		if groupMeta == nil {
			continue
		}

		recipient := s.buildRecipient(groupMeta)
		recipients = append(recipients, recipient)
		successfulGroups = append(successfulGroups, identifier)
	}

	if len(recipients) == 0 {
		s.Logger.Warn("no valid groups found to share with")
		return nil, nil
	}

	if err := s.shareFileWithRecipients(fileID, role, recipients, false); err != nil {
		return nil, err
	}

	return successfulGroups, nil
}

// resolveGroupWithRetry attempts to resolve a group, retrying with display name if initial lookup fails
func (s *Service) resolveGroupWithRetry(identifier string, displayNameMap map[string]string) *groupMetadata {
	groupMeta, err := s.resolveGroupIdentifier(identifier)
	if err == nil {
		return groupMeta
	}

	// Retry with display name from map if available
	if displayNameMap != nil {
		if displayName, exists := displayNameMap[identifier]; exists {
			s.Logger.Info("retry group lookup",
				"identifier", identifier,
				"display_name", displayName,
			)
			groupMeta, err = s.resolveGroupByDisplayName(displayName)
			if err == nil {
				return groupMeta
			}
		}
	}

	s.Logger.Warn("group not found",
		"identifier", identifier,
		"error", err,
	)
	return nil
}

// buildRecipient creates an inviteRecipient from group metadata
func (s *Service) buildRecipient(groupMeta *groupMetadata) inviteRecipient {
	if groupMeta == nil || strings.TrimSpace(groupMeta.ID) == "" {
		s.Logger.Warn("invalid group metadata")
		return inviteRecipient{}
	}

	if strings.TrimSpace(groupMeta.Mail) != "" {
		return inviteRecipient{Email: groupMeta.Mail}
	}
	return inviteRecipient{ObjectID: groupMeta.ID}
}

// ListPermissions lists all permissions for a file
func (s *Service) ListPermissions(fileID string) ([]Permission, error) {
	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s/permissions",
		s.SiteID, s.DriveID, fileID)

	resp, err := s.InvokeAPI("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error calling Graph API to list permissions: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to list permissions: %s, %s", resp.Status, string(body))
	}

	var result struct {
		Value []Permission `json:"value"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("error decoding permissions response: %w", err)
	}

	return result.Value, nil
}

// DeletePermission deletes a permission by ID
func (s *Service) DeletePermission(fileID, permissionID string) error {
	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s/permissions/%s",
		s.SiteID, s.DriveID, fileID, permissionID)

	resp, err := s.InvokeAPI("DELETE", url, nil)
	if err != nil {
		return fmt.Errorf("error calling Graph API to delete permission: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to delete permission: %s, %s", resp.Status, string(body))
	}

	return nil
}

// ReplaceDocumentHeader replaces the header in a SharePoint document
// This downloads the DOCX file, updates the document.xml content, and re-uploads it
func (s *Service) ReplaceDocumentHeader(fileID string, properties map[string]string) error {
	// Use the DOCX operations to download, modify, and upload the document
	return s.ReplaceDocumentHeaderWithContentUpdate(fileID, properties)
}

// MoveFile moves a file to a new folder
func (s *Service) MoveFile(fileID, folderPath string) (*CopyFileResponse, error) {
	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s",
		s.SiteID, s.DriveID, fileID)

	body := map[string]interface{}{
		"parentReference": map[string]string{
			"driveId": s.DriveID,
			"path":    "/drive/root:" + folderPath,
		},
	}

	jsonBody, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("error marshaling request body: %w", err)
	}

	resp, err := s.InvokeAPI("PATCH", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("error calling Graph API to move file: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to move file: %s, %s", resp.Status, string(body))
	}

	var result CopyFileResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("error decoding move file response: %w", err)
	}

	return &result, nil
}

// ResolveFolderPath resolves a folder path like "/DraftDocuments" to a folder ID
func (s *Service) ResolveFolderPath(folderPath string) (string, error) {
	// Construct the URL to get the folder by path
	destFolderURL := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/root:/%s",
		s.SiteID, s.DriveID, folderPath)

	// Create the HTTP request
	resp, err := s.InvokeAPI("GET", destFolderURL, nil)
	if err != nil {
		return "", fmt.Errorf("error calling Graph API for destination folder: %w", err)
	}
	defer resp.Body.Close()

	// Execute the request

	// Check for successful response
	if resp.StatusCode == http.StatusOK {
		// Parse the JSON response
		var destinationFolder struct {
			ID string `json:"id"`
		}

		if err := json.NewDecoder(resp.Body).Decode(&destinationFolder); err != nil {
			return "", fmt.Errorf("error decoding destination folder response: %w", err)
		}

		destinationFolderID := destinationFolder.ID
		s.Logger.Debug("found destination folder", "folder_id", destinationFolderID)

		return destinationFolderID, nil
	} else {
		// Handle error response
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("failed to find destination folder '%s': %s, %s",
			folderPath, resp.Status, string(body))
	}

}

// CreateFolder creates a folder in a SharePoint document library.
func (s *Service) CreateFolder(folderName, destFolderID string) (string, error) {
	if folderName == "" {
		return "", fmt.Errorf("folder name is required")
	}
	if destFolderID == "" {
		return "", fmt.Errorf("destination folder ID is required")
	}

	// Construct the Microsoft Graph API URL to create a folder
	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s/children",
		s.SiteID, s.DriveID, destFolderID)

	payload := map[string]interface{}{
		"name":                              folderName,
		"folder":                            map[string]interface{}{},
		"@microsoft.graph.conflictBehavior": "rename",
	}
	body, _ := json.Marshal(payload)

	resp, err := s.InvokeAPI("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return "", fmt.Errorf("error calling Graph API to create folder: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		b, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("failed to create folder: %s", string(b))
	}

	// Parse the response to get the new folder's ID (optional)
	var result struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("error decoding create folder response: %w", err)
	}

	return result.ID, nil
}

// DriveItem represents a SharePoint/OneDrive item (simplified for folders)
type DriveItem struct {
	ID                   string    `json:"id"`
	Name                 string    `json:"name"`
	WebURL               string    `json:"webUrl"`
	CreatedDateTime      time.Time `json:"createdDateTime"`
	LastModifiedDateTime time.Time `json:"lastModifiedDateTime"`
	Folder               *struct{} `json:"folder,omitempty"` // Will be non-nil for folders
}

// GetSubfolder returns the subfolder DriveItem if the specified folder contains a
// subfolder with the specified name, and nil if not found.
func (s *Service) GetSubfolder(parentFolderID, subfolderName string) (*DriveItem, error) {
	if parentFolderID == "" {
		return nil, fmt.Errorf("parent folder ID is required")
	}
	if subfolderName == "" {
		return nil, fmt.Errorf("subfolder name is required")
	}

	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s/children", s.SiteID, s.DriveID, parentFolderID)
	resp, err := s.InvokeAPI("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error calling Graph API to get subfolders: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to get subfolders: %s", string(b))
	}

	var result struct {
		Value []DriveItem `json:"value"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("error decoding response: %w", err)
	}

	for _, f := range result.Value {
		if f.Folder != nil && f.Name == subfolderName {
			return &f, nil
		}
	}
	return nil, nil
}

// CreateShortcut creates a .url shortcut file in the specified SharePoint folder.
// targetFileWebURL: the URL to the target document
// shortcutName: the name for the shortcut (without .url extension)
// destFolderID: the ID of the destination folder
func (s *Service) CreateShortcut(targetFileWebURL, shortcutName, destFolderID string) (string, error) {
	if targetFileWebURL == "" {
		return "", fmt.Errorf("target file web URL is required")
	}
	if shortcutName == "" {
		return "", fmt.Errorf("shortcut name is required")
	}
	if destFolderID == "" {
		return "", fmt.Errorf("destination folder ID is required")
	}
	conflictBehavior := "replace"
	uploadURL := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s:/%s.url:/content?@microsoft.graph.conflictBehavior=%s",
		s.SiteID, s.DriveID, destFolderID, shortcutName, conflictBehavior)

	content := fmt.Sprintf("[InternetShortcut]\nURL=%s\n", targetFileWebURL)

	resp, err := s.InvokeAPI("PUT", uploadURL, bytes.NewBufferString(content))
	if err != nil {
		return "", fmt.Errorf("error calling Graph API to create shortcut: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("failed to create shortcut: %s", string(b))
	}

	var result DriveItem
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("error decoding response: %w", err)
	}

	return result.ID, nil
}

// DriveItemVersion represents a SharePoint/OneDrive file version
type DriveItemVersion struct {
	ID                   string `json:"id"`
	LastModifiedDateTime string `json:"lastModifiedDateTime"`
	Size                 int64  `json:"size"`
	WebURL               string `json:"webUrl"`
}

// GetLatestVersion returns the latest version for a SharePoint file.
func (s *Service) GetLatestVersion(fileID string) (*DriveItemVersion, error) {
	if fileID == "" {
		return nil, fmt.Errorf("file ID is required")
	}

	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s/versions", s.SiteID, s.DriveID, fileID)
	resp, err := s.InvokeAPI("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error calling Graph API to list versions: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to list versions: %s", string(b))
	}

	var result struct {
		Value []DriveItemVersion `json:"value"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("error decoding response: %w", err)
	}

	if len(result.Value) == 0 {
		return nil, fmt.Errorf("no versions found")
	}

	return &result.Value[0], nil // Latest version is first in the list
}

// RenameFile renames a file in SharePoint/OneDrive.
// Uses the "Prefer: bypass-shared-lock" header to allow renaming files that are
// currently open in a co-authoring session.
func (s *Service) RenameFile(fileID, newName string) error {
	if fileID == "" {
		return fmt.Errorf("file ID is required")
	}
	if newName == "" {
		return fmt.Errorf("new name is required")
	}

	if s.Logger != nil {
		s.Logger.Info("renaming file in SharePoint",
			"file_id", fileID,
			"new_name", newName)
	}

	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s", s.SiteID, s.DriveID, fileID)
	payload := map[string]string{
		"name": newName,
	}
	body, _ := json.Marshal(payload)
	resp, err := s.InvokeAPIWithOptions("PATCH", url, bytes.NewBuffer(body), &APIOptions{
		Headers: map[string]string{
			"Prefer": "bypass-shared-lock",
		},
	})
	if err != nil {
		return fmt.Errorf("error calling Graph API to rename file: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to rename file: %s", string(b))
	}

	if s.Logger != nil {
		s.Logger.Info("successfully renamed file in SharePoint",
			"file_id", fileID,
			"new_name", newName)
	}
	return nil
}

// ShareFileWithDomain shares a SharePoint file with the entire organization (domain) by creating an org-scoped sharing link.
func (s *Service) ShareFileWithDomain(fileID, role string) (string, error) {
	if fileID == "" {
		return "", fmt.Errorf("file ID is required")
	}
	if role != "view" && role != "edit" {
		return "", fmt.Errorf("role must be 'view' or 'edit'")
	}

	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s/createLink", s.SiteID, s.DriveID, fileID)
	payload := map[string]string{
		"type":  role, // "view" or "edit"
		"scope": "organization",
	}
	body, _ := json.Marshal(payload)
	resp, err := s.InvokeAPI("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return "", fmt.Errorf("error calling Graph API to create sharing link: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusAccepted {
		b, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("failed to create sharing link: %s", string(b))
	}

	var result struct {
		Link struct {
			WebURL string `json:"webUrl"`
		} `json:"link"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("error decoding response: %w", err)
	}

	return result.Link.WebURL, nil
}
