# Docker Testing Infrastructure - Session Summary

**Date**: October 6, 2025  
**Branch**: jrepp/dev-tidy  
**Commits**: 3 (d50e372, 298c643, 817e8c0)

## Objective

Create a complete, self-verifying containerized testing environment for Hermes that includes:
- PostgreSQL database
- Meilisearch search backend  
- Hermes backend service
- Ember.js web frontend
- Automated health checks and validation

## What Was Accomplished

### 1. Docker Build Infrastructure ✅

**Created `.dockerignore` (66 lines)**
- Excludes node_modules (2.4GB) to optimize build context
- Reduces Docker context from 2.6GB to ~250KB
- Preserves web/dist for hermes binary embedding
- Prevents build timeouts and memory exhaustion

**Optimized `testing/Dockerfile.hermes`**
- Changed from 3-stage to 1-stage build
- Uses pre-built web assets from host (avoids OOM)
- Added validation: `test -d web/dist || exit 1`
- Build time: 9 seconds (was failing at 60s+)
- Added config mount: CMD ["server", "-config=/app/config.hcl"]

**Simplified `testing/Dockerfile.web`**
- Changed from multi-stage to single-stage
- Copies pre-built web/dist from host
- No yarn install/build in container (avoids OOM)
- Build time: 2 seconds (was failing at 66s+)

### 2. Docker Compose Configuration ✅

**Fixed `testing/docker-compose.yml`**
- Corrected volumes syntax (commented out malformed mount)
- Fixed meilisearch health check (curl instead of wget)
- Isolated ports to avoid conflicts:
  * PostgreSQL: 5433 (not 5432)
  * Meilisearch: 7701 (not 7700)
  * Hermes: 8001 (not 8000)
  * Web: 4201 (not 4200)
- All services use isolated `hermes-test` network
- Separate volumes: postgres_test, meilisearch_test

### 3. Configuration Files ✅

**Created valid `testing/config.hcl` (144 lines)**
- Fixed HCL syntax with proper block labels
- Added all required fields (template, flight_icon, etc.)
- Configured Google Workspace auth to avoid credentials.json
- Matches configs/config.hcl structure exactly
- Sections: algolia, datadog, document_types, email, feature_flags,
  google_workspace, indexer, jira, okta, postgres, products, server

### 4. Documentation ✅

**Created `TESTING_ENVIRONMENTS.md` (400+ lines)**
- Comparison: Local dev vs containerized testing
- Architecture diagrams (ASCII art)
- Quick command reference for both environments
- Troubleshooting section
- Known issues and workarounds
- Updated with current status

### 5. Build Validation ✅

**Successful Builds**:
- `docker compose -f testing/docker-compose.yml build`: ✅ 11.5 seconds
- PostgreSQL health check: ✅ Passes in 5 seconds
- Meilisearch health check: ✅ Passes in 5 seconds (after curl fix)
- Hermes binary compilation: ✅ Compiles successfully
- Web nginx container: ✅ Builds with pre-built assets

## What Remains (Blockers)

### Algolia Dependency Issue 🔴

**Problem**: Hermes server command requires Algolia connection even in test mode

**Error**: 
```
error initializing Algolia write client: all hosts have been contacted 
unsuccessfully, it can either be a server or a network error or wrong 
appID/key credentials were used
```

**Root Cause**: 
- Server initialization unconditionally connects to Algolia
- Unlike canary command which supports `-search-backend` flag
- No way to use local/meilisearch adapter at server startup

**Impact**:
- Hermes container fails at runtime (not build time)
- Blocks full containerized environment from working
- postgres ✅, meilisearch ✅, web ✅, hermes ❌

### Possible Solutions

**Option 1: Add Search Backend Flag** (Recommended)
- Add `-search-backend` flag to server command
- Reference: `internal/cmd/commands/canary/canary.go` (lines 40-65)
- Allows: `hermes server -config=config.hcl -search-backend=meilisearch`
- Effort: Medium (requires code changes)

**Option 2: Mock Algolia Service**
- Add mock-algolia service to docker-compose.yml
- Responds to health checks but doesn't actually index
- Effort: Low (docker-compose only)
- Limitation: Doesn't test real search functionality

**Option 3: Conditional Initialization**
- Modify server initialization to skip Algolia if disabled
- Check okta.disabled flag or add new algolia.disabled
- Effort: Medium (requires careful code changes)

**Option 4: Use Local Adapter** (Best long-term)
- Integrate workspace/search abstraction into server command
- Use local adapter for testing (no external dependencies)
- Effort: High (significant refactoring)

## Commits Created

