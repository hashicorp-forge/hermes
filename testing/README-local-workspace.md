# Local Workspace Provider Setup for Acceptance Testing

## Overview

The acceptance testing environment now uses the **local workspace provider** instead of Google Workspace. This enables:

1. **Persistent document storage** across container restarts via Docker volumes
2. **Static test users** that mirror Dex authentication identities
3. **Offline testing** without requiring Google Workspace credentials
4. **Deterministic testing** with predictable user data

## Configuration

### Provider Selection (`testing/config.hcl`)

```hcl
providers {
  workspace = "local"      # Use local filesystem adapter
  search    = "meilisearch" # Use Meilisearch for search
}

local_workspace {
  base_path    = "/app/workspace_data"
  docs_path    = "/app/workspace_data/docs"
  drafts_path  = "/app/workspace_data/drafts"
  folders_path = "/app/workspace_data/folders"
  users_path   = "/app/workspace_data/users"
  tokens_path  = "/app/workspace_data/tokens"
  domain       = "hermes.local"
  
  smtp {
    enabled = false
  }
}
```

### Volume Mounts (`testing/docker-compose.yml`)

```yaml
volumes:
  # Static test users (read-only)
  - ./users.json:/app/workspace_data/users.json:ro
  # Persistent workspace data (documents, drafts, folders)
  - hermes_workspace:/app/workspace_data
```

## Test Users

The `testing/users.json` file contains 6 test users that mirror the Dex OIDC identities:

### Primary Test Users (Match Dex staticPasswords)

| Email | Name | User ID | Password | Groups |
|-------|------|---------|----------|--------|
| test@hermes.local | Test User | 08a8684b-db88-4b73-90a9-3cd1661f5466 | `password` | users, testers |
| admin@hermes.local | Admin User | 08a8684b-db88-4b73-90a9-3cd1661f5467 | `password` | users, admins |
| user@hermes.local | Regular User | 08a8684b-db88-4b73-90a9-3cd1661f5468 | `password` | users |

### Additional Test Users (No Dex credentials, for people search testing)

| Email | Name | User ID | Groups |
|-------|------|---------|--------|
| jane.smith@hermes.local | Jane Smith | 08a8684b-db88-4b73-90a9-3cd1661f5469 | users, engineering |
| john.doe@hermes.local | John Doe | 08a8684b-db88-4b73-90a9-3cd1661f5470 | users, product |
| sarah.johnson@hermes.local | Sarah Johnson | 08a8684b-db88-4b73-90a9-3cd1661f5471 | users, design |

