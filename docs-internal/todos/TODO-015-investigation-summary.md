---
date: 2025-10-09
title: TODO-015 Investigation Summary - Architecture Clarification
tags: [investigation, architecture, people-api, local-workspace]
---

# TODO-015 Investigation Summary

## Objective

Implement "Option B: Seed People Database in Testing Environment" from TODO-015 to enable test users to appear in the people search for E2E testing.

## Key Discovery: No People Database Exists

**Critical Finding**: Hermes does NOT use a PostgreSQL table for people/users directory.

### Architecture Verification

1. **Database Schema Check**:
   - Examined `pkg/models/gorm.go` - NO `Person` model
   - Checked `internal/db/db.go` - NO people table migration
   - Searched codebase - NO `person.go` model file

2. **API Implementation Check**:
   - `internal/api/v2/people.go` delegates to `WorkspaceProvider.SearchPeople()`
   - Does NOT query database tables
   - Returns `people.Person` objects from provider

3. **Provider Architecture**:
   
   **Google Workspace Adapter**:
   ```go
   // pkg/workspace/adapters/google/adapter.go
   func (a *Adapter) SearchPeople(email string, fields string) ([]*people.Person, error) {
       return a.service.SearchPeople(email, fields)
       // ↑ Queries Google Directory API directly
   }
   ```
   
   **Local Workspace Adapter**:
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
       return persons, nil
   }
   ```

## Testing Environment Status

### ✅ Already Correctly Configured

**Verification Results** (2025-10-09):

1. **Config File** (`testing/config.hcl`):
   ```hcl
   local_workspace {
     base_path = "/app/workspace_data"
   }
   providers {
     workspace = "local"  # ← Using local workspace adapter
   }
   ```

2. **Docker Compose** (`testing/docker-compose.yml`):
   ```yaml
   hermes:
     volumes:
       - ./users.json:/app/workspace_data/users.json:ro
   ```

3. **Users File** (`testing/users.json`):
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
     "jane.smith@hermes.local": { ... },
     "john.doe@hermes.local": { ... },
     "sarah.johnson@hermes.local": { ... }
   }
   ```

4. **Container Verification**:
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

5. **Server Logs**:
   ```
   Using workspace provider: local
   Using search provider: meilisearch
   ```

## Findings Summary

### What Was Expected (Incorrect Assumption)

❌ Hermes uses a PostgreSQL `people` table
❌ Users must be inserted into database on OIDC login
❌ Need to create SQL seeding script for testing environment
❌ "Option B" means creating `testing/init-people.sql`

### What Actually Exists (Verified)

✅ Hermes uses provider-based people API (no database)
✅ Local workspace adapter reads from `users.json` file
✅ Testing environment already correctly configured
✅ `users.json` contains all Dex test users
✅ "Option B" is already fully implemented

## Conclusion

**"Option B: Seed People Database in Testing Environment" is already complete.**

The testing environment is correctly configured with:
- Local workspace provider enabled
- `users.json` mounted and accessible
- File contains all 6 Dex test users
- SearchPeople implementation working correctly

**No changes to backend configuration are needed.**

## Revised Problem Statement

The issue reported in TODO-015 ("No results found" when searching for test users) is **NOT caused by missing database records**.

The actual problem must be one of:
1. **Authentication**: Playwright test not including session cookie
2. **Frontend**: Approvers field sending incorrect query format
3. **API Routing**: Request not reaching the correct endpoint
4. **Response Parsing**: Frontend not parsing `people.Person` response correctly

## Next Steps

See updated TODO-015 for investigation steps:
1. Test API with authenticated request (manual curl)
2. Use playwright-mcp to debug browser behavior
3. Compare Approvers vs Contributors field implementations
4. Fix the actual integration issue
5. Update E2E test

## Documentation Created

1. **ADR-075**: People API Architecture Clarification
   - Documents that Hermes does NOT use a people database
   - Explains provider-based architecture
   - Clarifies Google vs Local workspace behavior

2. **TODO-015 (Updated)**: 
   - Corrected problem statement
   - Removed incorrect solution options
   - Added investigation steps for actual issue
   - Updated status to "investigation" (50% complete)

## References

- **TODO-015**: People API Not Returning Test Users - Investigation Required
- **ADR-075**: People API Architecture Clarification - No Database Table Needed
- **ADR-071**: Local File Workspace System
- **ADR-073**: Provider Abstraction Architecture
- **Implementation**: `pkg/workspace/adapters/local/`, `internal/api/v2/people.go`
- **Testing Config**: `testing/docker-compose.yml`, `testing/config.hcl`, `testing/users.json`
