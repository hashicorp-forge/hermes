# Hermes Frontend Proxy Configuration Guide

## Problem Statement

The Hermes frontend needs to proxy API requests to the backend, but the backend URL differs depending on the execution context:

- **Docker Container**: Uses Docker network hostname `http://hermes:8000`
- **Native Development**: Uses localhost `http://localhost:8000` or `http://localhost:8001` (testing)

This creates a challenge when switching between containerized and native development workflows.

## Solution: Environment-Based Proxy Configuration

### Architecture

Use the `HERMES_API_URL` environment variable with context-appropriate defaults:

| Context | Backend URL | Environment Variable |
|---------|-------------|---------------------|
| Docker (testing) | `http://hermes:8000` | `HERMES_API_URL=http://hermes:8000` |
| Native (local dev) | `http://localhost:8000` | `HERMES_API_URL=http://localhost:8000` |
| Native (testing backend) | `http://localhost:8001` | `HERMES_API_URL=http://localhost:8001` |

### Implementation

#### 1. Docker Configuration (Current - Already Correct)

**File**: `web/Dockerfile`
```dockerfile
CMD ["sh", "-c", "yarn ember server --proxy ${HERMES_API_URL:-http://hermes:8000} --port 4200 --host 0.0.0.0"]
```

**File**: `testing/docker-compose.yml`
```yaml
web:
  environment:
    HERMES_API_URL: http://hermes:8000  # Uses Docker service name
```

#### 2. Native Development Scripts

**File**: `web/package.json` (Updated)

Add these scripts:

```json
{
  "scripts": {
    "start": "ember serve",
    
    // Local development (native backend on port 8000)
    "start:proxy": "MIRAGE_ENABLED=false ember server --port 4200 --proxy ${HERMES_API_URL:-http://localhost:8000}",
    
    // Testing environment (docker backend on port 8001)
    "start:proxy:testing": "MIRAGE_ENABLED=false ember server --port 4200 --proxy http://localhost:8001",
    
    // Explicit local (for clarity)
    "start:proxy:local": "MIRAGE_ENABLED=false ember server --port 4200 --proxy http://localhost:8000",
    
    // Legacy alias (proxies to testing backend)
    "start:with-proxy": "MIRAGE_ENABLED=false ember server --port 4200 --proxy http://localhost:8001"
  }
}
```

### Usage

#### Development Workflow 1: Docker Backend (Testing Environment)

```bash
# Terminal 1: Start testing backend
cd testing
docker compose up -d hermes dex postgres meilisearch
# Backend available at http://localhost:8001

# Terminal 2: Start native frontend
cd web
yarn start:proxy:testing
# Frontend at http://localhost:4200 → proxies to http://localhost:8001
```

#### Development Workflow 2: Native Backend + Native Frontend

```bash
# Terminal 1: Start native backend
docker compose up -d dex postgres meilisearch  # Root docker-compose
./hermes server -config=config.hcl
# Backend available at http://localhost:8000

# Terminal 2: Start native frontend
cd web
yarn start:proxy:local  # or just yarn start:proxy (defaults to 8000)
# Frontend at http://localhost:4200 → proxies to http://localhost:8000
```

#### Development Workflow 3: Fully Containerized (Testing)

```bash
cd testing
docker compose up -d
# Backend: http://localhost:8001
# Frontend: http://localhost:4201 (uses internal http://hermes:8000)
```

### Environment Variable Override

You can always override the proxy URL:

```bash
# Custom backend URL
HERMES_API_URL=http://localhost:9000 yarn start:proxy

# Backend on different machine
HERMES_API_URL=http://192.168.1.100:8000 yarn start:proxy
```

