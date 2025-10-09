---
id: MEMO-010
title: Ember Development Server & Upgrade Strategy
date: 2025-10-09
type: Guide
status: Current Practice
audience:
  - Frontend Developers
  - DevOps
  - AI Agents
tags: [ember, frontend, development-server, upgrade-strategy]
related:
  - RFC-033
  - RFC-034
  - RFC-037
  - TESTING_ENVIRONMENTS.md
---

# Ember Development Server & Upgrade Strategy

## Executive Summary

This memo documents the current Ember.js frontend development setup, including the migration from Mirage mocking to backend proxy pattern, and the strategy for future Ember upgrades. It consolidates information from multiple sources to provide a single reference for frontend development workflows.

**Current State** (October 2025):
- ✅ **Ember 6.7.0** with TypeScript and strict mode templates
- ✅ **Backend proxy pattern** - No direct Algolia access, all requests through Hermes API
- ✅ **Ember dev server** in Docker - Simplifies testing environment
- ✅ **Multiple proxy scripts** - Support for native and containerized backends
- ⚠️ **Test suite broken** - 1 test with global failure (needs fixing before upgrade)
- ❌ **Low test coverage** - <10% overall, blocker for safe upgrades

**Key Achievements**:
1. Eliminated Mirage dependency for development
2. Unified native and Docker development workflows
3. Simplified proxy configuration with environment variables
4. Backend-only search reduces frontend complexity

