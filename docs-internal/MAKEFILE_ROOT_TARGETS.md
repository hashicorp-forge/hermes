---
id: makefile-root-targets
title: Root Makefile Quick Start Targets
date: 2025-10-09
type: memo
status: active
tags: [development, makefile, tooling]
---

# Root Makefile Quick Start Targets

This document describes the quick-start targets added to the root Makefile for easier development workflows.

## 🚀 Quick Start Targets

### `make up`
**Start full testing environment (all services in Docker)**

Starts the complete containerized testing environment with all services:
- Frontend (Ember.js) on port 4201
- Backend (Go) on port 8001  
- PostgreSQL on port 5433
- Meilisearch on port 7701
- Dex (OIDC provider) on ports 5558/5559

```bash
make up
# Access at:
# Frontend: http://localhost:4201
# Backend:  http://localhost:8001
# Dex:      http://localhost:5558
```

**Use case**: Full integration testing, E2E tests, or when you want everything running in containers.

### `make down`
**Stop testing environment**

Stops all containerized testing services:

```bash
make down
```

### `make canary`
**Run canary test against local docker-compose**

Runs the canary test script that validates the full testing environment:

```bash
make canary
```

This script:
1. Ensures docker-compose services are running
2. Builds the hermes binary if needed
3. Runs health checks against all services
4. Shows colored output for easy status reading

### `make web/proxy`
**Start web with auto-detected proxy to backend**

Starts the Ember.js frontend with automatic backend detection:

```bash
make web/proxy
```

**Smart proxy detection**:
- If port 8001 is active → proxies to testing backend (Docker)
- If port 8000 is active → proxies to native backend
- If neither is active → shows error with instructions

**Use case**: Develop frontend changes against either native or containerized backend without changing configuration.

## 🔄 Common Workflows

### Workflow 1: Full Testing Environment (Docker)

```bash
# Start everything in containers
make up

# Access frontend at http://localhost:4201
# Backend API at http://localhost:8001

# Run canary to validate
make canary

# Stop when done
make down
```

### Workflow 2: Native Backend + Native Frontend

```bash
# Terminal 1: Start backend
make bin
./hermes server -config=config.hcl

# Terminal 2: Start frontend with proxy
cd web
make web/proxy  # Auto-detects port 8000
```

### Workflow 3: Testing Backend + Native Frontend

**Good for playwright-mcp E2E testing**:

```bash
# Start testing environment (backend in Docker)
make up

# Frontend in another terminal (proxies to port 8001)
make web/proxy  # Auto-detects port 8001

# Run E2E tests
cd tests/e2e-playwright
npx playwright test --reporter=line
```

### Workflow 4: Quick Validation

```bash
# Start everything
make up

# Wait 30 seconds for all services to be healthy
sleep 30

# Run canary test
make canary

# Expected output: All green ✓ checks
```

## 📊 Port Reference

| Service      | Native Ports | Testing Ports (Docker) |
|-------------|--------------|------------------------|
| Frontend    | 4200         | 4201                   |
| Backend     | 8000         | 8001                   |
| PostgreSQL  | 5432         | 5433                   |
| Meilisearch | 7700         | 7701                   |
| Dex (HTTP)  | 5556         | 5558                   |
| Dex (gRPC)  | 5557         | 5559                   |

## 🎯 Target Dependencies

```
make up
  └─> cd testing && docker compose up --build -d
  
make down
  └─> cd testing && docker compose down
  
make canary
  └─> ./scripts/canary-local.sh
  
make web/proxy
  └─> make web/install-deps
  └─> Auto-detect backend (8001 or 8000)
  └─> yarn ember server --proxy <detected-backend>
```

## 🔍 Implementation Details

### `make up` Implementation

```makefile
.PHONY: up
up: ## Start full testing environment (all services in Docker)
	@echo "Starting containerized testing environment..."
	@cd testing && docker compose up --build -d
	@echo "Waiting for services to be healthy..."
	@sleep 5
	@cd testing && docker compose ps
	@echo ""
	@echo "✓ Testing environment ready!"
	@echo "  Frontend: http://localhost:4201"
	@echo "  Backend:  http://localhost:8001"
	@echo "  Dex:      http://localhost:5558"
```

### `make web/proxy` Implementation

```makefile
.PHONY: web/proxy
web/proxy: ## Start web with proxy to backend (native: port 8000, testing: port 8001)
web/proxy: web/install-deps
	@echo "Starting web frontend with proxy..."
	@echo "Detecting backend..."
	@if lsof -i :8001 > /dev/null 2>&1; then \
		echo "✓ Using testing backend at http://localhost:8001"; \
		cd web && MIRAGE_ENABLED=false yarn ember server --port 4200 --proxy http://127.0.0.1:8001; \
	elif lsof -i :8000 > /dev/null 2>&1; then \
		echo "✓ Using native backend at http://localhost:8000"; \
		cd web && MIRAGE_ENABLED=false yarn ember server --port 4200 --proxy http://127.0.0.1:8000; \
	else \
		echo "❌ No backend detected on port 8000 or 8001"; \
		echo "Start backend first with: make run (native) or make up (testing)"; \
		exit 1; \
	fi
```

## 📝 Notes

1. **`make up` vs `testing/up`**: Both do the same thing. `make up` is a convenience alias at the root level.

2. **Frontend auto-reload**: When using `make web/proxy`, the frontend will auto-reload on code changes.

3. **Backend changes**: For backend changes, you need to restart:
   - Native: `pkill -f "hermes server" && ./hermes server -config=config.hcl`
   - Testing: `cd testing && docker compose restart hermes`

4. **E2E testing**: For Playwright E2E tests, use the testing environment (`make up`) to ensure consistent ports and configuration.

5. **Canary test**: The canary test validates all services are healthy and properly communicating. Run it after `make up` to verify everything works.

## 🚨 Troubleshooting

**Problem**: `make up` fails with port conflicts

**Solution**: Check for running services and stop them:
```bash
lsof -i :4201 :8001 :5433 :7701 :5558
make down  # Stop testing environment
```

**Problem**: `make web/proxy` says no backend detected

**Solution**: Start a backend first:
```bash
# Option 1: Testing backend (Docker)
make up

# Option 2: Native backend
make bin && ./hermes server -config=config.hcl
```

**Problem**: `make canary` fails

**Solution**: Ensure testing environment is running and healthy:
```bash
make up
sleep 30  # Wait for all services
cd testing && docker compose ps  # Check all services are "Up"
make canary
```

## 🔗 Related Documentation

- [Testing Environment](../testing/README.md) - Complete testing environment documentation
- [GitHub Copilot Instructions](../.github/copilot-instructions.md) - Development workflow guide
- [Playwright E2E Testing](./PLAYWRIGHT_E2E_AGENT_GUIDE.md) - E2E testing with playwright-mcp

## 📅 Changelog

**2025-10-09**: Initial creation
- Added `make up` and `make down` for testing environment
- Added `make web/proxy` with auto-detection
- Documented `make canary` (already existed)
- Created comprehensive workflow examples
