// Hermes Configuration with Profiles
// Supports multiple environments through profile blocks

// Default profile - for local development with external services
profile "default" {
  base_url = "http://localhost:8000"
  log_format = "standard"
  
  algolia {
    application_id            = "your-app-id"
    docs_index_name           = "docs"
    drafts_index_name         = "drafts"
    internal_index_name       = "internal"
    links_index_name          = "links"
    missing_fields_index_name = "missing_fields"
    projects_index_name       = "projects"
    search_api_key            = "your-search-key"
    write_api_key             = "your-write-key"
  }
  
  postgres {
    dbname   = "hermes"
    host     = "localhost"
    port     = 5432
    user     = "postgres"
    password = "postgres"
  }
  
  server {
    addr = "127.0.0.1:8000"
  }
  
  okta {
    disabled        = false
    auth_server_url = "https://your-org.okta.com"
    aws_region      = "us-east-1"
    client_id       = "your-client-id"
    jwt_signer      = "your-jwt-signer"
  }
  
  datadog {
    enabled = false
    env     = "development"
  }
  
  email {
    enabled = false
    from_address = "hermes@example.com"
  }
  
  feature_flags {
    flag "api_v2" {
      enabled = true
    }
    flag "projects" {
      enabled = false
    }
  }
  
  google_workspace {
    create_doc_shortcuts = false
    docs_folder          = "your-docs-folder-id"
    domain               = "example.com"
    drafts_folder        = "your-drafts-folder-id"
    shortcuts_folder     = "your-shortcuts-folder-id"
    
    group_approvals {
      enabled = false
    }
    
    auth {
      client_email        = "service@project.iam.gserviceaccount.com"
      create_docs_as_user = false
      private_key         = "-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
      subject             = "user@example.com"
      token_url           = "https://oauth2.googleapis.com/token"
    }
    
    oauth2 {
      client_id    = "your-client-id"
      hd           = "example.com"
      redirect_uri = "http://localhost:8000/torii/redirect.html"
    }
  }
  
  indexer {
    max_parallel_docs          = 10
    update_doc_headers         = false
    update_draft_headers       = false
    use_database_for_document_data = true
  }
  
  jira {
    enabled   = false
    api_token = ""
    url       = ""
    user      = ""
  }
  
  document_types {
    document_type "RFC" {
      long_name   = "Request for Comments"
      description = "Create a Request for Comments document to present a proposal to colleagues for their review and feedback."
      flight_icon = "discussion-circle"
      template    = "rfc-template-id"
      
      custom_field {
        name = "Stakeholders"
        type = "people"
      }
    }
    
    document_type "PRD" {
      long_name   = "Product Requirements"
      description = "Create a Product Requirements Document to summarize a problem statement and outline a phased approach to addressing the problem."
      flight_icon = "target"
      template    = "prd-template-id"
      
      custom_field {
        name = "Stakeholders"
        type = "people"
      }
    }
  }
  
  products {
    product "Engineering" {
      abbreviation = "ENG"
    }
    
    product "Product" {
      abbreviation = "PROD"
    }
  }
}

