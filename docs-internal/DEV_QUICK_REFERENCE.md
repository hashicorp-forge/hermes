# Hermes Development Quick Reference

## TL;DR - Common Commands

```bash
# Quick start: Native backend + Native frontend
./scripts/dev-env.sh  # Choose option 1

# Quick start: Testing backend + Native frontend  
./scripts/dev-env.sh  # Choose option 2

# Quick start: Fully containerized
./scripts/dev-env.sh  # Choose option 3

# Check what's running
./scripts/dev-env.sh  # Choose option 4

# Stop everything
./scripts/dev-env.sh  # Choose option 5
```

## Development Workflows

### 🟢 Workflow 1: Native Backend + Native Frontend (Recommended for Development)

**When to use**: Active backend development, fast iteration, debugging

**Ports**: Backend 8000, Frontend 4200

```bash
# Terminal 1: Dependencies + Backend
docker compose up -d dex postgres meilisearch
make bin
./hermes server -config=config.hcl

# Terminal 2: Frontend
cd web
yarn start:proxy:local
```

**Access**: http://localhost:4200

---

### 🔵 Workflow 2: Testing Backend (Docker) + Native Frontend

**When to use**: Frontend-only development, testing against stable backend

**Ports**: Backend 8001, Frontend 4200

```bash
# Terminal 1: Testing Backend
cd testing
docker compose up -d hermes

# Terminal 2: Frontend
cd web
yarn start:proxy:testing
```

**Access**: http://localhost:4200

---

### 🟡 Workflow 3: Fully Containerized

**When to use**: Integration testing, QA, demos

**Ports**: Backend 8001, Frontend 4201

```bash
cd testing
docker compose up -d
```

**Access**: http://localhost:4201

---

## Port Reference

| Service | Native | Testing | Notes |
|---------|--------|---------|-------|
| **Frontend** | 4200 | 4201 | Ember dev server |
| **Backend** | 8000 | 8001 | Hermes API |
| PostgreSQL | 5432 | 5433 | Database |
| Meilisearch | 7700 | 7701 | Search |
| Dex | 5556/5557 | 5558/5559 | OIDC |

## npm Scripts Reference

```bash
# In web/ directory:

yarn start                 # Ember with Mirage (mock API)
yarn start:proxy           # Native, proxies to $HERMES_API_URL (default: localhost:8000)
yarn start:proxy:local     # Native, proxies to localhost:8000
yarn start:proxy:testing   # Native, proxies to localhost:8001
yarn start:with-proxy      # Alias for start:proxy:testing (legacy)
```

## Health Checks

```bash
# Check if services are running
curl http://localhost:8000/health  # Native backend
curl http://localhost:8001/health  # Testing backend
curl http://localhost:4200/        # Native frontend
curl http://localhost:4201/        # Testing frontend

# Check what's listening on ports
lsof -i :8000  # Native backend
lsof -i :8001  # Testing backend
lsof -i :4200  # Native frontend
lsof -i :4201  # Testing frontend
```

## Common Issues & Solutions

### Frontend shows "ECONNREFUSED"

**Cause**: Backend not running on expected port

**Solution**:
```bash
# Check which backend is running
lsof -i :8000
lsof -i :8001

# Make sure you're using the matching script:
yarn start:proxy:local    # for port 8000
yarn start:proxy:testing  # for port 8001
```

### Authentication redirects to wrong URL

**Cause**: Backend `base_url` doesn't match frontend URL

**Solution**:
- Native frontend: Backend should have `base_url = "http://localhost:4200"`
- Testing frontend: Backend should have `base_url = "http://localhost:4201"`

Check: `curl http://localhost:BACKEND_PORT/api/v2/web/config | jq '.dex_redirect_url'`

### Page shows loading spinner forever

**Cause**: `/api/v2/me` returns 401 (not authenticated)

**Solution**:
1. Navigate to `/authenticate`
2. Click "Authenticate with Dex"
3. Login with test@hermes.local / password

### Docker container won't start

**Cause**: Port conflict or previous container still running

**Solution**:
```bash
# Stop all
cd testing
docker compose down

cd ..
docker compose down

# Start fresh
cd testing
docker compose up -d
```

## Environment Variables

### Backend
```bash
# In testing/docker-compose.yml or testing/config.hcl
HERMES_BASE_URL=http://localhost:4201  # Where to redirect after auth
```

### Frontend (Docker)
```bash
# In testing/docker-compose.yml
HERMES_API_URL=http://hermes:8000  # Docker service name
```

### Frontend (Native)
```bash
# Not needed - use npm scripts
yarn start:proxy:local    # Uses localhost:8000
yarn start:proxy:testing  # Uses localhost:8001

# Or override:
HERMES_API_URL=http://localhost:9000 yarn start:proxy
```

## Debugging

### View Logs

```bash
# Native backend
tail -f /tmp/hermes-backend.log

# Native frontend
tail -f /tmp/ember-proxy.log

# Testing backend (Docker)
cd testing
docker compose logs -f hermes

# Testing frontend (Docker)
cd testing
docker compose logs -f web
```

### Browser DevTools

1. Open http://localhost:4200 (or 4201)
2. Open DevTools (F12)
3. Network tab: Check API calls
4. Console tab: Check for errors

### Playwright-MCP

```bash
# Use browser automation for debugging
# (requires playwright-mcp setup)
```

## Test Credentials

From `testing/dex-config.yaml`:

| Email | Password | Groups |
|-------|----------|--------|
| test@hermes.local | password | users, testers |
| admin@hermes.local | password | users, admins |
| user@hermes.local | password | users |

## Quick Cleanup

```bash
# Stop everything
./scripts/dev-env.sh  # Choose option 5

# Or manually:
pkill -f "hermes server"           # Kill native backend
lsof -ti :4200 | xargs kill -9     # Kill native frontend
cd testing && docker compose down  # Stop testing
cd .. && docker compose down       # Stop root dependencies
```

## File Locations

```
hermes/
├── config.hcl                  # Native backend config
├── testing/
│   ├── config.hcl              # Testing backend config
│   └── docker-compose.yml      # Testing environment
├── docker-compose.yml          # Root dependencies (dex, postgres, meilisearch)
├── web/
│   ├── package.json            # Frontend scripts
│   └── Dockerfile              # Frontend Docker build
└── scripts/
    └── dev-env.sh              # Environment selector
```

## Need Help?

1. Check `docs-internal/FRONTEND_PROXY_CONFIGURATION.md` for detailed proxy info
2. Check `docs-internal/TESTING_DOCKER_COMPOSE_DEBUG_2025_10_08.md` for auth flow
3. Run `./scripts/dev-env.sh` option 4 to check status
4. Check logs (see Debugging section above)
