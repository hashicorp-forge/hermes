import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test: Dashboard 'Awaiting Review' Workflow
 * 
 * Tests the complete workflow where:
 * 1. User A (admin@hermes.local) creates an RFC
 * 2. User A tags User B (test@hermes.local) as a reviewer
 * 3. User B sees the document in their 'Awaiting Review' section with a pip count badge
 * 
 * Related: TODO-011
 */

test.describe('Dashboard Awaiting Review', () => {
  
  async function loginAs(page: Page, email: string, password: string) {
    await page.goto('http://localhost:4200/');
    
    // Wait for redirect to Dex
    await page.waitForURL(/5558.*\/auth/, { timeout: 10000 });
    
    // Click on "Log in with Email" button
    await page.click('button:has-text("Log in with Email")');
    await page.waitForURL(/5558.*\/auth\/mock-password/, { timeout: 5000 });
    
    // Fill credentials
    await page.fill('input[name="login"]', email);
    await page.fill('input[name="password"]', password);
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Wait for redirect back to Hermes
    await page.waitForURL(/localhost:420[01]/, { timeout: 10000 });
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-test-dashboard]', { timeout: 10000 });
  }
  
  async function logout(page: Page) {
    // Click user menu
    await page.click('[data-test-user-menu-trigger]');
    
    // Click sign out
    await page.click('[data-test-sign-out]');
    
    // Wait for redirect to login
    await page.waitForURL(/5558.*\/auth/,{ timeout: 10000 });
  }
  
  async function createDocument(page: Page, docType: string, title: string) {
    // Navigate to new document page
    await page.goto(`http://localhost:4200/new/doc?docType=${docType}`);
    
    // Fill in title
    await page.fill('input[name="title"]', title);
    
    // Select product/area (Engineering)
    await page.click('[data-test-product-select-trigger]');
    await page.click('[data-test-product-select-option="ENG"]');
    
    // Create draft
    await page.click('[data-test-create-draft]');
    
    // Wait for navigation to document page
    await page.waitForURL(/\/document\//, { timeout: 10000 });
  }
  
  async function addReviewer(page: Page, reviewerEmail: string) {
    // Click on Approvers button
    await page.click('[data-test-sidebar-approvers-button]');
    
    // Search for reviewer
    await page.fill('[data-test-people-select-input]', reviewerEmail);
    
    // Wait for search results and click first result
    await page.waitForSelector(`[data-test-people-select-option="${reviewerEmail}"]`, { timeout: 5000 });
    await page.click(`[data-test-people-select-option="${reviewerEmail}"]`);
    
    // Close the dropdown
    await page.keyboard.press('Escape');
  }
  
  async function publishDocument(page: Page) {
    // Click publish for review button
    await page.click('[data-test-publish-for-review]');
    
    // Confirm in modal
    await page.click('[data-test-confirm-publish]');
    
    // Wait for status to change to "In-Review"
    await page.waitForSelector('[data-test-doc-status="In-Review"]', { timeout: 10000 });
  }

  test('dashboard shows awaiting review with pip badge', async ({ page }) => {
    // Test configuration
    const docTitle = `RFC Test ${Date.now()}`;
    const userA = { email: 'admin@hermes.local', password: 'password' };
    const userB = { email: 'test@hermes.local', password: 'password' };
    
    console.log(`[Test] Creating document "${docTitle}" as User A (${userA.email})`);
    
    // STEP 1: User A logs in
    console.log('[Test] Step 1: User A logs in');
    await loginAs(page, userA.email, userA.password);
    
    // STEP 2: User A creates an RFC
    console.log('[Test] Step 2: User A creates an RFC');
    await createDocument(page, 'RFC', docTitle);
    
    // STEP 3: User A adds User B as a reviewer
    console.log(`[Test] Step 3: User A adds User B (${userB.email}) as reviewer`);
    await addReviewer(page, userB.email);
    
    // STEP 4: User A publishes the document for review
    console.log('[Test] Step 4: User A publishes document for review');
    await publishDocument(page);
    
    // STEP 5: User A logs out
    console.log('[Test] Step 5: User A logs out');
    await logout(page);
    
    // STEP 6: User B logs in
    console.log(`[Test] Step 6: User B (${userB.email}) logs in`);
    await loginAs(page, userB.email, userB.password);
    
    // STEP 7: Navigate to dashboard
    console.log('[Test] Step 7: Navigate to dashboard');
    await page.goto('http://localhost:4200/dashboard');
    await page.waitForSelector('[data-test-dashboard]', { timeout: 10000 });
    
    // STEP 8: Verify "Awaiting Review" section exists
    console.log('[Test] Step 8: Verify "Awaiting Review" section exists');
    const awaitingReviewSection = page.locator('[data-test-awaiting-review]');
    await expect(awaitingReviewSection).toBeVisible();
    
    // STEP 9: Verify pip badge shows count >= 1
    console.log('[Test] Step 9: Verify pip badge shows count');
    const pipBadge = page.locator('[data-test-docs-awaiting-review-count]');
    await expect(pipBadge).toBeVisible();
    const badgeText = await pipBadge.textContent();
    expect(parseInt(badgeText || '0')).toBeGreaterThanOrEqual(1);
    console.log(`[Test] ✓ Pip badge shows: ${badgeText}`);
    
    // STEP 10: Verify document appears in list
    console.log('[Test] Step 10: Verify document appears in awaiting review list');
    const reviewItem = page.locator(`[data-test-review-item]:has-text("${docTitle}")`);
    await expect(reviewItem).toBeVisible();
    console.log(`[Test] ✓ Document "${docTitle}" found in awaiting review list`);
    
    // STEP 11: Click on document and verify navigation
    console.log('[Test] Step 11: Click document and verify navigation');
    await reviewItem.click();
    await expect(page).toHaveURL(/\/document\/RFC-\d+/);
    console.log('[Test] ✓ Successfully navigated to document');
    
    console.log('[Test] ✅ All steps passed!');
  });
  
  test('empty state when no reviews', async ({ page }) => {
    // Login as a user with no pending reviews
    await loginAs(page, 'demo@hermes.local', 'password');
    
    await page.goto('http://localhost:4200/dashboard');
    await page.waitForSelector('[data-test-dashboard]', { timeout: 10000 });
    
    // Verify "Awaiting Review" section either doesn't exist or shows 0
    const pipBadge = page.locator('[data-test-docs-awaiting-review-count]');
    if (await pipBadge.isVisible()) {
      const badgeText = await pipBadge.textContent();
      expect(badgeText).toBe('0');
    } else {
      // Section not shown when no reviews - this is also acceptable
      console.log('[Test] ✓ No "Awaiting Review" section shown (0 reviews)');
    }
  });
});
