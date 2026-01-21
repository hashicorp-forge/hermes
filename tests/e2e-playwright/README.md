# Playwright E2E Acceptance Tests for Hermes

This directory contains Playwright end-to-end tests for the Hermes application, focusing on authentication and critical user flows.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ installed
- Hermes testing environment running (`docker compose up -d` in `testing/` directory)

## Setup

1. Install dependencies:
```bash
cd tests/e2e-playwright
npm install
npx playwright install chromium
```

2. Ensure testing environment is running:
```bash
cd ../../testing/
docker compose up -d
docker compose ps  # Verify all services are healthy
```

3. Verify the web app is accessible:
```bash
curl http://localhost:4201
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run authentication tests only
```bash
npm run test:auth
```

### Run with UI mode (interactive)
```bash
npm run test:ui
```

### Run in headed mode (see browser)
```bash
npm run test:headed
```

### Debug mode
```bash
npm run test:debug
```

## Test Structure

### `tests/auth.spec.ts`
Tests the complete Dex OIDC authentication flow:

1. **Successful Authentication** - Tests login with `test@hermes.local`
   - Navigates to Hermes homepage
   - Gets redirected to Dex login page (port 5559)
   - Fills in credentials
   - Submits form
   - Verifies redirect back to Hermes
   - Checks for authenticated state

2. **Failed Authentication** - Tests invalid credentials
   - Attempts login with invalid email/password
   - Verifies error message appears

3. **Admin Authentication** - Tests login with `admin@hermes.local`
   - Verifies admin user can authenticate

## Test Users

Tests use the static users configured in `testing/users.json` and `testing/dex-config.yaml`:

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| `test@hermes.local` | `password` | Tester | Primary test user |
| `admin@hermes.local` | `password` | Admin | Administrator user |
| `user@hermes.local` | `password` | User | Regular user |

## Configuration

### `playwright.config.ts`
- **Base URL**: `http://localhost:4201` (Ember dev server or containerized web)
- **Browser**: Chromium (can be extended to Firefox, WebKit)
- **Workers**: 1 (sequential execution)
- **Screenshots**: On failure
- **Trace**: On first retry
- **Web Server**: Auto-starts if not running (uses containerized web app)

## Architecture

```
Browser (Playwright)
    ↓
http://localhost:4201 (Ember Dev Server OR Container)
    ↓ /auth/*, /api/*
http://localhost:8001 (Hermes Backend Container)
    ↓ OAuth redirect
http://localhost:5559 (Dex OIDC Container)
```

## Troubleshooting

### Tests timeout waiting for Dex
```bash
# Check Dex is running
docker compose ps dex
# Check Dex logs
docker compose logs dex
```

### Tests timeout waiting for Hermes
```bash
# Check Hermes backend
docker compose ps hermes
docker compose logs hermes
```

### Tests can't reach localhost:4201
```bash
# Check web container
docker compose ps web
# Or if using local Ember dev server
cd ../web
MIRAGE_ENABLED=false yarn start:with-proxy
```

### Clear test state
```bash
# Remove all cookies and storage
rm -rf test-results/
# Restart containers
cd ..
docker compose down -v
docker compose up -d
```

## Extending Tests

### Adding New Test Suites

1. Create a new spec file in `tests/` directory:
```typescript
// tests/documents.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Document Management', () => {
  test('should create a new document', async ({ page }) => {
    // Test implementation
  });
});
```

2. Add a script to `package.json`:
```json
{
  "scripts": {
    "test:documents": "playwright test tests/documents.spec.ts"
  }
}
```

### Authenticated Test Helper

To avoid repeating login in every test, create a helper:

```typescript
// tests/helpers/auth.ts
import { Page } from '@playwright/test';

export async function login(page: Page, email: string, password: string) {
  await page.goto('/');
  await page.waitForURL(/5559.*\/auth/);
  await page.fill('input[name="login"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:4201/**');
}
```

Use in tests:
```typescript
import { login } from './helpers/auth';

test('should access dashboard when authenticated', async ({ page }) => {
  await login(page, 'test@hermes.local', 'password');
  // Continue with test...
});
```

## CI Integration

To run in CI:

```yaml
- name: Run Playwright Tests
  run: |
    cd testing
    docker compose up -d
    cd playwright
    npm ci
    npx playwright install --with-deps chromium
    npx playwright test
```

## Related Documentation

- **Testing Environment**: `../README.md`
- **Local Workspace Setup**: `../README-local-workspace.md`
- **Dex Authentication**: `../../docs-internal/DEX_QUICK_START.md`
- **Provider Selection**: `../../docs-internal/PROVIDER_SELECTION.md`
