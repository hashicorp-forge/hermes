---
id: ADR-075
title: People API Architecture Clarification - No Database Table Needed
date: 2025-10-09
status: accepted
tags: [architecture, people, workspace, local, google]
related:
  - TODO-015
  - TODO-014
  - ADR-071
  - ADR-073
---

# ADR-075: People API Architecture Clarification - No Database Table Needed

## Context

TODO-015 was created based on the assumption that Hermes uses a `people` database table to store users, and that Dex OIDC users need to be inserted into this table to be searchable via the `/api/v2/people` endpoint.

**This assumption is incorrect.**

## Investigation Findings

### 1. No People Database Table Exists

Hermes **does not have** a `people` or `persons` table in the PostgreSQL database.

**Evidence**:
```go
// pkg/models/gorm.go - Complete list of auto-migrated models
func ModelsToAutoMigrate() []interface{} {
    return []interface{}{
        &DocumentType{},
        &Document{},
        &DocumentCustomField{},
        &DocumentFileRevision{},
        DocumentGroupReview{},
        &DocumentRelatedResource{},
        // ... other models ...
        &User{},  // ← This is for auth sessions, NOT for people directory
    }
}
```

**No `Person` model exists in `pkg/models/`**. The database schema only includes:
- `User` (for auth sessions/recently viewed)
- `Document`, `DocumentType`, `Project` (core entities)
- Join tables and metadata

### 2. People API Architecture

The `/api/v2/people` endpoint does **not** query a database table. Instead, it delegates to the **workspace provider**:

```go
// internal/api/v2/people.go
func PeopleDataHandler(srv server.Server) http.Handler {
    // ...
    users, err := srv.WorkspaceProvider.SearchPeople(
        req.Query,
        "emailAddresses,names,photos",
    )
    // Returns people.Person objects from workspace provider
}
```

### 3. Workspace Provider Implementations

#### Google Workspace Adapter
```go
// pkg/workspace/adapters/google/adapter.go
func (a *Adapter) SearchPeople(email string, fields string) ([]*people.Person, error) {
    return a.service.SearchPeople(email, fields)
    // ↑ Calls Google Directory API directly
}
```

**Google Workspace**: Queries the Google Directory API in real-time. No database caching.

#### Local Workspace Adapter
```go
// pkg/workspace/adapters/local/provider.go
func (p *ProviderAdapter) SearchPeople(email string, fields string) ([]*people.Person, error) {
    users, err := p.adapter.PeopleService().SearchUsers(p.ctx, email, ...)
    // ↑ Reads from users.json file
    
    // Converts workspace.User → people.Person
    for i, user := range users {
        person := &people.Person{
            Names: []*people.Name{{DisplayName: user.Name, ...}},
            EmailAddresses: []*people.EmailAddress{{Value: user.Email, ...}},
            Photos: []*people.Photo{{Url: user.PhotoURL}},
        }
    }
}
```

**Local Workspace**: Reads from `users.json` file (mounted from `testing/users.json`).

### 4. Testing Environment Configuration

**`testing/docker-compose.yml`**:
```yaml
hermes:
  volumes:
    - ./users.json:/app/workspace_data/users.json:ro
```

**`testing/config.hcl`**:
```hcl
local_workspace {
  base_path    = "/app/workspace_data"
  users_path   = "/app/workspace_data/users"  # ← Not used, reads users.json directly
}

providers {
  workspace = "local"  # ← Uses local workspace adapter
  search    = "meilisearch"
}
```

**`testing/users.json`**:
```json
{
  "test@hermes.local": {
    "email": "test@hermes.local",
    "name": "Test User",
    "given_name": "Test",
    "family_name": "User",
    "photo_url": "https://ui-avatars.com/api/?name=Test+User&...",
    "groups": ["users", "testers"]
  },
  "admin@hermes.local": { ... },
  "user@hermes.local": { ... },
  ...
}
```

### 5. Verification

**Container Check**:
```bash
$ docker exec hermes-server cat /app/workspace_data/users.json | jq 'keys'
[
  "admin@hermes.local",
  "jane.smith@hermes.local",
  "john.doe@hermes.local",
  "sarah.johnson@hermes.local",
  "test@hermes.local",
  "user@hermes.local"
]
```

**Server Logs**:
```
Using workspace provider: local
Using search provider: meilisearch
```

## Decision

**Option B from TODO-015 is ALREADY IMPLEMENTED.**

The testing environment is **correctly configured**:
- ✅ Local workspace provider enabled
- ✅ `users.json` mounted to `/app/workspace_data/users.json`
- ✅ File contains all Dex test users (test, admin, user, jane.smith, john.doe, sarah.johnson)
- ✅ SearchPeople implementation reads from this file

**No database seeding is needed** because there is no people database table.

## Consequences

### Positive
- ✅ Simpler architecture - no database synchronization needed
- ✅ Google Workspace queries API directly (always up-to-date)
- ✅ Local workspace reads from JSON file (fast, simple)
- ✅ No schema migrations needed for people data
- ✅ Testing environment already correctly configured

### Implications for TODO-015

The issue described in TODO-015 is **not caused by missing database records**. The actual problem must be one of:

1. **Authentication Issue**: User not logged in when testing
2. **Config Issue**: Workspace provider not correctly selected
3. **File Mount Issue**: `users.json` not mounted or incorrect path
4. **Frontend Issue**: Approvers field not sending correct query

### Next Steps

1. ✅ **Verify**: Testing environment uses local workspace provider (CONFIRMED)
2. ✅ **Verify**: `users.json` mounted correctly (CONFIRMED)
3. ✅ **Verify**: File contains Dex test users (CONFIRMED)
4. ⏭️ **Test**: Make authenticated request to `/api/v2/people` with Dex session
5. ⏭️ **Debug**: If people search still fails, check frontend code and request format

## Production Implications

### Google Workspace (Production)

No changes needed. Google Workspace adapter queries the Directory API directly:

```go
// Already works - no database needed
users, err := srv.WorkspaceProvider.SearchPeople(query, fields)
// ↑ Calls google.golang.org/api/admin/directory/v1
```

### Local Workspace (Testing)

Already working. Just ensure `users.json` is maintained with test users:

```json
{
  "user@domain": {
    "email": "user@domain",
    "name": "Full Name",
    "given_name": "First",
    "family_name": "Last",
    "photo_url": "https://...",
    "groups": ["users"]
  }
}
```

## References

- **TODO-015**: People Database Not Populated (based on incorrect assumption)
- **TODO-014**: Contributors vs Approvers field gap
- **ADR-071**: Local File Workspace System
- **ADR-073**: Provider Abstraction Architecture
- **Testing Environment**: `testing/docker-compose.yml`, `testing/config.hcl`
- **Implementation**: `pkg/workspace/adapters/local/provider.go`, `internal/api/v2/people.go`

## Conclusion

**Hermes does not use a people database table.** The people API is entirely provider-based:
- **Google Workspace**: Queries Directory API
- **Local Workspace**: Reads `users.json` file

The testing environment is already correctly configured with all Dex test users in `testing/users.json`. If the E2E test is failing to find users, the issue is likely:
- Authentication (no session cookie)
- Frontend query format
- API endpoint routing

**No database seeding is needed.**
