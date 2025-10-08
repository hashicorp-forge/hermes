//==============================================================================
// HERMES CONFIGURATION FILE
//==============================================================================
// This configuration file defines all settings for the Hermes document
// management system. It supports multiple authentication providers (Google,
// Okta, Dex), workspace providers (Google Workspace, Local), and search
// providers (Algolia, Meilisearch).
//
// For local development with Dex + Local Workspace + Meilisearch, see the
// providers section below.
//==============================================================================

//------------------------------------------------------------------------------
// BASE CONFIGURATION
//------------------------------------------------------------------------------

// base_url is the base URL used for building links. This should be the public
// URL of the application. Used for constructing document links, OAuth redirects,
// and email notifications.
base_url = "http://localhost:8000"

// log_format configures the logging format. Supported values:
//   - "standard": Human-readable format (default)
//   - "json": Structured JSON format (recommended for production)
log_format = "standard"

// shortener_base_url is the base URL for building short links (optional).
// If set, enables short URL generation for documents.
// Example: shortener_base_url = "https://go.yourcompany.com"

// support_link_url is the URL for support documentation (optional).
// Displayed in the UI for users to get help.
// Example: support_link_url = "https://docs.yourcompany.com/hermes"

// google_analytics_tag_id is the tag ID for Google Analytics (optional).
// If set, enables Google Analytics tracking in the frontend.
// Example: google_analytics_tag_id = "G-XXXXXXXXXX"

//------------------------------------------------------------------------------
// SEARCH PROVIDERS
//------------------------------------------------------------------------------
// Hermes supports two search backends: Algolia (cloud) and Meilisearch (self-hosted).
// Configure the provider you want to use in the "providers" section below.

// algolia configures Hermes to work with Algolia (cloud search service).
// Only used when providers.search = "algolia"
algolia {
  // application_id: Your Algolia application ID from dashboard
  application_id = ""
  
  // docs_index_name: Index for published documents
  docs_index_name = "docs"
  
  // drafts_index_name: Index for draft documents
  drafts_index_name = "drafts"
  
  // internal_index_name: Index for internal Hermes metadata
  internal_index_name = "internal"
  
  // links_index_name: Index for document links/redirects
  links_index_name = "links"
  
  // missing_fields_index_name: Index for tracking documents with missing metadata
  missing_fields_index_name = "missing_fields"
  
  // projects_index_name: Index for projects (if feature enabled)
  projects_index_name = "projects"
  
  // search_api_key: Public search-only API key (read-only)
  search_api_key = ""
  
  // write_api_key: Admin API key for indexing operations (keep secret)
  write_api_key = ""
}

// meilisearch configures Hermes to work with Meilisearch (self-hosted search).
// Only used when providers.search = "meilisearch"
// Start Meilisearch: docker compose up -d meilisearch
meilisearch {
  // host: Meilisearch server URL
  host = "http://localhost:7700"
  
  // api_key: Master API key (set in docker-compose.yml)
  api_key = "masterKey123"
  
  // docs_index_name: Index for published documents
  docs_index_name = "docs"
  
  // drafts_index_name: Index for draft documents
  drafts_index_name = "drafts"
  
  // links_index_name: Index for document links/redirects
  links_index_name = "links"
  
  // projects_index_name: Index for projects (if feature enabled)
  projects_index_name = "projects"
}

//------------------------------------------------------------------------------
// OBSERVABILITY
//------------------------------------------------------------------------------

// datadog configures Hermes to send metrics to Datadog.
datadog {
  // enabled: Set to true to enable Datadog metrics
  enabled = false
  
  // env: Environment name (e.g., "local", "staging", "production")
  env = "local"
  
  // service: Override service name (default: "hermes")
  // service = "hermes"
  
  // service_version: Override service version (default: from build)
  // service_version = "1.0.0"
}

//------------------------------------------------------------------------------
// DOCUMENT TYPES
//------------------------------------------------------------------------------
// Define the types of documents your organization uses. Each document type
// can have custom fields, templates, and validation checks.
//
// Template Fields:
//   - template: Google Docs file ID (for Google Workspace provider)
//   - markdown_template: Path to markdown frontmatter template (for Local provider)
//
// At least one template should be provided depending on your workspace provider.

