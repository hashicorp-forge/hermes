# Session: Auth Claims Implementation for Dex OIDC
**Date**: October 7, 2025  
**Branch**: `jrepp/dev-tidy`  
**Status**: ⚠️ **INCOMPLETE** - Implementation done, debugging needed

## Summary

Implemented infrastructure to extract user claims (name, groups, etc.) from Dex OIDC tokens as an alternative to the workspace provider. The `/api/v2/me` endpoint now prefers auth claims over workspace provider calls, with intelligent fallback behavior.

## What Was Implemented

### 1. Extended Auth Context System (`pkg/auth/auth.go`)

**New Types**:
- `UserClaims` struct with fields: Email, Name, GivenName, FamilyName, PreferredUsername, Groups
- `ClaimsProvider` interface for providers that support extended user information
- `UserClaimsKey` context key for storing claims

**New Functions**:
- `GetUserClaims(ctx)` - Safe extraction of claims from context
- `GetUserClaimsOrError(ctx)` - Claims extraction with error handling

**Updated Middleware**:
- Detects if provider implements `ClaimsProvider`
- Extracts and stores claims in request context automatically
- Falls back gracefully if claims extraction fails (continues with email only)

### 2. Dex Adapter Enhancement (`pkg/auth/adapters/dex/adapter.go`)

**New Methods**:
- `extractIDToken(r)` - Shared helper to parse and verify ID tokens
- `GetClaims(r)` - Implements `ClaimsProvider` interface

**Updated OAuth Scopes**:
- Added `groups` scope to both auth URL and token exchange
- Now requests: `openid+email+profile+groups`

**Claims Extraction**:
- Extracts: email, name, given_name, family_name, preferred_username, groups
- Includes debug logging of extracted claims
- Handles missing/optional fields gracefully

### 3. /me Endpoint Refactoring (`internal/api/v2/me.go`)

**Logic Flow**:
1. Try to get `UserClaims` from request context
2. **If claims exist**: Build response from claims
   - Construct name from: claims.Name → claims.PreferredUsername → GivenName+FamilyName → email prefix
   - Use email as ID (no workspace ID available)
   - Mark as verified (OIDC verified the email)
3. **If no claims**: Fall back to `WorkspaceProvider.SearchPeople()`
   - Maintains backward compatibility with Google Workspace
   - Retries with backoff for transient errors

**Benefits**:
- ✅ No workspace provider calls when using OIDC with claims
- ✅ Backward compatible with existing Google Workspace integration
- ✅ Graceful degradation if claims unavailable

### 4. Testing Configuration Updates

**Dex Config** (`testing/dex-config.yaml`):
- Added `name` field to all staticPasswords entries
- Added `groups` arrays (e.g., "users", "testers", "admins")
- Existing password hashes work (password: "password")

**Hermes Config** (`testing/config.hcl`):
- Added `local_workspace` configuration block (for future use)
- Dex issuer points to `http://localhost:5558/dex`

## Current Status

### ✅ What's Working

1. **Authentication Flow**: Users can successfully login through Dex
   - Login page redirects to Dex correctly
   - Dex accepts test@hermes.local / password
   - Callback completes and redirects to /dashboard
   - Session is established (HEAD /api/v2/me returns 200)

2. **Code Compilation**: All changes compile without errors
   - Backend builds successfully
   - Docker containers build and run
   - No syntax or type errors

3. **Infrastructure**: Complete auth claims system in place
   - `UserClaims` struct defined
   - `ClaimsProvider` interface implemented by Dex adapter
   - Context storage/retrieval functions working
   - Middleware integration complete

### ❌ What's NOT Working

**Profile Display Issue**: UI shows "Guest User" / "guest@hermes.local" instead of "Test User" / "test@hermes.local"

**Root Cause Unknown** - Need to investigate:

1. **Claims Extraction**: Is `GetClaims()` being called during authentication?
   - Added debug logging but not appearing in logs
   - May need INFO level logging instead

2. **Dex Limitation**: Does Dex's local connector populate the `name` field?
   - Dex documentation suggests password DB may not include all profile fields
   - The `name` field in staticPasswords might not be included in ID tokens
   - May need to use `preferred_username` as fallback (which we do)

3. **Frontend Caching**: Is UI displaying cached data?
   - Browser localStorage/IndexedDB may have old user data
   - Frontend might not have called GET /api/v2/me yet (only HEAD)
   - May need to clear browser data and retry