### Shell Aliases (Optional)

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
# Hermes development aliases
alias hermes-dev-native='cd ~/hc/hermes && docker compose up -d dex postgres meilisearch && ./hermes server -config=config.hcl'
alias hermes-web-local='cd ~/hc/hermes/web && yarn start:proxy:local'
alias hermes-web-testing='cd ~/hc/hermes/web && yarn start:proxy:testing'
alias hermes-docker-testing='cd ~/hc/hermes/testing && docker compose up -d'
```

## Port Reference

| Service | Native Dev | Testing Docker | Notes |
|---------|-----------|----------------|-------|
| Frontend | 4200 | 4201 | Ember dev server |
| Backend | 8000 | 8001 | Hermes API |
| PostgreSQL | 5432 | 5433 | Database |
| Meilisearch | 7700 | 7701 | Search |
| Dex | 5556/5557 | 5558/5559 | OIDC provider |

## Troubleshooting

### Issue: "ECONNREFUSED localhost:8000"

**Cause**: Backend is not running or running on different port

**Solutions**:
1. Check backend is running: `lsof -i :8000` or `lsof -i :8001`
2. Verify backend health: `curl http://localhost:8000/health`
3. Use correct proxy script for your backend port

### Issue: "Proxy timeout" or slow responses

**Cause**: Backend is slow or not healthy

**Solutions**:
1. Check backend logs for errors
2. Verify all dependencies running (postgres, dex, meilisearch)
3. Increase Ember proxy timeout (if needed)

### Issue: CORS errors despite proxy

**Cause**: Direct API calls bypassing proxy

**Solutions**:
1. Ensure `MIRAGE_ENABLED=false` is set
2. Check that API calls use relative paths (`/api/v2/...` not `http://localhost:8000/api/v2/...`)
3. Verify Ember proxy is working: check console for proxy requests

## Best Practices

### 1. Always Use Environment Variables

Don't hardcode URLs in scripts. Use `${HERMES_API_URL:-default}` pattern.

### 2. Document Your Workflow

When switching between workflows, document which ports you're using:

```bash
# In your terminal or commit message
# Backend: localhost:8000 (native)
# Frontend: localhost:4200 (native, proxying to 8000)
```

### 3. Consistent Port Allocation

Follow the established convention:
- Native = standard ports (4200, 8000, 5432, 7700, 5556)
- Testing = +1 ports (4201, 8001, 5433, 7701, 5558)

### 4. Use Health Checks

Before starting frontend, verify backend:

```bash
curl http://localhost:8000/health  # Native backend
curl http://localhost:8001/health  # Testing backend
```

### 5. Script Organization

Keep proxy scripts explicit:
- `start:proxy:local` - Clearly indicates localhost:8000
- `start:proxy:testing` - Clearly indicates localhost:8001
- Avoid ambiguous script names like just `start:proxy`

## Configuration Files Summary

### Required Changes

**1. Update `web/package.json`** (see scripts above)

**2. Verify `web/Dockerfile`** (already correct):
```dockerfile
CMD ["sh", "-c", "yarn ember server --proxy ${HERMES_API_URL:-http://hermes:8000} --port 4200 --host 0.0.0.0"]
```

**3. Verify `testing/docker-compose.yml`** (already correct):
```yaml
web:
  environment:
    HERMES_API_URL: http://hermes:8000
```

### No Changes Required

- `.ember-cli` - Uses defaults
- Ember build configuration - Proxy is CLI-only
- Backend configuration - Unaffected by proxy

## Testing the Setup

### Quick Verification

```bash
# Test 1: Native frontend → Testing backend
cd web
yarn start:proxy:testing &
sleep 10
curl -I http://localhost:4200/api/v2/web/config
# Should return 200 OK

# Test 2: Native frontend → Native backend
killall node  # Stop previous frontend
docker compose up -d dex postgres meilisearch
./hermes server -config=config.hcl &
cd web
yarn start:proxy:local &
sleep 10
curl -I http://localhost:4200/api/v2/web/config
# Should return 200 OK
```

### E2E Test Verification

```bash
# Run Playwright tests against native frontend + testing backend
cd tests/e2e-playwright
TEST_ENV=local yarn playwright test
```

## Conclusion

The key to managing proxy configuration across Docker and native environments is:

1. **Use environment variables** with sensible defaults
2. **Explicit npm scripts** for each backend target
3. **Consistent port conventions** (native vs testing)
4. **Document the active workflow** in your terminal/commits

This approach eliminates hardcoded URLs and makes switching between development modes straightforward.
