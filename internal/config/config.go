package config

import (
	"fmt"

	"github.com/hashicorp-forge/hermes/internal/auth/oktaalb"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	gw "github.com/hashicorp-forge/hermes/pkg/storage/adapters/google"
	"github.com/hashicorp/hcl/v2/hclsimple"
)

// Config contains the Hermes configuration.
type Config struct {
	// Algolia configures Hermes to work with Algolia.
	Algolia *algolia.Config `hcl:"algolia,block"`

	// BaseURL is the base URL used for building links.
	BaseURL string `hcl:"base_url,optional"`

	// Datadog contains the configuration for Datadog.
	Datadog *Datadog `hcl:"datadog,block"`

	// DocumentTypes contain available document types.
	DocumentTypes *DocumentTypes `hcl:"document_types,block"`

	// Email configures Hermes to send email notifications.
	Email *Email `hcl:"email,block"`

	// FeatureFlags contain available feature flags.
	FeatureFlags *FeatureFlags `hcl:"feature_flags,block"`

	// GoogleAnalyticsTagID is the tag ID for Google Analytics
	GoogleAnalyticsTagID string `hcl:"google_analytics_tag_id,optional"`

	// GoogleWorkspace configures Hermes to work with Google Workspace.
	GoogleWorkspace *GoogleWorkspace `hcl:"google_workspace,block"`

	// Indexer contains the configuration for the Hermes indexer.
	Indexer *Indexer `hcl:"indexer,block"`

	// Jira is the configuration for Hermes to work with Jira.
	Jira *Jira `hcl:"jira,block"`

	// LogFormat configures the logging format. Supported values are "standard" or
	// "json".
	LogFormat string `hcl:"log_format,optional"`

	// Okta configures Hermes to work with Okta.
	Okta *oktaalb.Config `hcl:"okta,block"`

	// Products contain available products.
	Products *Products `hcl:"products,block"`

	// Postgres configures PostgreSQL as the app database.
	Postgres *Postgres `hcl:"postgres,block"`

	// Server contains the configuration for the Hermes server.
	Server *Server `hcl:"server,block"`

	// ShortenerBaseURL is the base URL for building short links.
	ShortenerBaseURL string `hcl:"shortener_base_url,optional"`

	// SupportLinkURL is the URL for the support documentation.
	SupportLinkURL string `hcl:"support_link_url,optional"`
}

// Datadog configures Hermes to send metrics to Datadog.
type Datadog struct {
	// Enabled enables sending metrics to Datadog.
	Enabled bool `hcl:"enabled,optional"`

	// Env overrides the Datadog environment.
	Env string `hcl:"env,optional"`

	// Service overrides the Datadog service name.
	Service string `hcl:"service,optional"`

	// ServiceVersion overrides the Datadog service version.
	ServiceVersion string `hcl:"service_version,optional"`
}

// DocumentTypes contain available document types.
type DocumentTypes struct {
	// DocumentType defines a document type.
	DocumentType []*DocumentType `hcl:"document_type,block"`
}

// DocumentType is a document type (e.g., "RFC", "PRD").
type DocumentType struct {
	// Name is the name of the document type, which is generally an abbreviation.
	// Example: "RFC"
	Name string `hcl:"name,label" json:"name"`

	// LongName is the longer name for the document type.
	// Example: "Request for Comments"
	LongName string `hcl:"long_name,optional" json:"longName"`

	// Description is the description of the document type.
	// Example: "Create a Request for Comments document to present a proposal to
	//   colleagues for their review and feedback."
	Description string `hcl:"description,optional" json:"description"`

	// FlightIcon is the name of the Helios flight icon.
	// From: https://helios.hashicorp.design/icons/library
	FlightIcon string `hcl:"flight_icon,optional" json:"flightIcon"`

	// Template is the Google file ID for the document template used for this
	// document type.
	Template string `hcl:"template"`

	// MoreInfoLink defines a link to more info for the document type.
	// Example: "When should I create an RFC?"
	MoreInfoLink *DocumentTypeLink `hcl:"more_info_link,block" json:"moreInfoLink"`

	// Checks are document type checks, which require acknowledging a check box
	// in order to publish a document.
	Checks []*DocumentTypeCheck `hcl:"check,block" json:"checks"`

	// CustomFields are custom fields specific to the document type.
	CustomFields []*DocumentTypeCustomField `hcl:"custom_field,block" json:"customFields"`
}

