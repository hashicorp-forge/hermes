// Hermes Native Development Configuration
// For running backend natively with local workspace

base_url = "http://localhost:4200"
log_format = "standard"

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

datadog {
  enabled = false
  env     = "testing"
}

document_types {
  document_type "RFC" {
    long_name   = "Request for Comments"
    description = "Create an RFC document"
    flight_icon = "discussion-circle"
    template = "template-rfc"
  }
  
  document_type "PRD" {
    long_name   = "Product Requirements Document"
    description = "Create a PRD document"
    flight_icon = "docs"
    template = "template-prd"
  }
}

dex {
  disabled      = false
  issuer_url    = "http://localhost:5558/dex"
  client_id     = "hermes-testing"
  client_secret = "dGVzdGluZy1hcHAtc2VjcmV0"
  redirect_url  = "http://localhost:8000/auth/callback"
}

google_workspace {
  disabled = true
}

okta {
  disabled = true
}

providers {
  workspace = "local"
  search    = "meilisearch"
}

server {
  addr = "localhost:8000"
}

postgres {
  dbname   = "hermes_testing"
  host     = "localhost"
  password = "postgres"
  port     = 5433
  user     = "postgres"
}

meilisearch {
  host              = "http://localhost:7701"
  api_key           = "masterKey123"
  docs_index_name   = "docs"
  drafts_index_name = "drafts"
  projects_index_name = "projects"
  links_index_name  = "links"
}

indexer {
  max_parallel_docs          = 5
  update_doc_headers         = false
  update_draft_headers       = false
  use_database_for_document_data = true
}

jira {
  enabled = false
}

local_workspace {
  base_path    = "/Users/jrepp/hc/hermes/testing/workspace_data"
  docs_path    = "/Users/jrepp/hc/hermes/testing/workspace_data/docs"
  drafts_path  = "/Users/jrepp/hc/hermes/testing/workspace_data/drafts"
  folders_path = "/Users/jrepp/hc/hermes/testing/workspace_data/folders"
  users_path   = "/Users/jrepp/hc/hermes/testing/workspace_data"
  tokens_path  = "/Users/jrepp/hc/hermes/testing/workspace_data"
  domain       = "hermes.local"
  
  smtp {
    enabled  = false
    host     = "localhost"
    port     = 1025
    username = ""
    password = ""
  }
}