---

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Development Workflows](#development-workflows)
3. [Proxy Configuration](#proxy-configuration)
4. [Docker Development](#docker-development)
5. [Ember Upgrade Strategy](#ember-upgrade-strategy)
6. [Troubleshooting](#troubleshooting)
7. [References](#references)

---

## Current Architecture

### Frontend Stack

**Core Framework**:
- **Ember.js**: 6.7.0 (released mid-2024)
- **Ember CLI**: 6.7.0
- **Ember Data**: Latest compatible version
- **TypeScript**: Full TypeScript with strict mode
- **Glint**: Template type checking

**Build System**:
- **ember-auto-import**: 2.4.0+ (automatic npm package imports)
- **PostCSS + SASS**: CSS processing
- **Tailwind CSS**: Utility-first styling
- **Broccoli**: Asset pipeline (via Ember CLI)

**Component System**:
- **@glimmer/component**: Modern component API
- **Strict mode templates**: `<template>` tag imports
- **HashiCorp Design System (HDS)**: Component library
- **ember-basic-dropdown**: Dropdown components

**Development Tools**:
- **ESLint**: TypeScript + Ember rules (43 known non-blocking errors)
- **ember-template-lint**: Template linting (533 files)
- **Prettier**: Code formatting (via ESLint)
- **ember-cli-mirage**: API mocking (disabled for development)

### Backend Integration Pattern

**Before** (Pre-October 2025):
```
Frontend (Ember)
  ↓
Mirage Mock Server (in-browser)
  ↓
(Optional) Backend API calls
```

**After** (Current - Backend Proxy Pattern):
```
Frontend (Ember) → API Request (/api/v2/...)
  ↓
Ember Dev Server Proxy
  ↓
Backend (Hermes Go API)
  ↓
PostgreSQL / Meilisearch / Google Workspace
```

**Key Benefits**:
1. ✅ **No dual maintenance** - Single source of truth (backend API)
2. ✅ **Real data flow** - Test actual API responses
3. ✅ **Auth integration** - Real OAuth/OIDC flows work
4. ✅ **Search accuracy** - Backend search proxy (no frontend Algolia client)
5. ✅ **Simpler frontend** - Less mocking code to maintain

---

## Development Workflows

### Workflow 1: Fully Containerized (Testing Environment)

**Use Case**: E2E testing, acceptance testing, CI/CD validation

**Setup**:
```bash
cd testing
docker compose up -d
```

**Services**:
- **Frontend**: http://localhost:4201 (Ember dev server in container)
- **Backend**: http://localhost:8001 (Hermes API)
- **PostgreSQL**: localhost:5433
- **Meilisearch**: localhost:7701
- **Dex OIDC**: localhost:5558/5559

**Architecture**:
```
Browser → localhost:4201
  ↓
Docker: hermes-web-acceptance (Ember dev server)
  ↓ (internal proxy)
Docker: hermes-acceptance (Go API) → port 8001
  ↓
Docker: postgres-acceptance (PostgreSQL) → port 5433
Docker: meilisearch-acceptance (Meilisearch) → port 7701
Docker: dex (Dex OIDC) → port 5558/5559
```

**Proxy Configuration** (in container):
- Environment variable: `HERMES_API_URL=http://hermes:8000` (container name)
- Ember dev server: `yarn ember server --proxy http://hermes:8000`
- Frontend sees: Same origin API requests

**When to Use**:
- ✅ Running Playwright E2E tests
- ✅ Acceptance testing full user flows
- ✅ Testing Docker deployment before production
- ✅ Reproducible bug environments

### Workflow 2: Native Backend + Native Frontend (Local Development)

**Use Case**: Active feature development, fastest iteration

**Setup**:
```bash
# Terminal 1: Start dependencies (Docker)
docker compose up -d dex postgres meilisearch

# Terminal 2: Start backend (Native)
make bin
./hermes server -config=config.hcl
# Backend at http://localhost:8000

# Terminal 3: Start frontend (Native)
cd web
yarn start  # Defaults to proxy localhost:8001 (see note below)
# Or explicitly:
# HERMES_API_URL=http://localhost:8000 yarn start
# Frontend at http://localhost:4200
```

**⚠️ Current package.json Gotcha**:
```json
"start": "MIRAGE_ENABLED=false ember server --port 4200 --proxy ${HERMES_API_URL:-http://localhost:8001}"
```
The default is `8001` (testing backend), not `8000` (native backend). Use:
```bash
HERMES_API_URL=http://localhost:8000 yarn start
```
Or add alias script to package.json (see recommendations below).

**Architecture**:
```
Browser → localhost:4200
  ↓
Native: ember server (proxy enabled)
  ↓ (proxy to localhost:8000)
Native: ./hermes server
  ↓
Docker: postgres (5432)
Docker: meilisearch (7700)
Docker: dex (5556/5557)
```

**When to Use**:
- ✅ **Fastest iteration** - Hot reload for both frontend and backend
- ✅ **Debugging** - Native debuggers (Chrome DevTools, Delve)
- ✅ **Development** - Most common workflow for active coding

### Workflow 3: Docker Backend + Native Frontend (Hybrid)

**Use Case**: Frontend development against stable backend

**Setup**:
```bash
# Terminal 1: Start testing backend
cd testing
docker compose up -d hermes dex postgres meilisearch
# Backend at http://localhost:8001

# Terminal 2: Start native frontend
cd web
yarn start  # Already defaults to 8001
# Frontend at http://localhost:4200 → proxies to localhost:8001
```

**Architecture**:
```
Browser → localhost:4200
  ↓
Native: ember server (proxy enabled)
  ↓ (proxy to localhost:8001)
Docker: hermes-acceptance (port 8001)
  ↓
Docker: postgres-acceptance (5433)
Docker: meilisearch-acceptance (7701)
Docker: dex (5558/5559)
```

**When to Use**:
- ✅ **Frontend-only work** - Backend changes not needed
- ✅ **Testing frontend against stable API** - Backend in known-good state
- ✅ **Playwright development** - Iterate on E2E tests with consistent backend
- ✅ **Recommended for AI agents** - Stable backend, fast frontend reload

---

## Proxy Configuration

### Environment Variable: `HERMES_API_URL`

**Purpose**: Configures where Ember dev server proxies API requests

**Scope**: Server-side (Ember CLI), not browser-visible

**Usage**:
```bash
# Explicit override
HERMES_API_URL=http://localhost:8000 yarn start

# Use default from package.json
yarn start  # Uses ${HERMES_API_URL:-http://localhost:8001}

# Docker (set in docker-compose.yml)
HERMES_API_URL: http://hermes:8000  # Container name
```

### Current package.json Scripts

**File**: `web/package.json`

```json
{
  "scripts": {
    "start": "MIRAGE_ENABLED=false ember server --port 4200 --proxy ${HERMES_API_URL:-http://localhost:8001}"
  }
}
```

**Analysis**:
- ✅ **MIRAGE_ENABLED=false**: Disables Mirage mocking
- ✅ **--port 4200**: Standard Ember dev server port
- ✅ **--proxy**: Enables request proxying
- ⚠️ **Default: localhost:8001**: Assumes testing backend (not native)

### Recommended Script Additions

**Add to `web/package.json`**:

```json
{
  "scripts": {
    "start": "MIRAGE_ENABLED=false ember server --port 4200 --proxy ${HERMES_API_URL:-http://localhost:8001}",
    
    "start:native": "MIRAGE_ENABLED=false ember server --port 4200 --proxy http://localhost:8000",
    "start:testing": "MIRAGE_ENABLED=false ember server --port 4200 --proxy http://localhost:8001",
    "start:custom": "MIRAGE_ENABLED=false ember server --port 4200 --proxy ${HERMES_API_URL}"
  }
}
```

**Usage**:
```bash
yarn start:native   # Native backend (8000)
yarn start:testing  # Docker testing backend (8001)
yarn start:custom   # Use HERMES_API_URL env var
```

### Proxy Request Flow

**Example**: Frontend requests user profile

1. **Browser JavaScript**:
   ```javascript
   fetch('/api/v2/me')  // Relative URL, same origin
   ```

2. **Ember Dev Server** (localhost:4200):
   - Sees request to `/api/v2/me`
   - Matches proxy pattern (all requests)
   - Rewrites to: `http://localhost:8000/api/v2/me` (or configured URL)
   - Forwards request with original headers

3. **Backend API** (localhost:8000):
   - Receives request at `/api/v2/me`
   - Validates session cookie
   - Returns JSON response

4. **Ember Dev Server**:
   - Receives backend response
   - Forwards to browser with CORS headers

5. **Browser**:
   - Receives response as if from same origin
   - JavaScript processes JSON

**Key Points**:
- ✅ **No CORS issues** - Same origin from browser perspective
- ✅ **Cookies work** - Session cookies sent automatically
- ✅ **Simple frontend code** - No hardcoded backend URLs
- ✅ **Environment agnostic** - Works in all contexts

---

## Docker Development

### Dockerfile Architecture

**File**: `web/Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
RUN yarn install --immutable

# Copy source code
COPY . .

# Expose dev server port
EXPOSE 4200

# Start Ember dev server with proxy
CMD ["sh", "-c", "yarn ember server --proxy ${HERMES_API_URL:-http://hermes:8000} --port 4200 --host 0.0.0.0"]
```

**Key Design Decisions**:

1. **Node 20 Alpine** - Lightweight base image (~40MB vs ~900MB for full Node)
2. **Yarn Berry** (4.10.3) - Modern Yarn with PnP (Plug'n'Play)
3. **Immutable install** - `--immutable` fails if lockfile doesn't match
4. **Full source copy** - Not pre-building dist (development mode)
5. **Host 0.0.0.0** - Bind to all interfaces (accessible from outside container)
6. **Environment variable proxy** - `${HERMES_API_URL}` with default

**Why Not Pre-Build?**

**Previous Approach** (Static Assets):
```dockerfile
# Build on host
cd web && yarn build
# Copy to container
COPY dist /app/dist
CMD ["serve", "-s", "dist"]
```

**Current Approach** (Dev Server):
```dockerfile
# Install dependencies in container
RUN yarn install --immutable
# Copy source (not dist)
COPY . .
# Run dev server
CMD ["yarn", "ember", "server", "--proxy", "..."]
```

**Comparison**:

| Aspect | Pre-Build | Dev Server |
|--------|-----------|------------|
| Build time | ~3 min (on host) | ~30 sec (in container) |
| Startup time | ~2 sec | ~15 sec (webpack build) |
| Hot reload | ❌ No | ✅ Yes |
| Source maps | ❌ No (production) | ✅ Yes (development) |
| Debugging | ❌ Minified | ✅ Full source |
| Proxy support | ❌ Requires nginx | ✅ Built-in |
| File size | ~50MB (dist) | ~300MB (node_modules) |

**Decision**: **Use dev server for testing environment** (RFC-033)
- Rationale: Simplicity, consistency with local dev, hot reload for debugging
- Trade-off: Larger container size (~300MB vs ~50MB)
- Production: Still uses pre-built static assets (served by backend)

### Docker Compose Configuration

**File**: `testing/docker-compose.yml`

```yaml
services:
  web:
    container_name: hermes-web-acceptance
    build:
      context: ../web
      dockerfile: Dockerfile
    ports:
      - "4201:4200"  # Host:Container
    environment:
      HERMES_API_URL: http://hermes:8000  # Container network name
    depends_on:
      hermes:
        condition: service_healthy  # Wait for backend
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "-O", "/dev/null", "http://127.0.0.1:4200/"]
      interval: 3s
      timeout: 2s
      retries: 3
      start_period: 5s
    networks:
      - hermes-acceptance
```

**Key Configuration**:

1. **Port Mapping**: `4201:4200`
   - Host accesses: `http://localhost:4201`
   - Container listens: `0.0.0.0:4200`
   - Avoids conflict with native dev server (4200)

2. **Environment**: `HERMES_API_URL=http://hermes:8000`
   - Uses Docker service name (`hermes`)
   - Internal port (8000), not exposed port (8001)
   - Container-to-container communication

3. **Depends On**: `hermes: service_healthy`
   - Waits for backend health check before starting
   - Prevents frontend startup failures due to missing backend

4. **Health Check**: `wget http://127.0.0.1:4200/`
   - Verifies Ember dev server is responding
   - Retries 3 times with 3s interval
   - 5s start period (allows webpack initial build)

5. **Network**: `hermes-acceptance`
   - Isolated network for testing environment
   - Services can reach each other by name

### Build and Startup Times

**First Build** (Cold Cache):
```bash
cd testing
docker compose build web
```
- **Duration**: ~180 seconds
- **Steps**: Pull node:20-alpine → yarn install → copy source
- **Size**: ~300MB image

**Subsequent Builds** (Warm Cache):
```bash
docker compose build web
```
- **Duration**: ~30 seconds
- **Steps**: Use cached layers (node_modules unchanged)

**Container Startup**:
```bash
docker compose up -d web
```
- **Duration**: ~15-20 seconds
- **Steps**: Start container → webpack build → health check passes
- **Logs**: `docker compose logs -f web` to watch progress

**Ready State**:
```bash
docker compose ps web
# NAME                   STATUS         PORTS
# hermes-web-acceptance  Up 25 seconds  0.0.0.0:4201->4200/tcp
```

---

## Ember Upgrade Strategy

### Current Status (October 2025)

**Ember Version**: 6.7.0 (released mid-2024)

**Known Issues**:
1. ⚠️ **Test suite broken** - 1 test with global failure
   ```
   not ok 1 Chrome 141.0 - [1 ms] - global failure
   # tests 1
   # pass  0
   # fail  1
   ```

2. ⚠️ **Low test coverage** - Estimated <10% overall
   - Services: ~0%
   - Routes: ~0%
   - Components: ~10%
   - Helpers: ~0%

3. ⚠️ **43 ESLint errors** - Non-blocking, mostly `@typescript-eslint/no-empty-object-type`

4. ✅ **TypeScript compiles** - `yarn test:types` passes

5. ✅ **Application works** - Production frontend functional

### Upgrade Blockers

**Why We Can't Upgrade Yet**:

1. **No test safety net** - Can't detect regressions without working tests
2. **Unknown baseline** - Don't know what currently works
3. **Risk too high** - Production frontend could break without detection

**Required Before Upgrade**:
- ✅ Fix test runner (eliminate global failure)
- ✅ Achieve 60%+ overall test coverage
- ✅ Document known working behaviors
- ✅ Establish CI/CD test pipeline

### Phase 1: Fix Test Suite (Estimated: 2 weeks)

**Goal**: Get tests passing, establish baseline coverage

#### Week 1: Test Infrastructure

**Tasks**:
1. **Fix global test failure**
   - [ ] Investigate `tests/test-helper.ts` configuration
   - [ ] Check ember-cli-mirage setup (if still used)
   - [ ] Verify deprecation handling
   - [ ] Test with different browsers (Chrome, Firefox)

2. **Fix disabled tests**
   - [ ] `web/tests/integration/components/related-resources/add-test.ts.disabled`
   - [ ] Syntax error: `@relatedDocuments={{array}}` (line 10)
   - [ ] Re-enable after fixing

3. **Establish coverage baseline**
   - [ ] Install `ember-cli-code-coverage`
   - [ ] Run coverage report: `yarn test:coverage:report`
   - [ ] Document current % per category
   - [ ] Identify critical untested paths

**Success Criteria**:
- ✅ All tests pass (even if only 1-2 tests)
- ✅ Coverage reporting works
- ✅ Baseline documented in `web/COVERAGE_BASELINE.md`

#### Week 2: Critical Service Tests

**Priority Services to Test**:

1. **`services/session.ts`** (Authentication)
   ```typescript
   // Test cases:
   test('it authenticates with valid credentials', async function(assert) {
     // Mock successful login
   });
   
   test('it handles auth provider detection', async function(assert) {
     // Test Google, Okta, Dex detection
   });
   
   test('it clears session on logout', async function(assert) {
     // Verify session cleared
   });
   ```

2. **`services/fetch.ts`** (API Wrapper)
   ```typescript
   // Test cases:
   test('it adds auth headers to requests', async function(assert) {
     // Verify Authorization header
   });
   
   test('it handles 401 unauthorized', async function(assert) {
     // Test session expiry
   });
   
   test('it adds provider-specific headers', async function(assert) {
     // Test X-Hermes-Google-Auth-Id
   });
   ```

3. **`services/algolia.ts`** (Search Proxy)
   ```typescript
   // Test cases:
   test('it constructs search queries', async function(assert) {
     // Test query building
   });
   
   test('it proxies through backend', async function(assert) {
     // Verify /1/indexes/* path
   });
   
   test('it handles facet filters', async function(assert) {
     // Test facet construction
   });
   ```

**Target Coverage**: 70% for these 3 services

**Success Criteria**:
- ✅ 15+ test cases added
- ✅ Critical paths covered
- ✅ Services reach 70% coverage

### Phase 2: Increase Test Coverage (Estimated: 4 weeks)

**Goal**: Achieve 60% overall coverage before upgrade attempt

#### Week 3-4: Component Tests

**Critical Components** (20+ components):

**Authentication & User**:
- `components/header/user-menu.ts` - Profile dropdown
- `components/session/auth-modal.ts` - Login modal

**Search & Filters**:
- `components/header/toolbar.ts` - Search bar
- `components/header/search.ts` - Search input
- `components/header/facet-dropdown.ts` - Filter dropdowns

**Document Management**:
- `components/document/sidebar.ts` - Document metadata
- `components/document/index.ts` - Document viewer (iframe vs editor)
- `components/new/doc-form.ts` - Document creation form
- `components/related-resources.ts` - Resource linking

**Test Approach**:
- **Integration tests** for components with API calls
- **Unit tests** for pure display components
- **Mock fetch service** for API isolation
- **Test happy path + error states**

**Target Coverage**: 65% for components

#### Week 5-6: Route Tests

**Critical Routes** (10+ routes):

**Authentication**:
- `routes/authenticate.ts` - Login flow
- `routes/authenticated.ts` - Auth guard

**Dashboard & Lists**:
- `routes/authenticated/dashboard.ts` - Dashboard data loading
- `routes/authenticated/documents.ts` - Document listing
- `routes/authenticated/my/documents.ts` - User's documents

**Document Actions**:
- `routes/authenticated/document.ts` - Document viewing
- `routes/authenticated/new.ts` - Document creation
- `routes/authenticated/results.ts` - Search results

**Test Approach**:
- **Acceptance tests** for full user flows
- **Integration tests** for model hooks
- **Mock backend responses** via Mirage or fetch-mock
- **Test loading states, error states, empty states**

**Target Coverage**: 60% for routes

### Phase 3: Ember Upgrade Attempt (Estimated: 2 weeks)

**Prerequisites**:
- ✅ Overall coverage ≥60%
- ✅ All tests passing (100+ tests)
- ✅ CI/CD pipeline established
- ✅ Rollback plan documented

**Upgrade Path**:

#### Step 1: Minor Version Bump (6.7.0 → 6.9.0)
```bash
cd web
yarn upgrade ember-source@6.9.0 ember-cli@6.9.0
yarn install
yarn test:types  # Check TypeScript
yarn test:ember  # Run full test suite
```

**Expected Issues**:
- Deprecation warnings (upgrade ember-source)
- Type definition changes (update @types/ember*)
- Template linting rules (update ember-template-lint)

**Validation**:
- ✅ All tests pass
- ✅ TypeScript compiles
- ✅ Manual smoke testing (login, create doc, search)
- ✅ Coverage maintained or improved

#### Step 2: Major Version Bump (6.9.0 → 7.0.0)

**Research Phase**:
1. Read Ember 7.0 release notes
2. Check breaking changes
3. Review deprecations from 6.x
4. Test in local branch first

**Upgrade Considerations**:
- **Octane patterns**: Already using (Glimmer components, tracked properties)
- **TypeScript**: May need type definition updates
- **Ember Data**: Separate versioning, may need separate upgrade
- **ember-auto-import**: Version compatibility
- **HDS components**: Check Ember 7 compatibility

**Validation**:
- ✅ All tests pass (100+ tests)
- ✅ TypeScript compiles
- ✅ Linting passes (or new errors documented)
- ✅ Manual testing (full user flow walkthrough)
- ✅ Performance testing (no regressions)
- ✅ Docker build works
- ✅ Production build successful

### Phase 4: Post-Upgrade Cleanup (Estimated: 1 week)

**Tasks**:
1. **Remove deprecated code**
   - Clean up any 6.x deprecation workarounds
   - Update to Ember 7 best practices

2. **Update dependencies**
   - ember-data → latest compatible
   - @glimmer/* → latest
   - ember-cli plugins → latest

3. **Documentation**
   - Update this memo with Ember 7 notes
   - Document any breaking changes encountered
   - Update `.github/copilot-instructions.md`

4. **Announcement**
   - Notify team of upgrade completion
   - Document any behavioral changes
   - Update onboarding docs

---

## Troubleshooting

### Issue: "ECONNREFUSED localhost:8000"

**Symptom**:
```
Error: connect ECONNREFUSED 127.0.0.1:8000
```

**Cause**: Backend is not running or running on different port

**Solutions**:
1. **Check backend is running**:
   ```bash
   lsof -i :8000  # Native backend
   lsof -i :8001  # Docker testing backend
   ```

2. **Verify backend health**:
   ```bash
   curl http://localhost:8000/health
   curl http://localhost:8001/health
   ```

3. **Use correct proxy URL**:
   ```bash
   # Native backend
   HERMES_API_URL=http://localhost:8000 yarn start
   
   # Docker testing backend
   yarn start  # Default is 8001
   ```

4. **Check Docker backend**:
   ```bash
   cd testing
   docker compose ps hermes
   docker compose logs hermes | tail -20
   ```

### Issue: "Proxy timeout" or Slow Responses

**Symptom**: API requests take >30 seconds or timeout

**Causes**:
1. Backend is overloaded or stuck
2. Database connection issues
3. External service timeout (Algolia, Google Workspace)

**Solutions**:
1. **Check backend logs**:
   ```bash
   # Native backend
   tail -f /tmp/hermes-backend.log
   
   # Docker backend
   docker compose logs -f hermes
   ```

2. **Check database connection**:
   ```bash
   # PostgreSQL
   docker compose ps postgres
   psql -h localhost -p 5432 -U hermes -d hermes -c "SELECT 1"
   ```

3. **Increase timeout** (temporary workaround):
   ```javascript
   // web/app/services/fetch.ts
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s
   ```

4. **Disable external services** (if testing locally):
   ```hcl
   # config.hcl
   okta {
     disabled = true
   }
   google_workspace {
     disabled = true
   }
   ```

### Issue: "webpack build failed" in Docker

**Symptom**:
```
ERROR in ./app/components/...
Module parse failed: Unexpected token
```

**Cause**: Source file syntax error or incompatible dependency

**Solutions**:
1. **Check source file locally**:
   ```bash
   cd web
   yarn test:types  # TypeScript check
   yarn lint:js     # ESLint check
   ```

2. **Rebuild with no cache**:
   ```bash
   cd testing
   docker compose build --no-cache web
   ```

3. **Check dependency versions**:
   ```bash
   cd web
   yarn install --check-cache
   yarn outdated  # Check for outdated deps
   ```

### Issue: "Module not found" After Dependency Update

**Symptom**:
```
Error: Cannot find module 'some-package'
```

**Cause**: yarn.lock out of sync with package.json

**Solutions**:
1. **Reinstall dependencies**:
   ```bash
   cd web
   rm -rf node_modules .yarn/cache
   yarn install
   ```

2. **Rebuild Docker image**:
   ```bash
   cd testing
   docker compose build --no-cache web
   ```

3. **Check Yarn version**:
   ```bash
   yarn --version  # Should be 4.10.3
   ```

### Issue: "Session expired" Loop

**Symptom**: Frontend redirects to login repeatedly after authentication

**Cause**: Session cookie not being set or recognized

**Solutions**:
1. **Check cookie domain**:
   ```bash
   # In browser DevTools → Application → Cookies
   # Look for 'hermes_session' cookie
   # Domain should be 'localhost' or your domain
   ```

2. **Check backend session config**:
   ```hcl
   # config.hcl
   server {
     session_secret = "your-secret-key"
     cookie_secure = false  # false for localhost
   }
   ```

3. **Clear browser cookies**:
   ```
   Chrome DevTools → Application → Clear storage → Cookies only
   ```

4. **Check backend logs for auth errors**:
   ```bash
   grep -i "session\|auth" /tmp/hermes-backend.log | tail -20
   ```

### Issue: Port Already in Use

**Symptom**:
```
Error: listen EADDRINUSE: address already in use :::4200
```

**Solutions**:
1. **Kill process on port**:
   ```bash
   lsof -ti :4200 | xargs kill -9
   ```

2. **Check for zombie processes**:
   ```bash
   ps aux | grep "[e]mber server"
   pkill -f "ember server"
   ```

3. **Use different port**:
   ```bash
   yarn ember server --port 4201 --proxy http://localhost:8000
   ```

---

## References

### RFCs
- **RFC-033**: Ember Dev Server Migration (Complete implementation guide)
- **RFC-034**: Ember Upgrade Strategy (Detailed upgrade plan)
- **RFC-037**: Frontend Proxy Configuration (Architecture and patterns)
- **RFC-076**: Search & Auth Refactoring (Backend proxy rationale)

### Documentation Files
- **EMBER_UPGRADE_STRATEGY.md**: Full upgrade plan with coverage targets
- **EMBER_DEV_SERVER_MIGRATION.md**: Docker migration details
- **FRONTEND_PROXY_CONFIGURATION.md**: Proxy setup and troubleshooting
- **TESTING_ENVIRONMENTS.md**: Native vs Docker comparison
- **DEX_QUICK_START.md**: Local auth setup for development

### Session Notes
- **FRONTEND_PROXY_SESSION_SUMMARY_2025_10_08.md**: Implementation session details

### Key Files
- **`web/package.json`**: Scripts and dependencies
- **`web/Dockerfile`**: Container build configuration
- **`testing/docker-compose.yml`**: Testing environment orchestration
- **`web/ember-cli-build.js`**: Build pipeline configuration
- **`.github/copilot-instructions.md`**: Current project patterns

---

## Recommendations for Future Work

### Immediate (Next Sprint)

1. **Fix package.json default**:
   ```json
   "start": "MIRAGE_ENABLED=false ember server --port 4200 --proxy ${HERMES_API_URL:-http://localhost:8000}"
   ```
   Change default from `8001` to `8000` (native backend more common)

2. **Add convenience scripts**:
   ```json
   "start:native": "...",
   "start:testing": "...",
   "start:custom": "..."
   ```

3. **Document Yarn version requirement**:
   Add to `web/README.md`: "Requires Yarn 4.10.3 (Berry)"

4. **Fix test suite** (Priority 1 blocker for upgrades)

### Short-term (Next 2-3 Months)

1. **Increase test coverage to 60%** (Required for safe upgrades)
2. **Document test strategy** in `web/TESTING_STRATEGY.md`
3. **Set up CI/CD test pipeline** (GitHub Actions)
4. **Fix ESLint errors** (43 errors, mostly type-related)

### Long-term (Next 6-12 Months)

1. **Ember 7.0 upgrade** (After coverage achieved)
2. **Ember Data 5.x upgrade** (Separate from Ember core)
3. **Embroider adoption** (Next-gen build system, faster builds)
4. **Strict template types** (Full Glint integration)

---

## Appendix: Port Reference

| Service | Native Dev | Testing Docker | Production | Notes |
|---------|-----------|----------------|------------|-------|
| Frontend | 4200 | 4201 | 443 (HTTPS) | Ember dev server |
| Backend API | 8000 | 8001 | 443 (HTTPS) | Hermes Go server |
| PostgreSQL | 5432 | 5433 | (internal) | Database |
| Meilisearch | 7700 | 7701 | (internal) | Search (local) |
| Dex OIDC | 5556/5557 | 5558/5559 | N/A | Auth (dev only) |
| Algolia | N/A | N/A | API | Search (prod) |

**Key Pattern**: Testing Docker ports are `+1` from native dev ports to avoid conflicts

---

## Appendix: Package.json Scripts Explained

**From**: `web/package.json`

```json
{
  "scripts": {
    // Build for production (minified, optimized)
    "build": "ember build --environment=production",
    
    // Development server with proxy (current default)
    "start": "MIRAGE_ENABLED=false ember server --port 4200 --proxy ${HERMES_API_URL:-http://localhost:8001}",
    
    // Linting
    "lint": "npm-run-all --aggregate-output --continue-on-error --parallel \"lint:!(fix)\"",
    "lint:hbs": "ember-template-lint .",
    "lint:js": "eslint . --cache",
    
    // Testing
    "test": "npm-run-all lint test:*",
    "test:ember": "ember test",
    "test:types": "tsc --noEmit",  // TypeScript check
    "test:coverage": "COVERAGE=true ember test",
    "test:unit": "ember test --filter='Unit'",
    "test:integration": "ember test --filter='Integration'",
    "test:acceptance": "ember test --filter='Acceptance'",
    
    // Validation (CI/CD)
    "validate": "npm-run-all test:types test:lint test:build"
  }
}
```

**Common Commands**:
```bash
yarn start              # Dev server (proxy to 8001)
yarn test:types         # TypeScript check (fast, no browser)
yarn test:ember         # Full test suite (launches browser)
yarn lint:hbs           # Template linting (533 files)
yarn build              # Production build
yarn validate           # Full validation (CI/CD)
```

---

**Approval**: Living document, update as frontend evolves  
**Next Review**: After test suite fix (Phase 1 completion)  
**Feedback**: Update with Ember 7 migration notes when completed
