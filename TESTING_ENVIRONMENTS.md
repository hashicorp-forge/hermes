# Hermes Testing Environments

Hermes provides two complementary testing setups for different use cases.

## 🔧 Local Development Environment (Root)

**Location**: Root `docker-compose.yml`  
**Purpose**: Backend services only for local development  
**What you get**: PostgreSQL + Meilisearch

```bash
# Start services
docker-compose up -d

# Run local Hermes binary
./build/bin/hermes server -config=config.hcl

# Run local web dev server
cd web && yarn start:with-proxy

# Test connectivity
make canary
```

**When to use**:
- ✅ Local development with hot reload
- ✅ Testing code changes quickly
- ✅ Debugging with direct access to code
- ✅ IDE debugging and breakpoints

**Ports**:
- PostgreSQL: `5432`
- Meilisearch: `7700`
- Hermes (local): `8000`
- Web (local): `4200`

---

## 🐳 Containerized Testing Environment (./testing/)

**Location**: `./testing/docker-compose.yml`  
**Purpose**: Full stack in containers for integration testing  
**What you get**: PostgreSQL + Meilisearch + Hermes Backend + Web Frontend

```bash
# Quick start
cd testing
./quick-test.sh

# Or use Make
make testing/up        # Start everything
make testing/test      # Run canary test
make testing/down      # Stop everything
```

**When to use**:
- ✅ Integration testing
- ✅ CI/CD pipelines
- ✅ Production-like environment
- ✅ Testing deployment configurations
- ✅ End-to-end testing
- ✅ Demonstrating the full application

**Ports** (different to avoid conflicts):
- PostgreSQL: `5433`
- Meilisearch: `7701`
- Hermes API: `8001`
- Web UI: `4201`

---

## Comparison

| Feature | Local Dev | Containerized Testing |
|---------|-----------|----------------------|
| **Setup Speed** | Fast (services only) | Slower (full build) |
| **Hot Reload** | ✅ Yes | ❌ No (rebuild needed) |
| **Debugging** | ✅ Easy | ⚠️ Limited |
| **Isolation** | ⚠️ Shared ports | ✅ Fully isolated |
| **Production-like** | ❌ No | ✅ Yes |
| **CI/CD Ready** | ❌ No | ✅ Yes |
| **Web Frontend** | Local dev server | Nginx production build |
| **Configuration** | config.hcl | Environment variables |

---

## Recommended Workflows

### Daily Development
```bash
# Start backend services
docker-compose up -d

# Build and run Hermes locally
make bin
./hermes server -config=config.hcl

# In another terminal: Run web dev server
cd web
yarn start:with-proxy

# Validate setup
make canary
```

### Pre-Commit Testing
```bash
# Test with containerized environment
cd testing
make test

# Or from root
make testing/test
```

### CI/CD Pipeline
```bash
# In .github/workflows or similar
- name: Run integration tests
  run: |
    cd testing
    make up
    make canary
    make down
```

### Demonstrating Features
```bash
# Start complete stack
cd testing
./quick-test.sh

# Open http://localhost:4201 in browser
# Show full application running
```

---

## Quick Command Reference

### Local Development
```bash
# Services
docker-compose up -d              # Start services
docker-compose down               # Stop services
docker-compose ps                 # Check status

# Build and test
make bin                          # Build Hermes binary
make canary                       # Test local setup
./hermes server                   # Run server locally
```

### Containerized Testing
```bash
# From root
make testing/up                   # Start containers
make testing/test                 # Run tests
make testing/down                 # Stop containers
make testing/clean                # Stop and remove volumes

# From testing/
make up                           # Start with auto-build
make build                        # Rebuild containers
make logs                         # View logs
make canary                       # Run canary test
make open                         # Open in browser
make clean                        # Full cleanup
```

---

## Troubleshooting

### Port Conflicts
If you get "port already in use" errors:
- **Local dev**: Check if containerized env is running (`cd testing && make down`)
- **Containerized**: Ports are different (5433, 7701, 8001, 4201) to avoid conflicts

### Services Not Healthy
```bash
# Local dev
docker-compose logs postgres
docker-compose logs meilisearch

# Containerized
cd testing
make logs-postgres
make logs-meilisearch
```

### Build Failures
```bash
# Containerized: Rebuild without cache
cd testing
make rebuild
```