document_types {
  // RFC (Request for Comments) - Technical design proposals
  document_type "RFC" {
    // long_name: Full name displayed in UI (required)
    long_name = "Request for Comments"
    
    // description: Explanation shown when creating new document (required)
    description = "Create a Request for Comments document to present a proposal to colleagues for their review and feedback."
    
    // flight_icon: Icon name from Helios Design System (optional)
    // See: https://helios.hashicorp.design/icons/library
    flight_icon = "discussion-circle"
    
    // template: Google Docs file ID to use as template (Google Workspace only)
    // Get this from the Google Docs URL: https://docs.google.com/document/d/FILE_ID/edit
    template = "1Oz_7FhaWxdFUDEzKCC5Cy58t57C4znmC_Qr80BORy1U"

    // markdown_template: Path to markdown frontmatter template (Local Workspace only)
    // Example: "templates/rfc.md"
    // markdown_template = "templates/rfc.md"

    // more_info_link: Optional link to documentation about this doc type
    more_info_link {
      text = "More info on the RFC template"
      url  = "https://works.hashicorp.com/articles/rfc-template"
    }

    // custom_field: Metadata fields specific to this document type (optional)
    // Type options: "string", "people" (multiple emails), "person" (single email)
    custom_field {
      name = "Current Version"
      type = "string"
      read_only = false  // Optional: make field read-only (default: false)
    }
    custom_field {
      name = "PRD"
      type = "string"
      read_only = false
    }
    custom_field {
      name = "Stakeholders"
      type = "people"  // Multiple email addresses
      read_only = false
    }
    custom_field {
      name = "Target Version"
      type = "string"
      read_only = false
    }
    
    // check: Pre-publish validation checkboxes (optional)
    // Users must check these boxes before publishing the document
    check {
      label = "I have updated the status to 'In Review'"
      helper_text = "Documents must be in review status before publishing"
      link {
        text = "Status guide"
        url = "https://works.hashicorp.com/articles/rfc-status"
      }
    }
  }

  // PRD (Product Requirements Document) - Product specifications
  document_type "PRD" {
    long_name   = "Product Requirements"
    description = "Create a Product Requirements Document to summarize a problem statement and outline a phased approach to addressing the problem."
    flight_icon = "target"
    
    // Google Docs template for Google Workspace
    template = "1oS4q6IPDr3aMSTTk9UDdOnEcFwVWW9kT8ePCNqcg1P4"
    
    // Markdown template for Local Workspace
    // markdown_template = "templates/prd.md"

    more_info_link {
      text = "More info on the PRD template"
      url  = "https://works.hashicorp.com/articles/prd-template"
    }

    custom_field {
      name = "RFC"
      type = "string"
      read_only = false
    }
    custom_field {
      name = "Stakeholders"
      type = "people"
      read_only = false
    }
    custom_field {
      name = "Target Release"
      type = "string"
      read_only = false
    }
  }

  // ADR (Architectural Decision Record) - Document architectural decisions
  document_type "ADR" {
    long_name   = "Architectural Decision Record"
    description = "Document an architectural decision including context, alternatives considered, and rationale for the chosen solution."
    flight_icon = "building"
    
    // Google Docs template for Google Workspace
    // template = "YOUR_GOOGLE_DOCS_ADR_TEMPLATE_ID"
    
    // Markdown template for Local Workspace
    // markdown_template = "templates/adr.md"

    more_info_link {
      text = "Learn about ADRs"
      url  = "https://adr.github.io/"
    }

    custom_field {
      name = "Status"
      type = "string"
      read_only = false
    }
    custom_field {
      name = "Decision Owners"
      type = "people"
      read_only = false
    }
    custom_field {
      name = "Related RFCs"
      type = "string"
      read_only = false
    }
    custom_field {
      name = "Systems Impacted"
      type = "string"
      read_only = false
    }

    check {
      label = "I have documented all alternatives considered"
      helper_text = "ADRs should include at least 2-3 alternative approaches"
    }
    check {
      label = "I have clearly stated the consequences of this decision"
      helper_text = "Include both positive and negative consequences"
    }
  }

  // FRD (Functional Requirements Document) - Detailed technical specifications
  document_type "FRD" {
    long_name = "Functional Requirements Document"
    description = "Create detailed functional specifications for engineering implementation, including technical requirements and acceptance criteria."
    flight_icon = "docs-link"
    
    // Google Docs template for Google Workspace
    // template = "YOUR_GOOGLE_DOCS_FRD_TEMPLATE_ID"
    
    // Markdown template for Local Workspace
    // markdown_template = "templates/frd.md"

    more_info_link {
      text = "FRD best practices"
      url  = "https://works.hashicorp.com/articles/frd-template"
    }

    custom_field {
      name = "Related PRD"
      type = "string"
      read_only = false
    }
    custom_field {
      name = "Engineers"
      type = "people"
      read_only = false
    }
    custom_field {
      name = "Epic Link"
      type = "string"
      read_only = false
    }
  }

  // Memo - Short-form communication and announcements
  document_type "Memo" {
    long_name = "Memo"
    description = "Create a Memo document to share an idea, update, or brief note with colleagues."
    flight_icon = "radio"
    
    // Google Docs template for Google Workspace
    // template = "YOUR_GOOGLE_DOCS_MEMO_TEMPLATE_ID"
    
    // Markdown template for Local Workspace
    // markdown_template = "templates/memo.md"

    custom_field {
      name = "Distribution List"
      type = "people"
      read_only = false
    }
    custom_field {
      name = "Category"
      type = "string"
      read_only = false
    }
  }
}

