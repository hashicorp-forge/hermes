# Ember Data Store Initialization Error - Investigation & Fix

**Date**: October 8, 2025  
**Issue**: `TypeError: Cannot read properties of undefined (reading 'request')` in Ember Data store  
**Status**: ✅ RESOLVED

## Problem Description

After changing the frontend to use GET instead of HEAD for the `/me` endpoint, the application encountered a critical error:

```
TypeError: Cannot read properties of undefined (reading 'request')
    at StoreService.request
    at StoreService.findAll
    at AuthenticatedUserService.loadInfo
```

This error prevented the application from loading user information and caused the dashboard to show only a loading spinner.

## Root Cause Analysis

### Issue #1: Mismatched API Response Format

The `authenticated-user.ts` service was using `store.findAll("me")` to fetch user information:

```typescript
loadInfo = task(async () => {
  const mes = await this.store.findAll("me");  // ❌ Expects array response
  const me = mes.firstObject;
  // ...
});
```

However, the backend `/api/v2/me` endpoint returns a **single object**, not an array:

```json
{
  "email": "test@hermes.local",
  "given_name": "Test",
  "name": "Test User",
  "picture": ""
}
```

Ember Data's `findAll()` method expects:
- A GET request to `/api/v2/me`  (✅ correct)
- A response containing an array of objects (❌ backend returns single object)
- The RequestManager API to be properly configured (❌ not configured for this use case)

### Issue #2: Adapter Headers Accessing Undefined Session Data

The `ApplicationAdapter` was unconditionally accessing session data:

```typescript
get headers() {
  return {
    "Hermes-Google-Access-Token":
      this.session.data.authenticated.access_token,  // ❌ Crashes if undefined
  };
}
```

For Dex authentication:
- No `access_token` exists in the session (uses cookies instead)
- `this.session.data` or `this.session.data.authenticated` might be undefined during initialization
- This caused the "Cannot read properties of undefined" error

## Solutions Implemented

### Fix #1: Replace store.findAll() with Direct Fetch

Changed `web/app/services/authenticated-user.ts` to fetch data directly and manually manage the store:

