// Hermes Testing Configuration
// This configuration is designed for the containerized testing environment
// in docker-compose with postgres, meilisearch, hermes backend, and web frontend

// Base URL for the application (external access port)
base_url = "http://localhost:8001"

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

// Document types (minimal set for testing)
document_types {
  document_type "RFC" {
    long_name   = "Request for Comments"
    description = "Create a Request for Comments document to present a proposal to colleagues for their review and feedback."
    flight_icon = "discussion-circle"
    template    = "test-rfc-template-id"
    
    custom_field {
      name = "Stakeholders"
      type = "people"
    }
  }

  document_type "PRD" {
    long_name   = "Product Requirements"
    description = "Create a Product Requirements Document to summarize a problem statement and outline a phased approach to addressing the problem."
    flight_icon = "target"
    template    = "test-prd-template-id"
    
    custom_field {
      name = "Stakeholders"
      type = "people"
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

// Dex OIDC authentication (enabled for acceptance testing)
dex {
  disabled      = false
  issuer_url    = "http://dex:5557/dex"
  client_id     = "hermes-acceptance"
  client_secret = "YWNjZXB0YW5jZS1hcHAtc2VjcmV0"
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
  dbname   = "hermes_test"
  host     = "postgres"
  port     = 5432
  user     = "postgres"
  password = "postgres"
}

// Products (test product for testing)
products {
  product "Test Product" {
    abbreviation = "TEST"
  }
  
  product "Engineering" {
    abbreviation = "ENG"
  }
}

// Server configuration (bind to all interfaces in container)
server {
  addr = "0.0.0.0:8000"
}
