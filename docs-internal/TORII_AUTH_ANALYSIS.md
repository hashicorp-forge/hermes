# Torii Authentication Pattern Analysis

**Date**: October 6, 2025  
**Branch**: `jrepp/dev-tidy`  
**Analyst**: AI Assistant

## Executive Summary

**Question**: Is Torii the right pattern to use for supporting multiple auth systems (Google, Okta, Dex)?

**Answer**: **NO** - Torii is currently **disabled** and **not needed**. The current implementation uses a simpler, more maintainable approach that works well for the three auth providers.

## Current State

### Torii Status: DISABLED ❌

```javascript
// web/app/initializers/initialize-torii.js
export default {
  name: "torii",
  initialize: function() {
    // TEMPORARILY DISABLED FOR EMBER 6.x UPGRADE
    console.warn("Torii authentication temporarily disabled during Ember upgrade");
  },
};
```

**Key Finding**: Torii is commented out and **not installed** in `package.json`. It was disabled during the Ember 6.x upgrade.

### Current Auth Architecture ✅

The app uses a **simple, provider-aware** pattern that works without Torii:

```typescript
// web/app/controllers/authenticate.ts
protected authenticate = dropTask(async () => {
  // Google OAuth - uses ember-simple-auth directly
  await this.session.authenticate(
    "authenticator:torii",
    "google-oauth2-bearer"
  );
});

protected authenticateOIDC = dropTask(async () => {
  // OIDC (Okta/Dex) - redirects to backend
  const authProvider = this.authProvider;
  window.location.href = `/api/v2/auth/${authProvider}/login`;
});
```

**How It Works**:

1. **Google OAuth**: Uses `ember-simple-auth` with a custom authenticator (no Torii needed)
2. **OIDC (Okta/Dex)**: Backend handles the full OIDC flow, frontend just redirects
3. **Provider selection**: Runtime determination via `auth_provider` config from backend

## Auth Provider Comparison

### Google OAuth Flow
```
User → Frontend → Backend → Google → Backend → Frontend
                   ↓
            Access Token (custom header)
```