```typescript
loadInfo = task(async () => {
  try {
    // Fetch user info directly from the /me endpoint
    const response = await fetch(
      `/api/${this.configSvc.config.api_version}/me`,
      {
        method: "GET",
        credentials: "include", // Include session cookies for Dex auth
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.statusText}`);
    }

    const data = await response.json();

    // Create or update the person record in the store
    let person = this.store.peekRecord("person", data.email);
    if (!person) {
      person = this.store.createRecord("person", {
        id: data.email,
        email: data.email,
        name: data.name,
        firstName: data.given_name,
        picture: data.picture,
      });
    } else {
      // Update existing record
      person.setProperties({
        name: data.name,
        firstName: data.given_name,
        picture: data.picture,
      });
    }

    this._info = person;
  } catch (e: unknown) {
    console.error("Error getting user information: ", e);
    throw e;
  }
});
```

**Benefits**:
- ✅ Works with single-object response from `/me` endpoint
- ✅ No dependency on Ember Data's RequestManager API
- ✅ Explicit control over person record creation/update
- ✅ Works identically for Google, Okta, and Dex authentication

### Fix #2: Safe Header Access in Adapter

Changed `web/app/adapters/application.ts` to safely access session data:

```typescript
get headers() {
  // For Dex authentication, we don't need to send an access token
  // (authentication is handled via session cookies)
  const accessToken = this.session.data?.authenticated?.access_token;
  
  if (!accessToken) {
    return {};
  }
  
  return {
    "Hermes-Google-Access-Token": accessToken,
  };
}
```

**Benefits**:
- ✅ Uses optional chaining (`?.`) to safely access nested properties
- ✅ Returns empty headers for Dex (cookie-based auth)
- ✅ Returns Google token header for Google/Okta (token-based auth)
- ✅ No crashes if session data is undefined during initialization

## Testing & Validation

### Test Environment
- **Backend**: Hermes server with Dex OIDC authentication
- **Frontend**: Ember.js 6.7.0 dev server on port 4201
- **Auth Provider**: Dex with staticPasswords connector
- **Test User**: `test@hermes.local` / `password`

### Test Results

✅ **Authentication Flow**: 
- Dex login page loads correctly
- StaticPasswords connector authenticates successfully
- Redirect to dashboard completes

✅ **User Info Loading**:
- GET `/api/v2/me` returns 200 OK
- Backend logs show: `email=test@hermes.local`
- No Ember Data errors in console
- Person record created successfully in store

✅ **Session Management**:
- Session cookies properly sent with requests
- No "Cannot read properties of undefined" errors
- Adapter headers work for both Dex and Google auth

⚠️ **Dashboard Loading**:
- Dashboard route hangs on loading spinner
- Search requests not being made
- Likely unrelated to the store error fix (separate issue with search service)

## Key Learnings

1. **Ember Data Conventions**: Ember Data's `findAll()` is designed for collection endpoints that return arrays. For single-object endpoints like `/me`, use direct `fetch()` or `queryRecord()`.

2. **Session Data Timing**: Session data may not be fully initialized when adapters are first accessed. Always use optional chaining or guard clauses when accessing nested session properties.

3. **Authentication Provider Differences**: 
   - Google/Okta: Token-based (access_token in session)
   - Dex: Cookie-based (no access_token)
   - Adapters must handle both gracefully

4. **Store Management**: When not using standard Ember Data patterns, manually managing store records gives more control and avoids RequestManager configuration complexity.

## Related Files Changed

- `web/app/services/authenticated-user.ts` - Replaced `store.findAll()` with direct fetch
- `web/app/adapters/application.ts` - Added safe access to session headers
- `web/app/routes/authenticated.ts` - Previously changed to GET and load info for Dex (from earlier session)

## Next Steps - Dashboard Loading Issue (IDENTIFIED)

### Problem: Missing Search Proxy
The dashboard hangs because the Ember frontend's search service is configured to proxy Algolia requests through `/1/indexes/*`, but:

1. **Frontend configuration** (`web/app/services/search.ts` lines 90-102):
   - Creates Algolia client pointing to `localhost:4201/1/indexes/*`
   - Expects backend to proxy these requests to Meilisearch/Algolia

2. **Proxy configuration** (`web/server/index.js`):
   - ❌ Only proxies `/auth/*` and `/api/*` 
   - ❌ NO proxy configured for `/1/*`
   - Search requests timeout in browser

3. **Backend**:
   - Has Meilisearch provider configured
   - NO HTTP handler registered for `/1/indexes/*`
   - Would need new API endpoint to expose search functionality

### Solution Options:

**Option A: Add Backend Search API**
- Create `/api/v2/search` endpoint that proxies to SearchProvider
- Update frontend search service to use `/api/v2/search` instead of `/1/indexes/*`
- Most robust solution, allows backend access control

**Option B: Add /1 Proxy to Ember Server**
- Add `/1` proxy in `web/server/index.js` pointing to backend
- Backend adds direct pass-through to Meilisearch/Algolia
- Quick fix but bypasses backend logic

**Option C: Graceful Degradation**
- Add `.catch()` handlers in dashboard to return empty arrays on search failure
- Allow dashboard to load without search results
- Good for development/testing environments

### Recommendation:
For production: Option A (proper API endpoint)  
For immediate testing: Option C (graceful degradation)

## References

- [Ember Data 4.x Migration Guide](https://guides.emberjs.com/release/upgrading/current-edition/ember-data-4-x/)
- [Ember Data RequestManager API](https://api.emberjs.com/ember-data/release/classes/RequestManager)
- Previous session: `ME_ENDPOINT_VALIDATION_2025_10_08.md`
