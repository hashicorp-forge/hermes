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
5. Run `yarn test:unit` to verify unit tests (should pass, 5 known failures)
6. Test manually in browser with `yarn start:with-proxy`

**Full Build Verification**:
```bash
make build  # Should complete successfully with warnings
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

### Example Commit Messages

**Example 1: Feature Implementation**
```
feat: implement Meilisearch adapter for search provider

**Prompt Used**:
Implement Meilisearch adapter for search.Provider interface following TDD.
Design doc: docs-internal/design/SEARCH_ABSTRACTION_DESIGN.md
Test strategy: docs-internal/testing/SEARCH_TEST_STRATEGY.md
Pattern reference: docs-internal/EXISTING_PATTERNS.md

Steps:
1. Create adapter_test.go with test cases from strategy
2. Implement adapter.go to pass tests
3. Add integration tests with testcontainers
4. Verify coverage meets 80% target

**AI Implementation Summary**:
- adapter.go: 528 lines implementing search.Provider interface
- adapter_test.go: 284 lines of unit tests (12 test functions)
- integration_test.go: 327 lines testing real Meilisearch
- Followed error wrapping pattern: fmt.Errorf("operation: %w", err)
- Implemented retry logic for eventual consistency
- Used shared container pattern for test performance

**Verification**:
- make bin: ✅ Success
- go test ./pkg/search/adapters/meilisearch/...: ✅ All pass
- Coverage: 85% (target: 80%) ✅
- Integration tests: 15/15 passing in 12s
```

**Example 2: Refactoring**
```
refactor(api): migrate V2 handlers to workspace provider

**Prompt Used**:
Refactor internal/api/v2/*.go to use workspace.Provider instead of direct gw.Service calls.
Pattern: Same as completed V2/documents.go migration
Files: drafts.go, reviews.go, approvals.go
Verification: go test ./internal/api/v2/...

**AI Implementation Summary**:
- Replaced 47 gw.Service calls with workspace.Provider methods
- Updated error handling to use wrapped errors
- Removed direct Google Workspace API dependencies
- All handlers now backend-agnostic

Files changed:
- drafts.go: -198 lines (removed direct API calls)
- reviews.go: -156 lines (removed direct API calls)  
- approvals.go: -89 lines (removed direct API calls)

**Human Review Notes**:
- Verified error messages still provide useful context
- Checked that retry logic is preserved in provider layer
- Confirmed no behavioral changes (drop-in replacement)

**Verification**:
- make bin: ✅ Success
- go test ./internal/api/v2/...: ✅ 23/23 tests passing
- Integration tests: ✅ No regressions
```

**Example 3: Documentation**
```
docs: add comprehensive API migration documentation

**Prompt Used**:
Generate documentation for completed provider migration following template:
- docs-internal/completed/MIGRATION_COMPLETE_SUMMARY.md
- Include before/after architecture comparison
- List all migrated handlers and statistics
- Document patterns used and best practices
- Create quick reference guide

Reference: docs-internal/PROMPT_TEMPLATES.md (prompt #10)

**AI Implementation Summary**:
- MIGRATION_COMPLETE_SUMMARY.md: 645 lines comprehensive summary
- MIGRATION_STATUS.md: 89 lines quick reference
- MIGRATION_CHECKLIST.md: 112 lines completion verification
- Architecture diagrams showing before/after
- Statistics: 100+ direct API usages eliminated
- Pattern documentation with code examples

**Verification**:
- All markdown files validated with linter
- Links verified (no 404s)
- Code examples tested for syntax correctness
```

**Example 4: Small Fix**
```
fix: correct error wrapping in draft validation

**Prompt Used**:
Fix error in pkg/models/draft.go validation - errors should be wrapped with
context per EXISTING_PATTERNS.md, not returned directly.

**AI Implementation Summary**:
- Changed: return err → return fmt.Errorf("validating draft: %w", err)
- Applied to 3 validation functions
- Preserves error chain for debugging

**Verification**:
- go test ./pkg/models/...: ✅ All pass
- Error messages now include context
```

### When to Store Prompts

**ALWAYS store prompts for**:
- ✅ New feature implementation
- ✅ Refactoring work
- ✅ Test generation
- ✅ Documentation generation
- ✅ Architecture/design changes
- ✅ Bug fixes requiring AI assistance

**Optional for**:
- 🟡 Trivial changes (typo fixes, formatting)
- 🟡 Mechanical changes (bulk renames following established pattern)

**Prompt Quality Standards**:
- Be specific (reference files, patterns, docs)
- Include verification steps in prompt
- Reference design/strategy documents when applicable
- Show expected output format if non-standard

## Trust These Instructions

These instructions were created by thoroughly testing the build process, examining CI workflows, reviewing code structure, and documenting actual behavior (not assumptions). When you encounter errors or unexpected behavior:

1. **First**, check if it's documented above as expected/known
2. **Second**, verify you followed the exact command sequence
3. **Third**, check that prerequisites (PostgreSQL, correct versions) are met
4. **Only then** search the codebase or attempt fixes

This workflow ensures **repeatable, tested results** and minimizes trial-and-error debugging.
