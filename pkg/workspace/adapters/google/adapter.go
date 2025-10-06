package google

import (
	"github.com/hashicorp-forge/hermes/pkg/workspace"
	admin "google.golang.org/api/admin/directory/v1"
	"google.golang.org/api/docs/v1"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/people/v1"
)

// Adapter wraps the Google Service to implement the workspace.Provider interface.
// This provides a clean abstraction over Google Workspace operations while
// preserving all the existing implementation in Service.
type Adapter struct {
	service *Service
}

// NewAdapter creates a new Google Workspace adapter from a Service.
func NewAdapter(service *Service) workspace.Provider {
	return &Adapter{
		service: service,
	}
}

// File operations

func (a *Adapter) GetFile(fileID string) (*drive.File, error) {
	return a.service.GetFile(fileID)
}

func (a *Adapter) CopyFile(srcID, destFolderID, name string) (*drive.File, error) {
	return a.service.CopyFile(srcID, destFolderID, name)
}

func (a *Adapter) MoveFile(fileID, destFolderID string) (*drive.File, error) {
	return a.service.MoveFile(fileID, destFolderID)
}

func (a *Adapter) DeleteFile(fileID string) error {
	return a.service.DeleteFile(fileID)
}

func (a *Adapter) RenameFile(fileID, newName string) error {
	return a.service.RenameFile(fileID, newName)
}

func (a *Adapter) ShareFile(fileID, email, role string) error {
	return a.service.ShareFile(fileID, email, role)
}

func (a *Adapter) ShareFileWithDomain(fileID, domain, role string) error {
	return a.service.ShareFileWithDomain(fileID, domain, role)
}

func (a *Adapter) ListPermissions(fileID string) ([]*drive.Permission, error) {
	return a.service.ListPermissions(fileID)
}

func (a *Adapter) DeletePermission(fileID, permissionID string) error {
	return a.service.DeletePermission(fileID, permissionID)
}

func (a *Adapter) CreateFileAsUser(templateID, destFolderID, name, userEmail string) (*drive.File, error) {
	return a.service.CreateFileAsUser(templateID, destFolderID, name, userEmail)
}

// People operations

func (a *Adapter) SearchPeople(email string, fields string) ([]*people.Person, error) {
	return a.service.SearchPeople(email, fields)
}

func (a *Adapter) SearchDirectory(opts workspace.PeopleSearchOptions) ([]*people.Person, error) {
	return a.service.SearchDirectory(opts)
}

// Folder operations

func (a *Adapter) GetSubfolder(parentID, name string) (string, error) {
	subfolder, err := a.service.GetSubfolder(parentID, name)
	if err != nil {
		return "", err
	}
	if subfolder == nil {
		return "", nil
	}
	return subfolder.Id, nil
}

func (a *Adapter) CreateFolder(name, parentID string) (*drive.File, error) {
	return a.service.CreateFolder(name, parentID)
}

func (a *Adapter) CreateShortcut(targetID, parentID string) (*drive.File, error) {
	return a.service.CreateShortcut(targetID, parentID)
}

// Document content operations (Google Docs)

func (a *Adapter) GetDoc(fileID string) (*docs.Document, error) {
	return a.service.GetDoc(fileID)
}

func (a *Adapter) UpdateDoc(fileID string, requests []*docs.Request) (*docs.BatchUpdateDocumentResponse, error) {
	req := &docs.BatchUpdateDocumentRequest{
		Requests: requests,
	}
	return a.service.Docs.Documents.BatchUpdate(fileID, req).Do()
}

// Revision management

func (a *Adapter) GetLatestRevision(fileID string) (*drive.Revision, error) {
	return a.service.GetLatestRevision(fileID)
}

func (a *Adapter) KeepRevisionForever(fileID, revisionID string) (*drive.Revision, error) {
	return a.service.KeepRevisionForever(fileID, revisionID)
}

func (a *Adapter) UpdateKeepRevisionForever(fileID, revisionID string, keepForever bool) error {
	return a.service.UpdateKeepRevisionForever(fileID, revisionID, keepForever)
}

// Email operations

func (a *Adapter) SendEmail(to []string, from, subject, body string) error {
	return a.service.SendEmail(to, from, subject, body)
}

// Group operations

func (a *Adapter) ListGroups(domain, query string, maxResults int64) ([]*admin.Group, error) {
	groups, err := a.service.AdminDirectory.Groups.List().
		Domain(domain).
		MaxResults(maxResults).
		Query(query).
		Do()
	if err != nil {
		return nil, err
	}
	return groups.Groups, nil
}

func (a *Adapter) ListUserGroups(userEmail string) ([]*admin.Group, error) {
	groups, err := a.service.AdminDirectory.Groups.List().
		UserKey(userEmail).
		Do()
	if err != nil {
		return nil, err
	}
	return groups.Groups, nil
}