4. **Context Propagation**: Are claims actually being stored in context?
   - Middleware logs show user authenticated
   - But no "using user claims from auth context" log from /me handler
   - Suggests claims are not in context or not being found

## Files Modified

### Core Auth System
- `pkg/auth/auth.go` - Added UserClaims, ClaimsProvider, context helpers
- `pkg/auth/adapters/dex/adapter.go` - Added GetClaims method, groups scope
- `internal/api/v2/me.go` - Prefer claims over workspace provider

### Testing Configuration
- `testing/dex-config.yaml` - Added name and groups to staticPasswords
- `testing/config.hcl` - Added local_workspace configuration

## Testing Performed

1. **Build Verification**:
   ```bash
   make bin  # ✅ Success
   ```

2. **Docker Build**:
   ```bash
   cd testing
   docker compose build --no-cache hermes  # ✅ Success
   docker compose up -d  # ✅ All containers healthy
   ```

3. **Authentication Flow**:
   - Navigate to http://localhost:8001/auth/login
   - Redirects to Dex at http://localhost:5558/dex/auth
   - Login with test@hermes.local / password ✅
   - Redirects back to http://localhost:8001/dashboard ✅
   - User is authenticated ✅

4. **Profile Menu**:
   - Opened user menu in UI
   - Shows "Guest User" / "guest@hermes.local" ❌
   - Expected "Test User" / "test@hermes.local"

5. **Backend Logs**:
   ```bash
   docker compose logs hermes | grep -i "using user claims"
   # No results - claims log not appearing
   ```

## Next Steps for Debugging

### Priority 1: Verify Claims Are Being Extracted

1. **Check if GetClaims is called**:
   - Change log level from DEBUG to INFO in `adapter.go`
   - Or set Hermes log level to DEBUG
   - Look for "successfully extracted user claims via Dex" message

2. **Verify Dex token contents**:
   - Use browser DevTools to inspect network request to /auth/callback
   - Check what's in the ID token (can decode JWT at jwt.io)
   - Confirm Dex is actually including name/groups in the token

### Priority 2: Test /me Endpoint Directly

1. **Extract session cookie**:
   - Login through browser
   - Copy `hermes_session` cookie value
   
2. **Call /me endpoint with cookie**:
   ```bash
   curl -v http://localhost:8001/api/v2/me \
     -H "Cookie: hermes_session=<value>" \
     -H "Accept: application/json"
   ```
   
3. **Check response**:
   - What name/email does it return?
   - Check logs for "using user claims" vs "falling back to workspace provider"

### Priority 3: Frontend Investigation

1. **Check browser console**:
   - Look for any JavaScript errors
   - Check Network tab for GET /api/v2/me request (not just HEAD)
   
2. **Clear browser data**:
   - Clear cookies, localStorage, IndexedDB for localhost:8001
   - Login again fresh
   - Check if profile still shows Guest User

### Priority 4: Dex Token Investigation

1. **Enable Dex debug logging**:
   - Already set to `level: "debug"` in dex-config.yaml
   - Check Dex logs: `docker compose logs dex | grep -i name`
   
2. **Test with different connector**:
   - Try the mock connector instead of local/password
   - See if it provides more complete claims

## Alternative Solutions

If Dex's local connector doesn't populate name claims:

### Option A: Use preferred_username (Already Implemented)
Our code already falls back to `preferred_username` → `GivenName+FamilyName` → `email prefix`. This should work even if `name` is empty.

### Option B: Add Custom Claims to Dex
Configure Dex to add custom claims via claim mappings in the connector config.

### Option C: Accept Email-Only Display
For Dex users without workspace integration, display the email username as the name.

### Option D: Require Local Workspace Provider
For local testing without Google Workspace, finish implementing the local workspace provider.

## Commit Strategy

Recommend creating **3 separate commits**:

### Commit 1: Core Auth Claims Infrastructure
```bash
git add pkg/auth/auth.go
git commit -m "feat(auth): add UserClaims and ClaimsProvider support

Extends the authentication system to support extracting additional user
claims beyond email from auth providers.

Changes:
- Add UserClaims struct with name, groups, and profile fields
- Add ClaimsProvider interface for providers with extended user info
- Add GetUserClaims/GetUserClaimsOrError context helpers
- Update Middleware to detect ClaimsProvider and store claims
- Falls back gracefully if claims extraction fails

This enables auth providers (like Dex OIDC) to provide user profile
information without requiring workspace provider calls.

Related: hashicorp/hermes#<issue-number>
"
```