// DocumentTypeCheck is a document type check, which require acknowledging a
// check box in order to publish a document.
type DocumentTypeCheck struct {
	// Label is the document type check label.
	Label string `hcl:"label" json:"label"`

	// HelperText contains more details for the document type check.
	HelperText string `hcl:"helper_text,optional" json:"helperText"`

	// Links contain document type check links.
	Links []*DocumentTypeLink `hcl:"link,block" json:"links"`
}

type DocumentTypeCustomField struct {
	// Name is the name of the custom field. This is used as the custom field
	// identifier.
	Name string `hcl:"name" json:"name"`

	// ReadOnly is true if the custom field can only be read.
	ReadOnly bool `hcl:"read_only,optional" json:"readOnly"`

	// Type is the type of custom field. Valid values are "people", "person", and
	// "string".
	Type string `hcl:"type" json:"type"`
}

// DocumentTypeLink is a document type link.
type DocumentTypeLink struct {
	// Text is the displayed text for a document type link.
	Text string `hcl:"text" json:"text"`

	// URL is the URL that the document type link links to.
	URL string `hcl:"url" json:"url"`
}

// Email configures Hermes to send email notifications.
type Email struct {
	// Enabled enables sending email notifications.
	Enabled bool `hcl:"enabled,optional"`

	// FromAddress is the email address to send emails from.
	FromAddress string `hcl:"from_address,optional"`
}

// FeatureFlags contain available feature flags.
type FeatureFlags struct {
	// FeatureFlag defines a feature flag in Hermes.
	FeatureFlag []*FeatureFlag `hcl:"flag,block"`
}

type FeatureFlag struct {
	// Name is the name of the feature flag
	Name string `hcl:"name,label"`
	// Enabled enables the feature flag.
	// Since the default value of uninitialized bool is false,
	// *bool is used to check whether Enabled is set or not.
	Enabled *bool `hcl:"enabled,optional"`
	// Percentage defines the percentage of users that will have
	// the feature flag enabled.
	Percentage int `hcl:"percentage,optional"`
}

// Indexer contains the configuration for the Hermes indexer.
type Indexer struct {
	// MaxParallelDocs is the maximum number of documents that will be
	// simultaneously indexed.
	MaxParallelDocs int `hcl:"max_parallel_docs,optional"`

	// UpdateDocHeaders enables the indexer to automatically update document
	// headers for Hermes-managed documents with Hermes document metadata.
	UpdateDocHeaders bool `hcl:"update_doc_headers,optional"`

	// UpdateDraftHeaders enables the indexer to automatically update document
	// headers for draft documents with Hermes document metadata.
	UpdateDraftHeaders bool `hcl:"update_draft_headers,optional"`

	// UseDatabaseForDocumentData will use the database instead of Algolia as the
	// source of truth for document data, if true.
	UseDatabaseForDocumentData bool `hcl:"use_database_for_document_data,optional"`
}

// GoogleWorkspace is the configuration to work with Google Workspace.
type GoogleWorkspace struct {
	// Auth contains the authentication configuration for Google Workspace.
	Auth *gw.Config `hcl:"auth,block"`

	// CreateDocShortcuts enables creating a shortcut in the appropriate (per doc
	// type and product) Shared Drive folder when a document is published.
	CreateDocShortcuts bool `hcl:"create_doc_shortcuts,optional"`

	// DocsFolder is the folder that contains all published documents.
	DocsFolder string `hcl:"docs_folder"`

	// Domain is the Google Workspace domain (e.g., "hashicorp.com").
	Domain string `hcl:"domain"`

	// DraftsFolder is the folder that contains all document drafts.
	DraftsFolder string `hcl:"drafts_folder"`

	// GoogleWorkspaceGroupApprovals is the configuration for using Google Groups as
	// document approvers.
	GroupApprovals *GoogleWorkspaceGroupApprovals `hcl:"group_approvals,block"`

	// OAuth2 is the configuration to use OAuth 2.0 to access Google Workspace
	// APIs.
	OAuth2 *GoogleWorkspaceOAuth2 `hcl:"oauth2,block"`

	// ShortcutsFolder is the folder that contains document shortcuts organized
	// into doc type and product subfolders.
	ShortcutsFolder string `hcl:"shortcuts_folder"`

	// TemporaryDraftsFolder is a folder that will brieflly contain document
	// drafts before they are moved to the DraftsFolder. This is used when
	// create_docs_as_user is true in the auth block, so document notification
	// settings will be the same as when a user creates their own document.
	TemporaryDraftsFolder string `hcl:"temporary_drafts_folder,optional"`

	// UserNotFoundEmail is the configuration to send an email when a user is not
	// found in Google Workspace.
	UserNotFoundEmail *GoogleWorkspaceUserNotFoundEmail `hcl:"user_not_found_email,block"`
}

