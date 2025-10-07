# Application Stuck on Spinner - No Backend Available

## Issue

The Hermes frontend is showing a spinner and not making any API calls because:
1. The application is stuck waiting for `session.setup()` to complete
2. Session setup requires authentication flow
3. The backend server isn't running (needs Google credentials)
4. Without backend, the `/api/v2/web/config` endpoint returns 404

## Root Cause

The application architecture **requires a backend** to:
- Provide authentication (Google OAuth, Okta, or Dex)
- Serve the `/api/v2/web/config` endpoint  
- Provide user session validation

The frontend cannot run in isolation without mocking these services.

## Solutions

### Option 1: Start Backend with Credentials (Recommended)

The backend needs Google OAuth credentials to run. Follow these steps:

1. **Get Google OAuth Credentials**:
   - Go to Google Cloud Console
   - Create OAuth 2.0 credentials
   - Download as `credentials.json`

2. **Place credentials in repo root**:
   ```bash
   cp ~/Downloads/credentials.json /Users/jrepp/hc/hermes/credentials.json
   ```

3. **Start the backend**:
   ```bash
   cd /Users/jrepp/hc/hermes
   ./hermes server -config=config.hcl
   ```

4. **Use the proxy server**:
   ```bash
   cd web
   yarn start:with-proxy
   ```
   This starts the frontend with a proxy to the backend at http://localhost:8000

### Option 2: Use Test Environment with Mirage

Mirage mocks the backend for testing. You can leverage this:

1. **Run tests in browser**:
   ```bash
   cd /Users/jrepp/hc/hermes/web
   yarn test --server
   ```
   This opens a test UI at http://localhost:7357 where Mirage provides mock data.

2. **Benefits**:
   - No backend required
   - See components render with mock data
   - Can interact with the UI

### Option 3: Enable Mirage for Development (Advanced)

Modify the app to use Mirage in development mode:

1. **Update `web/config/environment.js`**:
   ```javascript
   if (environment === "development") {
     ENV['ember-cli-mirage'] = {
       enabled: true
     };
     // ... rest of config
   }
   ```

2. **Restart dev server**

3. **Caveats**:
   - Not the intended use case
   - May have incomplete mock data
   - Authentication will be mocked

### Option 4: Skip to Testing Profile

The repository has a `testing/` directory with Docker-based setup:

```bash
cd /Users/jrepp/hc/hermes/testing
make start  # Starts backend with Dex authentication
```

Check `testing/README.md` for details.

## Current State

**Frontend**: ✅ Running on http://localhost:4200/
**Backend**: ❌ Not running (needs credentials)
**Spinner**: App is stuck in `ApplicationRoute.beforeModel()` waiting for:
1. `this.session.setup()` - ember-simple-auth initialization
2. `/api/v2/web/config` fetch - needs backend response

## Recommended Next Steps

1. **If you have Google OAuth credentials**: Use Option 1
2. **If you want to see the UI without setup**: Use Option 2 (test server)
3. **For full local development**: Follow the setup in `testing/README.md`

## Code Reference

The blocking code is in `web/app/routes/application.ts`:

```typescript
async beforeModel(transition: Transition) {
  // ... redirect logic ...

  await this.session.setup();  // ← Stuck here waiting for auth

  await this.fetchSvc
    .fetch(`/api/${this.config.config.api_version}/web/config`)  // ← Never reaches here
    .then((response) => response?.json())
    .then((json) => {
      this.config.setConfig(json);
    })
    .catch((err) => {
      console.log("Error fetching and setting web config: " + err);
    });

  this.metrics;
}
```

## Files

- `web/app/routes/application.ts` - Application initialization
- `web/app/services/_session.ts` - Session service (ember-simple-auth wrapper)
- `web/config/environment.js` - Environment configuration
- `testing/README.md` - Local development setup guide
- `testing/config-dex.hcl` - Backend config for Dex auth (no Google needed)
