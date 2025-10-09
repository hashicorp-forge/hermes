import { test, expect, Page } from '@playwright/test';

/**
 * Dashboard 'Recently Viewed' E2E Test for Hermes
 * 
 * Tests the complete recently viewed workflow:
 * 1. User creates 5 RFC documents
 * 2. User views documents in specific order (A → B → C → D → E)
 * 3. Dashboard shows recently viewed in reverse order (E, D, C, B, A)
 * 4. User re-views first document (Doc A)
 * 5. Dashboard now shows Doc A at the top
 * 
 * Test Environment:
 * - Backend API: http://localhost:8001 (testing environment)
 * - Frontend: http://localhost:4201 (testing environment)
 * - Dex OIDC: http://localhost:5558
 * - Test User: test@hermes.local / password
 */

test.describe('Dashboard Recently Viewed Workflow', () => {
  // Increase timeout for this test suite (creates 5 docs + views them)
  test.setTimeout(120000); // 2 minutes

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
    await page.goto('http://localhost:4201/');

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
   * Helper function to create a new RFC document
   */
  async function createRFCDocument(page: Page, title: string, summary: string = 'Test RFC Summary') {
    console.log(`[Document] Creating RFC: ${title}`);
    
    // Navigate to new document page
    await page.goto('http://localhost:4201/new', { waitUntil: 'domcontentloaded' });

    // Click on RFC template by clicking the link that navigates to /new/doc?docType=RFC
    const rfcLink = page.getByRole('link', { name: /Request for Comments RFC/ });
    await rfcLink.waitFor({ state: 'visible', timeout: 5000 });
    
    // Click and wait for navigation
    await Promise.all([
      page.waitForURL(/\/new\/doc\?docType=RFC/, { timeout: 10000 }),
      rfcLink.click()
    ]);
    console.log('[Document] ✓ Navigated to RFC creation page');

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
   * Helper function to publish/create the document
   * Returns the document URL for later access
   */
  async function publishDocument(page: Page): Promise<string> {
    console.log('[Document] Publishing document...');

    // The button text is "Create draft in Google Drive" or "Create draft"
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
    await page.waitForURL(/\/(document|documents|drafts)\/.+/, { timeout: 10000 });
    
    // Get the document URL
    const docUrl = page.url();
    console.log(`[Document] ✓ Document published successfully: ${docUrl}`);
    
    // Wait for page to be usable
    await page.waitForTimeout(1000);
    
    return docUrl;
  }

  /**
   * Helper function to view a document by navigating directly to its URL
   */
  async function viewDocument(page: Page, docUrl: string, title: string) {
    console.log(`[Document] Viewing document: ${title}`);
    
    // Navigate directly to the document URL
    await page.goto(docUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    // Wait for the document content to be visible (indicates page loaded)
    try {
      await page.waitForSelector('h1, [data-test-document-title]', { timeout: 5000 });
    } catch (e) {
      console.log('[Document] ⚠️ Document title not found, continuing anyway');
    }
    
    // Give the backend time to track the view
    await page.waitForTimeout(1000);
    
    console.log(`[Document] ✓ Viewed document: ${title}`);
  }

  test('dashboard shows recently viewed in correct order', async ({ page }) => {
    const userEmail = 'test@hermes.local';
    const timestamp = Date.now();
    const docTitles: string[] = [];
    const docUrls: string[] = [];

    console.log('\n=== PHASE 1: Authenticate and create 5 documents ===\n');

    // Step 1: Authenticate
    await authenticateUser(page, userEmail);
    await page.screenshot({ 
      path: 'test-results/dashboard-recently-viewed-01-authenticated.png', 
      fullPage: true 
    });

    // Step 2: Create 5 documents
    for (let i = 1; i <= 5; i++) {
      const title = `RFC Viewed Test ${i} ${timestamp}`;
      await createRFCDocument(page, title, `Test summary for document ${i}`);
      const docUrl = await publishDocument(page);
      docTitles.push(title);
      docUrls.push(docUrl);
      console.log(`[Test] ✓ Created document ${i}/5: ${title}`);
      await page.screenshot({ 
        path: `test-results/dashboard-recently-viewed-02-created-doc-${i}.png`, 
        fullPage: true 
      });
      
      // Wait a bit between document creations
      await page.waitForTimeout(500);
    }

    console.log('\n=== PHASE 2: View documents in order A → B → C → D → E ===\n');

    // Step 3: View documents in specific order
    for (let i = 0; i < docTitles.length; i++) {
      await viewDocument(page, docUrls[i], docTitles[i]);
      console.log(`[Test] ✓ Viewed document ${i + 1}/5: ${docTitles[i]}`);
      // Wait between views to ensure distinct timestamps
      await page.waitForTimeout(1000);
    }

    console.log('\n=== PHASE 3: Verify Recently Viewed shows reverse order ===\n');

    // Step 4: Navigate to dashboard and check recently viewed
    await page.goto('http://localhost:4201/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give time for recently viewed to load

    // Take a screenshot of the dashboard
    await page.screenshot({ 
      path: 'test-results/dashboard-recently-viewed-03-after-views.png', 
      fullPage: true 
    });

    // Verify Recently Viewed sidebar is visible
    const recentlyViewedContainer = page.locator('[data-test-recently-viewed]');
    await expect(recentlyViewedContainer).toBeVisible({ timeout: 5000 });
    console.log('[Test] ✓ Recently Viewed sidebar is visible');

    // Get all recently viewed items
    const viewedItems = page.locator('[data-test-recently-viewed-item]');
    const itemCount = await viewedItems.count();
    console.log(`[Test] Found ${itemCount} recently viewed items`);

    // We should have at least 5 items (might have more from previous tests)
    expect(itemCount).toBeGreaterThanOrEqual(5);

    // Verify the order - most recent should be first (document E)
    // The recently viewed list shows docs in reverse order of viewing
    console.log('[Test] Verifying document order in Recently Viewed...');
    
    // Check first item is the last document we viewed (Doc E)
    const firstItem = viewedItems.nth(0);
    const firstItemTitle = await firstItem.locator('[data-test-recently-viewed-item-title]').textContent();
    console.log(`[Test] First item title: ${firstItemTitle}`);
    expect(firstItemTitle).toContain(docTitles[4]); // Doc E
    console.log('[Test] ✓ First item is Doc E (last viewed)');

    // Check second item is Doc D
    const secondItem = viewedItems.nth(1);
    const secondItemTitle = await secondItem.locator('[data-test-recently-viewed-item-title]').textContent();
    console.log(`[Test] Second item title: ${secondItemTitle}`);
    expect(secondItemTitle).toContain(docTitles[3]); // Doc D
    console.log('[Test] ✓ Second item is Doc D');

    // Check third item is Doc C
    const thirdItem = viewedItems.nth(2);
    const thirdItemTitle = await thirdItem.locator('[data-test-recently-viewed-item-title]').textContent();
    console.log(`[Test] Third item title: ${thirdItemTitle}`);
    expect(thirdItemTitle).toContain(docTitles[2]); // Doc C
    console.log('[Test] ✓ Third item is Doc C');

    console.log('\n=== PHASE 4: Re-view first document and verify it moves to top ===\n');

    // Step 5: Re-view first document (Doc A)
    await viewDocument(page, docUrls[0], docTitles[0]);
    console.log(`[Test] ✓ Re-viewed first document: ${docTitles[0]}`);
    await page.waitForTimeout(1000);

    // Step 6: Go back to dashboard and verify Doc A is now at top
    await page.goto('http://localhost:4201/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take a screenshot after re-viewing
    await page.screenshot({ 
      path: 'test-results/dashboard-recently-viewed-04-after-review.png', 
      fullPage: true 
    });

    // Verify Doc A is now at the top
    const updatedFirstItem = viewedItems.nth(0);
    const updatedFirstItemTitle = await updatedFirstItem.locator('[data-test-recently-viewed-item-title]').textContent();
    console.log(`[Test] First item after re-view: ${updatedFirstItemTitle}`);
    expect(updatedFirstItemTitle).toContain(docTitles[0]); // Doc A
    console.log('[Test] ✓ Doc A moved to top of Recently Viewed after re-viewing');

    console.log('\n=== TEST PASSED: Recently Viewed feature works correctly ===\n');
  });
});