//------------------------------------------------------------------------------
// EMAIL NOTIFICATIONS
//------------------------------------------------------------------------------

// email configures Hermes to send email notifications.
// For Google Workspace: Uses Gmail API
// For Local Workspace: Uses SMTP (configure in local_workspace.smtp section)
email {
  // enabled: Set to true to enable email notifications
  // Email events: document approvals, reviews, comments, mentions
  enabled = true

  // from_address: Sender email address for notifications
  // For Google Workspace: Must be a valid email in your domain
  // For Local Workspace: Can be any address (SMTP dependent)
  from_address = "hermes@yourorganization.com"
}

//------------------------------------------------------------------------------
// FEATURE FLAGS
//------------------------------------------------------------------------------
// Control experimental or phased features. Each flag can be:
//   - Fully enabled/disabled (enabled = true/false)
//   - Percentage-based rollout (percentage = 0-100)

feature_flags {
  // projects: Enable the projects feature in the UI
  // Allows grouping documents into projects for better organization
  flag "projects" {
    enabled = false
  }
}

//------------------------------------------------------------------------------
// WORKSPACE PROVIDERS - GOOGLE WORKSPACE
//------------------------------------------------------------------------------
// Only used when providers.workspace = "google"
// Requires Google Workspace (formerly G Suite) account with:
//   - Google Drive API enabled
//   - Gmail API enabled (for email)
//   - OAuth 2.0 credentials configured