// Testing profile - for containerized integration testing with Docker Compose
profile "testing" {
  base_url = "http://localhost:8001"
  log_format = "standard"
  
  // Provider configuration for this profile
  providers {
    workspace = "google"      // Use Google workspace (with test/minimal config)
    search    = "meilisearch" // Use Meilisearch adapter
  }
  
  // Meilisearch configuration
  meilisearch {
    host                  = "http://meilisearch:7700"
    api_key               = "masterKey123"
    docs_index_name       = "docs"
    drafts_index_name     = "drafts"
    projects_index_name   = "projects"
    links_index_name      = "links"
  }
  
  // Algolia placeholder - actual search backend is Meilisearch
  // These values allow the server to start without attempting real Algolia connection
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
  
  // PostgreSQL - connects to postgres container
  postgres {
    dbname   = "hermes_acceptance"
    host     = "postgres"  // Container name in docker-compose
    port     = 5432
    user     = "postgres"
    password = "postgres"
  }
  
  // Server - bind to all interfaces in container
  server {
    addr = "0.0.0.0:8000"
  }
  
  // Okta disabled for testing
  okta {
    disabled        = true
    auth_server_url = "https://test.okta.com"
    aws_region      = "us-east-1"
    client_id       = "test-client-id"
    jwt_signer      = "test-jwt-signer"
  }
  
  // Dex OIDC for testing - enabled by default
  // Use static test user: test@hermes.local / password
  // Note: issuer_url uses localhost:5558 (host-mapped port) so browser can access Dex
  dex {
    disabled      = false
    issuer_url    = "http://localhost:5558/dex"
    client_id     = "hermes-acceptance"
    client_secret = "YWNjZXB0YW5jZS1hcHAtc2VjcmV0"
    redirect_url  = "http://localhost:8001/auth/callback"
  }
  
  // Datadog disabled for testing
  datadog {
    enabled = false
    env     = "testing"
  }
  
  // Email disabled for testing
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
  
  // Google Workspace - minimal test configuration
  google_workspace {
    create_doc_shortcuts = false
    docs_folder          = "test-docs-folder-id"
    domain               = "test.local"
    drafts_folder        = "test-drafts-folder-id"
    shortcuts_folder     = "test-shortcuts-folder-id"
    
    group_approvals {
      enabled = false
    }
    
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
  
  // Jira disabled for testing
  jira {
    enabled   = false
    api_token = ""
    url       = ""
    user      = ""
  }
  
  // Minimal document types for testing
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
  
  // Test products
  products {
    product "Test Product" {
      abbreviation = "TEST"
    }
    
    product "Engineering" {
      abbreviation = "ENG"
    }
  }
}

// Local profile - for local development with filesystem storage and Meilisearch
profile "local" {
  base_url = "http://localhost:8000"
  log_format = "standard"
  
  // Provider configuration for this profile
  providers {
    workspace = "local"  // Use local filesystem adapter
    search    = "meilisearch"  // Use Meilisearch adapter
  }
  
  // Meilisearch configuration
  meilisearch {
    host                  = "http://localhost:7700"
    api_key               = "masterKey"
    docs_index_name       = "docs"
    drafts_index_name     = "drafts"
    projects_index_name   = "projects"
    links_index_name      = "links"
  }
  
  // Local workspace configuration
  local_workspace {
    base_path    = "./workspace_data"
    docs_path    = "./workspace_data/docs"
    drafts_path  = "./workspace_data/drafts"
    folders_path = "./workspace_data/folders"
    users_path   = "./workspace_data/users"
    tokens_path  = "./workspace_data/tokens"
    domain       = "local.dev"
    
    smtp {
      enabled  = false
      host     = "localhost"
      port     = 1025
      username = ""
      password = ""
    }
  }
  
  // Algolia placeholder (not used when search provider is meilisearch)
  algolia {
    application_id            = "placeholder"
    docs_index_name           = "docs"
    drafts_index_name         = "drafts"
    internal_index_name       = "internal"
    links_index_name          = "links"
    missing_fields_index_name = "missing_fields"
    projects_index_name       = "projects"
    search_api_key            = "placeholder"
    write_api_key             = "placeholder"
  }
  
  // PostgreSQL - local instance
  postgres {
    dbname   = "hermes"
    host     = "localhost"
    port     = 5432
    user     = "postgres"
    password = "postgres"
  }
  
  // Server configuration
  server {
    addr = "127.0.0.1:8000"
  }
  
  // Okta disabled for local development
  okta {
    disabled        = true
    auth_server_url = "https://local.okta.com"
    aws_region      = "us-east-1"
    client_id       = "local-client-id"
    jwt_signer      = "local-jwt-signer"
  }
  
  // Datadog disabled
  datadog {
    enabled = false
    env     = "local"
  }
  
  // Email disabled
  email {
    enabled = false
    from_address = "hermes@local.dev"
  }
  
  // Feature flags
  feature_flags {
    flag "api_v2" {
      enabled = true
    }
    flag "projects" {
      enabled = true
    }
  }
  
  // Google Workspace placeholder (not used when workspace provider is local)
  google_workspace {
    create_doc_shortcuts = false
    docs_folder          = "placeholder"
    domain               = "local.dev"
    drafts_folder        = "placeholder"
    shortcuts_folder     = "placeholder"
    
    group_approvals {
      enabled = false
    }
    
    auth {
      client_email        = "local@local.iam.gserviceaccount.com"
      create_docs_as_user = false
      private_key         = "-----BEGIN PRIVATE KEY-----\nPLACEHOLDER\n-----END PRIVATE KEY-----\n"
      subject             = "local@local.dev"
      token_url           = "https://oauth2.googleapis.com/token"
    }
    
    oauth2 {
      client_id    = "local-client-id"
      hd           = "local.dev"
      redirect_uri = "http://localhost:8000/torii/redirect.html"
    }
  }
  
  // Indexer configuration
  indexer {
    max_parallel_docs          = 10
    update_doc_headers         = false
    update_draft_headers       = false
    use_database_for_document_data = true
  }
  
  // Jira disabled
  jira {
    enabled   = false
    api_token = ""
    url       = ""
    user      = ""
  }
  
  // Document types
  document_types {
    document_type "RFC" {
      long_name   = "Request for Comments"
      description = "Create a Request for Comments document to present a proposal to colleagues for their review and feedback."
      flight_icon = "discussion-circle"
      template    = "local-rfc-template-id"
      
      custom_field {
        name = "Stakeholders"
        type = "people"
      }
    }
    
    document_type "PRD" {
      long_name   = "Product Requirements"
      description = "Create a Product Requirements Document to summarize a problem statement and outline a phased approach to addressing the problem."
      flight_icon = "target"
      template    = "local-prd-template-id"
      
      custom_field {
        name = "Stakeholders"
        type = "people"
      }
    }
  }
  
  // Products
  products {
    product "Engineering" {
      abbreviation = "ENG"
    }
    
    product "Product" {
      abbreviation = "PROD"
    }
  }
}
