# Playwright Frontend Validation Results
## October 8, 2025

## Executive Summary

**Status**: ❌ **VALIDATION FAILED** - Application does not load

**Critical Issue**: Ember Data store initialization error prevents application from loading

**Root Cause**: Missing session store registration causes ember-simple-auth to fail during initialization

---

## Test Environment

### Configuration
- **Backend**: Docker Compose testing environment
  - Hermes API: http://localhost:8001 (container hermes-server)
  - PostgreSQL: port 5433
  - Meilisearch: port 7701
  - Dex OIDC: port 5558
  
- **Frontend**: Ember Dev Server with Proxy
  - URL: http://localhost:4201
  - Proxy Target: http://127.0.0.1:8001
  - Mirage: Disabled (`MIRAGE_ENABLED=false`)

### Services Status
```
NAME                    STATUS
hermes-dex              Up About an hour (healthy)
hermes-server           Up About an hour (healthy)
testing-meilisearch-1   Up About an hour (healthy)
testing-postgres-1      Up About an hour (healthy)
```

**✅ All backend services healthy**

---

## Validation Steps Performed

### 1. Navigate to Application

**Action**: `playwright.navigate('http://localhost:4201/')`

**Expected**: Login page or dashboard loads

**Actual**: **FAIL** - Page stuck showing loading spinner

**Screenshot**: `.playwright-mcp/hermes-initial-load.png`

![Loading Spinner](../.playwright-mcp/hermes-initial-load.png)

### 2. Console Error Analysis

**Console Messages**:
```javascript
[DEBUG] DEBUG: Ember      : 6.7.0
[DEBUG] DEBUG: Ember Data : 4.12.8
[DEBUG] Session setup completed (may not be authenticated): 
TypeError: Cannot read properties of undefined (reading 'on')
    at Proxy._bindToStoreEvents (ember-simple-auth/dist/initializers/setup-session.js:46:4667)
    at Proxy.init (ember-simple-auth/dist/initializers/setup-session.js:46:510)
```

**Error Type**: `TypeError`

**Error Location**: ember-simple-auth initializer

**Error Details**: `Cannot read properties of undefined (reading 'on')`

---

## Root Cause Analysis

### Problem Statement

The ember-simple-auth library initializes a session object during application boot. As part of initialization, it attempts to bind event listeners to a session store by calling:

```javascript
this.store.on('sessionDataUpdated', callback);
```

However, `this.store` is `undefined`, causing a TypeError that crashes the application initialization.

### Code Inspection

**File**: `node_modules/ember-simple-auth/dist/initializers/setup-session.js`

**Relevant Code**:
```javascript
init() {
  this._super(...arguments);
  this.set('content', { authenticated: {} });
  let storeFactory = 'session-store:application';
  if (isTesting()) {
    storeFactory = 'session-store:test';
  }

  this.sessionEvents = new SessionEventTarget();
  this.set('store', getOwner(this).lookup(storeFactory));  // ← Returns undefined!
  this._busy = false;
  this._bindToStoreEvents();  // ← Crashes here because store is undefined
},

_bindToStoreEvents() {
  this.store.on('sessionDataUpdated', ...);  // ← TypeError: Cannot read 'on' of undefined
}
```

**The Problem**: `getOwner(this).lookup('session-store:application')` returns `undefined` because no session store is registered in the Ember application.

### Missing Registration

**Expected**: Hermes should register a session store factory:

```javascript
// Example: app/session-stores/application.js
import CookieStore from 'ember-simple-auth/session-stores/cookie';
export default CookieStore.extend({
  // configuration
});
```

**Actual**: No session store files found in `web/app/session-stores/`

**Search Results**:
```bash
$ grep -r "session-store" web/app/
# No results
```

---

## Impact Assessment

### User-Facing Impact

🔴 **CRITICAL**: Application completely non-functional

- ❌ Cannot access login page
- ❌ Cannot authenticate
- ❌ Cannot access any features
- ❌ Dashboard never loads (infinite spinner)

### Technical Impact

- ❌ Ember application bootstrap fails
- ❌ Router never initializes
- ❌ No routes accessible
- ❌ No recovery path (page refresh produces same error)

---

## Network Request Analysis

### Successful Requests

✅ `/api/v2/web/config` → 200 OK  
✅ `/api/v2/me` → 200 OK (called twice)

**Note**: Backend endpoints responding correctly, issue is frontend-only.

### Failed Requests

None - application crashes before making additional requests.

### Search Endpoint Status

⚠️ **UNTESTED**: Could not verify `/api/v2/search/*` endpoint because application never reaches the search functionality.

---

## Comparison with Previous Fix

### Commit e1f1962 Claims

**Commit Message**: "fix(web): resolve Ember Data store initialization error"

**Files Changed**:
- `web/app/adapters/application.ts`
- `web/app/routes/authenticated.ts`  
- `web/app/services/authenticated-user.ts`

### Actual Issue

**The commit e1f1962 does NOT fix the root cause**. The error message mentions "Ember Data store" but the actual error is about the **ember-simple-auth session store**, which is a different concept.

