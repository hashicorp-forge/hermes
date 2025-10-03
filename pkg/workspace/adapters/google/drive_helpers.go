package google

import (
	"fmt"
	"strings"

	"github.com/cenkalti/backoff/v4"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/googleapi"
)

const (
	fileFields = "id, lastModifyingUser, modifiedTime, name, parents, thumbnailLink"
)

// CopyFile copies a Google Drive file.
func (s *Service) CopyFile(
	fileID, name, destFolder string) (*drive.File, error) {

	f := &drive.File{
		Name:    name,
		Parents: []string{destFolder},
	}

	resp, err := s.Drive.Files.Copy(fileID, f).
		Fields("*").
		SupportsAllDrives(true).
		Do()
	if err != nil {
		return nil, fmt.Errorf("error copying file: %w", err)
	}
	return resp, nil
}

// CreateFolder creates a Google Drive folder.
func (s *Service) CreateFolder(
	folderName, destFolder string) (*drive.File, error) {

	// Validate inputs.
	if folderName == "" {
		return nil, fmt.Errorf("folder name is required")
	}
	if destFolder == "" {
		return nil, fmt.Errorf("destination folder is required")
	}

	f := &drive.File{
		Name:     folderName,
		MimeType: "application/vnd.google-apps.folder",
		Parents:  []string{destFolder},
	}

	resp, err := s.Drive.Files.Create(f).
		Fields("id,mimeType,name,parents").
		SupportsAllDrives(true).
		Do()
	if err != nil {
		return nil, err
	}

	return resp, nil
}

// CreateShortcut creates a Google Drive shortcut.
func (s *Service) CreateShortcut(
	targetFileID, destFolder string) (*drive.File, error) {

	// Validate inputs.
	if targetFileID == "" {
		return nil, fmt.Errorf("target file ID is required")
	}
	if destFolder == "" {
		return nil, fmt.Errorf("destination folder is required")
	}

	target, err := s.GetFile(targetFileID)
	if err != nil {
		return nil, fmt.Errorf("error getting target file: %w", err)
	}

	f := &drive.File{
		Name:     target.Name,
		MimeType: "application/vnd.google-apps.shortcut",
		Parents:  []string{destFolder},
		ShortcutDetails: &drive.FileShortcutDetails{
			TargetId: targetFileID,
		},
	}

	resp, err := s.Drive.Files.Create(f).
		Fields("id,mimeType,name,parents,shortcutDetails").
		SupportsAllDrives(true).
		Do()
	if err != nil {
		return nil, err
	}

	return resp, nil
}

// GetDocs returns all docs in a Google Drive folder.
func (s *Service) GetDocs(folderID string) ([]*drive.File, error) {
	return s.GetFiles(folderID, "application/vnd.google-apps.document")
}

// GetFile returns a Google Drive file.
func (s *Service) GetFile(fileID string) (*drive.File, error) {
	var (
		err  error
		resp *drive.File
	)

	op := func() error {
		resp, err = s.Drive.Files.Get(fileID).
			Fields(fileFields).
			SupportsAllDrives(true).
			Do()
		if err != nil {
			return fmt.Errorf("error getting file: %w", err)
		}

		return nil
	}

	boErr := backoff.RetryNotify(op, defaultBackoff(), backoffNotify)
	if boErr != nil {
		return nil, boErr
	}

	return resp, nil
}

// GetFiles returns all files in a Google Drive folder.
func (s *Service) GetFiles(folderID, mimeType string) ([]*drive.File, error) {
	query := fmt.Sprintf("'%s' in parents"+
		" and mimeType = '%s'"+
		" and trashed = false",
		folderID, mimeType)
	return s.ListFiles(folderID, query)
}

// GetDocs returns all folders in a Google Drive folder.
func (s *Service) GetFolders(folderID string) ([]*drive.File, error) {
	return s.GetFiles(folderID, "application/vnd.google-apps.folder")
}

// GetDocs returns all folders and recursively all subfolders in a Google Drive
// folder.
func (s *Service) GetFoldersRecursive(folderID string) ([]*drive.File, error) {
	folders, err := s.GetFolders(folderID)
	if err != nil {
		return nil, fmt.Errorf("error getting folders: %w", err)
	}

	for _, f := range folders {
		subFolders, err := s.GetFoldersRecursive(f.Id)
		if err != nil {
			return nil, fmt.Errorf("error getting subfolders: %w", err)
		}
		folders = append(folders, subFolders...)
	}

	return folders, nil
}