All users have:
- Photo URLs using [UI Avatars](https://ui-avatars.com) service (color-coded by role)
- Given name and family name split
- Group memberships for testing permissions

## Usage

### Start the Environment

```bash
cd testing
docker compose up -d --build
```

### Login

1. Navigate to http://localhost:4201
2. Click "Login with Dex"
3. Use credentials:
   - **Email**: `test@hermes.local` (or `admin@hermes.local` / `user@hermes.local`)
   - **Password**: `password`

### Verify Local Workspace

```bash
# Check that users.json is mounted
docker exec hermes-acceptance cat /app/workspace_data/users.json

# Check workspace directory structure
docker exec hermes-acceptance ls -la /app/workspace_data/

# View logs to confirm local provider is active
docker compose logs -f hermes | grep -i "workspace provider"
```

### Test People Search

The local workspace adapter's `PeopleService` supports:

- **GetUser**: Retrieve user by email
- **SearchUsers**: Search users by name or email (case-insensitive)
- **GetUserPhoto**: Get user photo URL

Example API calls:

```bash
# Get user by email
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8001/api/v1/users/test@hermes.local

# Search users
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8001/api/v1/users?q=admin"
```

## Document Persistence

Documents created in the acceptance testing environment are stored in the `hermes_workspace` Docker volume:

```
/app/workspace_data/
├── users.json          # Static user data (mounted from host)
├── docs/               # Published documents (persisted in volume)
├── drafts/             # Draft documents (persisted in volume)
├── folders/            # Folder metadata (persisted in volume)
└── tokens/             # Auth tokens (persisted in volume)
```

### Volume Operations

```bash
# View volume location
docker volume inspect testing_hermes_workspace

# Backup workspace data
docker run --rm -v testing_hermes_workspace:/data -v $(pwd):/backup \
  alpine tar czf /backup/workspace-backup.tar.gz -C /data .

# Restore workspace data
docker run --rm -v testing_hermes_workspace:/data -v $(pwd):/backup \
  alpine tar xzf /backup/workspace-backup.tar.gz -C /data

# Clear all workspace data (start fresh)
docker compose down -v
docker compose up -d
```

## Adding More Test Users

To add more test users, edit `testing/users.json`:

```json
{
  "newuser@hermes.local": {
    "email": "newuser@hermes.local",
    "name": "New User",
    "given_name": "New",
    "family_name": "User",
    "photo_url": "https://ui-avatars.com/api/?name=New+User&background=random&color=fff&size=200",
    "id": "unique-uuid-here",
    "groups": ["users"]
  }
}
```

Then restart the Hermes container:

```bash
docker compose restart hermes
```

**Note**: To allow login with the new user, you must also add them to `testing/dex-config.yaml` under `staticPasswords`.

## Troubleshooting

### Users Not Found

**Symptom**: API returns 404 for user lookups

**Solutions**:
1. Verify users.json is mounted: `docker exec hermes-acceptance cat /app/workspace_data/users.json`
2. Check file permissions: users.json should be readable
3. Verify workspace provider is set to "local" in config.hcl
4. Check logs: `docker compose logs hermes | grep -i "workspace\|provider"`

### Documents Not Persisting

**Symptom**: Documents disappear after container restart

**Solutions**:
1. Verify volume exists: `docker volume ls | grep workspace`
2. Check volume mount: `docker exec hermes-acceptance ls -la /app/workspace_data/`
3. Ensure volume is defined in docker-compose.yml under `volumes:` section
4. Don't use `docker compose down -v` (removes volumes)

### Authentication Fails

**Symptom**: Dex login succeeds but Hermes rejects session

**Solutions**:
1. Verify email domains match: Dex users use `@hermes.local`, users.json must match
2. Check local_workspace.domain in config.hcl (should be "hermes.local")
3. Verify user exists in users.json with correct email
4. Check Hermes logs for auth errors: `docker compose logs hermes | grep -i auth`

## Architecture Comparison

### Previous (Google Workspace)
```
Browser → Hermes → Google Drive API → Google Docs
                → Google People API → User Directory
```

### Current (Local Workspace)
```
Browser → Hermes → Local Filesystem → users.json
                                    → docs/*.md
                                    → drafts/*.md
                → Dex OIDC → Static Passwords
```

## Benefits

1. **No External Dependencies**: No Google Workspace account required
2. **Faster Testing**: No network latency for API calls
3. **Deterministic**: User data and documents are predictable
4. **Cost-Free**: No API quota limits or service costs
5. **Offline**: Works without internet connection
6. **Version Controlled**: Test data can be committed to git

## Limitations

1. **No Collaboration Features**: No real-time editing or comments
2. **Simple Storage**: Markdown files instead of Google Docs
3. **No Sharing UI**: Google Drive sharing UI not available
4. **Limited Search**: File-based search vs. Google's semantic search
5. **No Workspace Integration**: No Gmail, Calendar, etc. integration

## Migration Path

To migrate from local workspace back to Google Workspace:

1. Update `testing/config.hcl`:
   ```hcl
   providers {
     workspace = "google"
     search    = "algolia"
   }
   ```
2. Uncomment Google Workspace credentials in config.hcl
3. Remove or keep users.json (harmless if present)
4. Restart: `docker compose restart hermes`

## Related Documentation

- **Design**: `docs-internal/completed/WORKSPACE_ABSTRACTION_DESIGN.md`
- **Local Adapter**: `pkg/workspace/adapters/local/README.md`
- **Provider Selection**: `docs-internal/PROVIDER_SELECTION.md`
- **Dex Setup**: `docs-internal/DEX_QUICK_START.md`
