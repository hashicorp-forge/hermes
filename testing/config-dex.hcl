# Example Hermes Configuration with Dex Authentication
# This demonstrates the multi-provider authentication support

# Dex OIDC Configuration
dex {
  issuer_url    = "http://localhost:5556/dex"
  client_id     = "hermes-client"
  client_secret = "hermes-secret"
  redirect_url  = "http://localhost:8080/callback"
  disabled      = false
}

# Algolia Configuration (backend only)
# Note: Web frontend no longer needs these credentials!
algolia {
  app_id              = "test-algolia-app-id"
  search_api_key      = "test-search-key"
  docs_index_name     = "docs"
  drafts_index_name   = "drafts"
  internal_index_name = "internal"
  projects_index_name = "projects"
}

# Local Workspace Configuration (for testing without Google Workspace)
local_workspace {
  docs_dir   = "/workspace_data/docs"
  drafts_dir = "/workspace_data/drafts"
}

# PostgreSQL Configuration
postgres {
  host     = "postgres"
  port     = 5432
  dbname   = "hermes"
  user     = "postgres"
  password = "postgres"
}

# Server Configuration
server {
  addr = "0.0.0.0:8000"
}

# Provider Selection
providers {
  workspace = "local"  # Use local filesystem instead of Google Workspace
  search    = "algolia"
}

# Feature Flags
feature_flags {
  api_v2 = true
}

# Base URL for the application
base_url = "http://localhost:8080"

# Support Link URL
support_link_url = "https://github.com/hashicorp-forge/hermes"

# Document Types
document_types {
  rfc {
    long_name    = "RFC"
    short_name   = "RFC"
    description  = "Request for Comments"
    more_info_link_text = "More info"
    more_info_link_url  = "https://example.com/rfc"
  }
  
  prd {
    long_name    = "PRD"
    short_name   = "PRD"
    description  = "Product Requirements Document"
    more_info_link_text = "More info"
    more_info_link_url  = "https://example.com/prd"
  }
}

# Products
products {
  product {
    name         = "Test Product"
    abbreviation = "TEST"
  }
}