// google_workspace configures Hermes to work with Google Workspace.
google_workspace {
  // domain: Your Google Workspace domain (e.g., "hashicorp.com")
  domain = "your-domain-dot-com"

  // docs_folder: Google Drive folder ID for published documents (flat structure)
  // Get folder ID from Drive URL: https://drive.google.com/drive/folders/FOLDER_ID
  docs_folder = "my-docs-folder-id"

  // drafts_folder: Google Drive folder ID for draft documents
  drafts_folder = "my-drafts-folder-id"

  // shortcuts_folder: Google Drive folder ID for organized shortcuts
  // Used when create_doc_shortcuts = true
  // Creates hierarchy: {shortcuts_folder}/{doc_type}/{product}/{document}
  shortcuts_folder = "my-shortcuts-folder-id"

  // create_doc_shortcuts: Create organized shortcuts in shortcuts_folder when publishing
  create_doc_shortcuts = true

  // temporary_drafts_folder: Temporary location for new drafts (optional)
  // Used with auth.create_docs_as_user = true to ensure proper notification settings
  // temporary_drafts_folder = "my-temporary-drafts-folder-id"

  // group_approvals: Use Google Groups as document approvers (optional)
  group_approvals {
    // enabled: Allow selecting Google Groups for document approvals
    enabled = false

    // search_prefix: Filter groups by prefix when searching (e.g., "team-")
    // search_prefix = "team-"
  }

  // user_not_found_email: Send email when user lookup fails (optional)
  // user_not_found_email {
  //   enabled = true
  //   subject = "Action Required: Update Your Hermes Profile"
  //   body = "Your account needs to be configured in Hermes..."
  // }

  //-------------------------------------------
  // Google Workspace Authentication - Service Account
  //-------------------------------------------
  // For production: Use a Google Cloud service account with domain-wide delegation
  // Allows Hermes to act as users when creating/modifying documents
  
  // auth {
  //   // client_email: Service account email from Google Cloud Console
  //   client_email = "hermes@your-project.iam.gserviceaccount.com"
  //   
  //   // private_key: Service account private key (keep secure!)
  //   // Multiline string - paste the entire key including BEGIN/END lines
  //   private_key = <<EOT
  // -----BEGIN PRIVATE KEY-----
  // MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
  // -----END PRIVATE KEY-----
  // EOT
  //   
  //   // subject: Email address to impersonate (usually an admin)
  //   subject = "admin@your-domain.com"
  //   
  //   // create_docs_as_user: Create documents as the requesting user (recommended)
  //   // Ensures notification settings match user preferences
  //   create_docs_as_user = true
  //   
  //   // token_url: Google OAuth token endpoint (usually leave as default)
  //   token_url = "https://oauth2.googleapis.com/token"
  // }

  //-------------------------------------------
  // Google Workspace Authentication - OAuth 2.0
  //-------------------------------------------
  // For user authentication (required for login)
  
  oauth2 {
    // client_id: OAuth 2.0 client ID from Google Cloud Console
    // Configure at: https://console.cloud.google.com/apis/credentials
    client_id = ""
    
    // hd: Hosted domain - restrict authentication to your domain
    hd = "hashicorp.com"
    
    // redirect_uri: OAuth callback URL (must match Google Console configuration)
    // For local development: "http://localhost:8000/torii/redirect.html"
    // For production: "https://hermes.yourcompany.com/torii/redirect.html"
    redirect_uri = "http://localhost:8000/torii/redirect.html"
  }
}

//------------------------------------------------------------------------------
// INDEXER
//------------------------------------------------------------------------------
// The indexer syncs document metadata between workspace (Google/Local) and
// search backend (Algolia/Meilisearch), and optionally updates document headers.

indexer {
  // max_parallel_docs: Maximum concurrent document indexing operations
  // Higher values = faster indexing but more API usage
  // Recommended: 5-10 for Google Workspace, 20+ for Local
  max_parallel_docs = 5

  // update_doc_headers: Auto-update headers in published documents
  // Updates document headers with current metadata (title, status, approvers, etc.)
  // For Google Workspace: Uses Google Docs API
  // For Local Workspace: Updates markdown frontmatter
  update_doc_headers = true

  // update_draft_headers: Auto-update headers in draft documents
  // Same as update_doc_headers but for drafts
  update_draft_headers = true

  // use_database_for_document_data: Use PostgreSQL as source of truth
  // If true: Database is authoritative, search is secondary index
  // If false: Search backend (Algolia/Meilisearch) is authoritative (legacy)
  // Recommended: true (more reliable, supports all features)
  use_database_for_document_data = false
}

//------------------------------------------------------------------------------
// JIRA INTEGRATION (Optional)
//------------------------------------------------------------------------------
// Connect Hermes documents to Jira issues for project management integration.

jira {
  // enabled: Set to true to enable Jira integration
  enabled = false

  // url: Your Jira instance URL (Cloud or Data Center)
  // Examples: 
  //   - Cloud: "https://your-domain.atlassian.net"
  //   - Data Center: "https://jira.yourcompany.com"
  url = ""

  // user: Jira username/email for API authentication
  // For Cloud: your email address
  // For Data Center: your username
  user = ""

  // api_token: Jira API token (Cloud) or password (Data Center)
  // Generate token at: https://id.atlassian.com/manage-profile/security/api-tokens
  api_token = ""
}

