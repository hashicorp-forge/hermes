# Web Frontend External Dependencies Analysis

**Date**: October 6, 2025  
**Status**: Analysis Complete  
**Context**: Investigation into why web frontend requires Algolia and Google Workspace configuration

---

## Executive Summary

The web frontend (`./web`) **DOES** make direct calls to external services (Algolia) and requires Google OAuth configuration. However, it's designed with a **hybrid architecture** where:

1. **Algolia search**: Direct client-side calls in development, proxied through backend in production
2. **Google OAuth**: Direct browser-based authentication flow (OAuth2), then token passed to backend
3. **All other data**: Fetched from Hermes backend API (`/api/v1/*` and `/api/v2/*`)

This creates a dependency on external service configuration **even in production**, which complicates deployment scenarios like the current Docker testing environment.

---

## Algolia Integration - The Big Issue

### How It Works

The frontend uses the `algoliasearch` JavaScript client (`web/package.json` line 158):
```json
"algoliasearch": "^4"
```

### Environment-Based Behavior

**Non-Production Mode** (`web/app/services/algolia.ts` lines 56-63):
```typescript
if (config.environment != "production") {
  console.log("Running as non-production environment: Algolia client configured to directly interact with Algolia's API.");
  return algoliaSearch(config.algolia.appID, config.algolia.apiKey);
}
```
- **Direct calls to Algolia's API** (`https://{appID}-dsn.algolia.net`)
- Requires valid `HERMES_WEB_ALGOLIA_APP_ID` and `HERMES_WEB_ALGOLIA_SEARCH_API_KEY`

**Production Mode** (`web/app/services/algolia.ts` lines 67-107):
```typescript
// Proxy through Hermes backend
return algoliaSearch("", "", {
  headers: {
    "Hermes-Google-Access-Token": this.session.data.authenticated.access_token,
  },
  hosts: [
    {
      protocol: "http" | "https",
      url: window.location.hostname + ":" + window.location.port,
    },
  ],
});
```
- **Proxied through backend** at `/1/indexes/*` endpoint
- Backend handles Algolia API calls (see `pkg/algolia/proxy.go`)
- Still requires backend to have Algolia credentials configured

### Backend Proxy Handler

`internal/cmd/commands/server/server.go` lines 593-597:
```go
if searchProviderName == "algolia" && algoSearch != nil {
    authenticatedEndpoints = append(authenticatedEndpoints, endpoint{
        "/1/indexes/",
        algolia.AlgoliaProxyHandler(algoSearch, algoliaClientCfg, c.Log),
    })
}
```

`pkg/algolia/proxy.go` lines 12-58:
- Intercepts frontend requests to `/1/indexes/*`
- Forwards to `https://{appID}-dsn.algolia.net` with auth headers
- Returns results to frontend

### Usage Throughout Frontend

**Search functionality** (`web/app/routes/authenticated/results.ts`):
- Lines 61-84: Uses `this.algolia.searchForFacetValues`, `getFacets`, `getDocResults`, `getProjectResults`
- All search/filter/facet operations call Algolia service

**Document listing** (`web/app/routes/authenticated/documents.ts`):
- Lines 48-49: Uses `this.algolia.getFacets` and `getDocResults`

**Why This Is a Problem**:
1. ❌ Frontend **requires Algolia config at build time** (environment variables)
2. ❌ Backend **requires Algolia config at runtime** (even if just proxying)
3. ❌ Cannot use Hermes without Algolia credentials (search is core feature)
4. ❌ Docker testing environment needs Algolia config just to boot

---

## Google OAuth Integration

### How It Works

**Build-Time Configuration** (`web/config/environment.js` lines 70-75):
```javascript
torii: {
  sessionServiceName: "session",
  providers: {
    "google-oauth2-bearer-v2": {
      apiKey: getEnv("GOOGLE_OAUTH2_CLIENT_ID"),  // Required!
      hd: getEnv("GOOGLE_OAUTH2_HD"),
      scope: "email profile https://www.googleapis.com/auth/drive.appdata",
    },
  },
}
```

**Authentication Flow**:
1. User clicks "Sign in with Google" (`web/app/services/_session.ts` line 164)
2. Browser redirects to Google OAuth (`accounts.google.com`) 
3. User authenticates, Google redirects back with token
4. Frontend stores token, passes it to backend in `Hermes-Google-Access-Token` header
5. Backend validates token and makes Google API calls on user's behalf

