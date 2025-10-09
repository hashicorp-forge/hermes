# Hermes - GitHub Copilot Instructions

## Project Overview
Hermes is an open-source document management system built by HashiCorp Labs. It's a full-stack application with a **Go backend** (1.25.0+) and an **Ember.js TypeScript frontend** (Node.js 20+), using PostgreSQL for data persistence and Algolia for search. The system integrates with Google Workspace for document storage and authentication.

**Repository**: `hashicorp/hermes` | **Type**: Monorepo (Go + Ember.js)

## Critical Build & Validation Workflow

### 🔴 ALWAYS Follow This Sequence

#### 1. **Backend (Go) - Build First**
```bash
# From repo root - REQUIRED order:
make bin              # Build Go binary (fast, no web)
make go/test          # Run Go tests (no DB required)
```

#### 2. **Frontend (Ember.js) - Then Validate**
```bash
cd web
yarn install          # ALWAYS run first after pulling/switching branches
yarn test:types       # TypeScript check (fast, catches type errors)
yarn lint:hbs         # Template linting (533 files)
yarn build            # Production build with env var warnings (expected)
```

#### 3. **Full Integration Build**
```bash
# From repo root:
make build            # Builds web (yarn install + build) then Go binary
```

#### 4. **Database Tests (Optional - Requires PostgreSQL)**
```bash
make docker/postgres/start              # Start PostgreSQL 17.1
make go/test/with-docker-postgres       # Run DB-dependent tests
make docker/postgres/stop               # Cleanup
```

### ⚠️ Known Build Behaviors & Workarounds

**Web Build Environment Variables**: The web build shows ~10 env var warnings for optional configuration. This is **expected** and **not an error** - defaults are applied. Note: As of October 2025, `HERMES_WEB_ALGOLIA_APP_ID` and `HERMES_WEB_ALGOLIA_SEARCH_API_KEY` are **no longer needed** (search proxies through backend). `HERMES_WEB_GOOGLE_OAUTH2_CLIENT_ID` is **optional** (only needed for Google auth provider).


See `docs-internal/testing/` for detailed test analysis and fix strategies.

**Linting Has Known Issues**: `yarn lint:js` reports 43 ESLint errors (mostly `@typescript-eslint/no-empty-object-type`). These are **non-blocking** - linting does not prevent builds or deployment.

**Yarn Version**: The project uses **Yarn 4.10.3** (Berry/v3+). Commands like `yarn install --check-files` (from package.json `test:deps`) fail with newer Yarn. Use `yarn install --check-cache` instead or skip `yarn validate`.

**PostgreSQL Container**: If `make docker/postgres/start` results in a restarting container, run:
```bash
make docker/postgres/stop && make docker/postgres/start
```

## Project Structure & Key Files

### Root Level Configuration
- **`Makefile`**: Primary build orchestration (25+ targets)
- **`go.mod`**: Go 1.25.0, main deps: gorm, google.golang.org/api, algolia, datadog
- **`docker-compose.yml`**: PostgreSQL 17.1-alpine (port 5432)
- **`config.hcl`**: **Fully documented runtime config** (tracked in git, 652 lines with comprehensive examples)
- **`configs/config.hcl`**: Minimal config template (246 lines, for reference)
- **`.gitignore`**: Excludes `credentials.json`, `token.json`, but NOT `config.hcl`

### Backend Structure (`cmd/`, `internal/`, `pkg/`)
- **`cmd/hermes/main.go`**: Entry point
- **`internal/cmd/`**: CLI commands (server, indexer, operator)
- **`internal/api/`**: REST API handlers (v1 + v2)
- **`internal/server/`**: HTTP server setup
- **`internal/db/`**: PostgreSQL/GORM database layer
- **`pkg/models/`**: GORM models with extensive tests
- **`pkg/workspace/`**: Workspace management, adapters for Google and Local
- **`pkg/search/`**: Search abstraction, Algolia and Meilisearch adapters
- **`pkg/hashicorpdocs/`**: Document type handlers (RFC, PRD, FRD)

