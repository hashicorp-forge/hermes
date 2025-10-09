import { test, expect } from '@playwright/test';

/**
 * Authentication Flow Test for Hermes with Dex OIDC
 * 
 * Tests the complete authentication flow:
 * 1. User visits Hermes app
 * 2. Gets redirected to Dex login page
 * 3. Logs in with test credentials (test@hermes.local)
 * 4. Gets redirected back to Hermes
 * 5. Successfully authenticated and can access the app
 */

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies and storage before each test
    await page.context().clearCookies();
  });

  test('should successfully authenticate with Dex using test@hermes.local', async ({ page }) => {
    // Start at the Hermes homepage
    await page.goto('/');

    // Should be redirected to Dex login page (port 5558 is the issuer/connector port for testing)
    await page.waitForURL(/5558.*\/auth/, { timeout: 10000 });
    
    // Verify we're on the Dex login page
    await expect(page).toHaveTitle(/dex/i);
    
    // Look for the Dex login heading
    await expect(page.locator('text=Log in to dex')).toBeVisible();

    // Click on the first "Log in with Email" button (mock-password connector)
    await page.click('button:has-text("Log in with Email")');
    
    // Wait for the password form
    await page.waitForURL(/5558.*\/auth\/mock-password/, { timeout: 5000 });

    // Fill in test credentials
    await page.fill('input[name="login"]', 'test@hermes.local');
    await page.fill('input[name="password"]', 'password');

    // Submit the login form
    await page.click('button[type="submit"]');

    // Should be redirected back to Hermes after successful authentication
    await page.waitForURL(/localhost:420[01]/, { timeout: 10000 });

    // Verify we're authenticated - check for user menu or authenticated UI elements
    // The exact selector depends on Hermes UI, but typically there's a user menu/avatar
    await expect(page).toHaveURL(/localhost:420[01]/);
    
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');

    // Check for common authenticated UI elements
    // This will vary based on Hermes UI, adjust as needed
    const authenticatedIndicators = [
      page.locator('[data-test-user-menu]'),
      page.locator('[data-test-authenticated]'),
      page.locator('text=/logout|sign out/i'),
      page.locator('[aria-label*="user"]'),
    ];

    // At least one authenticated indicator should be visible
    let foundIndicator = false;
    for (const indicator of authenticatedIndicators) {
      try {
        await indicator.waitFor({ timeout: 2000 });
        foundIndicator = true;
        break;
      } catch (e) {
        // Try next indicator
      }
    }

    // If no specific indicator found, at least verify we're not on login page anymore
    if (!foundIndicator) {
      await expect(page).not.toHaveURL(/auth|login|dex/);
    }

    // Take a screenshot for visual verification
    await page.screenshot({ path: 'test-results/authenticated-state.png', fullPage: true });

    console.log('✓ Authentication flow completed successfully');
  });

  test('should fail authentication with invalid credentials', async ({ page }) => {
    // Start at the Hermes homepage
    await page.goto('/');

    // Wait for redirect to Dex (port 5558 is the issuer/connector port for testing)
    await page.waitForURL(/5558.*\/auth/, { timeout: 10000 });

    // Click on the first "Log in with Email" button (mock-password connector)
    await page.click('button:has-text("Log in with Email")');
    
    // Wait for the password form
    await page.waitForURL(/5558.*\/auth\/mock-password/, { timeout: 5000 });

    // Try to login with invalid credentials
    await page.fill('input[name="login"]', 'invalid@hermes.local');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should see an error message on the Dex page
    await expect(page.locator('text=/invalid|error|failed/i')).toBeVisible({ timeout: 5000 });

    console.log('✓ Invalid credentials properly rejected');
  });

  test('should authenticate with admin user', async ({ page }) => {
    // Start at the Hermes homepage
    await page.goto('/');

    // Wait for redirect to Dex (port 5558 is the connector port)
    await page.waitForURL(/5558.*\/auth/, { timeout: 10000 });

    // Click on the first "Log in with Email" button (mock-password connector)
    await page.click('button:has-text("Log in with Email")');
    
    // Wait for the password form
    await page.waitForURL(/5558.*\/auth\/mock-password/, { timeout: 5000 });

    // Login with admin credentials
    await page.fill('input[name="login"]', 'admin@hermes.local');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Should be redirected back to Hermes
    await page.waitForURL(/localhost:420[01]/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Verify authentication
    await expect(page).not.toHaveURL(/auth|login|dex/);

    console.log('✓ Admin authentication completed successfully');
  });
});
