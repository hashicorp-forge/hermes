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
