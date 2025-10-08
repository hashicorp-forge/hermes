# Local Workspace Provider Configuration Summary

**Date**: October 7, 2025  
**Task**: Configure testing environment to use local workspace provider with persistent document storage and test users mirroring Dex identities

## Changes Made

### 1. Updated `testing/config.hcl`

Added explicit provider selection:

```hcl
// Provider selection (use local workspace and Meilisearch search)
providers {
  workspace = "local"
  search    = "meilisearch"
}
```

This ensures the Hermes backend uses:
- **Local filesystem adapter** for document storage (instead of Google Workspace)
- **Meilisearch** for search (instead of Algolia)

The `local_workspace` block was already present, so no additional configuration was needed there.

### 2. Created `testing/users.json`

Created a test user database with 6 users:

**Primary Users (Match Dex staticPasswords)**:
- `test@hermes.local` - Test User (tester role)
- `admin@hermes.local` - Admin User (admin role)
- `user@hermes.local` - Regular User (basic permissions)

**Additional Users (For people search testing)**:
- `jane.smith@hermes.local` - Jane Smith (engineering)
- `john.doe@hermes.local` - John Doe (product)
- `sarah.johnson@hermes.local` - Sarah Johnson (design)

Each user includes:
- Email address (matches Dex domain: `@hermes.local`)
- Full name, given name, family name
- Photo URL (UI Avatars with color coding)
- Unique UUID (matches Dex user IDs for primary users)
- Group memberships

### 3. Updated `testing/docker-compose.yml`

Added volume mount for users.json in the hermes service:

```yaml
volumes:
  # Mount acceptance testing configuration
  - ./config.hcl:/app/config.hcl:ro
  # Mount test users data (mirrors Dex identities)
  - ./users.json:/app/workspace_data/users.json:ro
  # Mount workspace data (persists across restarts)
  - hermes_workspace:/app/workspace_data
```

The `hermes_workspace` volume was already configured for persistent storage.

### 4. Created `testing/README-local-workspace.md`

Comprehensive documentation covering:
- Overview and benefits of local workspace provider
- Configuration details
- Test user reference table
- Usage instructions
- Verification steps
- Document persistence with volume operations
- Adding new test users
- Troubleshooting guide
- Architecture comparison (Google vs Local)
- Migration path back to Google Workspace

### 5. Created `testing/verify-local-workspace.sh`

Verification script that checks:
- ✓ config.hcl has providers block with workspace = "local"
- ✓ local_workspace block exists
- ✓ users.json exists and is valid JSON
- ✓ All Dex users are present in users.json
- ✓ docker-compose.yml has users.json volume mount
- ✓ docker-compose.yml has hermes_workspace volume
- ✓ Dex configuration aligns with users.json

Script returns exit code 0 on success, 1 on failure.

### 6. Updated `testing/README.md`

Added:
- Notice about local workspace provider at top
- Link to README-local-workspace.md
- Test user credentials in authentication section
- New section (3a) with verification script instructions

## Verification

Ran `./verify-local-workspace.sh` - **All checks passed** ✅

```
✓ config.hcl has workspace provider set to 'local'
✓ config.hcl has local_workspace block
✓ users.json exists and is valid JSON (6 users)
✓   - test@hermes.local found in users.json
✓   - admin@hermes.local found in users.json
✓   - user@hermes.local found in users.json
✓ docker-compose.yml mounts users.json to /app/workspace_data/users.json
✓ docker-compose.yml has hermes_workspace volume configured
✓   - test@hermes.local found in dex-config.yaml
✓   - admin@hermes.local found in dex-config.yaml
✓   - user@hermes.local found in dex-config.yaml
```

## Architecture Overview

### Before (Google Workspace)
```
Browser → Hermes API → Google Drive API → Google Docs
                    → Google People API → User Directory
```

