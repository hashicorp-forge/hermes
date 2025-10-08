# Container Name Simplification

**Date**: October 7, 2025  
**Branch**: jrepp/dev-tidy  
**Commit**: 0eab6f5

## Summary

Simplified all container, network, volume, and service names in the testing environment by removing the "acceptance" suffix. This makes the configuration cleaner and easier to understand.

## Changes Made

### Container Names

| Before | After | Purpose |
|--------|-------|---------|
| `hermes-acceptance` | `hermes-server` | Backend Go server |
| `hermes-web-acceptance` | `hermes-web` | Frontend Ember app |
| `dex-acceptance` | `hermes-dex` | Dex OIDC provider |
| `postgres` | `postgres` | PostgreSQL (no container name set) |
| `meilisearch` | `meilisearch` | Meilisearch (no container name set) |

### Network Names

| Before | After |
|--------|-------|
| `hermes-acceptance` | `hermes-testing` |

### Volume Names

| Before | After |
|--------|-------|
| `postgres_acceptance` | `postgres_testing` |
| `meilisearch_acceptance` | `meilisearch_testing` |
| `hermes_workspace` | `hermes_workspace` *(unchanged)* |

### Database Names

| Before | After |
|--------|-------|
| `hermes_acceptance` | `hermes_testing` |

### OIDC Client Configuration

| Before | After |
|--------|-------|
| Client ID: `hermes-acceptance` | Client ID: `hermes-testing` |
| Client Name: `Hermes Acceptance` | Client Name: `Hermes Testing` |
| Client Secret: `YWNjZXB0YW5jZS1hcHAtc2VjcmV0` | Client Secret: `dGVzdGluZy1hcHAtc2VjcmV0` |

**Note**: The client secret is base64-encoded. The decoded values are:
- Old: `acceptance-app-secret`
- New: `testing-app-secret`

## Files Modified

1. **testing/docker-compose.yml**
   - Updated all container names, network names, and volume names
   - Updated comments from "Acceptance Testing" to "Testing Environment"

2. **testing/config.hcl**
   - Changed database name: `hermes_acceptance` → `hermes_testing`
   - Changed Dex client_id: `hermes-acceptance` → `hermes-testing`
   - Changed Dex client_secret to match new client ID
   - Updated comment: "acceptance testing" → "testing"

3. **testing/config-profiles.hcl**
   - Changed database name: `hermes_acceptance` → `hermes_testing`
   - Changed Dex client_id: `hermes-acceptance` → `hermes-testing`

4. **testing/dex-config.yaml**
   - Updated header comment: "Acceptance Testing" → "Testing Environment"
   - Changed client ID: `hermes-acceptance` → `hermes-testing`
   - Changed client name: `Hermes Acceptance` → `Hermes Testing`
   - Changed client secret to match new client ID
   - Updated comment: "acceptance testing" → "testing"

5. **testing/test-local-workspace-integration.sh**
   - Updated all `docker exec` commands: `hermes-acceptance` → `hermes-server`

6. **testing/README.md**
   - Updated title: "Acceptance Testing Environment" → "Testing Environment"
   - Updated table headers and content
   - Updated ASCII diagram with new container names

7. **testing/README-local-workspace.md**
   - Updated title: "Acceptance Testing" → "Testing Environment"
   - Updated all `docker exec` examples: `hermes-acceptance` → `hermes-server`

8. **testing/LOCAL_WORKSPACE_SETUP_SUMMARY.md**
   - Updated `docker exec` examples: `hermes-acceptance` → `hermes-server`
   - Updated comment: "acceptance testing configuration" → "testing configuration"

9. **testing/quick-start-local-workspace.sh**
   - Updated header comment: "acceptance testing" → "testing environment"
   - Updated success message: "acceptance testing" → "testing environment"

## Migration Guide

If you have existing containers, networks, or volumes, you'll need to migrate:

### 1. Stop and Remove Old Containers

```bash
cd testing
docker compose down
```

### 2. Remove Old Volumes (Optional - Will Delete Data)

```bash
docker volume rm testing_postgres_acceptance
docker volume rm testing_meilisearch_acceptance
```

Or keep data by renaming volumes:

```bash
docker volume create testing_postgres_testing
docker volume create testing_meilisearch_testing
```

Then copy data from old to new volumes using temporary containers.

### 3. Start with New Configuration

```bash
docker compose up -d --build
```

## Breaking Changes

⚠️ **Important**: These changes are breaking for existing deployments:

1. **Container names changed** - Any scripts or tools referencing old container names will break
2. **Volume names changed** - Data in old volumes won't be automatically migrated
3. **Network name changed** - External connections to the network will need updating
4. **Database name changed** - Any external database connections will need updating
5. **OIDC client credentials changed** - Any cached authentication will be invalidated

## Benefits

1. **Cleaner names**: Shorter, simpler container names
2. **Consistent naming**: All containers now follow `hermes-*` pattern
3. **Clear purpose**: "testing" better reflects the environment's purpose
4. **Easier to type**: Shorter names in CLI commands
5. **Better organization**: Clear separation from other environments

## Verification

After applying changes, verify everything works:

```bash
cd testing

# Verify configuration
./verify-local-workspace.sh

# Start environment
docker compose up -d

# Check container names
docker ps --format "table {{.Names}}\t{{.Status}}"

# Check network
docker network ls | grep hermes

# Check volumes
docker volume ls | grep testing

# Run integration tests
./test-local-workspace-integration.sh
```

## Rollback

If needed, revert to previous commit:

```bash
git revert 0eab6f5
```

Then restart containers:

```bash
cd testing
docker compose down
docker compose up -d --build
```

## Related Documentation

- `testing/README.md` - Main testing environment documentation
- `testing/README-local-workspace.md` - Local workspace provider guide
- `testing/docker-compose.yml` - Container orchestration configuration
- `.github/copilot-instructions.md` - Project build and test instructions