//------------------------------------------------------------------------------
// AUTHENTICATION PROVIDERS
//------------------------------------------------------------------------------
// Hermes supports three authentication providers:
//   1. Google OAuth (via google_workspace.oauth2)
//   2. Okta OIDC (via AWS ALB)
//   3. Dex OIDC (open-source, great for local dev)
//
// Only ONE provider should be enabled at a time.

//-------------------------------------------
// Dex OIDC (Recommended for Local Development)
//-------------------------------------------
// Dex is an open-source OIDC provider that federates other identity providers.
// Perfect for local testing without requiring Google/Okta accounts.
// Start Dex: docker compose up -d dex

dex {
  // disabled: Set to false to enable Dex authentication
  disabled = false  // Enabled for local testing

  // issuer_url: Dex server URL (must match dex-config.yaml)
  issuer_url = "http://localhost:5556/dex"  // Dex runs on port 5556

  // client_id: OAuth client ID (must match dex-config.yaml staticClients)
  client_id = "hermes-integration"

  // client_secret: OAuth client secret (must match dex-config.yaml)
  // This is a base64-encoded example secret from dex-config.yaml
  client_secret = "ZXhhbXBsZS1hcHAtc2VjcmV0"

  // redirect_url: OAuth callback URL (must match dex-config.yaml and base_url)
  redirect_url = "http://localhost:8000/auth/callback"
}

//-------------------------------------------
// Okta OIDC (For AWS ALB + Okta Deployments)
//-------------------------------------------
// For production deployments using AWS Application Load Balancer with Okta.
// ALB handles OIDC flow and passes user info in JWT header.

okta {
  // disabled: Set to false to enable Okta authentication
  disabled = true

  // auth_server_url: Okta authorization server URL
  // Example: "https://your-domain.okta.com/oauth2/default"
  // Or custom auth server: "https://your-domain.okta.com/oauth2/aus1a2b3c4d5e6f7g8h"
  auth_server_url = ""

  // client_id: Okta application client ID
  // From Okta Admin Console: Applications > Your App > General
  client_id = ""

  // aws_region: AWS region of your Application Load Balancer
  // Example: "us-west-2"
  aws_region = ""

  // jwt_signer: Public key URL for verifying ALB JWT signatures
  // Example: "https://public-keys.auth.elb.us-west-2.amazonaws.com/..."
  // Get from ALB authentication settings
  jwt_signer = ""
}

//------------------------------------------------------------------------------
// DATABASE
//------------------------------------------------------------------------------
// PostgreSQL is the primary database for Hermes (stores documents, users, etc.)
// Start PostgreSQL: make docker/postgres/start
// Stop PostgreSQL: make docker/postgres/stop

postgres {
  // dbname: Database name
  dbname = "hermes"

  // host: PostgreSQL server hostname
  // For Docker: "localhost" (mapped to host)
  // For production: actual hostname or IP
  host = "localhost"

  // port: PostgreSQL server port
  port = 5432

  // user: Database user
  user = "postgres"

  // password: Database password (keep secure in production!)
  password = "postgres"
}

//------------------------------------------------------------------------------
// PRODUCTS
//------------------------------------------------------------------------------
// Define your organization's products/areas/teams. Documents are tagged with
// a product for organization and filtering.
// Each product requires:
//   - name: Full product name (displayed in UI)
//   - abbreviation: Short code (2-4 uppercase letters, used in document IDs)
//
// Document IDs are generated as: {abbreviation}-{number}
// Example: "ENG-123" for Engineering product

products {
  product "Engineering" {
    abbreviation = "ENG"
  }
  
  product "Labs" {
    abbreviation = "LAB"
  }
  
  product "Platform" {
    abbreviation = "PLT"
  }
  
  product "Security" {
    abbreviation = "SEC"
  }
  
  product "Infrastructure" {
    abbreviation = "INF"
  }

  product "Product Management" {
    abbreviation = "PM"
  }

  product "Design" {
    abbreviation = "DES"
  }

  // Add more products as needed:
  // product "MyProduct" {
  //   abbreviation = "MY"
  // }
  //
  // product "Data Engineering" {
  //   abbreviation = "DE"
  // }
  //
  // product "DevOps" {
  //   abbreviation = "DO"
  // }
}