### After (Local Workspace)
```
Browser → Hermes API → Local Filesystem → users.json (static users)
                                        → docs/*.md (persisted)
                                        → drafts/*.md (persisted)
                    → Dex OIDC → Static Passwords
```

## Benefits

1. **No External Dependencies**: Testing doesn't require Google Workspace account
2. **Persistent Storage**: Documents survive container restarts via Docker volume
3. **Deterministic Testing**: User data is predictable and version-controlled
4. **Static User Database**: PeopleService reads from users.json (no API calls)
5. **Offline Testing**: Works without internet connection
6. **Cost-Free**: No Google Workspace API quotas or costs

## Usage

### Start Environment
```bash
cd testing
docker compose up -d --build
```

### Login
- URL: http://localhost:4201
- Email: `test@hermes.local`
- Password: `password`

### Verify Users API
```bash
# Check mounted users.json
docker exec hermes-acceptance cat /app/workspace_data/users.json

# Check workspace directory
docker exec hermes-acceptance ls -la /app/workspace_data/

# View logs
docker compose logs -f hermes
```

### Backup/Restore Documents
```bash
# Backup
docker run --rm -v testing_hermes_workspace:/data -v $(pwd):/backup \
  alpine tar czf /backup/workspace-backup.tar.gz -C /data .

# Restore
docker run --rm -v testing_hermes_workspace:/data -v $(pwd):/backup \
  alpine tar xzf /backup/workspace-backup.tar.gz -C /data
```

## Files Modified/Created

### Modified
- `testing/config.hcl` - Added providers block
- `testing/docker-compose.yml` - Added users.json volume mount
- `testing/README.md` - Added local workspace notices and verification section

### Created
- `testing/users.json` - Test user database (6 users)
- `testing/README-local-workspace.md` - Comprehensive documentation
- `testing/verify-local-workspace.sh` - Configuration verification script

## Testing Strategy

The local workspace provider implementation in `pkg/workspace/adapters/local/` provides:

1. **DocumentStorage**: Read/write markdown files to `docs/` and `drafts/`
2. **PeopleService**: Read users from `users.json`, search by name/email
3. **NotificationService**: Email notifications (SMTP, disabled in testing)
4. **AuthService**: Token management (stored in `tokens/` directory)

All services are backend-agnostic and follow the `workspace.Provider` interface, allowing seamless switching between Google Workspace and local filesystem.

## Future Enhancements

1. Add more test users for complex permission scenarios
2. Pre-populate sample documents for testing search and display
3. Add test data generator script for bulk document creation
4. Create acceptance test suite that uses local workspace
5. Document migration scripts (Google → Local, Local → Google)

## Related Documentation

- **Workspace Abstraction**: `docs-internal/completed/WORKSPACE_ABSTRACTION_DESIGN.md`
- **Provider Selection**: `docs-internal/PROVIDER_SELECTION.md`
- **Local Adapter Code**: `pkg/workspace/adapters/local/`
- **Dex Authentication**: `docs-internal/DEX_QUICK_START.md`
- **Testing Environments**: `TESTING_ENVIRONMENTS.md`

## Prompt Used

**User Request**:
> ensure that the local workspace is enabled for ./testing hermes server as the main provider
>
> use a volume export for that local provider so the documents persist during acceptance testing
>
> add a users.json that mirrors the dex user identities for static authentication testing, create test data so that these users can be returned through the local workspace provider

**Implementation Approach**:
1. Analyzed existing configuration (config.hcl, docker-compose.yml, dex-config.yaml)
2. Identified that provider selection mechanism exists in internal/config/config.go
3. Added explicit provider configuration to config.hcl
4. Created users.json mirroring Dex staticPasswords with 3 primary + 3 additional users
5. Updated docker-compose.yml to mount users.json into workspace_data directory
6. Verified existing volume configuration for document persistence
7. Created comprehensive documentation and verification tooling

**Result**: Fully configured local workspace provider with persistent storage, static test users, and verification tooling. All checks pass, ready for acceptance testing.
