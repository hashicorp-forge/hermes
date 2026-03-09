package config

// MicrosoftGraphConfig contains the configuration for Microsoft Graph API.
type MicrosoftGraphConfig struct {
	// SiteID is the SharePoint site ID.
	SiteID string `hcl:"site_id"`

	// DriveID is the SharePoint drive ID.
	DriveID string `hcl:"drive_id"`

	// DocsFolder is the folder for published documents.
	DocsFolder string `hcl:"docs_folder"`

	// DraftsFolder is the folder for draft documents.
	DraftsFolder string `hcl:"drafts_folder"`

	// TemporaryDraftsFolder is the folder for temporary draft documents.
	TemporaryDraftsFolder string `hcl:"temporary_drafts_folder"`

	// ShortcutsFolder is the folder for shortcuts.
	ShortcutsFolder string `hcl:"shortcuts_folder"`
}
