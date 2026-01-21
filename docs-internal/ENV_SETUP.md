# Environment Variables Setup Guide

## Quick Start

1. **Copy the template**:
   ```bash
   cp .env.template .env
   ```

2. **Fill in required credentials** in `.env`:
   - Google OAuth 2.0 Client ID
   - Google Service Account credentials file path
   - Algolia App ID and API keys

3. **Never commit** `.env` files with real credentials (already in `.gitignore`)

## Required Credentials

### Google Workspace Setup

1. **Google Cloud Console** (https://console.cloud.google.com)
   - Create a project or use existing
   - Enable these APIs:
     - Google Drive API
     - Google Docs API
     - Gmail API
     - Google People API

2. **OAuth 2.0 Client ID** (for web frontend):
   - Go to: APIs & Services > Credentials
   - Create OAuth 2.0 Client ID (Web application)
   - Add authorized redirect URIs (e.g., `http://localhost:4200`)
   - Copy Client ID to `HERMES_WEB_GOOGLE_OAUTH2_CLIENT_ID`

3. **Service Account** (for backend):
   - Go to: IAM & Admin > Service Accounts
   - Create service account with appropriate permissions
   - Generate JSON key and save as `credentials.json` in repo root
   - Set `GOOGLE_APPLICATION_CREDENTIALS=./credentials.json`

### Algolia Setup

1. **Algolia Account** (https://www.algolia.com)
   - Create account and application
   - Get App ID from Dashboard
   - Get API keys from API Keys section:
     - Search API Key (public, for frontend)
     - Admin API Key (secret, for backend)

2. **Create indices** (or use existing):
   - `hermes_docs` (or `hermes_docs_dev` for development)
   - `hermes_drafts`
   - `hermes_internal`
   - `hermes_projects`

## Environment Variables Reference

### Frontend Variables (HERMES_WEB_*)

These variables are used at **build time** by the Ember.js frontend. They must be set before running `yarn build` or `make build`.

#### `HERMES_WEB_GOOGLE_OAUTH2_CLIENT_ID`
- **Type**: String (optional)
- **Purpose**: Google OAuth 2.0 Client ID for user authentication
- **When needed**: Only when using Google OAuth authentication provider
- **Example**: `123456789-abcdefghijklmnop.apps.googleusercontent.com`
- **How to get**: Create OAuth 2.0 credentials in Google Cloud Console
- **Note**: Not needed when using Dex or Okta authentication

#### `HERMES_WEB_ALGOLIA_APP_ID`
- **Type**: String (optional, deprecated)
- **Purpose**: Algolia Application ID for search
- **Status**: **No longer needed as of October 2025** - search proxies through backend
- **Default**: Uses backend proxy at `/1/indexes/*`
- **Note**: Only set if you need direct client-side Algolia access

#### `HERMES_WEB_ALGOLIA_SEARCH_API_KEY`
- **Type**: String (optional, deprecated)
- **Purpose**: Algolia Search-Only API Key
- **Status**: **No longer needed as of October 2025** - search proxies through backend
- **Default**: Uses backend proxy with server-side authentication
- **Note**: Only set if you need direct client-side Algolia access

### Backend Variables (HERMES_SERVER_*)

These variables are used at **runtime** by the Go backend server. They override values in `config.hcl`.

#### Database Configuration

##### `HERMES_SERVER_POSTGRES_HOST`
- **Type**: String
- **Purpose**: PostgreSQL server hostname or IP address
- **Default**: `localhost`
- **Example**: `localhost`, `postgres.example.com`, `10.0.1.50`
- **Docker**: Use `postgres` when backend runs in Docker network

##### `HERMES_SERVER_POSTGRES_PORT`
- **Type**: Integer
- **Purpose**: PostgreSQL server port
- **Default**: `5432`
- **Example**: `5432`, `5433` (testing environment)

##### `HERMES_SERVER_POSTGRES_DBNAME`
- **Type**: String
- **Purpose**: PostgreSQL database name
- **Default**: `hermes`
- **Example**: `hermes`, `hermes_dev`, `hermes_prod`

##### `HERMES_SERVER_POSTGRES_USER`
- **Type**: String
- **Purpose**: PostgreSQL username
- **Default**: `postgres`
- **Example**: `postgres`, `hermes_app`, `hermes_ro`
- **Security**: Use dedicated user with minimal required permissions

##### `HERMES_SERVER_POSTGRES_PASSWORD`
- **Type**: String (sensitive)
- **Purpose**: PostgreSQL password
- **Default**: `postgres` (development only!)
- **Example**: `SecureP@ssw0rd123!`
- **Security**: **Never use default password in production!**

##### `HERMES_SERVER_POSTGRES_SSLMODE`
- **Type**: String
- **Purpose**: PostgreSQL SSL/TLS connection mode
- **Default**: `disable`
- **Options**: `disable`, `require`, `verify-ca`, `verify-full`
- **Production**: Use `require` or higher
- **Development**: `disable` is acceptable

#### Search Provider Configuration

##### `HERMES_MEILISEARCH_HOST`
- **Type**: String (URL)
- **Purpose**: Meilisearch server URL
- **Default**: `http://localhost:7700`
- **Example**: `http://localhost:7700`, `https://meilisearch.example.com`
- **When needed**: When using Meilisearch search provider

##### `HERMES_MEILISEARCH_MASTER_KEY`
- **Type**: String (sensitive)
- **Purpose**: Meilisearch master key for authentication
- **Default**: None (required for Meilisearch)
- **Example**: `your-secure-master-key-here`
- **Security**: Use strong random key (32+ characters)

##### `HERMES_ALGOLIA_APPLICATION_ID`
- **Type**: String
- **Purpose**: Algolia Application ID
- **Default**: None
- **Example**: `ABC123DEF456`
- **When needed**: When using Algolia search provider

##### `HERMES_ALGOLIA_SEARCH_API_KEY`
- **Type**: String (semi-sensitive)
- **Purpose**: Algolia Search-Only API Key (can be exposed to frontend)
- **Default**: None
- **Example**: `0123456789abcdefghijklmnopqrstuv`

##### `HERMES_ALGOLIA_WRITE_API_KEY`
- **Type**: String (sensitive)
- **Purpose**: Algolia Admin API Key for indexing operations
- **Default**: None
- **Example**: `9876543210zyxwvutsrqponmlkjihgfe`
- **Security**: **Keep secret!** Never expose to frontend

#### Authentication Configuration

##### `HERMES_DEX_ISSUER_URL`
- **Type**: String (URL)
- **Purpose**: Dex OIDC issuer URL
- **Default**: `http://localhost:5556/dex`
- **Example**: `http://localhost:5556/dex`, `http://dex:5558/dex` (Docker)
- **When needed**: When using Dex authentication provider

##### `HERMES_DEX_CLIENT_ID`
- **Type**: String
- **Purpose**: Dex OIDC client ID
- **Default**: `hermes-integration`
- **Example**: `hermes-integration`, `hermes-prod`
- **Note**: Must match client ID in dex-config.yaml

##### `HERMES_DEX_CLIENT_SECRET`
- **Type**: String (sensitive)
- **Purpose**: Dex OIDC client secret
- **Default**: `ZXhhbXBsZS1hcHAtc2VjcmV0`
- **Example**: `ZXhhbXBsZS1hcHAtc2VjcmV0`
- **Note**: Must match client secret in dex-config.yaml
- **Security**: Use secure secret in production

##### `HERMES_DEX_REDIRECT_URL`
- **Type**: String (URL)
- **Purpose**: OAuth callback URL after Dex authentication
- **Default**: `http://localhost:8000/auth/callback`
- **Example**: `http://localhost:8000/auth/callback`, `https://hermes.example.com/auth/callback`
- **Note**: Must match redirect URI in dex-config.yaml

##### `GOOGLE_APPLICATION_CREDENTIALS`
- **Type**: String (file path)
- **Purpose**: Path to Google Service Account JSON key file
- **Default**: None
- **Example**: `./credentials.json`, `/etc/hermes/google-sa.json`
- **When needed**: When using Google Workspace provider with service account
- **Security**: Protect this file - it grants full API access!

#### Workspace Provider Configuration

##### `HERMES_WORKSPACE_LOCAL_ROOT`
- **Type**: String (directory path)
- **Purpose**: Root directory for local workspace file storage
- **Default**: `./testing/workspace_data`
- **Example**: `./testing/workspace_data`, `/var/hermes/workspace`
- **When needed**: When using Local Workspace provider
- **Note**: Directory must be writable by Hermes process

##### `HERMES_WORKSPACE_LOCAL_SMTP_HOST`
- **Type**: String
- **Purpose**: SMTP server hostname for email notifications (local workspace)
- **Default**: None (emails disabled if not set)
- **Example**: `smtp.gmail.com`, `localhost`
- **When needed**: Optional, for email notifications in local workspace mode

##### `HERMES_WORKSPACE_LOCAL_SMTP_PORT`
- **Type**: Integer
- **Purpose**: SMTP server port
- **Default**: `587`
- **Example**: `587` (TLS), `465` (SSL), `25` (plain)

##### `HERMES_WORKSPACE_LOCAL_SMTP_USERNAME`
- **Type**: String
- **Purpose**: SMTP authentication username
- **Default**: None
- **Example**: `notifications@example.com`

##### `HERMES_WORKSPACE_LOCAL_SMTP_PASSWORD`
- **Type**: String (sensitive)
- **Purpose**: SMTP authentication password
- **Default**: None
- **Example**: `smtp-app-password`
- **Security**: Use app-specific password, not account password

##### `HERMES_WORKSPACE_LOCAL_SMTP_FROM`
- **Type**: String (email address)
- **Purpose**: Email "From" address for notifications
- **Default**: `hermes@localhost`
- **Example**: `hermes@example.com`, `noreply@example.com`

#### Jira Integration

##### `HERMES_JIRA_ENABLED`
- **Type**: Boolean
- **Purpose**: Enable Jira integration
- **Default**: `false`
- **Example**: `true`, `false`

##### `HERMES_JIRA_BASE_URL`
- **Type**: String (URL)
- **Purpose**: Jira instance URL
- **Default**: None
- **Example**: `https://yourcompany.atlassian.net`, `https://jira.yourcompany.com`

##### `HERMES_JIRA_USER_EMAIL`
- **Type**: String (email)
- **Purpose**: Jira user email for authentication (Cloud)
- **Default**: None
- **Example**: `integration@yourcompany.com`
- **When needed**: Jira Cloud only

##### `HERMES_JIRA_API_TOKEN`
- **Type**: String (sensitive)
- **Purpose**: Jira API token for authentication (Cloud)
- **Default**: None
- **Example**: `ATATT3xFfGF0...`
- **When needed**: Jira Cloud only
- **How to get**: https://id.atlassian.com/manage-profile/security/api-tokens

##### `HERMES_JIRA_PERSONAL_ACCESS_TOKEN`
- **Type**: String (sensitive)
- **Purpose**: Jira Personal Access Token (Data Center)
- **Default**: None
- **Example**: `ODAyNzM4NDE2...`
- **When needed**: Jira Data Center only

#### Observability

##### `HERMES_DATADOG_ENABLED`
- **Type**: Boolean
- **Purpose**: Enable Datadog metrics and tracing
- **Default**: `false`
- **Example**: `true`, `false`

##### `HERMES_DATADOG_ENV`
- **Type**: String
- **Purpose**: Environment tag for Datadog metrics
- **Default**: `development`
- **Example**: `development`, `staging`, `production`

##### `HERMES_DATADOG_SERVICE`
- **Type**: String
- **Purpose**: Service name for Datadog metrics
- **Default**: `hermes`
- **Example**: `hermes`, `hermes-api`, `hermes-indexer`

### System Variables

#### `PORT`
- **Type**: Integer
- **Purpose**: HTTP server port (alternative to config.hcl)
- **Default**: `8000`
- **Example**: `8000`, `8001`, `3000`
- **Note**: Overrides `server.addr` in config.hcl

#### `LOG_LEVEL`
- **Type**: String
- **Purpose**: Logging verbosity level
- **Default**: `info`
- **Options**: `debug`, `info`, `warn`, `error`
- **Development**: Use `debug` for detailed logs
- **Production**: Use `info` or `warn`

#### `LOG_FORMAT`
- **Type**: String
- **Purpose**: Log output format
- **Default**: `text`
- **Options**: `text`, `json`
- **Development**: `text` is more readable
- **Production**: `json` for structured logging and parsing

## Environment Variable Priority

Environment variables override configuration file values in this order (highest to lowest priority):

1. **Environment variables** (runtime)
2. **config.hcl file** (configuration)
3. **Default values** (hardcoded)

Example:
```bash
# config.hcl has: database { password = "config-password" }
# .env has: HERMES_SERVER_POSTGRES_PASSWORD=env-password

# Result: Uses "env-password" (environment variable wins)
```

## Environment Files

| File | Purpose | Committed? |
|------|---------|------------|
| `.env.template` | Full template with all options | ✅ Yes |
| `.env.example` | Minimal example for quick start | ✅ Yes |
| `.env` | Your actual credentials | ❌ NO (gitignored) |
| `.env.local` | Local overrides | ❌ NO (gitignored) |
| `.env.test` | Test-specific values | ❌ NO (gitignored) |

## Testing with Environment Variables

### Backend Tests (Go)

```bash
# Load .env and run Go tests
export $(cat .env | xargs) && make go/test

# With PostgreSQL (Docker)
make docker/postgres/start
export $(cat .env | xargs) && make go/test/with-docker-postgres
```

### Frontend Tests (Ember)

```bash
cd web
# Environment variables are automatically loaded during build
yarn test:types
yarn build  # Reads HERMES_WEB_* variables
```

### Full Integration Testing

```bash
# Start PostgreSQL
make docker/postgres/start

# In terminal 1: Start backend
export $(cat .env | xargs) && ./hermes server -config=config.hcl

# In terminal 2: Start frontend
cd web && yarn start:with-proxy
```

## Security Best Practices

- ✅ **DO**: Use `.env.template` as a guide
- ✅ **DO**: Keep `.env` files in `.gitignore`
- ✅ **DO**: Use different credentials for dev/staging/prod
- ✅ **DO**: Rotate API keys regularly
- ❌ **DON'T**: Commit real credentials to git
- ❌ **DON'T**: Share `.env` files via Slack/email
- ❌ **DON'T**: Use production credentials for local development

## Troubleshooting

### "Missing HERMES_WEB_* variable" warnings during web build

These warnings are **expected** and use sensible defaults. To silence them, set the variables in your `.env` file and ensure they're exported before running `make build` or `yarn build`.

### "credentials.json not found"

Make sure you've downloaded your Google Service Account JSON key and placed it in the repo root, then set `GOOGLE_APPLICATION_CREDENTIALS=./credentials.json` in `.env`.

### PostgreSQL connection errors

Verify PostgreSQL is running:
```bash
make docker/postgres/start
# Check it's accessible
psql postgresql://postgres:postgres@localhost:5432/hermes
```

## CI/CD Notes

For GitHub Actions and production deployments, set these as **repository secrets** or **environment variables** in your CI/CD platform, not in `.env` files.
