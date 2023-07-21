package hashicorpdocs

// BaseDoc contains common document metadata fields used by Hermes.
type BaseDoc struct {
	// ObjectID is the Google Drive file ID for the document.
	ObjectID string `json:"objectID,omitempty"`

	// Title is the title of the document. It does not contain the document number
	// (e.g., "TF-123").
	Title string `json:"title,omitempty"`

	// DocType is the type of document (e.g., "RFC", "PRD").
	DocType string `json:"docType,omitempty"`

	// DocNumber is a unique document identifier containing a product/area
	// abbreviation and a unique number (e.g., "TF-123").
	DocNumber string `json:"docNumber,omitempty"`

	// AppCreated should be set to true if the document was created through this
	// application, and false if created directly in Google Docs and indexed
	// afterwards.
	AppCreated bool `json:"appCreated,omitempty"`

	// ReviewedBy is a slice of email address strings for users that have reviewed
	// the document.
	ReviewedBy []string `json:"reviewedBy,omitempty"`

	// Reviewers is a slice of email address strings for users whose approvals
	// are requested for the document.
	Reviewers []string `json:"reviewers,omitempty"`

	// ChangesRequestedBy is a slice of email address strings for users that have
	// requested changes for the document.
	ChangesRequestedBy []string `json:"changesRequestedBy,omitempty"`

	// Contributors is a slice of email address strings for users who have
	// contributed to the document.
	Contributors []string `json:"contributors,omitempty"`

	// Content is the plaintext content of the document.
	Content string `json:"content,omitempty"`

	// Created is the UTC time of document creation, in a RFC 3339 string format.
	Created string `json:"created,omitempty"`

	// CreatedTime is the time of document creation, in Unix time.
	CreatedTime int64 `json:"createdTime,omitempty"`

	// CustomEditableFields are all document-type-specific fields that are
	// editable.
	CustomEditableFields map[string]CustomDocTypeField `json:"customEditableFields,omitempty"`

	// FileRevisions is a map of file revision IDs to custom names.
	FileRevisions map[string]string `json:"fileRevisions,omitempty"`

	// TODO: LinkedDocs is not used yet.
	LinkedDocs []string `json:"linkedDocs,omitempty"`

	// Locked is true if the document is locked for editing.
	Locked bool `json:"locked,omitempty"`

	// MetaTags contains metadata tags that can be used for filtering in Algolia.
	MetaTags []string `json:"_tags,omitempty"`

	// Created is the time that the document was last modified, in Unix time.
	ModifiedTime int64 `json:"modifiedTime,omitempty"`

	// Owners is a slice of email address strings for document owners. Hermes
	// generally only uses the first element as the document owner, but this is a
	// slice for historical reasons as some HashiCorp documents have had multiple
	// owners in the past.
	Owners []string `json:"owners,omitempty"`

	// OwnerPhotos is a slice of URL strings for the profile photos of the
	// document owners (in the same order as the Owners field).
	OwnerPhotos []string `json:"ownerPhotos,omitempty"`

	// Product is the product or area that the document relates to.
	Product string `json:"product,omitempty"`

	// Team is the team/pods that the document relates to.
	Team string `json:"team,omitempty"`

	// Summary is a summary of the document.
	Summary string `json:"summary,omitempty"`

	// Status is the status of the document (e.g., "Draft", "In-Review", "Reviewed",
	// "Obsolete").
	Status string `json:"status,omitempty"`

	// Tags is a slice of tags to help users discover the document based on their
	// interests.
	Tags []string `json:"tags,omitempty"`

	// ThumbnailLink is a URL string for the document thumbnail image.
	ThumbnailLink string `json:"thumbnailLink,omitempty"`
}

func (d *BaseDoc) DeleteFileRevision(revisionID string) {
	delete(d.FileRevisions, revisionID)
}

func (d BaseDoc) GetReviewedBy() []string {
	return d.ReviewedBy
}

func (d BaseDoc) GetReviewers() []string {
	return d.Reviewers
}

func (d BaseDoc) GetChangesRequestedBy() []string {
	return d.ChangesRequestedBy
}

func (d BaseDoc) GetContributors() []string {
	return d.Contributors
}

func (d BaseDoc) GetCreatedTime() int64 {
	return d.CreatedTime
}

func (d BaseDoc) GetDocNumber() string {
	return d.DocNumber
}

func (d BaseDoc) GetDocType() string {
	return d.DocType
}

func (d BaseDoc) GetMetaTags() []string {
	return d.MetaTags
}

func (d BaseDoc) GetObjectID() string {
	return d.ObjectID
}

func (d BaseDoc) GetOwners() []string {
	return d.Owners
}

func (d BaseDoc) GetModifiedTime() int64 {
	return d.ModifiedTime
}

func (d BaseDoc) GetProduct() string {
	return d.Product
}

func (d BaseDoc) GetTeam() string {
	return d.Team
}

func (d BaseDoc) GetStatus() string {
	return d.Status
}

func (d BaseDoc) GetSummary() string {
	return d.Summary
}

func (d BaseDoc) GetTitle() string {
	return d.Title
}

func (d *BaseDoc) SetReviewedBy(s []string) {
	d.ReviewedBy = s
}

func (d *BaseDoc) SetChangesRequestedBy(s []string) {
	d.ChangesRequestedBy = s
}

func (d *BaseDoc) SetContent(s string) {
	d.Content = s
}

func (d *BaseDoc) SetDocNumber(s string) {
	d.DocNumber = s
}

func (d *BaseDoc) SetFileRevision(revisionID, revisionName string) {
	if d.FileRevisions == nil {
		d.FileRevisions = map[string]string{
			revisionID: revisionName,
		}
	} else {
		d.FileRevisions[revisionID] = revisionName
	}
}

func (d *BaseDoc) SetLocked(l bool) {
	d.Locked = l
}

func (d *BaseDoc) SetModifiedTime(i int64) {
	d.ModifiedTime = i
}

func (d *BaseDoc) SetStatus(s string) {
	d.Status = s
}