**Terminology Confusion**:
- **Ember Data Store**: Manages models, adapters, serializers (for API data)
- **ember-simple-auth Session Store**: Manages authentication state persistence

**The real issue**: Missing session store registration for ember-simple-auth

---

## Recommended Fix

### Option 1: Register Cookie Session Store (Recommended for Dex)

**File**: `web/app/session-stores/application.ts`

```typescript
import CookieStore from 'ember-simple-auth/session-stores/cookie';

export default class ApplicationSessionStore extends CookieStore {
  // For Dex authentication which uses session cookies
  cookieName = 'hermes-session';
  
  // Domain and path configuration
  cookieDomain = null; // Use current domain
  cookiePath = '/';
  
  // Secure cookies in production
  cookieExpirationTime = null; // Session cookie (expires when browser closes)
}
```

**Why Cookie Store**: Dex authentication uses session cookies, so the session store should also use cookies for consistency.

### Option 2: Register Adaptive Session Store (Google/Okta)

**File**: `web/app/session-stores/application.ts`

```typescript
import AdaptiveStore from 'ember-simple-auth/session-stores/adaptive';

export default class ApplicationSessionStore extends AdaptiveStore {
  // For Google/Okta OAuth which uses localStorage
  localStorageKey = 'ember_simple_auth-session';
}
```

**Why Adaptive Store**: Google and Okta use OAuth tokens stored in localStorage.

### Option 3: Provider-Aware Session Store (All Providers)

**File**: `web/app/session-stores/application.ts`

```typescript
import { service } from '@ember/service';
import AdaptiveStore from 'ember-simple-auth/session-stores/adaptive';
import CookieStore from 'ember-simple-auth/session-stores/cookie';
import ConfigService from 'hermes/services/config';

export default class ApplicationSessionStore extends AdaptiveStore {
  @service('config') declare configSvc: ConfigService;
  
  // Switch storage strategy based on auth provider
  get _store() {
    const authProvider = this.configSvc.config.auth_provider;
    
    if (authProvider === 'dex') {
      // Use cookie store for Dex (session-based auth)
      return CookieStore.create({
        cookieName: 'hermes-session',
        cookiePath: '/',
      });
    } else {
      // Use localStorage for Google/Okta (token-based auth)
      return super._store; // AdaptiveStore default
    }
  }
}
```

**Why Provider-Aware**: Supports all auth providers with appropriate storage strategy.

---

## Verification Steps After Fix

1. **Add Session Store File**
   - Create `web/app/session-stores/application.ts`
   - Implement one of the recommended options above

2. **Restart Ember Dev Server**
   ```bash
   pkill -f "ember server"
   cd /Users/jrepp/hc/hermes/web
   MIRAGE_ENABLED=false yarn ember server --port 4201 --proxy http://127.0.0.1:8001
   ```

3. **Navigate with Playwright**
   ```bash
   playwright.navigate('http://localhost:4201/')
   playwright.waitFor({ time: 5 })
   ```

4. **Verify Success Criteria**
   - ✅ No console errors about `_bindToStoreEvents`
   - ✅ Page redirects to `/auth/login` (Dex login page)
   - ✅ Can log in with test credentials
   - ✅ Dashboard loads after authentication

---

## Additional Findings

### Backend Health Check

```bash
$ curl http://localhost:8001/api/v2/me
HTTP/1.1 401 Unauthorized  # ← Expected (not authenticated)
```

**✅ Backend responding correctly**

### Ember Dev Server Logs

```
Build successful (26899ms) – Serving on http://localhost:4201/
Proxying to http://127.0.0.1:8001
[Hermes Proxy] Registered /auth proxy
[Hermes Proxy] Registered /api proxy
```

**✅ Proxy configured correctly**

---

## Test Artifacts

### Screenshots

| Filename | Description |
|----------|-------------|
| `hermes-initial-load.png` | Shows loading spinner stuck on page |

### Logs

| File | Content |
|------|---------|
| `/tmp/ember-dev-server-new.log` | Ember dev server build output |
| `docker compose logs hermes` | Backend authentication attempts |

---

## Conclusion

**The frontend validation revealed a critical issue** that prevents the Hermes application from loading. The root cause is a missing session store registration for ember-simple-auth.

**Commit e1f1962 claims to fix an "Ember Data store initialization error"**, but the actual error is about the ember-simple-auth session store, which is unrelated to Ember Data.

**The application cannot proceed to any validation steps** (login, search endpoint testing, dashboard loading) until this initialization error is resolved.

---

## Recommendations

1. **Immediate**: Create session store file following Option 1 (Cookie Store for Dex)
2. **Short-term**: Update commit e1f1962 message to clarify what was actually fixed
3. **Medium-term**: Add frontend unit tests for initializers to catch these errors earlier
4. **Long-term**: Add automated Playwright tests to CI pipeline

---

**Validation Date**: October 8, 2025  
**Performed By**: AI Agent (GitHub Copilot) with Playwright MCP  
**Environment**: Local Docker Compose + Ember Dev Proxy  
**Status**: ❌ **FAILED** - Requires session store implementation