**Why This Is Required**:
- Uses standard OAuth2 "implicit grant" flow (browser-based)
- Google requires **registered OAuth client ID** (can't be proxied)
- Must be configured at **web build time** (embedded in JS bundle)

### Token Usage in Backend Calls

**All API requests** (`web/app/services/fetch.ts` lines 42-58):
```typescript
if (!this.configSvc.config.skip_google_auth) {
  if (Array.from(url)[0] == "/") {  // Local API call
    options.headers = {
      ...options.headers,
      "Hermes-Google-Access-Token": this.session.data.authenticated.access_token,
    };
  }
}
```
- Every backend API call includes Google access token
- Backend validates token, uses it for Google Workspace API calls
- Without token, backend requests fail (401 Unauthorized)

---

## What The Frontend DOES Get From Backend

The frontend **does not** bypass the backend for data. It properly uses the backend API for:

### Documents & Drafts
- `GET /api/v2/documents/{id}` - Document details
- `GET /api/v2/drafts` - List drafts  
- `POST /api/v2/drafts` - Create draft
- `PATCH /api/v2/drafts/{id}` - Update draft
- `DELETE /api/v2/drafts/{id}` - Delete draft

### Projects
- `GET /api/v2/projects` - List projects
- `GET /api/v2/projects/{id}` - Project details
- `POST /api/v2/projects` - Create project

### User Data
- `GET /api/v2/me` - Current user info
- `GET /api/v2/me/subscriptions` - User subscriptions
- `GET /api/v2/me/recently-viewed-docs` - Recently viewed
- `GET /api/v2/people` - User directory

### Configuration
- `GET /api/v2/web/config` - Runtime config (document types, products, etc.)
- `GET /api/v2/products` - Product areas
- `GET /api/v2/document-types` - Available doc types

**Evidence**: 20+ `this.fetchSvc.fetch('/api/...')` calls throughout `web/app/routes/` and `web/app/services/`

---

## Why Can't Everything Go Through Backend?

### For Algolia
**Current approach**: Needed for performance (Algolia's edge network is optimized for search)
**But**: Backend proxy exists and works! Could be made mandatory.

**Recommendation**: 
- ✅ **Force all environments to use proxy mode**
- ✅ **Remove direct Algolia client configuration from web**
- ✅ **Let backend handle Algolia completely**
- ✅ **Web only needs to know proxy endpoint exists**

**Implementation**:
1. Remove `config.algolia.appID` and `config.algolia.apiKey` from `web/config/environment.js`
2. Always configure Algolia client to proxy through backend (lines 67-107 of `algolia.ts`)
3. Backend remains responsible for Algolia credentials
4. Web build doesn't need any Algolia environment variables

### For Google OAuth
**Cannot be proxied** - OAuth2 spec requires browser-based flow:
1. Browser must redirect to Google (`accounts.google.com`)
2. User authenticates directly with Google  
3. Google redirects browser back to app with token
4. This is a **security feature** - backend never sees user's Google password

**Must remain as-is** - This is correct architecture.

---

## Current Build-Time Requirements

From `web/config/environment.js` (lines 3-12):
```javascript
const getEnv = (key, defaultValue) => {
  const fullKey = `HERMES_WEB_${key}`;
  const value = process.env[fullKey];
  if (value == null) {
    console.warn(`env var ${fullKey} was not set! Proceeding with default value "${defaultValue}"`);
  }
  return value != null ? value : defaultValue;
};
```

### Required for Algolia (lines 47-53):
```javascript
algolia: {
  appID: getEnv("ALGOLIA_APP_ID"),                         // ❌ Should not be needed
  docsIndexName: getEnv("ALGOLIA_DOCS_INDEX_NAME", "docs"), // ✅ Reasonable default
  draftsIndexName: getEnv("ALGOLIA_DRAFTS_INDEX_NAME", "drafts"),
  internalIndexName: getEnv("ALGOLIA_INTERNAL_INDEX_NAME", "internal"),
  projectsIndexName: getEnv("ALGOLIA_PROJECTS_INDEX_NAME", "projects"),
  apiKey: getEnv("ALGOLIA_SEARCH_API_KEY"),                // ❌ Should not be needed
}
```

### Required for Google OAuth (lines 70-75):
```javascript
torii: {
  sessionServiceName: "session",
  providers: {
    "google-oauth2-bearer-v2": {
      apiKey: getEnv("GOOGLE_OAUTH2_CLIENT_ID"),  // ✅ Legitimately required
      hd: getEnv("GOOGLE_OAUTH2_HD"),             // ✅ Optional (hosted domain)
      scope: "email profile https://www.googleapis.com/auth/drive.appdata",
    },
  },
}
```

---

## Impact on Docker Testing Environment

### Current Problem
`testing/docker-compose.yml` and related Docker builds fail because:
1. Web build requires `HERMES_WEB_ALGOLIA_APP_ID` and `HERMES_WEB_ALGOLIA_SEARCH_API_KEY`
2. Web build requires `HERMES_WEB_GOOGLE_OAUTH2_CLIENT_ID`
3. These are external service credentials (not mock-able)
4. Build fails with warnings/errors when not provided

### Solution Options

**Option A: Provide Dummy Values** ✅ **RECOMMENDED FOR SHORT-TERM**
```yaml
# testing/docker-compose.yml
services:
  web:
    build:
      args:
        HERMES_WEB_ALGOLIA_APP_ID: "test-app-id"
        HERMES_WEB_ALGOLIA_SEARCH_API_KEY: "test-key"
        HERMES_WEB_GOOGLE_OAUTH2_CLIENT_ID: "test-client-id.apps.googleusercontent.com"
```
- ✅ Allows build to complete
- ✅ Web container starts
- ⚠️ Search won't work (Algolia calls fail)
- ⚠️ OAuth won't work (Google rejects invalid client ID)

**Option B: Refactor to Remove Algolia Client Config** ✅ **RECOMMENDED FOR LONG-TERM**
1. Modify `web/app/services/algolia.ts` to **always** proxy through backend
2. Remove `config.algolia.appID` and `config.algolia.apiKey` from `web/config/environment.js`
3. Web build no longer needs Algolia credentials
4. Backend still needs Algolia config (but that's in `config.hcl`, not build-time)

**Option C: Skip Google Auth in Testing** ✅ **ALREADY IMPLEMENTED**
```javascript
// web/config/environment.js line 66
skipGoogleAuth: getEnv("SKIP_GOOGLE_AUTH"),
```
- Set `HERMES_WEB_SKIP_GOOGLE_AUTH=true` for testing
- Authentication bypassed (see `web/app/services/fetch.ts` line 43)
- ⚠️ Still need dummy `GOOGLE_OAUTH2_CLIENT_ID` for build

---

## Recommendations

### Immediate Actions (Fix Docker Testing)
1. ✅ Add dummy Algolia/Google env vars to `testing/docker-compose.yml` (Option A)
2. ✅ Set `HERMES_WEB_SKIP_GOOGLE_AUTH=true` in testing environment
3. ✅ Document that search won't work without real Algolia credentials

### Short-Term Improvements (1-2 days)
1. ✅ Refactor `algolia.ts` to always use backend proxy (Option B)
2. ✅ Remove Algolia client credentials from web build-time config
3. ✅ Make `GOOGLE_OAUTH2_CLIENT_ID` optional with safe default (empty string)
4. ✅ Update documentation to clarify what's needed for different deployment modes

### Long-Term Architecture (Future)
1. 🔮 Consider alternative search providers that don't require client-side config
2. 🔮 Evaluate Meilisearch adapter (already exists in codebase: `pkg/search/adapters/meilisearch/`)
3. 🔮 Implement search abstraction in frontend (call backend search API, not Algolia directly)
4. 🔮 Keep Google OAuth as-is (correct pattern, cannot be simplified)

---

## Conclusion

**Does the web frontend call external services?**
- **Algolia**: YES (direct in dev, proxied in prod, but still requires config)
- **Google OAuth**: YES (required by OAuth2 spec, correct architecture)
- **Google Workspace**: NO (all calls go through backend)
- **Other data**: NO (all calls go through backend API)

**Can it get all data from backend?**
- **Search data**: Currently gets from Algolia directly/proxied, **COULD** be refactored to backend-only
- **Auth tokens**: Must get from Google directly (OAuth2 requirement)
- **Everything else**: Already getting from backend ✅

**Biggest Issue**:
The Algolia client configuration at web build time is **unnecessary** and complicates deployment. The backend proxy already exists and works. Refactoring to use it exclusively would eliminate external dependencies from the frontend build process.

**Action Item**:
Implement Option B (refactor Algolia service to always proxy) in next development session.
