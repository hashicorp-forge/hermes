# Agent Instructions Simplification - 2025-10-08

## Changes Made

### 1. Simplified Development Workflow Section

**File**: `.github/copilot-instructions.md`

**Before**: Confusing mix of commands without clear directory context
**After**: Three explicit development modes with clear directory paths

#### New Structure:

**Mode 1: Native Backend + Native Frontend**
- Clearest workflow path: `cd testing` → start deps → `cd ..` → start backend → `cd web` → start frontend
- Emphasizes `./testing` directory for dependencies

**Mode 2: Testing Backend (Docker) + Native Frontend**
- Start everything: `cd testing && docker compose up -d`
- Frontend connects to testing backend on port 8001
- Clear separation: backend in Docker, frontend native

**Mode 3: Fully Containerized**
- Simplest for integration testing
- Everything runs in `./testing` directory
- Access at http://localhost:4201

### 2. Updated Dockerfile CMD

**File**: `web/Dockerfile`

**Change**: Added `MIRAGE_ENABLED=false` to the CMD

```dockerfile
# Before:
CMD ["sh", "-c", "yarn ember server --proxy ${HERMES_API_URL:-http://hermes:8000} --port 4200 --host 0.0.0.0"]

# After:
CMD ["sh", "-c", "MIRAGE_ENABLED=false yarn ember server --proxy ${HERMES_API_URL:-http://hermes:8000} --port 4200 --host 0.0.0.0"]
```

**Rationale**: Ensures consistency with npm scripts (`yarn start:proxy`, `yarn start:proxy:local`, `yarn start:proxy:testing`) which all set `MIRAGE_ENABLED=false`

### 3. Clarified Quick Start Commands

**File**: `.github/copilot-instructions.md`

Replaced verbose "Quick Iteration Workflow" section with concise "Quick Start Commands" that show:
- How to check what's running (`cd testing && docker compose ps`)
- Health check commands for all services
- How to stop services properly
- Simple iteration cycle for native mode

### 4. Port Conventions Table

Added explicit table showing port mappings:

| Service | Native | Testing (./testing) |
|---------|--------|---------------------|
| Frontend | 4200 | 4201 |
| Backend | 8000 | 8001 |
| Postgres | 5432 | 5433 |
| Meilisearch | 7700 | 7701 |
| Dex | 5556/5557 | 5558/5559 |

## Key Improvements

### 1. Directory Context Always Clear
- **Before**: Commands started with ambiguous working directory
- **After**: Every workflow explicitly states `cd testing` when needed

### 2. Testing Environment = ./testing Directory
- **Before**: "Testing backend" could mean anything
- **After**: "Testing (in `./testing`)" makes it explicit

### 3. Docker Compose Always in ./testing
- **Before**: `docker compose up -d` could run anywhere
- **After**: `cd testing && docker compose up -d` is the pattern

### 4. Consistent Mirage Configuration
- **Before**: Dockerfile didn't match npm scripts
- **After**: All proxy commands use `MIRAGE_ENABLED=false`

## Verification

### Docker Compose Configuration (Already Correct)

The `./testing/docker-compose.yml` already uses the correct pattern:

```yaml
web:
  environment:
    HERMES_API_URL: http://hermes:8000  # Container-to-container
```

And the web Dockerfile now includes `MIRAGE_ENABLED=false` to match the npm scripts.

### Testing Commands

```bash
# Mode 1: Native + Native
cd testing && docker compose up -d dex postgres meilisearch
cd .. && make bin && ./hermes server -config=config.hcl &
cd web && yarn start:proxy:local

# Mode 2: Testing + Native
cd testing && docker compose up -d
cd ../web && yarn start:proxy:testing

# Mode 3: Full Docker
cd testing && docker compose up -d
open http://localhost:4201
```

## Benefits for AI Agents

1. **Clear Working Directory**: Always know if you're in repo root or `./testing`
2. **No Ambiguity**: "Testing environment" = `./testing` directory
3. **Consistent Pattern**: All Docker commands run from `./testing`
4. **Port Clarity**: Table shows exactly which ports for which mode
5. **Quick Reference**: Health checks and status commands in one place

## Related Documentation

- `FRONTEND_PROXY_CONFIGURATION.md` - Detailed proxy configuration guide
- `DEV_QUICK_REFERENCE.md` - Quick reference card for developers
- `FRONTEND_PROXY_SESSION_SUMMARY_2025_10_08.md` - Session summary from previous work
- `TESTING_DOCKER_COMPOSE_DEBUG_2025_10_08.md` - Docker debugging session

## Commit Message

```
docs: simplify agent instructions for development workflows

**Prompt Used**:
simplify the agent instructions for this workflow, make sure it indicates 
the ./testing directory is where we're running. make sure the docker-compose 
is using the correct yarn start command

**AI Implementation Summary**:
- Restructured development workflow section in .github/copilot-instructions.md
  - Three explicit modes: Native+Native, Testing+Native, Full Docker
  - Always specify "cd testing" when running docker compose commands
  - Added port conventions table showing Native vs Testing (./testing) ports
- Updated web/Dockerfile CMD to include MIRAGE_ENABLED=false
  - Matches npm scripts: start:proxy, start:proxy:local, start:proxy:testing
- Replaced "Quick Iteration Workflow" with concise "Quick Start Commands"
  - Status checks, health checks, stop commands
  - Simple iteration cycle for native mode
- Clarified that "Testing environment" = ./testing directory
- Verified docker-compose.yml already uses correct yarn ember server command

**Rationale**:
Previous instructions were ambiguous about working directories. Commands like
"docker compose up -d" could run from repo root or ./testing. Now every
workflow explicitly states "cd testing" when needed. Makes it clear that the
testing environment lives in ./testing directory.

**Files Changed**:
- .github/copilot-instructions.md (development workflow section)
- web/Dockerfile (added MIRAGE_ENABLED=false to CMD)
- docs-internal/AGENT_INSTRUCTIONS_SIMPLIFIED_2025_10_08.md (this doc)

**Verification**:
- ✅ Docker compose commands always prefixed with "cd testing"
- ✅ Port conventions table shows native vs testing ports
- ✅ Dockerfile CMD matches npm scripts (MIRAGE_ENABLED=false)
- ✅ Three modes clearly documented with working directories
- ✅ Quick start commands show status checks and health checks
```
