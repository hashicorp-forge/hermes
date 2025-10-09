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
- **`testing/`**: Complete containerized testing environment (see `testing/README.md`)
- **`config.hcl`**: **Fully documented runtime config** (tracked in git, 828 lines with comprehensive examples)
- **`configs/config.hcl`**: Minimal config template (246 lines, for reference only)
- **`testing/dex-config.yaml`**: Dex OIDC provider configuration for testing environment
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

### Quick Start Commands

```bash
# Start full testing environment (all services in Docker)
make up

# Start native backend
make bin && ./hermes server -config=config.hcl

# Start frontend with auto-detected proxy (8001 or 8000)
make web/proxy

# Run canary test to validate environment
make canary

# Stop testing environment
make down
```

**Testing Backend (Docker) + Native Frontend** (stable backend, fast frontend changes, good for playwright-mcp iteration)
```bash
# Start full testing environment
make up

# Frontend in another terminal (auto-detects port 8001)
make web/proxy
```

**Fully Containerized** (complete integration testing)
```bash
# Everything in containers
make up

# Access at http://localhost:4201
# Backend at http://localhost:8001

# Validate with canary test
make canary
```

**Native Development** (fastest iteration)
```bash
# Terminal 1: Backend
make bin && ./hermes server -config=config.hcl

# Terminal 2: Frontend (auto-detects port 8000)
make web/proxy
```

**Port Conventions**:
- Native: Frontend 4200, Backend 8000, Postgres 5432, Meilisearch 7700, Dex 5556/5557
- Testing (in `./testing`): Frontend 4201, Backend 8001, Postgres 5433, Meilisearch 7701, Dex 5558/5559

**See**: `docs-internal/MAKEFILE_ROOT_TARGETS.md` for comprehensive workflow examples

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

### Quick Start Commands

```bash
# Check what's running
cd testing && docker compose ps
lsof -i :4200 :4201 :8000 :8001

# Health checks
curl -I http://localhost:8000/health   # Native backend
curl -I http://localhost:8001/health   # Testing backend (docker)
curl -I http://localhost:4200/         # Native frontend
curl -I http://localhost:4201/         # Testing frontend (docker)

# Stop services
pkill -f "hermes server"               # Native backend
pkill -f "ember server"                # Native frontend
cd testing && docker compose down      # All testing containers
```

**Iteration Cycle** (Native mode):
```bash
# Backend changes
make bin && pkill -f "./hermes server" && ./hermes server -config=testing=/config.hcl &

# Frontend auto-reloads (no action needed)

# Validate
cd tests/e2e-playwright && npx playwright test --reporter=line --max-failures=1
```

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
