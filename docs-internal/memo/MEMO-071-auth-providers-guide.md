---
id: MEMO-071
title: Authentication Providers Guide
date: 2025-10-09
type: Guide
status: Final
tags: [authentication, providers, google, okta, dex, configuration]
related:
  - MEMO-008
  - MEMO-023
  - RFC-007
  - RFC-009
  - ADR-072
---

# Authentication Providers Guide

Hermes supports three authentication providers with runtime selection:
1. **Dex OIDC** - For local development and testing
2. **Google OAuth** - For production with Google Workspace
3. **Okta OIDC** - For enterprise SSO

## Provider Selection

Set `auth_provider` in `config.hcl`:

```hcl
# Choose ONE:
auth_provider = "dex"      # Local development (recommended)
auth_provider = "google"   # Production (Google Workspace)
auth_provider = "okta"     # Enterprise (Okta SSO)
```

**See**: [MEMO-008: Auth Provider Quick Ref](MEMO-008-auth-provider-quickref.md) for runtime selection details.

## Provider Configurations

### Dex OIDC (Local Development)

**Best for**: Local development, CI/CD, testing, demos

**Advantages**:
- ✅ No external accounts needed
- ✅ Runs in Docker
- ✅ Pre-configured test users
- ✅ Fast iteration

**Configuration**:
```hcl
auth_provider = "dex"

dex {
  issuer_url = "http://localhost:5556/dex"
  client_id = "hermes-integration"
  client_secret = "ZXhhbXBsZS1hcHAtc2VjcmV0"
  redirect_url = "http://localhost:8000/auth/callback"
}
```

**Test Users** (from `testing/dex-config.yaml`):
```
test@hermes.local / password
admin@hermes.local / password
user@hermes.local / password
```

**Docker Setup**:
```bash
# Start Dex
docker compose up -d dex

# Verify
curl http://localhost:5556/dex/.well-known/openid-configuration
```

**See**: [MEMO-023: Dex Quick Start](MEMO-023-dex-quickstart.md) for complete Dex guide.

### Google OAuth (Production)

**Best for**: Production deployments with Google Workspace

**Advantages**:
- ✅ Integration with Google Drive/Docs
- ✅ Real user accounts
- ✅ Domain-wide delegation
- ✅ Production-ready

**Requirements**:
1. Google Cloud Project
2. OAuth 2.0 Client ID (Web application)
3. Service Account with domain-wide delegation
4. Enabled APIs: Drive, Docs, Gmail, People

**Configuration**:
```hcl
auth_provider = "google"

google_workspace {
  # OAuth 2.0 Client ID
  client_id = "your-client-id.apps.googleusercontent.com"
  client_secret = "your-client-secret"
  
  # Service Account for backend operations
  credentials_file = "./credentials.json"
  
  # OAuth scopes
  auth_scopes = [
    "openid",
    "email",
    "profile"
  ]
  
  # API scopes for service account
  scopes = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/documents"
  ]
}
```

**Setup Steps**:

1. **Create OAuth 2.0 Client ID**:
   - Google Cloud Console → APIs & Services → Credentials
   - Create OAuth client ID → Web application
   - Add authorized redirect URIs: `http://localhost:8000/auth/callback` (dev), `https://your-domain.com/auth/callback` (prod)
   - Save Client ID and Client Secret

2. **Create Service Account**:
   - IAM & Admin → Service Accounts → Create Service Account
   - Grant appropriate roles
   - Create JSON key → Save as `credentials.json`
   - Enable domain-wide delegation

3. **Enable APIs**:
   ```
   - Google Drive API
   - Google Docs API
   - Gmail API
   - Google People API
   ```

4. **Domain-Wide Delegation** (Admin SDK):
   - Admin Console → Security → API Controls
   - Add service account client ID
   - Authorize scopes

**Environment Variables** (optional override):
```bash
export GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
export GOOGLE_OAUTH_CLIENT_ID=your-client-id
export GOOGLE_OAUTH_CLIENT_SECRET=your-secret
```

### Okta OIDC (Enterprise)

**Best for**: Enterprise deployments with existing Okta infrastructure

**Advantages**:
- ✅ Enterprise SSO
- ✅ Centralized user management
- ✅ Compliance (SAML, MFA)
- ✅ Audit trails

**Requirements**:
1. Okta developer or enterprise account
2. OIDC application configured in Okta
3. Client ID and Client Secret

**Configuration**:
```hcl
auth_provider = "okta"

okta {
  client_id = "your-okta-client-id"
  client_secret = "your-okta-client-secret"
  domain = "dev-12345.okta.com"  # Your Okta domain
  
  # Optional: customize scopes
  scopes = ["openid", "email", "profile"]
  
  # Optional: custom authorization server
  auth_server_id = "default"
}
```

**Setup Steps**:

1. **Create OIDC Application in Okta**:
   - Applications → Create App Integration
   - Sign-in method: OIDC - OpenID Connect
   - Application type: Web Application
   - Sign-in redirect URIs: `http://localhost:8000/auth/callback` (dev), `https://your-domain.com/auth/callback` (prod)
   - Save Client ID and Client Secret

2. **Assign Users/Groups**:
   - Applications → Your App → Assignments
   - Assign users or groups who should have access