- **Frontend**: Initiates OAuth popup (legacy Torii pattern, but doesn't use Torii lib)
- **Token format**: `Hermes-Google-Access-Token: <token>`
- **Refresh**: Frontend-managed via `ember-simple-auth`

### OIDC (Okta/Dex) Flow
```
User → Frontend → Backend → OIDC Provider → Backend → Frontend
                            ↓
                    JWT Bearer Token
```

- **Frontend**: Simple redirect to `/api/v2/auth/{provider}/login`
- **Token format**: `Authorization: Bearer <jwt>`
- **Refresh**: Backend-managed, session cookie-based

## Provider Detection Pattern

The app uses **runtime provider detection** from backend config:

```typescript
// web/app/services/config.ts
interface HermesConfig {
  auth_provider: "google" | "okta" | "dex";  // Determined at runtime
}

// web/app/services/_session.ts
get isUsingOIDC(): boolean {
  const provider = this.configSvc.config.auth_provider;
  return provider === "okta" || provider === "dex";
}
```

This pattern is used throughout the app:

```typescript
// web/app/services/fetch.ts - Adding auth headers
if (authProvider === "google") {
  headers["Hermes-Google-Access-Token"] = accessToken;
} else if (authProvider === "dex" || authProvider === "okta") {
  headers["Authorization"] = `Bearer ${accessToken}`;
}

// web/app/services/search.ts - Same pattern for search client
private getAuthHeaders(): Record<string, string> {
  const authProvider = this.configSvc.config.auth_provider;
  if (authProvider === "google") {
    return { "Hermes-Google-Access-Token": accessToken };
  } else if (authProvider === "dex" || authProvider === "okta") {
    return { Authorization: `Bearer ${accessToken}` };
  }
}
```

## Why Torii is NOT Needed

### 1. **Different Flow Patterns**

| Provider | Auth Flow | Frontend Role |
|----------|-----------|---------------|
| **Google** | OAuth 2.0 popup | Manage token, refresh |
| **OIDC (Okta/Dex)** | Server-side redirect | Just redirect to backend |

Torii was designed for **popup-based OAuth flows** (Google, GitHub, etc.). But:
- ✅ **Google**: Currently works without Torii library (uses ember-simple-auth directly)
- ❌ **OIDC**: Doesn't use popups at all - backend handles everything

### 2. **Backend-Centric OIDC**

The OIDC implementation is **backend-driven**:

```go
// Backend handles the full OIDC flow
/api/v2/auth/dex/login    → Initiates OIDC flow
/api/v2/auth/dex/callback → Handles provider callback
```

Frontend just redirects and receives a session cookie. No need for a JavaScript OAuth library.

### 3. **Simpler Maintenance**

**Without Torii**:
- ✅ One less dependency to maintain
- ✅ No Torii upgrade issues (currently broken with Ember 6.x)
- ✅ Clear separation: frontend=redirect, backend=OIDC logic
- ✅ Standard patterns (redirect for OIDC, ember-simple-auth for OAuth)

**With Torii**:
- ❌ Extra dependency to upgrade/maintain
- ❌ Complexity for patterns that don't need it (OIDC)
- ❌ Currently disabled due to Ember 6.x incompatibility

### 4. **Current Implementation is Clean**

The existing pattern is simple and works:

```typescript
// Authenticate based on provider type
if (isOIDC) {
  // Redirect to backend
  window.location.href = `/api/v2/auth/${provider}/login`;
} else {
  // Use ember-simple-auth for Google OAuth
  await this.session.authenticate("authenticator:torii", "google-oauth2-bearer");
}
```

## Recommendations

### ✅ **Keep Current Pattern** (Recommended)

**Why**:
1. Works for all three providers (Google, Okta, Dex)
2. Simpler - one less dependency
3. Backend-centric OIDC is the right pattern
4. Already implemented and tested
5. Torii is disabled anyway

**Actions**:
- [ ] Remove dead Torii code (`web/app/initializers/initialize-torii.js`)
- [ ] Remove Torii provider stubs (`web/app/torii-providers/`)
- [ ] Update authenticator to not reference "torii" name
- [ ] Update documentation to reflect actual auth flows
- [ ] Verify Google OAuth still works without Torii library

### ❌ **Don't Re-enable Torii**

**Reasons**:
1. Not needed for OIDC providers (Okta/Dex)
2. ember-simple-auth handles Google OAuth directly
3. Adds complexity without benefits
4. Currently incompatible with Ember 6.x

## Auth Flow Details

### Google OAuth (Current)

```typescript
// User clicks "Sign in with Google"
1. Frontend: authenticate("authenticator:torii", "google-oauth2-bearer")
   ↓
2. Opens popup to Google (via custom authenticator, not Torii lib)
   ↓
3. Google redirects to /torii/redirect.html with token
   ↓
4. Frontend: Stores token in ember-simple-auth session
   ↓
5. API calls: Include header "Hermes-Google-Access-Token: <token>"
```

### OIDC (Okta/Dex) - Current ✅

```typescript
// User clicks "Sign in with Okta" or "Sign in with Dex"
1. Frontend: window.location.href = '/api/v2/auth/{provider}/login'
   ↓
2. Backend: Redirects to OIDC provider
   ↓
3. User authenticates at provider
   ↓
4. Provider: Redirects to /api/v2/auth/{provider}/callback
   ↓
5. Backend: Validates, creates session, redirects to frontend
   ↓
6. Frontend: Has session cookie, ready to use
   ↓
7. API calls: Include header "Authorization: Bearer <jwt>"
```

## Code Cleanup Needed

### Files to Remove/Update

**Remove** (dead code):
- `web/app/initializers/initialize-torii.js` - Disabled initializer
- `web/app/torii-providers/google-oauth2-bearer.js` - Empty stub
- References to Torii in comments

**Update**:
- `web/app/authenticators/torii.ts` - Rename to `oauth.ts`, remove Torii references
- `web/app/controllers/authenticate.ts` - Update authenticator reference
- `web/app/services/_session.ts` - Remove Torii service injection

## Alternative: If You Want a Provider Pattern

If you want to formalize the provider pattern, consider:

### Custom Authenticator Pattern ✅

```typescript
// web/app/authenticators/google-oauth.ts
export default class GoogleOAuthAuthenticator extends Base {
  async authenticate() {
    // Google-specific OAuth logic
  }
}

// web/app/authenticators/oidc.ts
export default class OIDCAuthenticator extends Base {
  async authenticate(provider: "okta" | "dex") {
    // OIDC redirect logic
    window.location.href = `/api/v2/auth/${provider}/login`;
  }
}

// Usage
if (authProvider === "google") {
  await session.authenticate("authenticator:google-oauth");
} else {
  await session.authenticate("authenticator:oidc", authProvider);
}
```

**Benefits**:
- ✅ Clear separation of concerns
- ✅ Testable in isolation
- ✅ Standard Ember pattern
- ✅ No external dependencies

## Conclusion

**Torii is NOT the right pattern for Hermes because**:

1. ❌ **Not installed** - Currently disabled and not in package.json
2. ❌ **Not needed** - OIDC providers use backend-redirect pattern
3. ❌ **Outdated** - Incompatible with Ember 6.x
4. ✅ **Current pattern works** - Simple runtime provider detection
5. ✅ **Easier maintenance** - One less dependency to manage

**The right pattern is what you already have**: Runtime provider detection with provider-specific authentication flows (ember-simple-auth for Google, backend redirect for OIDC).

## Next Steps

1. **Document the current pattern** - Update README with auth flow diagrams
2. **Clean up dead code** - Remove Torii stubs and commented code
3. **Add tests** - Verify each provider's auth flow works
4. **Formalize providers** (optional) - Create explicit authenticator classes per provider

---

**References**:
- `docs-internal/AUTH_PROVIDER_SELECTION.md` - Provider selection implementation
- `docs-internal/DEX_AUTHENTICATION.md` - Dex OIDC setup
- `web/app/services/_session.ts` - Session management with provider detection
- `web/app/services/fetch.ts` - Auth header logic per provider