// GetLatestRevision returns the latest revision for a Google Drive file.
func (s *Service) GetLatestRevision(fileID string) (*drive.Revision, error) {
	revs, err := s.ListRevisions(fileID)
	if err != nil {
		return nil, fmt.Errorf("error listing revisions: %w", err)
	}

	if len(revs) == 0 {
		return nil, fmt.Errorf("no revisions found")
	}

	return revs[len(revs)-1], nil
}

// GetSubfolder returns the subfolder file if the specified folder contains a
// subfolder with the specified name, and nil if not found.
func (s *Service) GetSubfolder(
	folderID, subfolderName string) (*drive.File, error) {

	subfolders, err := s.GetFolders(folderID)
	if err != nil {
		return nil, fmt.Errorf("error getting subfolders: %w", err)
	}

	for _, f := range subfolders {
		if f.Name == subfolderName {
			return f, nil
		}
	}
	return nil, nil
}

// GetUpdatedDocs returns all docs in a Google Drive folder that have been
// modified after a provided timestamp.
func (s *Service) GetUpdatedDocs(
	folderID, timestamp string) ([]*drive.File, error) {
	return s.GetUpdatedFiles(folderID, "application/vnd.google-apps.document",
		timestamp)
}

// GetUpdatedDocsBetween returns all docs in a Google Drive folder that have
// been modified after a provided timestamp string (in RFC 3339 date-time)
// "afterTime" and before (or equal to) the timestamp string "beforeTime".
func (s *Service) GetUpdatedDocsBetween(
	folderID, afterTime, beforeTime string) ([]*drive.File, error) {
	query := fmt.Sprintf("'%s' in parents"+
		" and mimeType = 'application/vnd.google-apps.document'"+
		" and trashed = false"+
		" and modifiedTime > '%s'"+
		" and modifiedTime <= '%s'",
		folderID, afterTime, beforeTime)
	return s.ListFiles(folderID, query)
}

// GetUpdatedFiles returns all files in a Google Drive folder that have been
// modified after a provided timestamp.
func (s *Service) GetUpdatedFiles(
	folderID, mimeType, timestamp string) ([]*drive.File, error) {
	query := fmt.Sprintf("'%s' in parents"+
		" and mimeType = '%s'"+
		" and trashed = false"+
		" and modifiedTime > '%s'",
		folderID, mimeType, timestamp)
	return s.ListFiles(folderID, query)
}

// KeepRevisionForever keeps a Google Drive file revision forever.
func (s *Service) KeepRevisionForever(
	fileID, revisionID string) (*drive.Revision, error) {

	resp, err := s.Drive.Revisions.Update(fileID, revisionID, &drive.Revision{
		KeepForever: true,
	}).
		Fields("keepForever").
		Do()
	if err != nil {
		return nil, err
	}
	return resp, nil
}

// KeepRevisionForever keeps a Google Drive file revision forever.
func (s *Service) UpdateKeepRevisionForever(
	fileID, revisionID string, keepForever bool) error {

	_, err := s.Drive.Revisions.Update(fileID, revisionID, &drive.Revision{
		KeepForever: keepForever,
	}).
		Fields("keepForever").
		Do()

	return err
}

// ListFiles lists files in a Google Drive folder using the provided query.
func (s *Service) ListFiles(folderID, query string) ([]*drive.File, error) {
	var files []*drive.File
	var nextPageToken string

	for {
		op := func() error {
			call := s.Drive.Files.List().
				Fields(googleapi.Field(fmt.Sprintf("files(%s), nextPageToken", fileFields))).
				IncludeItemsFromAllDrives(true).
				PageSize(20).
				Q(query).
				SupportsAllDrives(true)
			if nextPageToken != "" {
				call = call.PageToken(nextPageToken)
			}
			resp, err := call.Do()
			if err != nil {
				return fmt.Errorf("error listing files: %w", err)
			}
			files = append(files, resp.Files...)
			nextPageToken = resp.NextPageToken

			return nil
		}

		boErr := backoff.RetryNotify(op, defaultBackoff(), backoffNotify)
		if boErr != nil {
			return nil, boErr
		}

		if nextPageToken == "" {
			break
		}
	}

	return files, nil
}