// GoogleWorkspaceGroupApprovals is the configuration for using Google Groups as
// document approvers.
type GoogleWorkspaceGroupApprovals struct {
	// Enabled enables using Google Groups as document approvers.
	Enabled bool `hcl:"enabled,optional"`

	// SearchPrefix is the prefix to use when searching for Google Groups.
	SearchPrefix string `hcl:"search_prefix,optional"`
}

// GoogleWorkspaceOAuth2 is the configuration to use OAuth 2.0 to access Google
// Workspace APIs.
type GoogleWorkspaceOAuth2 struct {
	// ClientID is the client ID obtained from the Google API Console Credentials
	// page.
	ClientID string `hcl:"client_id,optional"`

	// HD is the allowed domain associated with the authenticating user.
	HD string `hcl:"hd,optional"`

	// RedirectURI is an authorized redirect URI for the given client_id as
	// specified in the Google API Console Credentials page.
	RedirectURI string `hcl:"redirect_uri,optional"`
}

// GoogleWorkspaceUserNotFoundEmail is the configuration to send an email when a
// user is not found in Google Workspace.
type GoogleWorkspaceUserNotFoundEmail struct {
	// Body is the body of the email.
	Body string `hcl:"body,optional"`

	// Enabled enables sending an email when a user is not found in Google
	// Workspace.
	Enabled bool `hcl:"enabled,optional"`

	// Subject is the subject of the email.
	Subject string `hcl:"subject,optional"`
}

// Jira is the configuration for Hermes to work with Jira.
type Jira struct {
	// APIToken is the API token for authenticating to Jira.
	APIToken string `hcl:"api_token,optional"`

	// Enabled enables integration with Jira.
	Enabled bool `hcl:"enabled,optional"`

	// URL is the URL of the Jira instance (ex: https://your-domain.atlassian.net).
	URL string `hcl:"url,optional"`

	// User is the user for authenticating to Jira.
	User string `hcl:"user,optional"`
}

// Postgres configures PostgreSQL as the app database.
type Postgres struct {
	// Host is the database name.
	DBName string `hcl:"dbname"`

	// Host is the name of host to connect to.
	Host string `hcl:"host"`

	// Password is the password to be used.
	Password string `hcl:"password"`

	// Port is the port number to connect to at the server host.
	Port int `hcl:"port"`

	// Host is the PostgreSQL user name to connect as.
	User string `hcl:"user"`
}

// Products contain available products.
type Products struct {
	// Product defines a product.
	Product []*Product `hcl:"product,block"`
}

// Product is a product/area.
type Product struct {
	// Name is the name of the product.
	Name string `hcl:"name,label" json:"name"`

	// Abbreviation is the abbreviation (usually a few uppercase letters).
	Abbreviation string `hcl:"abbreviation" json:"abbreviation"`
}

// Server contains the configuration for the Hermes server.
type Server struct {
	// Addr is the address to bind to for listening.
	Addr string `hcl:"addr,optional"`
}

// NewConfig parses an HCL configuration file and returns the Hermes config.
func NewConfig(filename string) (*Config, error) {
	c := &Config{
		Algolia:         &algolia.Config{},
		Email:           &Email{},
		FeatureFlags:    &FeatureFlags{},
		GoogleWorkspace: &GoogleWorkspace{},
		Indexer:         &Indexer{},
		Okta:            &oktaalb.Config{},
		Server:          &Server{},
	}
	err := hclsimple.DecodeFile(filename, nil, c)
	if err != nil {
		return nil, fmt.Errorf("failed to load configuration: %w", err)
	}

	return c, nil
}
