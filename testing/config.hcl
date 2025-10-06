# Hermes Testing Configuration
# This configuration is used for the docker-compose testing environment

# PostgreSQL configuration
postgres {
  host     = "postgres"
  port     = 5432
  user     = "postgres"
  password = "postgres"
  dbname   = "hermes_test"
}

# Server configuration
server {
  addr = "0.0.0.0:8000"
}

# Base URL for the application
base_url = "http://localhost:8001"

# Okta authentication (disabled for testing)
okta {
  disabled = true
  
  # These are required fields but not used when disabled
  auth_server_url = "https://example.okta.com"
  client_id       = "test-client-id"
  aws_region      = "us-east-1"
  jwt_signer      = "test-signer"
}

# Algolia search (using Meilisearch adapter in testing)
algolia {
  app_id           = "test-app-id"
  search_api_key   = "test-search-key"
  write_api_key    = "masterKey123"
  docs_index_name  = "docs"
  drafts_index_name = "drafts"
  internal_index_name = "internal"
  links_index_name = "links"
  missing_fields_index_name = "missing_fields"
  projects_index_name = "projects"
}

# Google Workspace configuration (minimal for testing)
google_workspace {
  domain            = "test.local"
  docs_folder       = "test-docs-folder-id"
  drafts_folder     = "test-drafts-folder-id"
  shortcuts_folder  = "test-shortcuts-folder-id"
}

# Document types
document_types {
  document_type {
    name      = "RFC"
    long_name = "Request for Comments"
    description = "Create a Request for Comments document"
  }
  
  document_type {
    name      = "PRD"
    long_name = "Product Requirements Document"
    description = "Create a Product Requirements Document"
  }
  
  document_type {
    name      = "FRD"
    long_name = "Functional Requirements Document"
    description = "Create a Functional Requirements Document"
  }
}

# Products
products {
  product {
    name         = "Test Product"
    abbreviation = "TEST"
  }
}

# Feature flags
feature_flags {
  feature_flag {
    name    = "test_flag"
    enabled = true
  }
}

# Email (disabled for testing)
email {
  enabled = false
  from_address = "test@test.local"
}

# Datadog (disabled for testing)
datadog {
  enabled = false
}

# Indexer configuration
indexer {
  max_parallel = 10
  update_docs  = true
}
