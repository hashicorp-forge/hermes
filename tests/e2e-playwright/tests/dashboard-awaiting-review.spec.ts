import { test, expect, Page } from '@playwright/test';

/**
 * Dashboard 'Awaiting Review' E2E Test for Hermes
 * 
 * Tests the complete reviewer notification workflow:
 * 1. User A (test@hermes.local) creates an RFC document
 * 2. User A adds User B (admin@hermes.local) as a reviewer/approver
 * 3. User A publishes the document (status: In-Review)
 * 4. User B logs in and sees the document in "Awaiting your review" section
 * 5. User B sees the pip badge with count "1"
 * 6. User B can click on the document to view it
 * 
 * Test Environment:
 * - Backend API: http://localhost:8001 (testing environment)
 * - Frontend: http://localhost:4201 (testing environment)
 * - Dex OIDC: http://localhost:5558
 * - Test Users:
 *   - test@hermes.local / password (User A, document author)
 *   - admin@hermes.local / password (User B, reviewer)
 */

test.describe('Dashboard Awaiting Review Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies and storage before each test
    await page.context().clearCookies();
  });

  /**
   * Helper function to authenticate user via Dex
   */
  async function authenticateUser(page: Page, email: string, password: string = 'password') {
    console.log(`[Auth] Authenticating ${email}...`);
    
    // Start at the Hermes homepage
    await page.goto('/');

    // Should be redirected to Dex login page (port 5558 is the issuer/connector port for testing)
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

  /**
   * Helper function to create a new RFC document
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

  /**
   * Helper function to add a reviewer/approver to the document
   * Note: This function adds approvers during document creation.
   * Approvers must review and approve documents before they can be published.
   */
  async function addApprover(page: Page, approverEmail: string) {
    console.log(`[Document] Adding approver: ${approverEmail}`);

    // In the document creation form, look for "Contributors" section
    // The Contributors field is actually a searchbox within a button wrapper
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
      await searchInput.fill(approverEmail);
      console.log(`[Document] ✓ Typed approver email: ${approverEmail}`);
      
      await page.waitForTimeout(1500); // Wait for autocomplete dropdown

      // Try to select from dropdown or press Enter
      try {
        // Look for the email in the dropdown list
        const dropdownItem = page.locator(`li:has-text("${approverEmail}")`).first();
        await dropdownItem.waitFor({ timeout: 2000 });
        await dropdownItem.click();
        console.log('[Document] ✓ Selected approver from dropdown');
      } catch (e) {
        await page.keyboard.press('Enter');
        console.log('[Document] ✓ Added approver via Enter key');
      }

      await page.waitForTimeout(500);
      console.log(`[Document] ✓ Approver ${approverEmail} added`);
    } catch (error) {
      console.log('[Document] ⚠️ Could not add approver during creation, will try after document is created');
      throw error;
    }
  }

  /**
   * Helper function to publish/create the document
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

  test('dashboard shows awaiting review with pip badge', async ({ page }) => {
    const docTitle = `RFC Test ${Date.now()}`;
    const authorEmail = 'test@hermes.local';
    const reviewerEmail = 'admin@hermes.local';

    console.log('\n=== PHASE 1: User A creates document and adds User B as reviewer ===\n');

    // Step 1: User A logs in
    await authenticateUser(page, authorEmail);
    await page.screenshot({ path: 'test-results/dashboard-awaiting-review-01-user-a-authenticated.png', fullPage: true });

    // Step 2: User A creates a new RFC document
    await createRFCDocument(page, docTitle);
    await page.screenshot({ path: 'test-results/dashboard-awaiting-review-02-document-created.png', fullPage: true });

    // Step 3: User A adds User B as an approver
    try {
      await addApprover(page, reviewerEmail);
      await page.screenshot({ path: 'test-results/dashboard-awaiting-review-03-reviewer-added.png', fullPage: true });
    } catch (error) {
      console.error('[Test] ❌ Failed to add reviewer:', error);
      await page.screenshot({ path: 'test-results/dashboard-awaiting-review-03-reviewer-error.png', fullPage: true });
      throw error;
    }

    // Step 4: User A publishes the document
    try {
      await publishDocument(page);
      await page.screenshot({ path: 'test-results/dashboard-awaiting-review-04-document-published.png', fullPage: true });
    } catch (error) {
      console.error('[Test] ❌ Failed to publish document:', error);
      await page.screenshot({ path: 'test-results/dashboard-awaiting-review-04-publish-error.png', fullPage: true });
      throw error;
    }

    // Step 5: User A logs out
    await logoutUser(page);

    console.log('\n=== PHASE 2: User B views dashboard and sees document awaiting review ===\n');

    // Step 6: User B logs in
    await authenticateUser(page, reviewerEmail);
    await page.screenshot({ path: 'test-results/dashboard-awaiting-review-05-user-b-authenticated.png', fullPage: true });

    // Step 7: Navigate to dashboard (should be there by default, but ensure it)
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give time for dashboard data to load
    await page.screenshot({ path: 'test-results/dashboard-awaiting-review-06-dashboard-loaded.png', fullPage: true });

    console.log('[Test] 🔍 Checking for "Awaiting your review" section...');

    // Step 8: Verify "Awaiting your review" section exists
    const awaitingReviewSection = page.locator('text=Awaiting your review');
    try {
      await expect(awaitingReviewSection).toBeVisible({ timeout: 5000 });
      console.log('[Test] ✓ "Awaiting your review" section found');
    } catch (error) {
      console.error('[Test] ❌ "Awaiting your review" section not found');
      await page.screenshot({ path: 'test-results/dashboard-awaiting-review-07-section-not-found.png', fullPage: true });
      throw error;
    }

    // Step 9: Verify pip badge shows count
    console.log('[Test] 🔍 Checking for pip badge with count...');
    const pipBadge = page.locator('[data-test-docs-awaiting-review-count]');
    try {
      await expect(pipBadge).toBeVisible({ timeout: 3000 });
      const badgeText = await pipBadge.textContent();
      console.log(`[Test] ✓ Pip badge found with count: ${badgeText}`);
      
      // Verify count is at least 1 (could be more if other documents exist)
      const count = parseInt(badgeText || '0', 10);
      expect(count).toBeGreaterThanOrEqual(1);
      console.log(`[Test] ✓ Badge count verified (${count} >= 1)`);
    } catch (error) {
      console.error('[Test] ❌ Pip badge not found or invalid');
      await page.screenshot({ path: 'test-results/dashboard-awaiting-review-08-badge-error.png', fullPage: true });
      throw error;
    }

    // Step 10: Verify document appears in the list
    console.log(`[Test] 🔍 Looking for document "${docTitle}" in awaiting review list...`);
    const reviewItem = page.locator(`text=${docTitle}`);
    try {
      await expect(reviewItem).toBeVisible({ timeout: 3000 });
      console.log('[Test] ✓ Document found in awaiting review list');
      await page.screenshot({ path: 'test-results/dashboard-awaiting-review-09-document-in-list.png', fullPage: true });
    } catch (error) {
      console.error('[Test] ❌ Document not found in awaiting review list');
      await page.screenshot({ path: 'test-results/dashboard-awaiting-review-09-document-not-found.png', fullPage: true });
      throw error;
    }

    // Step 11: Click on the document and verify navigation
    console.log('[Test] 🖱️ Clicking on document to verify navigation...');
    await reviewItem.click();
    await page.waitForURL(/\/documents\/.+/, { timeout: 5000 });
    console.log('[Test] ✓ Successfully navigated to document');
    await page.screenshot({ path: 'test-results/dashboard-awaiting-review-10-document-opened.png', fullPage: true });

    console.log('\n=== TEST COMPLETED SUCCESSFULLY ===\n');
  });
});