### Frontend Structure (`web/`)
- **`web/package.json`**: Ember 6.7.0, TypeScript, Tailwind CSS, HDS components
- **`web/tsconfig.json`**: TypeScript with Ember paths, Glint for templates
- **`web/.eslintrc.js`**: TypeScript-ESLint with many rules disabled
- **`web/ember-cli-build.js`**: PostCSS/SASS + Tailwind build pipeline
- **`web/app/`**: Ember app source (components, routes, services)
- **`web/tests/`**: Acceptance & integration tests (currently broken)
- **`web/mirage/`**: API mocking for development

## Continuous Integration (GitHub Actions)

**Workflow**: `.github/workflows/ci.yml` (runs on PRs and main branch pushes)

## Code Patterns & Standards

### Go Conventions
- **CGO disabled**: All builds use `CGO_ENABLED=0`
- **Error handling**: Use `hashicorp/go-multierror` for aggregation
- **Logging**: `hashicorp/go-hclog` structured logging
- **Database**: GORM v2 with PostgreSQL driver, auto-migration on startup
- **Testing**: Table-driven tests, use `internal/test/database.go` for DB setup
- **Config**: HCL format via `hashicorp/hcl/v2`

### TypeScript/Ember Conventions
- **Template syntax**: Ember strict mode with `<template>` tag imports
- **Type safety**: Glint for template type checking
- **Components**: Class-based with `@glimmer/component` and decorators
- **State**: `@tracked` properties, `@action` methods
- **Styling**: Tailwind CSS + SCSS, HashiCorp Design System components
- **API**: Ember Data or `fetch` for backend communication

### Common Patterns in Codebase
- **Document types**: RFC, PRD, FRD with custom header replacement logic
- **Multi-provider auth**: Supports Google OAuth, Okta OIDC, and Dex OIDC with runtime selection
- **Backend-only search**: All Algolia search operations proxy through backend at `/1/indexes/*`

## Development Workflow

### Local Development (Two Process Model)
```bash
# Terminal 1 - Backend
make docker/postgres/start
docker compose up -d dex meilisearch
# config.hcl is already configured for local dev with Dex + Local + Meilisearch
# See docs-internal/CONFIG_HCL_DOCUMENTATION.md for full documentation
./hermes server -config=config.hcl

# Terminal 2 - Frontend (proxies to backend)
cd web
# No build-time auth/search credentials needed!
yarn start:with-proxy  # Runs on localhost:4200, proxies to :8000
```

### E2E Testing with Playwright

**Guide**: See `docs-internal/PLAYWRIGHT_E2E_AGENT_GUIDE.md` for comprehensive instructions

**Quick Reference**:

**For Interactive Exploration** (preferred for agents):
- Use `playwright-mcp` browser tools: `mcp_microsoft_pla_browser_navigate`, `mcp_microsoft_pla_browser_snapshot`, etc.
- Take snapshots to see page state
- Take screenshots for documentation
- Click, type, fill forms interactively

**For Validation/CI** (headless test execution):
```bash
# Verify environment first
curl -I http://localhost:8000/health
curl -I http://localhost:4200/
curl -s http://localhost:5556/dex/.well-known/openid-configuration | jq '.'

# Run tests (headless, agent-friendly)
cd tests/e2e-playwright
npx playwright test document-content-editor.spec.ts --reporter=line --max-failures=1
```

**Key Points**:
- ✅ **Always use headless mode** with `--reporter=line` for programmatic execution
- ❌ **Never use `--headed`** when running tests as an agent (hangs terminal, starts interactive server)
- ✅ **Check prerequisites** before running (backend, frontend, Dex must be running)
- ✅ **Use playwright-mcp** for exploration and debugging
- ✅ **Parse exit codes**: 0 = success, 1 = failure
- ✅ **Read screenshots** from `test-results/` on failures

