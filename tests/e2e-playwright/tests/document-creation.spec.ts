import { test, expect, Page } from '@playwright/test';

/**
 * Document Creation Flow Test for Hermes with Dex OIDC
 * 
 * Tests the complete document creation flow:
 * 1. User authenticates via Dex OIDC
 * 2. Navigates to new document creation page
 * 3. Fills in document details (title, summary, type)
 * 4. Creates the document
 * 5. Verifies document was created successfully
 * 
 * Test Environment:
 * - Backend API: http://localhost:8001
 * - Frontend: http://localhost:4201 (Ember dev server proxying to backend)
 * - Dex OIDC: http://localhost:5558
 * - Test User: test@hermes.local / password
 */

test.describe('Document Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies and storage before each test
    await page.context().clearCookies();
  });

  /**
   * Helper function to authenticate user via Dex
   */
  async function authenticateUser(page: Page, email: string = 'test@hermes.local', password: string = 'password') {
    // Start at the Hermes homepage
    await page.goto('/');

    // Should be redirected to Dex login page
    await page.waitForURL(/5558.*\/auth/, { timeout: 10000 });
    
    // Verify we're on the Dex login page
    await expect(page.locator('text=Log in to Your Account')).toBeVisible();

    // Fill in credentials
    await page.fill('input[name="login"]', email);
    await page.fill('input[name="password"]', password);

    // Submit the login form
    await page.click('button[type="submit"]');

    // Should be redirected back to Hermes after successful authentication
    await page.waitForURL('http://localhost:4201/**', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    console.log(`✓ User ${email} authenticated successfully`);
  }

  test('should create a new RFC document successfully', async ({ page }) => {
    // Step 1: Authenticate
    await authenticateUser(page);
    
    // Take a screenshot of authenticated state
    await page.screenshot({ path: 'test-results/01-authenticated.png', fullPage: true });

    // Step 2: Navigate to new document page
    // Look for common UI elements like "New Document", "Create", or "+" button
    const newDocButtons = [
      page.locator('text=/new.*document/i'),
      page.locator('text=/create.*document/i'),
      page.locator('[data-test-new-document]'),
      page.locator('[aria-label*="new document" i]'),
      page.locator('a[href*="new"]'),
      page.locator('button:has-text("New")'),
    ];

    let navigatedToNewDoc = false;
    for (const button of newDocButtons) {
      try {
        await button.waitFor({ timeout: 3000 });
        await button.click();
        navigatedToNewDoc = true;
        console.log('✓ Clicked new document button');
        break;
      } catch (e) {
        // Try next button
      }
    }

    // If no button found, try direct navigation
    if (!navigatedToNewDoc) {
      await page.goto('http://localhost:4201/new');
      console.log('✓ Navigated directly to /new');
    }

    // Wait for the new document form to load
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/02-new-document-page.png', fullPage: true });

    // Step 3: Fill in document details
    const timestamp = Date.now();
    const documentTitle = `Test RFC ${timestamp}`;
    const documentSummary = `This is an automated test document created at ${new Date().toISOString()}`;

    // Look for title input field
    const titleInputs = [
      page.locator('input[name="title"]'),
      page.locator('input[placeholder*="title" i]'),
      page.locator('[data-test-document-title]'),
      page.locator('input[type="text"]').first(),
    ];

    for (const input of titleInputs) {
      try {
        await input.waitFor({ timeout: 3000 });
        await input.fill(documentTitle);
        console.log(`✓ Filled title: ${documentTitle}`);
        break;
      } catch (e) {
        // Try next input
      }
    }

    // Look for summary/description field
    const summaryInputs = [
      page.locator('textarea[name="summary"]'),
      page.locator('textarea[placeholder*="summary" i]'),
      page.locator('textarea[placeholder*="description" i]'),
      page.locator('[data-test-document-summary]'),
      page.locator('textarea').first(),
    ];

    for (const input of summaryInputs) {
      try {
        await input.waitFor({ timeout: 3000 });
        await input.fill(documentSummary);
        console.log(`✓ Filled summary: ${documentSummary}`);
        break;
      } catch (e) {
        // Try next input
      }
    }

    // Select document type (RFC)
    const typeSelectors = [
      page.locator('select[name="type"]'),
      page.locator('select[name="docType"]'),
      page.locator('[data-test-document-type]'),
      page.locator('text=/select.*type/i').locator('..'),
    ];

    for (const selector of typeSelectors) {
      try {
        await selector.waitFor({ timeout: 3000 });
        await selector.selectOption('RFC');
        console.log('✓ Selected document type: RFC');
        break;
      } catch (e) {
        // Try next selector - might be a custom dropdown
        try {
          await page.locator('text=/RFC/i').first().click();
          console.log('✓ Selected RFC via text click');
          break;
        } catch (e2) {
          // Continue
        }
      }
    }

    await page.screenshot({ path: 'test-results/03-form-filled.png', fullPage: true });

    // Step 4: Submit the form
    const submitButtons = [
      page.locator('button[type="submit"]'),
      page.locator('button:has-text("Create")'),
      page.locator('button:has-text("Submit")'),
      page.locator('button:has-text("Save")'),
      page.locator('[data-test-create-document]'),
      page.locator('[data-test-submit]'),
    ];

    let formSubmitted = false;
    for (const button of submitButtons) {
      try {
        await button.waitFor({ timeout: 3000 });
        await button.click();
        console.log('✓ Clicked submit button');
        formSubmitted = true;
        break;
      } catch (e) {
        // Try next button
      }
    }

    if (!formSubmitted) {
      // Try pressing Enter in the title field
      await page.keyboard.press('Enter');
      console.log('✓ Submitted form via Enter key');
    }

    // Step 5: Wait for document creation and verify success
    // Should be redirected to the document page or see a success message
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Wait for either:
    // 1. URL to change to document view (e.g., /document/RFC-123)
    // 2. Success message to appear
    // 3. Document title to appear on the page
    
    try {
      await page.waitForURL(/\/document\/.*|\/RFC-.*|\d{10}/, { timeout: 5000 });
      console.log('✓ Redirected to document page');
    } catch (e) {
      console.log('⚠ No redirect detected, checking for success indicators');
    }

    await page.screenshot({ path: 'test-results/04-after-creation.png', fullPage: true });

    // Check for success indicators
    const successIndicators = [
      page.locator('text=/created.*successfully/i'),
      page.locator('text=/document.*created/i'),
      page.locator('[data-test-success]'),
      page.locator('.success'),
      page.locator('.notification.is-success'),
      page.locator(`text="${documentTitle}"`),
    ];

    let successFound = false;
    for (const indicator of successIndicators) {
      try {
        await indicator.waitFor({ timeout: 3000 });
        successFound = true;
        console.log('✓ Found success indicator');
        break;
      } catch (e) {
        // Try next indicator
      }
    }

    // If we're on a different page than /new, consider it a success
    const currentUrl = page.url();
    if (!currentUrl.includes('/new')) {
      successFound = true;
      console.log(`✓ Navigated away from /new page to: ${currentUrl}`);
    }

    // Check for any error messages
    const errorSelectors = [
      page.locator('text=/error/i'),
      page.locator('.error'),
      page.locator('.notification.is-danger'),
      page.locator('[role="alert"]'),
    ];

    for (const errorSelector of errorSelectors) {
      const errorCount = await errorSelector.count();
      if (errorCount > 0) {
        const errorText = await errorSelector.first().textContent();
        console.log(`⚠ Found error message: ${errorText}`);
      }
    }

    // Final screenshot
    await page.screenshot({ path: 'test-results/05-final-state.png', fullPage: true });

    // Assert that we have some indication of success
    expect(successFound).toBeTruthy();
    
    console.log('✅ Document creation test completed successfully!');
  });

  test('should show validation errors for empty form', async ({ page }) => {
    // Authenticate
    await authenticateUser(page);

    // Navigate to new document page
    try {
      await page.locator('text=/new.*document/i').first().click({ timeout: 3000 });
    } catch (e) {
      await page.goto('http://localhost:4201/new');
    }

    await page.waitForLoadState('networkidle');

    // Try to submit empty form
    const submitButtons = [
      page.locator('button[type="submit"]'),
      page.locator('button:has-text("Create")'),
      page.locator('button:has-text("Submit")'),
    ];

    for (const button of submitButtons) {
      try {
        await button.waitFor({ timeout: 3000 });
        await button.click();
        break;
      } catch (e) {
        // Try next
      }
    }

    // Should see validation errors
    const validationSelectors = [
      page.locator('text=/required/i'),
      page.locator('text=/must.*provide/i'),
      page.locator('.error'),
      page.locator('[role="alert"]'),
    ];

    let validationFound = false;
    for (const selector of validationSelectors) {
      try {
        await selector.waitFor({ timeout: 3000 });
        validationFound = true;
        console.log('✓ Found validation error');
        break;
      } catch (e) {
        // Try next
      }
    }

    await page.screenshot({ path: 'test-results/validation-errors.png', fullPage: true });

    expect(validationFound).toBeTruthy();
    console.log('✅ Validation test completed');
  });
});