### Commit 1: `d50e372` - Testing environments documentation
```
docs: add comprehensive testing environments guide

- TESTING_ENVIRONMENTS.md: 400+ lines
- Comparison table, architecture diagrams
- Quick command reference, troubleshooting
```

### Commit 2: `298c643` - Docker infrastructure fixes
```
fix(testing): optimize Docker builds and fix configuration issues

- .dockerignore: Exclude node_modules (2.4GB)
- testing/Dockerfile.hermes: Use pre-built web assets
- testing/Dockerfile.web: Simplified single-stage build
- testing/config.hcl: Complete valid HCL configuration
- testing/docker-compose.yml: Fixed syntax and health checks
```

### Commit 3: `817e8c0` - Status documentation
```
docs: update testing environments status with known issues

- Added "Current Status" section (✅🚧🔴)
- Documented Algolia dependency blocking issue
- Listed workarounds and next steps
```

## Verification Commands

### Build Everything
```bash
# Ensure web assets are built
make web/build

# Build Docker containers
cd testing
docker compose build
```

### Test What Works
```bash
# Start postgres and meilisearch only
docker compose up -d postgres meilisearch

# Check health
docker compose ps

# Check meilisearch is accessible
curl http://localhost:7701/health
```

### See The Failure
```bash
# Try to start hermes (will fail)
docker compose up -d hermes

# Check logs
docker compose logs hermes
```

## Performance Improvements

**Before Optimization**:
- Docker build context: 2.6GB
- Web build in container: 60+ seconds → OOM failure
- Hermes build: 60+ seconds → OOM failure
- Total build time: Never completed

**After Optimization**:
- Docker build context: ~250KB (10x smaller)
- Web container build: 2 seconds ✅
- Hermes container build: 9 seconds ✅
- Total build time: 11.5 seconds ✅

**Key Optimization**: Pre-build web assets on host, copy into containers.
This avoids yarn installing 2.4GB of node_modules in Docker.

## Files Changed Summary

```
6 files changed, 215 insertions(+), 110 deletions(-)

New:
- .dockerignore (66 lines)

Modified:
- testing/.dockerignore (updated for parent context)
- testing/docker-compose.yml (syntax fixes, health checks)
- testing/Dockerfile.hermes (simplified, pre-built assets)
- testing/Dockerfile.web (simplified, pre-built assets)
- testing/config.hcl (complete rewrite, 144 lines)

Documentation:
- TESTING_ENVIRONMENTS.md (created, 400+ lines)
- TESTING_ENVIRONMENTS.md (updated with status)
```

## Recommendations

### For Immediate Use
1. **Use local development environment** (fully working)
   ```bash
   docker-compose up -d
   make bin
   ./hermes server -config=config.hcl
   make canary  # Validates everything works
   ```

### For Future Work
1. **Add search backend abstraction to server command**
   - Priority: High
   - Impact: Unblocks containerized testing
   - Reference: canary command implementation

2. **Integrate local adapter for testing**
   - Priority: Medium
   - Impact: No external dependencies for tests
   - Reference: pkg/workspace/adapters/local/

3. **Add Meilisearch support to server**
   - Priority: Medium
   - Impact: Provides alternative to Algolia
   - Reference: pkg/search/adapters/meilisearch/

## Lessons Learned

### Docker Build Best Practices
1. **Always check context size**: 2.4GB node_modules killed builds
2. **Pre-build assets when possible**: Faster, more reliable
3. **Use .dockerignore aggressively**: Reduces context transfer time
4. **Layer caching matters**: COPY package files before source code

### HCL Configuration
1. **All blocks need labels**: `product "Name"` not `product { name = "Name" }`
2. **Required fields vary by block**: document_type needs `template`
3. **Comments are `//` not `#`**: HCL is C-style
4. **Auth config required**: Even when auth is disabled

### Health Checks
1. **Check what tools are in the image**: wget vs curl
2. **Use curl -f for HTTP checks**: Fails on non-200 status
3. **Set reasonable intervals**: 5s interval, 5 retries = 25s max

## Next Session Recommendations

1. Start with server command modification (add -search-backend flag)
2. Test with meilisearch backend in containerized environment
3. Add integration test that validates full stack
4. Document any remaining issues
5. Consider adding mock Algolia as interim solution

## Time Investment

- Docker infrastructure: 2 hours
- Configuration debugging: 1.5 hours
- Documentation: 30 minutes
- Total: ~4 hours

**Value Delivered**:
- Complete Docker build infrastructure
- Comprehensive documentation
- Clear path forward for full containerized testing
- Identified and documented blocker with solutions
