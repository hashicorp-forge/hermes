// Hermes Testing Configuration
// This configuration is designed for the containerized testing environment
// in docker-compose with postgres, meilisearch, hermes backend, and web frontend

// Base URL for the application (external access URL - frontend dev server)
// This is where users will be redirected after OAuth authentication.
// For local development with Ember dev server: http://localhost:4201
// For containerized frontend: http://localhost:4201 (or whatever port web service uses)
base_url = "http://localhost:4201"

// Logging format
log_format = "standard"

// Algolia configuration (placeholder values for testing)
// Note: Actual search backend is Meilisearch, but Hermes config uses Algolia structure
algolia {
  application_id            = "test-app-id"
  docs_index_name           = "docs"
  drafts_index_name         = "drafts"
  internal_index_name       = "internal"
  links_index_name          = "links"
  missing_fields_index_name = "missing_fields"
  projects_index_name       = "projects"
  search_api_key            = "test-search-key"
  write_api_key             = "masterKey123"
}

// Datadog (disabled for testing)
datadog {
  enabled = false
  env     = "testing"
}

// Document types - comprehensive set matching core config.hcl patterns
// Templates reference files in testing/templates/ directory (mapped to container)
document_types {
  // RFC (Request for Comments) - Technical design proposals
  document_type "RFC" {
    long_name   = "Request for Comments"
    description = "Create a Request for Comments document to present a proposal to colleagues for their review and feedback."
    flight_icon = "discussion-circle"
    
    // For local workspace: use markdown template from testing/templates/
    template = "template-rfc"  // References a template document that will be created

    more_info_link {
      text = "More info on the RFC template"
      url  = "https://works.hashicorp.com/articles/rfc-template"
    }

    custom_field {
      name = "Current Version"
      type = "string"
      read_only = false
    }
    custom_field {
      name = "PRD"
      type = "string"
      read_only = false
    }
    custom_field {
      name = "Stakeholders"
      type = "people"
      read_only = false
    }
    custom_field {
      name = "Target Version"
      type = "string"
      read_only = false
    }
    
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
    
    template = "template-prd"

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
    
    template = "template-adr"

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
    
    template = "template-frd"

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
    
    template = "template-memo"

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

  // PATH (Golden Path) - Step-by-step workflow guides
  document_type "PATH" {
    long_name = "Golden Path"
    description = "Create a Golden Path document to provide step-by-step guidance for repeatable workflows and processes."
    flight_icon = "map"
    
    template = "template-path"

    more_info_link {
      text = "Golden Paths overview"
      url  = "https://works.hashicorp.com/articles/golden-paths"
    }

    custom_field {
      name = "Category"
      type = "string"
      read_only = false
    }
    custom_field {
      name = "Time Investment"
      type = "string"
      read_only = false
    }
    custom_field {
      name = "Steps"
      type = "number"
      read_only = false
    }
    custom_field {
      name = "Related Paths"
      type = "string"
      read_only = false
    }

    check {
      label = "I have documented all prerequisites"
      helper_text = "Include both required and helpful prerequisites"
    }
    check {
      label = "I have provided time estimates for each step"
      helper_text = "Help users plan their time effectively"
    }
    check {
      label = "I have included working examples"
      helper_text = "Real examples help users understand the path"
    }
  }
}

// Email (disabled for testing)
email {
  enabled = false
  from_address = "hermes-test@example.com"
}

// Feature flags
feature_flags {
  flag "api_v2" {
    enabled = true
  }

  flag "projects" {
    enabled = false
  }
}

// Google Workspace configuration (minimal placeholders for testing)
google_workspace {
  create_doc_shortcuts = false
  docs_folder          = "test-docs-folder-id"
  domain               = "test.local"
  drafts_folder        = "test-drafts-folder-id"
  shortcuts_folder     = "test-shortcuts-folder-id"
  
  group_approvals {
    enabled = false
  }
  
  // Use service account auth to avoid needing credentials.json
  auth {
    client_email        = "test@test-project.iam.gserviceaccount.com"
    create_docs_as_user = false
    private_key         = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC0test\n-----END PRIVATE KEY-----\n"
    subject             = "test@test.local"
    token_url           = "https://oauth2.googleapis.com/token"
  }
  
  oauth2 {
    client_id    = "test-client-id"
    hd           = "test.local"
    redirect_uri = "http://localhost:8001/torii/redirect.html"
  }
}

// Indexer configuration
indexer {
  max_parallel_docs          = 5
  update_doc_headers         = false
  update_draft_headers       = false
  use_database_for_document_data = true
}

// Jira (disabled for testing)
jira {
  enabled   = false
  api_token = ""
  url       = ""
  user      = ""
}

// Meilisearch configuration (used for testing instead of Algolia)
meilisearch {
  host              = "http://meilisearch:7700"
  api_key           = "masterKey123"
  docs_index_name   = "docs"
  drafts_index_name = "drafts"
  projects_index_name = "projects"
  links_index_name  = "links"
}

// Dex OIDC authentication (enabled for testing)  
// Note: issuer_url uses host.docker.internal:5558 so both browser AND Hermes container can access Dex
//       On macOS/Windows Docker Desktop, host.docker.internal resolves to the host machine
// Dex configuration for Docker environment
// Note: Dex runs in testing docker-compose on port 5558 (external) / 5557 (internal)
//       issuer_url must match the issuer in dex-config.yaml (http://localhost:5558/dex)
//       Uses extra_hosts to map localhost to host-gateway for container access
dex {
  disabled      = false
  issuer_url    = "http://localhost:5558/dex"
  client_id     = "hermes-testing"
  client_secret = "dGVzdGluZy1hcHAtc2VjcmV0"
  redirect_url  = "http://localhost:8001/auth/callback"
}

// Okta authentication (disabled - using Dex instead)
okta {
  disabled        = true
  auth_server_url = "https://test.okta.com"
  aws_region      = "us-east-1"
  client_id       = "test-client-id"
  jwt_signer      = "test-jwt-signer"
}

// PostgreSQL configuration (connects to postgres container)
postgres {
  dbname   = "hermes_testing"
  host     = "postgres"
  port     = 5432
  user     = "postgres"
  password = "postgres"
}

// Products - comprehensive set matching core config.hcl patterns
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
}

// Local workspace configuration (for testing without Google Workspace)
// Paths are mapped to container volumes in docker-compose.yml
// - testing/templates -> /app/workspace_data/templates (template source files)
// - hermes_workspace volume -> /app/workspace_data (runtime data)
local_workspace {
  // Base path for all workspace data (container path)
  base_path    = "/app/workspace_data"
  
  // Document storage paths (container paths)
  docs_path    = "/app/workspace_data/docs"
  drafts_path  = "/app/workspace_data/drafts"
  
  // Metadata paths (container paths)
  folders_path = "/app/workspace_data/folders"
  users_path   = "/app/workspace_data/users"
  tokens_path  = "/app/workspace_data/tokens"
  
  // Domain for local workspace users
  domain       = "hermes.local"
  
  smtp {
    enabled  = false
    host     = "localhost"
    port     = 1025
    username = ""
    password = ""
  }
}

// Provider selection (use Local Workspace and Meilisearch search)
// This allows testing without Google Workspace credentials
providers {
  workspace = "local"
  search    = "meilisearch"
}

// Server configuration (bind to all interfaces in container)
server {
  addr = "0.0.0.0:8000"
}
