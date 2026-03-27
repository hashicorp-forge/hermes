# Hermes

[![CI](https://github.com/hashicorp-forge/hermes/workflows/ci/badge.svg?branch=main)](https://github.com/hashicorp-forge/hermes/actions/workflows/ci.yml?query=branch%3Amain)

> Hermes is not an official HashiCorp project.
> The repository contains software which is under active development and is in the alpha stage. Please read the “[Project Status](#project-status)” section for more information.

Hermes is an open source document management system created by HashiCorp to help scale the writing and document process. Read the release blog post [here](https://hashicorp.com/blog/introducing-hermes-an-open-source-document-management-system).

Hermes was created and is currently maintained by HashiCorp Labs, a small team in the Office of the CTO.

**Please note**: While this is not an official HashiCorp project, security is still very important to us! If you think that you've found a security issue, please contact us via email at security@hashicorp.com instead of filing a GitHub issue.

# Usage

## Setup

Hermes supports two backend modes:

- Google Workspace
- SharePoint / Microsoft 365

### Google

1. Sign up for a [Google Workspace](https://workspace.google.com/) account.

1. [Create a Google Cloud project](https://developers.google.com/workspace/guides/create-project).

1. Enable the following APIs for [Google Workspace APIs](https://developers.google.com/workspace/guides/enable-apis)

   - Admin SDK API (optional, if enabling Google Groups as document approvers)
   - Google Docs API
   - Google Drive API
   - Gmail API
   - People API
   - Also, to enable searching for users, the Google Workspace domain admin needs to enable external directory sharing. See more details: https://support.google.com/a/answer/6343701
     - Select Directory Setting >Sharing setting section > Contact sharing > Enable contact sharing

1. [Configure the OAuth consent screen](https://developers.google.com/workspace/guides/configure-oauth-consent) for the application in GCP project.

   - Enter a domain name in the “Authorized domains” section that Hermes may use. Example, mycompany.com
   - Add scopes:
     - `https://www.googleapis.com/auth/drive.readonly`

1. [Create OAuth client ID credentials](https://developers.google.com/workspace/guides/create-credentials) for a “web application”.

   - Add the following domains in the “Authorized JavaScript origins” section.

     - `https://{HERMES_DOMAIN}`
     - `http://localhost:8000` (Note: this should be localhost when running locally)

   - Add the following URLs in the “Authorized redirect URIs” section.

     - `https://{HERMES_DOMAIN}/torii/redirect.html`
     - `http://localhost:8000/torii/redirect.html` (Note: this should be localhost when running locally)

   Please note the client ID as you may need it to be provided at application build time as the `HERMES_WEB_GOOGLE_OAUTH2_CLIENT_ID` environment variable.

1. [Create OAuth client ID credentials](https://developers.google.com/workspace/guides/create-credentials) for a “desktop application” for Hermes backend.

   - Download the OAuth credentials JSON file and save it to the root of this project repository.
   - Rename to `credentials.json`

### Google Drive

We suggest using a [shared drive](https://support.google.com/a/users/answer/7212025?hl=en) for your organization.

- "Shortcuts" folder: this folder contains an organized hierarchy of folders and shortcuts to published files. You may want to share this with users if you need to provide a non-Hermes experience of navigating through Google Drive to find documents.

  - Structure: `{doc_type}/{product}/{document}`

- "Documents" folder: this folder contains all published documents in a flat structure. This folder should be shared with all of your users, but it is not ideal to view itself in Google Drive, given the flat structure. Instead, the "shortcuts folder" will provide a better viewing experience when navigating directly in Google Drive.

- "Drafts" folder: this folder contains all draft documents. It should be kept private and only accessible to the Hermes service user. The Hermes user will automatically share any draft documents with document owners and collaborators.

Example shared drive organization

- Shared Drives
  - Hermes
    - Documents (this is the "shortcuts" folder)
    - All Documents (this is the "documents" folder)
    - Drafts (this is the "drafts" folder)

### Algolia (required)

1. [Sign up](https://www.algolia.com/users/sign_up) for a free Algolia account.

The Application ID, Search API Key, and Write API Key in Algolia's [API Keys settings](https://www.algolia.com/account/api-keys) are required for the Hermes server and the indexer. You will later add them to the [config.hcl configuration file](https://github.com/hashicorp-forge/hermes#configuration-file).

Similarly, you will use these values to set the `HERMES_WEB_ALGOLIA_APP_ID` and `HERMES_WEB_ALGOLIA_SEARCH_API_KEY` environment variables at build time.

### Jira (optional)

Jira can be optionally configured to enable linking Hermes projects with Jira issues.

1. [Create an API token](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/#Create-an-API-token) for Jira.

1. Enable Jira using the `jira` block in the Hermes config file.

### SharePoint / Microsoft 365

1. Create a Microsoft Entra ID app registration for Hermes.

1. Configure a redirect URI for the Hermes server.

  - Local development example: `https://localhost:8443/authenticate`
  - The redirect URI in Entra ID must match `sharepoint.redirect_uri` in `config.hcl`.

1. Create a client secret for the app registration.

1. Collect the values Hermes needs for configuration:

  - Tenant ID
  - Client ID
  - Client secret
  - SharePoint site ID
  - SharePoint drive ID
  - Your Microsoft 365 email domain (for example, `example.com`)

1. Create or identify the folders Hermes will use in the SharePoint document library:

  - Drafts folder
  - Published documents folder
  - Shortcuts folder

1. Enable the `sharepoint` block in `config.hcl` and set the values above.

1. If you want Microsoft distribution lists to be selectable as approvers, enable the `group_approvals` block under `sharepoint`.

1. Choose an authentication mode:

  - Direct Microsoft login: configure only the `sharepoint` block.
  - ALB-fronted OIDC login: configure `sharepoint` and `oidc_alb`. Hermes prefers `oidc_alb` when it is enabled.

## Development and Usage

### Requirements

- Go 1.18
- Node.js 20
- Yarn ~3.3.0 ([install with corepack](https://yarnpkg.com/getting-started/install))

### Configuration File

Copy the example configuration file to the root of this repo and edit the file (it contains sensible defaults and comments to hopefully provide enough information to update necessary values).

```sh
cp configs/config.hcl ./
# Edit config.hcl...
```

For Google Workspace deployments, configure the `google_workspace` block.

For SharePoint deployments, enable and configure the `sharepoint` block in `config.hcl`:

```hcl
sharepoint {
  redirect_uri     = "https://localhost:8443/authenticate"
  client_id        = "YOUR_SHAREPOINT_CLIENT_ID"
  client_secret    = "YOUR_SHAREPOINT_CLIENT_SECRET"
  tenant_id        = "YOUR_AZURE_AD_TENANT_ID"
  site_id          = "YOUR_SHAREPOINT_SITE_ID"
  drive_id         = "YOUR_SHAREPOINT_DRIVE_ID"
  domain           = "your-domain.com"
  drafts_folder    = "DraftDocuments"
  docs_folder      = "PublishedDocuments"
  shortcuts_folder = "ShortcutsFolder"

  group_approvals {
    enabled = true
    #search_prefix = "team-"
  }
}
```

Notes:

- `group_approvals` is optional. When enabled, Hermes exposes the group search API and can validate Microsoft group membership for approver checks.
- `search_prefix` is optional. When set, Hermes searches both `{search_prefix}{query}` and `{query}` and merges the results.
- If `oidc_alb` is enabled, Hermes uses it ahead of direct Microsoft auth.

### Build the Project

```sh
make build
```

### PostgreSQL

Hermes can be configured to point to any PostgreSQL database, but for running locally, there is tooling to start one in Docker using Docker Compose.

```sh
# Start PostgreSQL in Docker.
make docker/postgres/start
```

The database password can be configured via the Hermes config.hcl or the `HERMES_SERVER_POSTGRES_PASSWORD` environment variable.

### Run the Server

```sh
./hermes server -config=config.hcl
```

### Run the Indexer

```sh
./hermes indexer -config=config.hcl
```

NOTE: when not using a Google service account, this will automatically open a browser to authenticate the server to read and create documents, send emails, etc.

For SharePoint deployments without `oidc_alb`, Hermes uses the Microsoft login flow and serves the `/authenticate` callback route directly.

## Running Hermes in Production

### Google Workspace

1. [Create Service Account](https://developers.google.com/workspace/guides/create-credentials#service-account)

- Create a new key (JSON type) for the service account and download it.
- Go to [Delegating domain-wide authority to the service account](https://developers.google.com/identity/protocols/oauth2/service-account#delegatingauthority) and follow the instructions to enter the OAuth scopes.
- Add the following OAuth scopes (if enabling group approvals, add `https://www.googleapis.com/auth/admin.directory.group.readonly` to the comma-delimited list):
  `https://www.googleapis.com/auth/directory.readonly,https://www.googleapis.com/auth/documents,https://www.googleapis.com/auth/drive,https://www.googleapis.com/auth/gmail.send`

1. Configure the service account in the `auth` block under the `google_workspace` config block.

1. If enabling group approvals, add the `https://www.googleapis.com/auth/admin.directory.group.readonly` role to the service user configured as the `subject` in the `auth` block (from previous step).

### SharePoint / Microsoft 365

For SharePoint deployments, configure the `sharepoint` block instead of the Google service account.

- `redirect_uri` must match the app registration callback URL.
- `site_id` and `drive_id` identify the SharePoint document library Hermes will use.
- `drafts_folder`, `docs_folder`, and `shortcuts_folder` are the SharePoint folders Hermes manages.
- `group_approvals` is optional and enables Microsoft distribution-list search for approvers.
- `oidc_alb` is optional and can be used when Hermes is deployed behind an AWS ALB handling OIDC.

## Architecture

### Server

The server process serves web content. Of note, there are API endpoints for an authenticated Algolia proxy (`/1/` to allow usage of Algolia's client library), and redirect links (`/l/`) which provide human-readable links (i.e., `/l/rfc/lab-123`) to documents.

### Indexer

The indexer is a process that is run alongside the server that continually polls for published document updates and reindexes their content in Algolia for search. Additionally, it will rewrite the document headers with Hermes metadata in case they are manually changed to incorrect values. While not strictly required, it is recommended to run the indexer so search index data and Google Docs stay up-to-date.

### Frontend

The Ember.js web frontend is built and embedded into the Hermes binary, and served via the server process.

## Project Status

This project is under active development and in the alpha stage. There may be breaking changes to the API, application configuration file, or other parts of the project. We recommend against installing builds from the `main` branch. We will make every attempt to document breaking changes and provide an upgrade path between releases of Hermes.

## Feedback

If you think that you've found a security issue, please contact us via email at security@hashicorp.com instead of filing a GitHub issue.

Found a non-security-related bug or have a feature request or other feedback? Please [open a GitHub issue](https://github.com/hashicorp-forge/hermes/issues/new).

> Please note that it may take us up to a week to respond to GitHub issues as we continue to work on the project.

## Contributing

In the short term, there are several large changes planned for the Hermes project. To make sure there aren’t any conflicts with the upcoming plans for the project, before submitting a PR please [create a GitHub issue](https://github.com/hashicorp-forge/hermes/issues/new) so we can validate the change you may want to propose.

As the project becomes more stable over the next several releases, we think it will become much easier to contribute.

> Please note that it may take us up to a week to respond to PRs that are submitted as we continue to work on the project.

## Upcoming Plans

Here are some higher-level initiatives that we are currently working on:

- Increase test coverage.
- Finish migration of using Algolia as a NoSQL database to PostgreSQL as the source of truth for all non-search data.
