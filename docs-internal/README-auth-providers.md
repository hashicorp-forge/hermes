# Authentication Provider Testing Guide

This directory contains configuration examples for testing Hermes with different authentication providers.

## Configuration Files

- **`config-dex.hcl`** - Dex OIDC authentication (for local/CI testing)
- **`config.hcl`** - Default configuration (may use Google OAuth)

## Quick Start with Dex

### 1. Start Dex Server

```bash
# Using the provided dex-config.yaml
docker run -d \
  --name dex \
  -p 5556:5556 \
  -v $(pwd)/dex-config.yaml:/etc/dex/config.yaml \
  ghcr.io/dexidp/dex:latest \
  dex serve /etc/dex/config.yaml
```

### 2. Build Hermes

```bash
cd /Users/jrepp/hc/hermes

# Backend - no changes needed
make bin

# Web frontend - NO AUTHENTICATION ENV VARS NEEDED!
cd web
yarn build
# Notice: No GOOGLE_OAUTH2_CLIENT_ID required
# Notice: No ALGOLIA credentials required
```

### 3. Run Hermes with Dex Config

```bash
./build/bin/hermes server -config=testing/config-dex.hcl
```

### 4. Access Application

Open browser to `http://localhost:8080`

The frontend will:
1. Call `/api/v2/web/config` to get runtime configuration
2. Receive `{ "auth_provider": "dex", "dex_issuer_url": "...", ... }`
3. Automatically configure Dex authentication
4. Use `Authorization: Bearer {token}` header for API calls

## Configuration Comparison

### Using Google OAuth

**Backend `config.hcl`**:
```hcl
google_workspace {
  oauth2 {
    client_id = "123-abc.apps.googleusercontent.com"
    hd        = "hashicorp.com"
  }
  # ... other Google Workspace config
}
```

**Web Build**:
```bash
# Optional: Can provide Google OAuth client ID
export HERMES_WEB_GOOGLE_OAUTH2_CLIENT_ID="123-abc.apps.googleusercontent.com"
cd web && yarn build
```

**Runtime Result**: `auth_provider = "google"`

---

### Using Dex OIDC

**Backend `config-dex.hcl`**:
```hcl
dex {
  issuer_url    = "http://localhost:5556/dex"
  client_id     = "hermes-client"
  client_secret = "hermes-secret"
  redirect_url  = "http://localhost:8080/callback"
  disabled      = false
}
```

**Web Build**:
```bash
# No authentication env vars needed!
cd web && yarn build
```

**Runtime Result**: `auth_provider = "dex"`

---

### Using Okta OIDC

**Backend `config-okta.hcl`**:
```hcl
okta {
  auth_server_url = "https://hashicorp.okta.com/oauth2/default"
  aws_region      = "us-west-2"
  client_id       = "okta-client-id"
  jwt_signer      = "arn:aws:elasticloadbalancing:..."
  disabled        = false
}
```

**Web Build**:
```bash
# No authentication env vars needed!
cd web && yarn build
```

**Runtime Result**: `auth_provider = "okta"`

## Docker Compose with Dex

Update `docker-compose.yml`:

```yaml
version: '3.8'

services:
  dex:
    image: ghcr.io/dexidp/dex:latest
    ports:
      - "5556:5556"
    volumes:
      - ./dex-config.yaml:/etc/dex/config.yaml
    command: ["dex", "serve", "/etc/dex/config.yaml"]

  postgres:
    image: postgres:17.1-alpine
    environment:
      POSTGRES_DB: hermes
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  hermes:
    build:
      context: ..
      dockerfile: testing/Dockerfile.hermes
    ports:
      - "8080:8000"
    depends_on:
      - postgres
      - dex
    volumes:
      - ./config-dex.hcl:/config.hcl
      - ../workspace_data:/workspace_data
    command: ["server", "-config=/config.hcl"]

  web:
    build:
      context: ../web
      dockerfile: ../testing/Dockerfile.web
      args:
        # No authentication credentials needed!
        # No Algolia credentials needed!
        HERMES_WEB_GOOGLE_OAUTH2_CLIENT_ID: ""
    ports:
      - "4200:80"
    depends_on:
      - hermes

volumes:
  postgres_data:
```

## Testing Different Providers

### Test Google OAuth
```bash
cp configs/config.hcl testing/config.hcl
# Edit to ensure google_workspace block is configured
./build/bin/hermes server -config=testing/config.hcl
```

### Test Dex OIDC
```bash
./build/bin/hermes server -config=testing/config-dex.hcl
```

### Test Okta OIDC
```bash
cp testing/config-okta.hcl testing/config.hcl
./build/bin/hermes server -config=testing/config.hcl
```

## Verification

### Check Runtime Auth Provider

```bash
# After starting Hermes, check the config endpoint
curl http://localhost:8080/api/v2/web/config | jq '{
  auth_provider,
  dex_issuer_url,
  google_oauth2_client_id,
  skip_google_auth
}'
```

**Expected for Dex**:
```json
{
  "auth_provider": "dex",
  "dex_issuer_url": "http://localhost:5556/dex",
  "google_oauth2_client_id": "",
  "skip_google_auth": true
}
```

**Expected for Google**:
```json
{
  "auth_provider": "google",
  "dex_issuer_url": "",
  "google_oauth2_client_id": "123-abc.apps.googleusercontent.com",
  "skip_google_auth": false
}
```

### Check Search Proxy

```bash
# Search requests go through backend proxy (no direct Algolia access)
curl -H "Authorization: Bearer {your-token}" \
  http://localhost:8080/1/indexes/docs/query \
  -d '{"query":"test"}'
```

Backend will forward to Algolia with its own credentials.

## Key Benefits

✅ **Single Web Build** - Same build works with any auth provider  
✅ **No External Credentials at Build Time** - Auth config comes from backend at runtime  
✅ **Easy Provider Switching** - Just change backend config, no rebuild needed  
✅ **Testing-Friendly** - Use Dex for CI/testing, Google/Okta for production  
✅ **Search Simplified** - All search goes through backend proxy, no direct Algolia access

## Troubleshooting

### Frontend shows wrong auth provider
- Check `/api/v2/web/config` response
- Verify only one auth block is enabled in backend config (not disabled)

### Authentication fails
- **Google**: Check OAuth client ID and HD (hosted domain)
- **Dex**: Verify Dex server is running and issuer URL is accessible
- **Okta**: Check AWS ALB JWT headers are present

### Search doesn't work
- Verify backend has valid Algolia credentials in config
- Check backend logs for Algolia proxy errors
- Ensure `/1/indexes/*` endpoint is accessible (authenticated)

## References

- **Implementation**: `/docs-internal/SEARCH_AND_AUTH_REFACTORING.md`
- **Analysis**: `/docs-internal/WEB_EXTERNAL_DEPENDENCIES_ANALYSIS.md`
- **Dex Documentation**: https://dexidp.io/docs/
