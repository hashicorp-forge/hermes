# Commit Message: Auth Provider Command-Line Selection

## Suggested Commit Message

```
feat(auth): add command-line flag for explicit auth provider selection

**Prompt Used**:
"add the auth provider selection via command line and pass it through docker compose to hermes server in acceptance"

**AI Implementation Summary**:
- Added --auth-provider flag to server command
- Implemented HERMES_AUTH_PROVIDER environment variable support
- Provider selection logic disables non-selected providers automatically
- Updated testing/docker-compose.yml to set HERMES_AUTH_PROVIDER=dex
- Fixed Dex issuer URL to use Docker service name (dex:5557) instead of localhost
- Added comprehensive logging for provider selection source

**Implementation Details**:
- server.go: Added flagAuthProvider field and flag registration
- server.go: Added provider selection switch/case (dex/okta/google)
- server.go: Priority: flag > env var > config file
- testing/docker-compose.yml: Added HERMES_AUTH_PROVIDER environment variable
- testing/dex-config.yaml: Fixed issuer URL for container-to-container communication
- Removed obsolete HERMES_SERVER_OKTA_DISABLED env var from acceptance

**Files Changed**:
- internal/cmd/commands/server/server.go (+48 lines)
- testing/docker-compose.yml (+2 lines, -1 line)
- testing/dex-config.yaml (1 line modified)
- docs-internal/AUTH_PROVIDER_SELECTION.md (new, 310 lines)
- docs-internal/DEX_QUICK_START.md (+2 lines)
- docs-internal/DEX_AUTHENTICATION.md (+2 lines)

**Verification**:
- ✅ make bin: Success
- ✅ docker compose build hermes: Success  
- ✅ Hermes logs show "auth provider selection: provider=dex source=flag/env"
- ✅ Hermes container healthy and listening on 0.0.0.0:8000
- ✅ Dex container healthy and responding to OIDC discovery
- ✅ Help text displays correctly: hermes server --help | grep auth-provider
- ✅ Invalid provider names correctly rejected with error

**Testing**:
Successfully tested in acceptance environment:
```bash
cd testing
docker compose up -d --build
docker compose ps  # hermes (healthy), dex (healthy)
docker compose logs hermes | grep "auth provider selection"
# Output: "auth provider selection: provider=dex source=flag/env"
```

**Benefits**:
- Explicit control over auth provider selection
- Environment variable support for CI/CD pipelines
- No config file edits needed to switch providers
- Clear logging of provider selection and source
- Simplified testing with multiple auth providers

**Related Issues**: None

**Related PRs**: Part of Dex IDP integration feature set
```

## Files to Include in Commit

```bash
git add internal/cmd/commands/server/server.go
git add testing/docker-compose.yml
git add testing/dex-config.yaml
git add docs-internal/AUTH_PROVIDER_SELECTION.md
git add docs-internal/DEX_QUICK_START.md
git add docs-internal/DEX_AUTHENTICATION.md
```

## Verification Commands for Commit Description

```bash
# Build verification
make bin

# Test in acceptance environment
cd testing
docker compose up -d --build
docker compose ps
docker compose logs hermes | grep "auth provider"

# Help text verification
./build/bin/hermes server --help | grep -A 3 "auth-provider"

# Test invalid provider
./build/bin/hermes server -auth-provider=invalid -config=testing/config-profiles.hcl
```

## Breaking Changes

None. This is a purely additive feature:
- Existing configurations continue to work unchanged
- Auto-selection behavior is preserved when flag/env var not set
- Config file `disabled` flags still work as before

## Migration Guide

No migration needed. To use the new feature:

**Option 1 - Command Line**:
```bash
hermes server -config=config.hcl -auth-provider=dex
```

**Option 2 - Environment Variable**:
```bash
export HERMES_AUTH_PROVIDER=dex
hermes server -config=config.hcl
```

**Option 3 - Docker Compose**:
```yaml
services:
  hermes:
    environment:
      HERMES_AUTH_PROVIDER: dex
```

## Rollback Plan

If needed, rollback is trivial:
1. Remove `HERMES_AUTH_PROVIDER` from environment
2. Remove `--auth-provider` from command-line invocation
3. System reverts to auto-selection based on config file

No database migrations or data changes involved.