//------------------------------------------------------------------------------
// WORKSPACE PROVIDERS - LOCAL (For Testing/Development)
//------------------------------------------------------------------------------
// Only used when providers.workspace = "local"
// Stores documents as files on local filesystem instead of Google Drive.
// Great for:
//   - Local development without Google Workspace
//   - Integration testing
//   - CI/CD pipelines

local_workspace {
  // base_path: Root directory for all workspace data
  base_path = "/tmp/hermes_workspace"

  // docs_path: Directory containing published documents (as markdown/JSON)
  docs_path = "/tmp/hermes_workspace/docs"

  // drafts_path: Directory containing draft documents
  drafts_path = "/tmp/hermes_workspace/drafts"

  // folders_path: Directory containing folder metadata (JSON files)
  folders_path = "/tmp/hermes_workspace/folders"

  // users_path: Directory containing user profiles (JSON files)
  users_path = "/tmp/hermes_workspace/users"

  // tokens_path: Directory containing authentication tokens
  tokens_path = "/tmp/hermes_workspace/tokens"

  // domain: Local domain name (used for email addresses)
  // User emails will be: username@domain
  domain = "hermes.local"

  // smtp: Optional SMTP configuration for email notifications
  smtp {
    // enabled: Set to true to send real emails via SMTP
    // If false, emails are logged but not sent
    enabled = false

    // SMTP server settings (only needed if enabled = true)
    // host = "smtp.gmail.com"
    // port = 587
    // username = "your-email@gmail.com"
    // password = "your-app-password"
  }
}

//------------------------------------------------------------------------------
// PROVIDER SELECTION
//------------------------------------------------------------------------------
// Choose which backend implementations to use.
// This is the key configuration that determines runtime behavior.

providers {
  // workspace: Where documents and user data are stored
  //   - "google": Google Workspace (Drive + Gmail)
  //   - "local": Local filesystem (for development/testing)
  workspace = "local"

  // search: Which search backend to use
  //   - "algolia": Algolia cloud search
  //   - "meilisearch": Self-hosted Meilisearch
  search = "meilisearch"  // Using Meilisearch for local testing
}

// NOTE: The meilisearch configuration block is defined at the top of this file
// in the "SEARCH PROVIDERS" section. No need to duplicate it here.

//------------------------------------------------------------------------------
// SERVER
//------------------------------------------------------------------------------
// HTTP server configuration.

server {
  // addr: Address and port to bind to
  // Format: "host:port" or ":port" (binds to all interfaces)
  // For local dev: "127.0.0.1:8000" (localhost only)
  // For production: "0.0.0.0:8000" (all interfaces)
  addr = "127.0.0.1:8000"
}

//==============================================================================
// CONFIGURATION EXAMPLES FOR DIFFERENT ENVIRONMENTS
//==============================================================================
//
// LOCAL DEVELOPMENT WITH DEX + LOCAL WORKSPACE + MEILISEARCH (Current Config)
// - Authentication: Dex (dex.disabled = false)
// - Workspace: Local filesystem (providers.workspace = "local")
// - Search: Meilisearch (providers.search = "meilisearch")
// - Start services: docker compose up -d postgres dex meilisearch
// - Run server: ./hermes server -config=config.hcl
//
// PRODUCTION WITH GOOGLE WORKSPACE + ALGOLIA
// - Authentication: Google OAuth (via google_workspace.oauth2)
// - Workspace: Google Workspace (providers.workspace = "google")
// - Search: Algolia (providers.search = "algolia")
// - Configure: google_workspace.auth (service account)
// - Configure: google_workspace.oauth2 (user auth)
// - Configure: algolia (search credentials)
//
// PRODUCTION WITH OKTA + GOOGLE WORKSPACE + MEILISEARCH
// - Authentication: Okta (okta.disabled = false, dex.disabled = true)
// - Workspace: Google Workspace (providers.workspace = "google")
// - Search: Meilisearch (providers.search = "meilisearch")
// - Deploy: Behind AWS ALB with Okta OIDC integration
//
// TESTING WITH DEX + GOOGLE WORKSPACE + ALGOLIA
// - Authentication: Dex (dex.disabled = false)
// - Workspace: Google Workspace (providers.workspace = "google")
// - Search: Algolia (providers.search = "algolia")
// - Useful for testing Google Workspace features locally
//
//==============================================================================