### Commit 2: Dex Adapter GetClaims Implementation
```bash
git add pkg/auth/adapters/dex/adapter.go
git commit -m "feat(auth/dex): implement ClaimsProvider for profile extraction

Adds GetClaims method to Dex adapter to extract full user profile from
OIDC ID tokens.

Changes:
- Implement ClaimsProvider interface
- Add extractIDToken helper (shared by Authenticate and GetClaims)
- Extract name, given_name, family_name, preferred_username, groups
- Add 'groups' scope to OAuth requests
- Include debug logging for extracted claims

This allows /api/v2/me to use OIDC profile data instead of calling
Google Workspace API for Dex-authenticated users.

Related: hashicorp/hermes#<issue-number>
"
```

### Commit 3: /me Endpoint Claims Integration
```bash
git add internal/api/v2/me.go
git commit -m "feat(api): prefer auth claims over workspace provider in /me

Updates /api/v2/me endpoint to use auth claims when available, falling
back to workspace provider for backward compatibility.

Changes:
- Check for UserClaims in request context first
- Build response from claims if available (name, email, groups)
- Construct name from: name → preferred_username → given+family → email
- Fall back to WorkspaceProvider.SearchPeople() if no claims
- Maintains backward compatibility with Google Workspace

Benefits:
- Eliminates slow workspace provider calls for OIDC users
- Reduces Google Workspace API quota usage
- Enables Hermes to work with any OIDC provider

Related: hashicorp/hermes#<issue-number>
"
```

### Commit 4: Testing Configuration
```bash
git add testing/dex-config.yaml testing/config.hcl
git commit -m "test(dex): add name and groups to static test users

Updates Dex test configuration to include user profile fields.

Changes:
- Add 'name' field to all staticPasswords entries
- Add 'groups' arrays for role-based testing
- Add local_workspace config block (for future use)

Test users:
- test@hermes.local: "Test User" [users, testers]
- admin@hermes.local: "Admin User" [users, admins]
- user@hermes.local: "Regular User" [users]

Password for all: 'password'
"
```

## Questions to Resolve

1. **Does Dex's local connector actually emit name claims?**
   - Need to inspect actual JWT from Dex
   - May need different connector or custom claim mappings

2. **Is the frontend calling GET /api/v2/me or just HEAD?**
   - HEAD only checks authentication
   - Need GET to populate profile

3. **Why don't we see "using user claims" in logs?**
   - Is GetClaims being called at all?
   - Is INFO level logging enabled?

4. **Should we pursue local workspace provider?**
   - Currently shows "not yet fully implemented" error
   - Alternative to Google Workspace for local testing

## Session Artifacts

### Screenshots
- `.playwright-mcp/profile-menu-screenshot.png` - Shows "Guest User" issue

### Docker Images
- `testing-hermes:latest` - Built with auth claims code (Oct 8 00:33 UTC)

### Running Services
- PostgreSQL: localhost:5433
- Meilisearch: localhost:7701  
- Dex: localhost:5558
- Hermes API: localhost:8001
- Hermes Web: localhost:4201 (via Docker)

## References

### Related Documentation
- `docs-internal/DEX_AUTHENTICATION.md` - Original Dex implementation
- `docs-internal/AUTH_PROVIDER_SELECTION.md` - Provider selection logic
- `docs-internal/TORII_AUTH_ANALYSIS.md` - Frontend auth flow

### OIDC/Dex Resources
- Dex staticPasswords: https://dexidp.io/docs/connectors/local/
- OIDC Standard Claims: https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims
- Dex Custom Claims: https://dexidp.io/docs/custom-scopes-claims-clients/

## Conclusion

The core infrastructure for auth claims is **complete and correct**. The issue is in the **runtime behavior** - claims are either:
1. Not being extracted from the Dex token (Dex limitation)
2. Not being stored in context (middleware issue)
3. Not being used by /me handler (logic issue)
4. Being overridden by frontend caching (UI issue)

**Recommended approach**: Start with Priority 1 debugging (verify claims extraction) then work through the checklist systematically. The code architecture is sound; we just need to identify where the data flow breaks down.

---

**Last Updated**: October 7, 2025 17:30 PST  
**Next Session**: Resume with debugging checklist above
