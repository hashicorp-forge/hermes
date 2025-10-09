---
id: ADR-032
title: Ember Data Store Error Fix
date: 2025-10-08
type: ADR
subtype: Frontend Decision
status: Accepted
tags: [ember, frontend, ember-data, bug-fix, authentication]
related:
  - RFC-020
  - RFC-007
---

# Ember Data Store Error Fix

## Context

After switching from HEAD to GET for the `/me` endpoint, the application crashed with:
```
TypeError: Cannot read properties of undefined (reading 'request')
    at StoreService.request
    at StoreService.findAll
    at AuthenticatedUserService.loadInfo
```

**Root Causes**:

1. **API Response Mismatch**: `store.findAll("me")` expects array response, but `/api/v2/me` returns single object
2. **Unsafe Header Access**: ApplicationAdapter unconditionally accessed `session.data.authenticated.access_token` which is undefined for Dex (cookie-based auth)

## Decision

Replace Ember Data's `store.findAll()` with direct `fetch()` call and manual store management.

**Implementation**:

1. **Direct Fetch** (`web/app/services/authenticated-user.ts`):
   ```typescript
   const response = await fetch(`/api/${this.configSvc.config.api_version}/me`, {
     method: "GET",
     credentials: "include", // Include session cookies
   });
   const data = await response.json();
   
   // Manually create/update person record
   let person = this.store.peekRecord("person", data.email);
   if (!person) {
     person = this.store.createRecord("person", { /* data */ });
   } else {
     person.setProperties({ /* updated data */ });
   }
   ```

2. **Safe Header Access** (`web/app/adapters/application.ts`):
   ```typescript
   get headers() {
     const accessToken = this.session.data?.authenticated?.access_token;
     if (!accessToken) return {};
     return { "Hermes-Google-Access-Token": accessToken };
   }
   ```

## Consequences

### Positive
- ✅ Works with single-object `/me` response
- ✅ No dependency on Ember Data RequestManager API
- ✅ Explicit control over record lifecycle
- ✅ Works for all auth providers (Google, Okta, Dex)
- ✅ No crashes on undefined session data
- ✅ Proper separation of concerns (fetch vs store management)

### Negative
- ❌ Bypasses Ember Data conventions
- ❌ Manual store record management required
- ❌ Less declarative than `store.findAll()`
- ❌ Duplicates some Ember Data logic

## Alternatives Considered

1. **Change backend to return array**
   - ❌ Wrong semantics (`/me` is singular resource)
   - ❌ Would break other consumers
   
2. **Use store.findRecord() instead**
   - ❌ Requires backend to support `/api/v2/me/:id` endpoint
   - ❌ Still requires proper RequestManager setup
   
3. **Configure RequestManager for single-object responses**
   - ❌ Complex Ember Data configuration
   - ❌ Overkill for single endpoint
   
4. **Use store.queryRecord()**
   - ❌ Still expects Ember Data conventions
   - ❌ Doesn't match our API structure

## Implementation Details

**Why `credentials: "include"`**:
- Required for Dex session cookies
- Ensures cookies sent with cross-origin requests
- Works for all auth methods

**Why Manual Store Management**:
- Person record needs to exist for other components
- `peekRecord()` checks if record already in store
- `createRecord()` adds to store without API call
- `setProperties()` updates existing record

**Header Safety Pattern**:
- Optional chaining (`?.`) prevents crashes
- Empty object returned for cookie-based auth
- Token header only sent when available

## Verification

✅ User info loads correctly after authentication  
✅ Person record created in store  
✅ No "undefined reading 'request'" errors  
✅ Works with Dex (cookie auth)  
✅ Works with Google (token auth)  
✅ Dashboard displays user name and picture  

## Future Considerations

- Consider creating custom Ember Data serializer for `/me` endpoint
- Evaluate if other endpoints need similar treatment
- Document pattern for team (when to bypass Ember Data)
- Monitor Ember Data updates for better single-object support

## References

- Source: `EMBER_DATA_STORE_ERROR_FIX_2025_10_08.md`
- Related: `DEX_AUTHENTICATION_IMPLEMENTATION.md`, `SESSION_AUTHENTICATION_FIX.md`
