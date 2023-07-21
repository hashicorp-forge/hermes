// base_url is the base URL used for building links. This should be the public
// URL of the application.
base_url = "http://localhost:8000"

// algolia configures Hermes to work with Algolia.
algolia {
  application_id            = "dummy"
  docs_index_name           = "docs"
  drafts_index_name         = "drafts"
  internal_index_name       = "internal"
  template_index_name       = "template"
  links_index_name          = "links"
  missing_fields_index_name = "missing_fields"
  search_api_key            = "dummy"
  write_api_key             = "dummy"
}

// document_types configures document types. Currently this block should not be
// modified, but Hermes will support custom document types in the near future.
// *** DO NOT MODIFY document_types ***
document_types {
  document_type "RFC" {
    description = "Create a Request for Comments document to present a proposal to colleagues for their review and feedback."
    template    = "1Oz_7FhaWxdFUDEzKCC5Cy58t57C4znmC_Qr80BORy1U"

    more_info_link {
      text = "More info on the RFC template"
      url  = "https://works.hashicorp.com/articles/rfc-template"
    }

    custom_field {
      name = "Current Version"
      type = "string"
    }
    custom_field {
      name = "PRD"
      type = "string"
    }
    custom_field {
      name = "Stakeholders"
      type = "people"
    }
    custom_field {
      name = "Target Version"
      type = "string"
    }
  }

  document_type "PRD" {
    description = "Create a Product Requirements Document to summarize a problem statement and outline a phased approach to addressing the problem."
    template    = "1oS4q6IPDr3aMSTTk9UDdOnEcFwVWW9kT8ePCNqcg1P4"

    more_info_link {
      text = "More info on the PRD template"
      url  = "https://works.hashicorp.com/articles/prd-template"
    }

    custom_field {
      name = "RFC"
      type = "string"
    }
    custom_field {
      name = "Stakeholders"
      type = "people"
    }
  }
}

// email configures Hermes to send email notifications.
email {
  // enabled enables sending email notifications.
  enabled = true

  // from_address is the email address to send email notifications from.
  from_address = "dummy"
}

// google_workspace configures Hermes to work with Google Workspace.
google_workspace {
  // create_doc_shortcuts enables creating a shortcut in the shortcuts_folder
  // when a document is published.
  create_doc_shortcuts = true
  // Razorpay ones

  // docs_folder contains all published documents in a flat structure.
  docs_folder = "dummy"

  // drafts_folder contains all draft documents.
  drafts_folder = "dummy"

  // If create_doc_shortcuts is set to true, shortcuts_folder will contain an
  // organized hierarchy of folders and shortcuts to published files that can be
  // easily browsed directly in Google Drive:
  //   {shortcut_folder}/{doc_type}/{product}/{document}
  shortcuts_folder = "dummy"

  // auth is the configuration for interacting with Google Workspace using a
  // service account.
  // auth {
  //   client_email = ""
  //   private_key  = ""
  //   subject      = ""
  //   token_url    = "https://oauth2.googleapis.com/token"
  // }

  auth {
    client_email = "dummy"
    private_key  = "dummy"
    subject      = "dummy"
    token_url    = "https://oauth2.googleapis.com/token"
  }

  // oauth2 is the configuration used to authenticate users via Google.
  oauth2 {
    client_id    = "dummy"
    hd           = "dummy"
    redirect_uri = "dummy"
  }
}

// indexer contains the configuration for the indexer.
indexer {
  // max_parallel_docs is the maximum number of documents that will be
  // simultaneously indexed.
  max_parallel_docs = 5

  // update_doc_headers enables the indexer to automatically update document
  // headers for changed documents based on Hermes metadata.
  update_doc_headers = true

  // update_draft_headers enables the indexer to automatically update document
  // headers for draft documents based on Hermes metadata.
  update_draft_headers = true
}

// okta configures Hermes to authenticate users using an AWS Application Load
// Balancer and Okta instead of using Google OAuth.
okta {
  // auth_server_url is the URL of the Okta authorization server.
  auth_server_url = ""

  // AWSRegion is the region of the AWS Application Load Balancer.
  aws_region = ""

  // ClientID is the Okta client ID.
  client_id = ""

  // disabled disables Okta authorization.
  disabled = true
}

// postgres configures PostgreSQL as the app database.
postgres {
  dbname   = "dummy"
  host     = "dummy"
  password = "dummy"
  port     = 5432
  user     = "dummy"
}

// products should be modified to reflect the products/areas in your
// organization.
products {
  product "Payments" {
    abbreviation = "PAYMT"
  }
  product "Platform" {
    abbreviation = "PLF"
  }
  product "X" {
    abbreviation = "X"
  }
  product "Capital" {
  abbreviation = "CAP"
  }
  product "Curlec" {
  abbreviation = "CUR"
  }
  product "Ezetap" {
  abbreviation = "EZP"
  }
  product "Payroll" {
  abbreviation = "PAYRL"
  }
  product "Issuing" {
  abbreviation = "ISSU"
  }
}

// server contains the configuration for the server.
server {
  // addr is the address to bind to for listening.
  addr = "127.0.0.1:8000"
  // uncomment this if usign docker compose or deploying
  // addr = "0.0.0.0:8000"
}