**Common Commands**:
```bash
# Single test file (recommended)
npx playwright test file.spec.ts --reporter=line --max-failures=1

# Grep for specific test
npx playwright test -g "should edit document" --reporter=line

# JSON output for parsing
npx playwright test --reporter=json > results.json

# Check test status
echo $?  # 0 = pass, 1 = fail
```

### Quick Iteration Workflow

**Native Backend (Recommended)**: Fast rebuilds (1-2s), instant frontend hot-reload
```bash
# Start environment (once)
docker compose up -d dex postgres meilisearch
make bin && ./hermes server -config=config.hcl &
cd web && MIRAGE_ENABLED=false yarn ember server --port 4200 --proxy http://127.0.0.1:8000 &

# Iteration cycle
# Backend: make bin && pkill -f "./hermes server" && ./hermes server -config=config.hcl &
# Frontend: Auto-reloads
# Validate: cd tests/e2e-playwright && npx playwright test --reporter=line --max-failures=1
```

**Docker Backend**: For testing `./testing` environment (slower, 10-15s rebuilds)
```bash
cd testing && docker compose build hermes && docker compose up -d hermes  # Port 8001
cd web && MIRAGE_ENABLED=false yarn ember server --port 4200 --proxy http://127.0.0.1:8001
```

**Verification**:
```bash
curl -I http://localhost:8000/health  # Backend
curl -I http://localhost:4200/        # Frontend
lsof -i :4200 :8000 :8001             # Check ports
```

**Troubleshooting**:
- Port conflicts: `pkill -f "ember server"` or `pkill -f "./hermes server"`
- Dependencies: `docker compose ps | grep -E "dex|postgres|meilisearch"`
- Backend restart: `pkill -f "./hermes server" && make bin && ./hermes server -config=config.hcl`

## What Not To Do

❌ **Don't** commit `credentials.json` or `token.json` (gitignored)
✅ **Do** track `config.hcl` (comprehensive example config, tracked in git)
❌ **Don't** run PostgreSQL tests without starting the Docker container first
❌ **Don't** commit without documenting the prompt used (see Commit Standards below)

## AI Agent Commit Standards

### 🎯 MANDATORY: Store Prompts in Commits

**Every commit involving AI-generated or AI-assisted code MUST include the prompt in the commit body.**

This enables:
- Future developers to understand the reasoning behind AI-generated solutions
- Other agents to learn effective prompting patterns
- Reproduction of results if code needs to be regenerated
- Knowledge transfer across team members and sessions

### Commit Message Format

```
[type]: [short description of what was done]

**Prompt Used**:
[The exact prompt or high-level instruction given to the AI agent]

**AI Implementation Summary**:
- [Bullet 1: what the AI generated/modified]
- [Bullet 2: key decisions made by AI]
- [Bullet 3: patterns followed]

**Human Review Notes** (if applicable):
- [Any modifications made to AI output]
- [Validation steps performed]
- [Issues found and fixed]

**Verification**:
- [Commands run to verify the changes]
- [Test results]
- [Coverage/metrics if applicable]
```

### Example Commit by Category

```
[type]: [short description]

**Prompt Used**: [exact prompt with context/references]

**AI Implementation Summary**:
- [What was generated/modified]
- [Key decisions and patterns followed]

**Human Review Notes** (optional): [Modifications, validation, issues]

**Verification**: [Commands, test results, metrics]
```

**Examples by Type**:
- **feat**: `feat: implement Meilisearch adapter` - New feature with TDD, integration tests, 85% coverage
- **refactor**: `refactor(api): migrate V2 to workspace provider` - Replace 47 gw.Service calls, backend-agnostic
- **fix**: `fix: correct error wrapping in validation` - Apply fmt.Errorf("context: %w", err) pattern
- **docs**: `docs: add migration summary` - Architecture diagrams, statistics, code examples
- **test**: `test: add E2E document editor tests` - Playwright tests with playwright-mcp validation

**Store prompts for**: features, refactoring, tests, docs, architecture, bug fixes. Skip for trivial changes (typos, formatting).

**Prompt quality**: Reference files/patterns/docs, include verification steps, show expected output format.