3. **Optional: Configure Authorization Server**:
   - Security → API → Authorization Servers
   - Customize claims, scopes, policies

## Frontend Configuration

**No frontend environment variables needed!** The frontend auto-configures via `/api/v2/web/config` API endpoint.

**How it works**:
1. Frontend calls `/api/v2/web/config` on startup
2. Backend returns runtime configuration:
   ```json
   {
     "auth_provider": "dex",
     "dex_issuer_url": "http://localhost:5556/dex",
     "dex_redirect_url": "http://localhost:8000/auth/callback",
     ...
   }
   ```
3. Frontend automatically configures the correct auth flow
4. API calls use `Authorization: Bearer {token}` header

**Legacy** (not needed anymore):
```bash
# ❌ OLD: Frontend environment variables
export HERMES_WEB_GOOGLE_OAUTH2_CLIENT_ID=...
export HERMES_WEB_ALGOLIA_APP_ID=...
export HERMES_WEB_ALGOLIA_SEARCH_API_KEY=...

# ✅ NEW: No frontend env vars needed!
cd web && yarn build
```

## Testing Each Provider

### Testing with Dex

```bash
# 1. Start Dex
docker compose up -d dex

# 2. Configure backend
# Edit config.hcl: auth_provider = "dex"

# 3. Start backend
./hermes server -config=config.hcl

# 4. Start frontend
cd web && yarn start:proxy:local

# 5. Login at http://localhost:4200
# Use: test@hermes.local / password
```

### Testing with Google

```bash
# 1. Configure backend
# Edit config.hcl: auth_provider = "google"
# Ensure credentials.json exists

# 2. Start backend
./hermes server -config=config.hcl

# 3. Start frontend
cd web && yarn start:proxy:local

# 4. Login at http://localhost:4200
# Use real Google Workspace account
```

### Testing with Okta

```bash
# 1. Configure backend
# Edit config.hcl: auth_provider = "okta"

# 2. Start backend
./hermes server -config=config.hcl

# 3. Start frontend
cd web && yarn start:proxy:local

# 4. Login at http://localhost:4200
# Use Okta account assigned to app
```

## Switching Providers

To switch providers, change `auth_provider` in `config.hcl` and restart:

```bash
# 1. Edit config.hcl
vim config.hcl  # Change auth_provider = "..."

# 2. Restart backend
pkill -f "hermes server"
./hermes server -config=config.hcl

# 3. Frontend auto-detects change (no restart needed)
# Refresh browser at http://localhost:4200
```

## Troubleshooting

### "Authentication failed" with Dex

**Check**:
```bash
# Verify Dex is running
docker compose ps dex
curl http://localhost:5556/dex/.well-known/openid-configuration

# Check backend config
grep -A 10 "^dex {" config.hcl

# Verify redirect URL matches
# In config.hcl: redirect_url = "http://localhost:8000/auth/callback"
```

### "Invalid client" with Google

**Check**:
1. Client ID matches in config.hcl and Google Cloud Console
2. Redirect URI authorized in Google Cloud Console
3. APIs enabled (Drive, Docs, Gmail, People)
4. Service account has domain-wide delegation

### "Unauthorized" with Okta

**Check**:
1. User is assigned to the Okta application
2. Client ID/secret are correct
3. Domain matches (e.g., `dev-12345.okta.com`)
4. Redirect URI configured in Okta app

### Frontend not redirecting to auth

**Check**:
```bash
# Verify backend /api/v2/web/config returns correct provider
curl http://localhost:8000/api/v2/web/config | jq .

# Should show:
# {
#   "auth_provider": "dex",  # or google, okta
#   "dex_issuer_url": "...",  # if Dex
#   ...
# }
```

### Session expires immediately

**Check**:
1. Backend `server.cookie_secure = false` for localhost
2. Backend `server.base_url` matches frontend URL
3. Browser allows cookies for localhost

## Security Considerations

### Dex (Development Only)
- ⚠️ Not for production use
- ⚠️ Insecure default passwords
- ✅ Safe for local dev and CI/CD

### Google (Production)
- ✅ OAuth 2.0 with PKCE
- ✅ Domain-wide delegation for service account
- ✅ Secure credential storage
- ⚠️ Rotate client secrets regularly
- ⚠️ Monitor service account usage

### Okta (Enterprise)
- ✅ Enterprise-grade security
- ✅ MFA support
- ✅ Audit logging
- ⚠️ Rotate client secrets regularly
- ⚠️ Review assigned users periodically

## Architecture Diagrams

See [AUTH_ARCHITECTURE_DIAGRAMS.md](../AUTH_ARCHITECTURE_DIAGRAMS.md) for complete authentication flow diagrams showing:
- Google OAuth flow
- Okta OIDC flow
- Dex OIDC flow
- Session management
- Token handling

## References

**Configuration**:
- `config.hcl` - Main configuration file
- `testing/dex-config.yaml` - Dex OIDC configuration

**Documentation**:
- MEMO-008: Auth Provider Quick Reference
- MEMO-023: Dex Quick Start
- RFC-007: Multi-Provider Auth Architecture
- RFC-009: Auth Provider Selection
- ADR-072: Dex OIDC Authentication Decision

**External**:
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Okta OIDC Documentation](https://developer.okta.com/docs/guides/)
- [Dex Documentation](https://dexidp.io/docs/)