### Database Issues
```bash
# Local dev: Reset database
docker-compose down -v
docker-compose up -d

# Containerized: Reset all data
cd testing
make clean
make up
```

---

## Architecture Diagrams

### Local Development
```
┌─────────────┐     ┌──────────────┐
│  Browser    │────▶│  Web (Yarn)  │
│ :4200       │     │  localhost   │
└─────────────┘     └──────┬───────┘
                           │
                    ┌──────▼────────┐
                    │  Hermes (Go)  │
                    │  ./hermes     │
                    │  localhost    │
                    └──┬─────────┬──┘
                       │         │
        ┌──────────────▼┐  ┌────▼──────────┐
        │  PostgreSQL   │  │  Meilisearch  │
        │  Docker :5432 │  │  Docker :7700 │
        └───────────────┘  └───────────────┘
```

### Containerized Testing
```
┌─────────────┐     ┌──────────────────┐
│  Browser    │────▶│  Web (Nginx)     │
│ :4201       │     │  Docker :4201    │
└─────────────┘     └──────┬───────────┘
                           │ /api/*
                    ┌──────▼────────────┐
                    │  Hermes Backend   │
                    │  Docker :8001     │
                    └──┬─────────────┬──┘
                       │             │
        ┌──────────────▼──┐  ┌──────▼────────┐
        │  PostgreSQL     │  │  Meilisearch  │
        │  Docker :5433   │  │  Docker :7701 │
        └─────────────────┘  └───────────────┘
        
        All in isolated hermes-test network
```

---

## Files and Directories

```
hermes/
├── docker-compose.yml          # Local dev services
├── Makefile                    # Root make targets
├── scripts/
│   ├── canary-local.sh        # Local canary test
│   └── README.md
└── testing/                    # Complete containerized environment
    ├── docker-compose.yml     # Full stack definition
    ├── Dockerfile.hermes      # Backend container
    ├── Dockerfile.web         # Frontend container
    ├── nginx.conf             # Web server config
    ├── config.hcl             # Test configuration
    ├── Makefile               # Testing commands
    ├── quick-test.sh          # One-command startup
    └── README.md              # Detailed documentation
```

---

## Current Status

### ✅ Working
- **Local Development Environment**: Fully functional
  - PostgreSQL and Meilisearch services run in Docker
  - Hermes binary runs locally with hot reload
  - Web dev server with live updates
  - Canary test validates end-to-end functionality

### 🚧 In Progress
- **Containerized Testing Environment**: Build infrastructure complete, runtime blocked
  - ✅ Docker builds complete successfully (11.5s)
  - ✅ PostgreSQL container starts and passes health checks
  - ✅ Meilisearch container starts and passes health checks
  - ✅ Web container builds with pre-built assets
  - ❌ Hermes container fails at runtime (Algolia dependency)

### 🔴 Known Issues

**Hermes Server Requires Algolia Connection**

The Hermes server command currently requires a working Algolia connection even in test/development mode. This blocks the containerized testing environment from starting.

**Error**: `error initializing Algolia write client: all hosts have been contacted unsuccessfully`

**Root Cause**: Server initialization unconditionally connects to Algolia for search indexing, unlike the canary command which supports `-search-backend` flag.

**Workarounds**:
1. **Use Local Development** (recommended): Run hermes locally with local/meilisearch adapter
2. **Mock Algolia**: Set up mock Algolia service in docker-compose
3. **Code Change**: Add `-search-backend` flag to server command (like canary has)

## Next Steps

1. **For Development** (✅ RECOMMENDED): Use local dev environment
   ```bash
   docker-compose up -d
   make bin
   make canary
   ```

2. **For Testing** (🚧 BLOCKED): Containerized environment needs fix
   ```bash
   # Blocked: Requires Algolia or search backend abstraction
   cd testing
   ./quick-test.sh  # Will fail at hermes startup
   ```

3. **For Contributors**: Fix the Algolia dependency
   - Add search backend selection to server command
   - Or add conditional Algolia initialization
   - Reference: `internal/cmd/commands/canary/canary.go` (has `-search-backend` flag)

4. **Read the Docs**:
   - `scripts/README.md` - Canary test details
   - `testing/README.md` - Full containerized setup guide
   - `.github/copilot-instructions.md` - Build standards and workflows
