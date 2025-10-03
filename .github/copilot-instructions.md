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

**Web Build Environment Variables**: The web build shows ~12 env var warnings (e.g., `HERMES_WEB_ALGOLIA_APP_ID was not set!`). This is **expected** and **not an error** - defaults are applied.

**Web Tests Currently Fail**: `yarn test:ember` has a known syntax error in `web/tests/integration/components/related-resources/add-test.ts` (line 10: `@relatedDocuments={{array}}`). **Do not run** `yarn test:ember` or `make web/test` until this is fixed. The CI workflow also runs this and will fail.

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
- **`config.hcl`**: Runtime config (copy from `configs/config.hcl`, gitignored)
- **`.gitignore`**: Excludes `/config.hcl`, `/hermes` binary, `/credentials.json`, `/token.json`

### Backend Structure (`cmd/`, `internal/`, `pkg/`)
- **`cmd/hermes/main.go`**: Entry point
- **`internal/cmd/`**: CLI commands (server, indexer, operator)
- **`internal/api/`**: REST API handlers (v1 + v2)
- **`internal/server/`**: HTTP server setup
- **`internal/db/`**: PostgreSQL/GORM database layer
- **`pkg/models/`**: GORM models with extensive tests
- **`pkg/googleworkspace/`**: Google Drive/Docs/Gmail integration
- **`pkg/algolia/`**: Search indexing client
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

**Steps** (Ubuntu, Node 16 - NOTE: Outdated, local uses Node 24):
1. Setup Node 16 + cache yarn.lock
2. `make web/set-yarn-version` (workaround for Yarn/Corepack)
3. Setup Go 1.18 (NOTE: Outdated, go.mod requires 1.25.0)
4. `make web/build`
5. `make web/test` ⚠️ **FAILS** due to test syntax error
6. `make bin/linux`
7. `make go/test`

**CI Will Fail** on `make web/test` - this is a known issue documented above.

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
- **TODO comments**: 20+ across codebase (see `internal/indexer/`, `pkg/hashicorpdocs/`, `internal/api/`)
- **Document types**: RFC, PRD, FRD with custom header replacement logic
- **Google OAuth**: Both web client ID (build-time) and service account (runtime)

## Development Workflow

### Local Development (Two Process Model)
```bash
# Terminal 1 - Backend
make docker/postgres/start
cp configs/config.hcl ./config.hcl
# Edit config.hcl with Google credentials, Algolia keys, etc.
./hermes server -config=config.hcl

# Terminal 2 - Frontend (proxies to backend)
cd web
yarn start:with-proxy  # Runs on localhost:4200, proxies to :8000
```

### Making Changes

**Go Changes**:
1. Make code changes
2. Run `make bin` to verify compilation
3. Run `make go/test` to verify tests
4. For DB changes, ensure models in `pkg/models/` are updated
5. Run `make go/test/with-docker-postgres` if touching DB code

**Ember/TypeScript Changes**:
1. Make code changes
2. Run `yarn test:types` to catch type errors early
3. Run `yarn lint:hbs` if modifying templates
4. Run `yarn build` to verify production build
5. **Skip** `yarn test:ember` until test syntax is fixed
6. Test manually in browser with `yarn start:with-proxy`

**Full Build Verification**:
```bash
make build  # Should complete successfully with warnings
```

## Environment Variables (Build-Time for Web)

These are **optional** and have sensible defaults:
- `HERMES_WEB_GOOGLE_OAUTH2_CLIENT_ID`: Google OAuth client ID
- `HERMES_WEB_ALGOLIA_APP_ID`: Algolia application ID
- `HERMES_WEB_ALGOLIA_SEARCH_API_KEY`: Algolia search key
- `HERMES_WEB_ALGOLIA_*_INDEX_NAME`: Index names (docs, drafts, internal, projects)
- `HERMES_WEB_SHORT_LINK_BASE_URL`: Base URL for short links
- `HERMES_WEB_GOOGLE_ANALYTICS_TAG_ID`: GA tracking ID

## What Not To Do

❌ **Don't** commit `config.hcl`, `credentials.json`, or `token.json` (gitignored)
❌ **Don't** run PostgreSQL tests without starting the Docker container first

## Quick Reference - Make Targets

| Target | Description | Speed | Requirements |
|--------|-------------|-------|--------------|
| `make bin` | Build Go binary only | Fast | Go 1.25+ |
| `make build` | Full build (web + Go) | Slow | Node 20, Yarn 4, Go 1.25+ |
| `make go/test` | Go tests without DB | Fast | Go 1.25+ |
| `make go/test/with-docker-postgres` | Go tests with DB | Medium | Docker, PostgreSQL running |
| `make web/build` | Build Ember production | Slow | Node 20, Yarn 4 |
| `make web/test` | Run Ember tests | N/A | ❌ Currently broken |
| `make docker/postgres/start` | Start PostgreSQL | Fast | Docker |
| `make docker/postgres/stop` | Stop PostgreSQL | Fast | Docker |
| `make docker/postgres/clear` | Stop + clear data | Fast | Docker |

## Trust These Instructions

These instructions were created by thoroughly testing the build process, examining CI workflows, reviewing code structure, and documenting actual behavior (not assumptions). When you encounter errors or unexpected behavior:

1. **First**, check if it's documented above as expected/known
2. **Second**, verify you followed the exact command sequence
3. **Third**, check that prerequisites (PostgreSQL, correct versions) are met
4. **Only then** search the codebase or attempt fixes

This workflow ensures **repeatable, tested results** and minimizes trial-and-error debugging.