// ListRevisions lists revisions for a Google Drive file.
func (s *Service) ListRevisions(fileID string) ([]*drive.Revision, error) {
	var revisions []*drive.Revision
	var nextPageToken string

	for {
		call := s.Drive.Revisions.List(fileID).
			Fields("*").
			PageSize(20)
		if nextPageToken != "" {
			call = call.PageToken(nextPageToken)
		}
		resp, err := call.Do()
		if err != nil {
			return nil, err
		}
		revisions = append(revisions, resp.Revisions...)

		nextPageToken = resp.NextPageToken
		if nextPageToken == "" {
			break
		}
	}

	return revisions, nil
}

// MoveFile moves a Google Drive file to a different folder.
func (s *Service) MoveFile(fileID, destFolder string) (*drive.File, error) {
	if destFolder == "" {
		return nil, fmt.Errorf("destination folder cannot be empty")
	}

	f, err := s.GetFile(fileID)
	if err != nil {
		return nil, fmt.Errorf("error getting file: %w", err)
	}

	resp, err := s.Drive.Files.Update(fileID, &drive.File{}).
		AddParents(destFolder).
		RemoveParents(strings.Join(f.Parents[:], ",")).
		Fields("parents").
		SupportsAllDrives(true).
		Do()
	if err != nil {
		return nil, fmt.Errorf("error updating file: %w", err)
	}
	return resp, nil
}

// RenameFile renames a Google Drive file.
func (s *Service) RenameFile(fileID, newName string) error {
	_, err := s.Drive.Files.Update(fileID, &drive.File{
		Name: newName,
	}).
		SupportsAllDrives(true).
		Do()
	if err != nil {
		return fmt.Errorf("error updating file: %w", err)
	}
	return nil
}

// ShareFile shares a Google Drive file with a user.
func (s *Service) ShareFile(
	fileID, email, role string) error {

	_, err := s.Drive.Permissions.Create(fileID,
		&drive.Permission{
			EmailAddress: email,
			Role:         role,
			Type:         "user",
		}).
		SupportsAllDrives(true).
		Do()
	if err != nil {
		return fmt.Errorf("error updating file permissions: %w", err)
	}
	return nil
}

// ShareFileWithDomain shares a Google Drive file with a domain.
func (s *Service) ShareFileWithDomain(
	fileID, domain, role string) error {

	_, err := s.Drive.Permissions.Create(fileID,
		&drive.Permission{
			Domain: domain,
			Role:   role,
			Type:   "domain",
		}).
		SupportsAllDrives(true).
		Do()
	if err != nil {
		return fmt.Errorf("error updating file permissions: %w", err)
	}
	return nil
}

// ListPermissions lists permissions for a Google Drive file.
func (s *Service) ListPermissions(fileID string) ([]*drive.Permission, error) {
	var permissions []*drive.Permission
	var nextPageToken string

	for {
		call := s.Drive.Permissions.List(fileID).
			Fields("*").
			PageSize(20).
			SupportsAllDrives(true)
		if nextPageToken != "" {
			call = call.PageToken(nextPageToken)
		}
		resp, err := call.Do()
		if err != nil {
			return nil, err
		}
		permissions = append(permissions, resp.Permissions...)

		nextPageToken = resp.NextPageToken
		if nextPageToken == "" {
			break
		}
	}

	return permissions, nil
}

// DeleteFile deletes a Google Drive file
func (s *Service) DeleteFile(fileID string) error {
	err := s.Drive.Files.Delete(fileID).
		SupportsAllDrives(true).
		Do()
	if err != nil {
		return fmt.Errorf("error deleting file: %w", err)
	}
	return nil
}

// DeletePermission deletes a permission for a Google Drive file.
func (s *Service) DeletePermission(
	fileID, permissionID string) error {
	err := s.Drive.Permissions.Delete(fileID, permissionID).
		SupportsAllDrives(true).
		Do()
	if err != nil {
		return fmt.Errorf("error deleting permission: %w", err)
	}
	return nil
}
