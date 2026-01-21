---
id: MEMO-035
title: Environment Setup Guide
date: 2025-10-09
type: Guide
status: Final
tags: [setup, environment, credentials, onboarding]
related:
  - MEMO-023
  - MEMO-017
---

# Environment Setup Guide

**Quick Start**: Get Hermes running locally in under 10 minutes.

## Prerequisites

- **Go 1.25.0+** (backend)
- **Node.js 20+** (frontend)
- **Docker Desktop** (for Postgres, Meilisearch, Dex)
- **Git** (for cloning repo)

## Fast Track: Local Development with Dex

**Recommended for new developers** - No Google/Okta credentials needed!

```bash
# 1. Clone and enter repo
git clone https://github.com/hashicorp/hermes.git
cd hermes

# 2. Start dependencies (Postgres, Meilisearch, Dex)
docker compose up -d

# 3. Build backend
make bin

# 4. Start backend (will use Dex authentication)
./hermes server -config=config.hcl

# 5. In another terminal: Start frontend
cd web
yarn install
yarn start:proxy:local

# 6. Open http://localhost:4200
# Login with: test@hermes.local / password
```

**Done!** ✅ You're now running Hermes locally.

## Configuration Overview

Hermes uses `config.hcl` for runtime configuration. The file is **tracked in git** and has sensible defaults.

**Key sections**:
- `server {}` - HTTP server settings, base URL
- `auth_provider = "dex"` - Authentication provider selection
- `dex {}` - Dex OIDC configuration (default for local dev)
- `google_workspace {}` - Google Drive/Docs (optional, for production)
- `okta {}` - Okta OIDC (optional, for enterprise)
- `database {}` - PostgreSQL connection
- `search {}` - Meilisearch or Algolia configuration

**See**: `MEMO-014-config-hcl-docs.md` for complete reference.

## Authentication Providers

### Option 1: Dex (Recommended for Local Dev)

✅ **No external account needed**  
✅ **Test users pre-configured**  
✅ **Runs in Docker**

```bash
# Already running if you did docker compose up -d
docker compose ps dex

# Test users (from testing/dex-config.yaml):
# test@hermes.local / password
# admin@hermes.local / password
```

**See**: `MEMO-023-dex-quickstart.md` for Dex details.

### Option 2: Google Workspace (Production)

**Requires**:
- Google Cloud Project
- OAuth 2.0 Client ID
- Service Account with domain-wide delegation

**Setup**:
1. **Google Cloud Console** (https://console.cloud.google.com)
2. Enable APIs: Drive, Docs, Gmail, People
3. Create OAuth 2.0 Client ID (Web application)
4. Create Service Account, download JSON key
5. Update config.hcl:
   ```hcl
   auth_provider = "google"
   google_workspace {
     client_id = "your-client-id.apps.googleusercontent.com"
     credentials_file = "./credentials.json"
   }
   ```

### Option 3: Okta (Enterprise)

**Requires**:
- Okta developer account or org
- OIDC application configured

**Setup**:
1. Create OIDC app in Okta
2. Get client ID, client secret, domain
3. Update config.hcl:
   ```hcl
   auth_provider = "okta"
   okta {
     client_id = "your-okta-client-id"
     client_secret = "your-okta-secret"
     domain = "dev-12345.okta.com"
   }
   ```

**See**: `MEMO-008-auth-provider-quickref.md` for provider selection.

## Database Setup

**PostgreSQL** is required for document metadata.

### Local Development
```bash
# Use Docker (easiest)
docker compose up -d postgres

# Connection details (from docker-compose.yml):
# Host: localhost
# Port: 5432
# Database: hermes
# User: hermes
# Password: password
```

### Production
Update `config.hcl`:
```hcl
database {
  host = "your-postgres-host"
  port = 5432
  dbname = "hermes_prod"
  user = "hermes"
  password = "secure-password"
  sslmode = "require"
}
```

## Search Setup

**Meilisearch** (local dev) or **Algolia** (production).

### Meilisearch (Local Dev - Recommended)
```bash
# Use Docker (easiest)
docker compose up -d meilisearch

# Connection details:
# URL: http://localhost:7700
# API Key: (optional for local dev)
```

Config:
```hcl
search {
  provider = "meilisearch"
  meilisearch {
    url = "http://localhost:7700"
  }
}
```

### Algolia (Production)
1. Create Algolia account (https://www.algolia.com)
2. Get App ID and Admin API Key
3. Update config.hcl:
   ```hcl
   search {
     provider = "algolia"
     algolia {
       app_id = "your-app-id"
       admin_api_key = "your-admin-key"
     }
   }
   ```

## Frontend Setup

```bash
cd web

# Install dependencies (Yarn 4.10.3)
yarn install

# Development modes:
yarn start:proxy:local    # Native backend (port 8000)
yarn start:proxy:testing  # Docker backend (port 8001)
yarn start                # With Mirage mock API (no backend needed)
```

**See**: `MEMO-017-dev-quickref.md` for workflow details.

## Troubleshooting

### Backend won't start
```bash
# Check Dex is running
curl http://localhost:5556/dex/.well-known/openid-configuration

# Check Postgres is running
docker compose ps postgres

# Check config syntax
./hermes server -config=config.hcl -validate
```

### Frontend can't connect to backend
```bash
# Check backend is running
curl http://localhost:8000/health

# Check proxy is configured
# In web/package.json, verify HERMES_API_URL or use:
HERMES_API_URL=http://localhost:8000 yarn start:proxy
```

### "Authentication failed"
```bash
# Verify Dex users
cat testing/dex-config.yaml | grep -A 5 staticPasswords

# Check backend auth provider
grep auth_provider config.hcl
```

## Quick Reference Card

| Component | Port | Docker Service | Health Check |
|-----------|------|----------------|--------------|
| Backend | 8000 | (native) | `curl http://localhost:8000/health` |
| Frontend | 4200 | (native) | `curl http://localhost:4200/` |
| Postgres | 5432 | `postgres` | `docker compose ps postgres` |
| Meilisearch | 7700 | `meilisearch` | `curl http://localhost:7700/health` |
| Dex | 5556/5557 | `dex` | `curl http://localhost:5556/dex/.well-known/openid-configuration` |

**Testing Environment** (in `testing/`):
- Backend: 8001
- Frontend: 4201
- Postgres: 5433
- Meilisearch: 7701
- Dex: 5558/5559

## Next Steps

1. ✅ **Verify Setup**: Run `make canary` to test environment
2. 📚 **Read Architecture**: See `docs-internal/rfc/` and `docs-internal/adr/`
3. 🧪 **Run Tests**: `make go/test` (backend), `cd web && yarn test` (frontend)
4. 🎭 **E2E Tests**: See `MEMO-058-playwright-agent-guide.md`
5. 🚀 **Start Developing**: See `MEMO-017-dev-quickref.md` for workflows

## Common Development Workflows

See these memos for specific tasks:
- **MEMO-017**: Dev Quick Reference (native vs Docker workflows)
- **MEMO-023**: Dex Quick Start (local authentication)
- **MEMO-014**: Config HCL Documentation (all configuration options)
- **MEMO-058**: Playwright E2E Agent Guide (testing)
- **MEMO-010**: Ember Dev Server (frontend specifics)

## Help & Support

- **Issues**: File on GitHub repository
- **Documentation**: `docs-internal/` directory
- **Memos**: `docs-internal/memo/` for quick references
- **RFCs**: `docs-internal/rfc/` for design documents
- **ADRs**: `docs-internal/adr/` for architecture decisions
