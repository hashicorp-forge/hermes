# Headless Playwright E2E Test Definition for Hermes

**Date**: October 9, 2025  
**Version**: 1.0  
**Purpose**: Standard template and guidelines for writing headless Playwright E2E tests in the Hermes project

---

## Table of Contents

1. [Test Environment Setup](#test-environment-setup)
2. [Test Structure Template](#test-structure-template)
3. [Authentication Patterns](#authentication-patterns)
4. [Helper Functions Library](#helper-functions-library)
5. [Best Practices](#best-practices)
6. [Debugging Guide](#debugging-guide)
7. [Common Patterns](#common-patterns)

---

## Test Environment Setup

### Prerequisites

```bash
# Ensure testing environment is running
cd testing
docker compose ps

# Expected services:
# - hermes-server (backend): http://localhost:8001
# - hermes-web (frontend): http://localhost:4201
# - postgres: localhost:5433
# - meilisearch: http://localhost:7701
# - dex (OIDC): http://localhost:5558
```

### Health Checks Before Running Tests

```bash
# Backend health
curl -I http://localhost:8001/health
# Expected: HTTP/1.1 200 OK

# Frontend health
curl -I http://localhost:4201/
# Expected: HTTP/1.1 200 OK

# Dex OIDC discovery
curl -s http://localhost:5558/dex/.well-known/openid-configuration | jq -r '.issuer'
# Expected: http://localhost:5558/dex
```

### Test Execution Commands

```bash
# Run single test file (headless, recommended for CI/agents)
cd tests/e2e-playwright
npx playwright test tests/your-test.spec.ts --reporter=line --max-failures=1

# Run specific test by name
npx playwright test -g "should show dashboard" --reporter=line

# Run all tests
npx playwright test --reporter=line

# Generate JSON report for parsing
npx playwright test --reporter=json > results.json

# View trace for debugging failures
npx playwright show-trace test-results/your-test-*/trace.zip
```

### ⚠️ Critical: Never Use `--headed` for Automated Tests

```bash
# ❌ WRONG - Starts interactive browser server, hangs terminal
npx playwright test --headed

# ✅ CORRECT - Headless execution for automation
npx playwright test --reporter=line --max-failures=1
```

---

## Test Structure Template

### Basic Test File Structure

```typescript
import { test, expect, Page } from '@playwright/test';

/**
 * [Feature Name] E2E Test for Hermes
 * 
 * Tests the complete [workflow description]:
 * 1. [Step 1]
 * 2. [Step 2]
 * 3. [Step 3]
 * 
 * Test Environment:
 * - Backend API: http://localhost:8001
 * - Frontend: http://localhost:4201
 * - Dex OIDC: http://localhost:5558
 * - Test Users: test@hermes.local / password, admin@hermes.local / password
 */

test.describe('[Feature Name] Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies and storage before each test
    await page.context().clearCookies();
  });

  test('[descriptive test name]', async ({ page }) => {
    console.log('\n=== PHASE 1: [Phase Description] ===\n');
    
    // Test implementation
    
    console.log('\n=== PHASE 2: [Phase Description] ===\n');
    
    // More test phases
    
    console.log('\n=== TEST COMPLETED SUCCESSFULLY ===\n');
  });
});
```

---

## Authentication Patterns

### Dex OIDC Authentication Helper

```typescript
/**
 * Helper function to authenticate user via Dex OIDC
 * 
 * @param page - Playwright page object
 * @param email - User email (e.g., 'test@hermes.local')
 * @param password - User password (default: 'password')
 */
async function authenticateUser(page: Page, email: string, password: string = 'password') {
  console.log(`[Auth] Authenticating ${email}...`);
  
  // Start at the Hermes homepage
  await page.goto('/');

  // Should be redirected to Dex login page
  // Port 5558 is the issuer/connector port for testing environment
  await page.waitForURL(/5558.*\/auth/, { timeout: 10000 });
  
  // Verify we're on the Dex login page
  await expect(page.locator('text=Log in to dex')).toBeVisible();

  // Click on "Log in with Email" button to use local password database
  await page.click('button:has-text("Log in with Email")');
  
  // Wait for the password form (local auth)
  await page.waitForURL(/5558.*\/auth\/local/, { timeout: 5000 });

  // Fill in credentials
  await page.fill('input[name="login"]', email);
  await page.fill('input[name="password"]', password);

  // Submit the login form
  await page.click('button[type="submit"]');

  // Should be redirected back to Hermes after successful authentication
  await page.waitForURL(/localhost:4201/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');

  console.log(`[Auth] ✓ User ${email} authenticated successfully`);
}
```

### Logout Helper

```typescript
/**
 * Helper function to logout the current user
 */
async function logoutUser(page: Page) {
  console.log('[Auth] Logging out current user...');
  
  // Look for logout/sign out button or user menu
  const logoutSelectors = [
    'button:has-text("Log out")',
    'button:has-text("Sign out")',
    'a:has-text("Log out")',
    'a:has-text("Sign out")',
    '[data-test-user-menu] >> text=/logout|sign out/i',
  ];

  let loggedOut = false;
  for (const selector of logoutSelectors) {
    try {
      const element = page.locator(selector).first();
      await element.waitFor({ timeout: 2000 });
      await element.click();
      loggedOut = true;
      console.log('[Auth] ✓ Logout button clicked');
      break;
    } catch (e) {
      // Try next selector
    }
  }

  if (!loggedOut) {
    // Fallback: clear cookies to force logout
    console.log('[Auth] ⚠️ No logout button found, clearing cookies');
    await page.context().clearCookies();
  }

  // Wait a moment for logout to complete
  await page.waitForTimeout(1000);
  console.log('[Auth] ✓ User logged out');
}
```

---

## Helper Functions Library

### Document Creation

```typescript
/**
 * Create a new RFC document
 * 
 * @param page - Playwright page object
 * @param title - Document title
 * @param summary - Document summary (optional)
 */
async function createRFCDocument(page: Page, title: string, summary: string = 'Test RFC Summary') {
  console.log(`[Document] Creating RFC: ${title}`);
  
  // Navigate to new document page
  const newDocButtons = [
    page.locator('text=/new.*document/i'),
    page.locator('[data-test-new-document]'),
    page.locator('a[href*="new"]'),
    page.locator('button:has-text("New")'),
  ];

  let navigatedToNewDoc = false;
  for (const button of newDocButtons) {
    try {
      await button.waitFor({ timeout: 3000 });
      await button.click();
      navigatedToNewDoc = true;
      console.log('[Document] ✓ Clicked new document button');
      break;
    } catch (e) {
      // Try next button
    }
  }

  if (!navigatedToNewDoc) {
    await page.goto('/new');
    console.log('[Document] ✓ Navigated directly to /new');
  }

  // Wait for the template chooser
  await page.waitForLoadState('networkidle');

  // Click on RFC template by clicking the link that navigates to /new/doc?docType=RFC
  try {
    const rfcLink = page.getByRole('link', { name: /Request for Comments RFC/ });
    await rfcLink.waitFor({ state: 'visible', timeout: 5000 });
    
    // Click and wait for navigation
    await Promise.all([
      page.waitForURL(/\/new\/doc\?docType=RFC/, { timeout: 10000 }),
      rfcLink.click()
    ]);
    console.log('[Document] ✓ Navigated to RFC creation page');
  } catch (error) {
    console.error('[Document] ❌ Failed to click RFC template:', error);
    throw new Error('Could not navigate to RFC creation page');
  }

  // Wait for document creation form to fully load
  await page.waitForLoadState('networkidle');
  
  // Wait for the "Create your RFC" heading to ensure page loaded
  await page.waitForSelector('h1:has-text("Create your RFC")', { timeout: 10000 });
  console.log('[Document] ✓ Document creation form loaded');
  
  await page.waitForTimeout(1000);

  // Fill in title - wait for the input to be visible and ready
  const titleInput = page.getByPlaceholder('Enter a title');
  await titleInput.waitFor({ state: 'visible', timeout: 5000 });
  await titleInput.fill(title);
  console.log('[Document] ✓ Filled in title');

  // Fill in summary if field exists
  try {
    const summaryInput = page.getByPlaceholder('One or two sentences outlining your doc.');
    await summaryInput.fill(summary, { timeout: 3000 });
    console.log('[Document] ✓ Filled in summary');
  } catch (e) {
    console.log('[Document] ⚠️ Summary field not found, skipping');
  }

  // Select Product/Area (required field)
  try {
    const productAreaButton = page.getByRole('button', { name: 'Product/Area' });
    await productAreaButton.click({ timeout: 3000 });
    console.log('[Document] ✓ Clicked Product/Area dropdown');
    
    await page.waitForTimeout(500);
    
    // Select first product option (Engineering - ENG)
    const productOption = page.getByText('Engineering', { exact: false }).first();
    await productOption.click({ timeout: 3000 });
    console.log('[Document] ✓ Selected Engineering product');
  } catch (e) {
    console.log('[Document] ⚠️ Product/Area selection failed:', e);
  }

  await page.waitForTimeout(500);
  return title;
}
```

### Add Contributors (During Creation)

```typescript
/**
 * Add a contributor during document creation
 * 
 * @param page - Playwright page object
 * @param contributorEmail - Contributor email address
 */
async function addContributor(page: Page, contributorEmail: string) {
  console.log(`[Document] Adding contributor: ${contributorEmail}`);

  try {
    // Scroll down to ensure Contributors section is visible
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(500);
    
    // Find and click on the Contributors search input
    const searchInput = page.getByPlaceholder('Search by name or email...');
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    await searchInput.click();
    console.log('[Document] ✓ Clicked Contributors search field');
    
    await page.waitForTimeout(300);
    
    // Type the email in the search box
    await searchInput.fill(contributorEmail);
    console.log(`[Document] ✓ Typed contributor email: ${contributorEmail}`);
    
    await page.waitForTimeout(1500); // Wait for autocomplete dropdown

    // Try to select from dropdown or press Enter
    try {
      // Look for the email in the dropdown list
      const dropdownItem = page.locator(`li:has-text("${contributorEmail}")`).first();
      await dropdownItem.waitFor({ timeout: 2000 });
      await dropdownItem.click();
      console.log('[Document] ✓ Selected contributor from dropdown');
    } catch (e) {
      await page.keyboard.press('Enter');
      console.log('[Document] ✓ Added contributor via Enter key');
    }

    await page.waitForTimeout(500);
    console.log(`[Document] ✓ Contributor ${contributorEmail} added`);
  } catch (error) {
    console.log('[Document] ⚠️ Could not add contributor:', error);
    throw error;
  }
}
```

### Add Approvers (Post-Creation via Sidebar)

```typescript
/**
 * Add an approver to a document via the sidebar
 * Must be on the document page
 * 
 * @param page - Playwright page object
 * @param approverEmail - Approver email address
 */
async function addApproverViaSidebar(page: Page, approverEmail: string) {
  console.log(`[Document] Adding approver via sidebar: ${approverEmail}`);

  try {
    // Find the "Approvers" section in sidebar
    const approversHeading = page.locator('heading:has-text("Approvers")');
    await approversHeading.waitFor({ state: 'visible', timeout: 5000 });
    
    // Click on the "None" button or existing approvers list to edit
    const approversButton = page.locator('button:has-text("None")').or(
      page.locator('[data-test-document-approvers]')
    );
    await approversButton.click({ timeout: 3000 });
    console.log('[Document] ✓ Clicked Approvers field');
    
    await page.waitForTimeout(500);
    
    // Type in the search box that appears
    const searchInput = page.getByPlaceholder('Search by name or email...');
    await searchInput.waitFor({ state: 'visible', timeout: 3000 });
    await searchInput.fill(approverEmail);
    console.log(`[Document] ✓ Typed approver email: ${approverEmail}`);
    
    await page.waitForTimeout(1500); // Wait for autocomplete dropdown

    // Try to select from dropdown
    try {
      const dropdownItem = page.locator(`li:has-text("${approverEmail}")`).first();
      await dropdownItem.waitFor({ timeout: 2000 });
      await dropdownItem.click();
      console.log('[Document] ✓ Selected approver from dropdown');
    } catch (e) {
      await page.keyboard.press('Enter');
      console.log('[Document] ✓ Added approver via Enter key');
    }

    await page.waitForTimeout(500);
    
    // Click Save button
    const saveButton = page.locator('button:has-text("Save")').first();
    await saveButton.waitFor({ state: 'visible', timeout: 3000 });
    await saveButton.click();
    console.log('[Document] ✓ Clicked Save button');
    
    await page.waitForTimeout(1000); // Wait for PATCH request
    console.log(`[Document] ✓ Approver ${approverEmail} added and saved`);
  } catch (error) {
    console.log('[Document] ⚠️ Could not add approver via sidebar:', error);
    throw error;
  }
}
```

### Publish Document

```typescript
/**
 * Publish/create the document
 * 
 * @param page - Playwright page object
 */
async function publishDocument(page: Page) {
  console.log('[Document] Publishing document...');

  // The button text from the snapshot is "Create draft in Google Drive"
  // But it actually works with local workspace too
  const publishSelectors = [
    'button:has-text("Create draft")',
    'button:has-text("Create")',
    'button:has-text("Publish")',
    'button:has-text("Save")',
    '[data-test-create-document]',
    '[data-test-publish-document]',
  ];

  let published = false;
  for (const selector of publishSelectors) {
    try {
      const button = page.locator(selector).first();
      await button.waitFor({ timeout: 3000 });
      await button.click();
      published = true;
      console.log('[Document] ✓ Clicked publish button');
      break;
    } catch (e) {
      // Try next selector
    }
  }

  if (!published) {
    throw new Error('Could not find publish/create button');
  }

  // Wait for redirect to document page
  // Local workspace creates as drafts first
  await page.waitForURL(/\/(document|documents)\/.+/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
  console.log('[Document] ✓ Document published successfully');
}
```

### Change Document Status

```typescript
/**
 * Change document status (e.g., Draft → In-Review)
 * Must be on the document page
 * 
 * @param page - Playwright page object
 * @param newStatus - Target status (e.g., 'In-Review', 'Approved', 'Obsolete')
 */
async function changeDocumentStatus(page: Page, newStatus: string) {
  console.log(`[Document] Changing status to: ${newStatus}`);

  try {
    // Look for status dropdown or button in sidebar
    const statusButton = page.locator('button:has-text("WIP")').or(
      page.locator('button:has-text("Draft")').or(
        page.locator('[data-test-document-status]')
      )
    );
    
    await statusButton.waitFor({ state: 'visible', timeout: 5000 });
    await statusButton.click();
    console.log('[Document] ✓ Clicked status button');
    
    await page.waitForTimeout(500);
    
    // Select new status from dropdown
    const statusOption = page.locator(`text=${newStatus}`).first();
    await statusOption.waitFor({ timeout: 3000 });
    await statusOption.click();
    console.log(`[Document] ✓ Selected status: ${newStatus}`);
    
    await page.waitForTimeout(1000); // Wait for status update
    console.log('[Document] ✓ Status changed successfully');
  } catch (error) {
    console.log('[Document] ⚠️ Could not change status:', error);
    throw error;
  }
}
```

---

## Best Practices

### 1. Always Use Console Logging

```typescript
// ✅ GOOD - Helps debug test failures
console.log('[Phase] 📊 Starting data load...');
console.log('[Phase] ✓ Data loaded successfully');
console.log('[Phase] ❌ Failed to load data');

// ❌ BAD - Silent failures are hard to debug
await someOperation();
```

### 2. Use Descriptive Phase Markers

```typescript
test('complete workflow', async ({ page }) => {
  console.log('\n=== PHASE 1: User Authentication ===\n');
  // Auth code
  
  console.log('\n=== PHASE 2: Document Creation ===\n');
  // Creation code
  
  console.log('\n=== PHASE 3: Validation ===\n');
  // Validation code
  
  console.log('\n=== TEST COMPLETED SUCCESSFULLY ===\n');
});
```

### 3. Take Screenshots at Critical Points

```typescript
// After each major phase
await page.screenshot({ 
  path: 'test-results/my-test-01-authenticated.png', 
  fullPage: true 
});

// On errors
try {
  await criticalOperation();
} catch (error) {
  await page.screenshot({ 
    path: 'test-results/my-test-error.png', 
    fullPage: true 
  });
  throw error;
}
```

### 4. Use Explicit Waits

```typescript
// ✅ GOOD - Wait for specific condition
await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 10000 });

// ❌ BAD - Arbitrary timeout
await page.waitForTimeout(5000);

// ✅ ACCEPTABLE - After interaction that needs brief settling
await button.click();
await page.waitForTimeout(500); // Allow UI to update
```

### 5. Handle Dynamic Content with Retries

```typescript
// For elements that may take time to appear
let element;
let attempts = 0;
const maxAttempts = 3;

while (attempts < maxAttempts) {
  try {
    element = page.locator('[data-test-my-element]');
    await element.waitFor({ timeout: 3000 });
    break;
  } catch (e) {
    attempts++;
    if (attempts >= maxAttempts) throw e;
    await page.waitForTimeout(1000);
  }
}
```

### 6. Use getByRole for Better Accessibility

```typescript
// ✅ PREFERRED - Accessible selectors
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByRole('link', { name: 'Dashboard' }).click();
await page.getByRole('textbox', { name: 'Email' }).fill('test@example.com');

// ⚠️ ACCEPTABLE - When data-test attributes exist
await page.locator('[data-test-submit-button]').click();

// ❌ AVOID - Fragile selectors
await page.locator('.btn.btn-primary.submit').click();
```

### 7. Clean Up Between Tests

```typescript
test.beforeEach(async ({ page }) => {
  // Always clear cookies and storage
  await page.context().clearCookies();
  await page.context().clearPermissions();
});

test.afterEach(async ({ page }) => {
  // Take screenshot if test failed
  if (test.info().status !== 'passed') {
    await page.screenshot({ 
      path: `test-results/failure-${Date.now()}.png`,
      fullPage: true 
    });
  }
});
```

---

## Debugging Guide

### When Tests Fail

1. **Check Exit Code**:
   ```bash
   echo $?  # 0 = pass, 1 = fail
   ```

2. **Read Terminal Output**:
   - Look for console.log messages
   - Check which phase failed
   - Note timeout errors vs assertion errors

3. **View Screenshots**:
   ```bash
   ls -lht test-results/*.png | head -5
   open test-results/my-test-01-error.png
   ```

4. **View Trace**:
   ```bash
   npx playwright show-trace test-results/my-test-*/trace.zip
   ```

5. **Check Backend Logs**:
   ```bash
   cd testing
   docker compose logs hermes | tail -50
   ```

6. **Verify Services Are Running**:
   ```bash
   curl -I http://localhost:8001/health
   curl -I http://localhost:4201/
   docker compose ps
   ```

### Common Issues & Solutions

#### Issue: "TimeoutError: page.waitForSelector"

**Cause**: Element not appearing on page  
**Solutions**:
- Check if navigation happened correctly
- Verify element exists with playwright-mcp
- Increase timeout if element takes time to load
- Check for JavaScript errors in console

#### Issue: "Test timeout of 30000ms exceeded"

**Cause**: Test taking too long  
**Solutions**:
- Break test into smaller phases
- Check for infinite loops or hanging requests
- Increase test timeout in playwright.config.ts
- Add more granular console.log to find slow step

#### Issue: "No results found" in dropdowns

**Cause**: Database not populated  
**Solutions**:
- Check if users/people exist in database
- Verify search index is updated
- See TODO-015 for people database issue

#### Issue: "Element is not visible"

**Cause**: Element hidden or not rendered  
**Solutions**:
- Add scroll to element: `await element.scrollIntoViewIfNeeded()`
- Check if element is in collapsed section
- Verify page loaded completely with `waitForLoadState('networkidle')`

---

## Common Patterns

### Pattern: Multi-User Workflow

```typescript
test('multi-user collaboration', async ({ page }) => {
  // User A creates document
  await authenticateUser(page, 'user-a@hermes.local');
  const docTitle = await createRFCDocument(page, `RFC ${Date.now()}`);
  await publishDocument(page);
  await logoutUser(page);
  
  // User B reviews document
  await authenticateUser(page, 'user-b@hermes.local');
  await page.goto('/dashboard');
  await page.click(`text=${docTitle}`);
  // Perform review actions
  await logoutUser(page);
});
```

### Pattern: Wait for Search Index Update

```typescript
// After document creation/update, search index may need time to update
await publishDocument(page);

// Option 1: Fixed wait (simple but not ideal)
await page.waitForTimeout(3000);

// Option 2: Poll until document appears (better)
let found = false;
for (let i = 0; i < 10; i++) {
  await page.goto('/dashboard');
  const element = page.locator(`text=${docTitle}`);
  try {
    await element.waitFor({ timeout: 2000 });
    found = true;
    break;
  } catch (e) {
    await page.waitForTimeout(2000);
  }
}
expect(found).toBeTruthy();
```

### Pattern: Verify Backend State

```typescript
// Check database after UI action
await addApproverViaSidebar(page, 'approver@hermes.local');

// Verify via API or database query
const response = await page.request.get('/api/v2/documents/DOCID');
const data = await response.json();
expect(data.approvers).toContain('approver@hermes.local');
```

### Pattern: Handle Dynamic IDs

```typescript
// Extract document ID from URL after creation
await publishDocument(page);
const url = page.url();
const docIdMatch = url.match(/\/document\/([a-f0-9]+)/);
const docId = docIdMatch ? docIdMatch[1] : null;

// Use the ID for subsequent operations
await page.goto(`/document/${docId}`);
```

---

## Test Configuration

### playwright.config.ts Settings

```typescript
export default defineConfig({
  testDir: './tests',
  timeout: 30000,  // 30s per test
  expect: {
    timeout: 5000  // 5s for assertions
  },
  fullyParallel: false,  // Run tests sequentially for E2E
  forbidOnly: !!process.env.CI,  // Fail in CI if test.only
  retries: process.env.CI ? 2 : 0,  // Retry failed tests in CI
  workers: 1,  // Single worker for E2E tests
  reporter: [
    ['line'],  // Terminal output
    ['json', { outputFile: 'test-results/results.json' }],
    ['html', { open: 'never' }]
  ],
  use: {
    baseURL: 'http://localhost:4201',
    trace: 'retain-on-failure',  // Keep traces for failed tests
    screenshot: 'on',  // Take screenshots on failure
    video: 'retain-on-failure',  // Record video on failure
  },
});
```

---

## Example: Complete Test File

See `tests/dashboard-awaiting-review.spec.ts` for a complete example implementing all these patterns.

---

## Related Documentation

- **Playwright E2E Agent Guide**: `docs-internal/PLAYWRIGHT_E2E_AGENT_GUIDE.md`
- **Testing Environment**: `testing/README.md`
- **E2E Test Readme**: `tests/e2e-playwright/README.md`
- **TODO-011**: E2E test awaiting review dashboard (reference implementation)
- **TODO-014**: Contributors vs Approvers field gap (context)
- **TODO-015**: People database not populated (known blocker)

---

## Checklist for New E2E Test

- [ ] Test environment is running and healthy
- [ ] Test file follows naming convention: `feature-name.spec.ts`
- [ ] Test has descriptive JSDoc comment at top
- [ ] Uses helper functions from this guide
- [ ] Includes phase markers with console.log
- [ ] Takes screenshots at critical points
- [ ] Handles authentication properly
- [ ] Cleans up between tests (beforeEach)
- [ ] Has descriptive test name in `test()` function
- [ ] Runs headless with `--reporter=line`
- [ ] Validates expected outcomes with `expect()` assertions
- [ ] Documents any new patterns discovered
- [ ] Updates this guide if new helpers are created

---

**Version History**:
- v1.0 (2025-10-09): Initial version based on dashboard awaiting review test implementation
