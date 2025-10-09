import { test, expect, Page } from '@playwright/test';

/**
 * CRITICAL BUG TEST: Document Content Not Displayed After Save
 * 
 * This test validates the CRITICAL bug discovered on 2025-10-09:
 * After editing and saving document content, the content is not displayed
 * in the view mode, even though the backend successfully saves the content.
 * 
 * Expected Behavior:
 * 1. User edits document content
 * 2. User clicks "Save"
 * 3. Content view should display the newly saved content (Markdown rendered)
 * 4. Page refresh should still show the saved content
 * 
 * Actual Behavior (BUG):
 * 1. User edits document content
 * 2. User clicks "Save"
 * 3. Content view shows placeholder text: "Click 'Edit' to modify this document's content."
 * 4. Page refresh still shows placeholder text
 * 5. Backend logs confirm content WAS saved successfully
 * 
 * Root Cause:
 * The document content component is not reloading/refreshing after save operation.
 * The component needs to fetch updated content after successful save.
 * 
 * Test Environment:
 * - Backend API: http://localhost:8001 (testing environment)
 * - Frontend: http://localhost:4200 (Ember dev server proxy)
 * - Dex OIDC: http://localhost:5558
 * - Test User: test@hermes.local / password
 * - Workspace: Local filesystem provider
 */

test.describe('CRITICAL BUG: Document Content Display After Save', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies and storage before each test
    await page.context().clearCookies();
  });

  /**
   * Helper function to authenticate user via Dex
   */
  async function authenticateUser(page: Page, email: string = 'test@hermes.local', password: string = 'password') {
    // Start at the Hermes homepage
    await page.goto('http://localhost:4200/');

    // Should be redirected to Dex login page (port 5558 for testing)
    await page.waitForURL(/5558.*\/auth/, { timeout: 10000 });
    
    // Verify we're on the Dex login page
    await expect(page.locator('text=Log in to dex')).toBeVisible({ timeout: 5000 });

    // Click on "Log in with Email" to use local password database
    await page.click('button:has-text("Log in with Email")');
    await page.waitForURL(/5558.*\/auth\/local/, { timeout: 5000 });

    // Fill in credentials
    await page.fill('input[name="login"]', email);
    await page.fill('input[name="password"]', password);

    // Submit the login form
    await page.click('button[type="submit"]');

    // Should be redirected back to Hermes after successful authentication
    // Accept either port 4200 (native) or 4201 (docker)
    await page.waitForURL(/localhost:420[01]/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    console.log(`✓ User ${email} authenticated successfully`);
  }

  /**
   * Helper function to create a new RFC document
   */
  async function createNewRFC(page: Page, title: string): Promise<string> {
    // Navigate to new document page (use relative URL to work with current base)
    await page.goto('/new');
    await page.waitForLoadState('networkidle');

    // Click RFC template
    await page.click('a[href*="new/doc?docType=RFC"]');
    await page.waitForURL(/new\/doc/, { timeout: 5000 });
    await page.waitForLoadState('networkidle');

    // Fill in title
    await page.fill('input[name="title"]', title);
    
    // Select product area (required field)
    await page.click('button:has-text("Select a product/area")');
    await page.waitForTimeout(500);
    await page.click('text=Engineering');
    await page.waitForTimeout(500);

    // Create draft
    await page.click('button:has-text("Create Draft")');
    
    // Wait for navigation to document page
    await page.waitForURL(/\/document\//, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Extract document ID from URL
    const url = page.url();
    const match = url.match(/\/document\/([^/?]+)/);
    const docId = match ? match[1] : '';
    
    console.log(`✓ Created document: ${title} (ID: ${docId})`);
    return docId;
  }

  test('CRITICAL: Content should display after save', async ({ page }) => {
    // Step 1: Authenticate
    await authenticateUser(page);
    await page.screenshot({ path: 'test-results/bug-01-authenticated.png', fullPage: true });

    // Step 2: Navigate to an existing document instead of creating one
    // Use the document ID we know exists from the testing summary
    const docId = 'e92a95903b8fcfd3ac01f2d858741a18';
    await page.goto(`/document/${docId}?draft=true`);
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: 'test-results/bug-02-document-loaded.png', fullPage: true });

    // Step 3: Verify we're on the document page and can see the Edit button
    // Try multiple selectors for the Edit button
    let editButton = page.locator('button:has-text("Edit")').first();
    let buttonVisible = await editButton.isVisible().catch(() => false);
    
    if (!buttonVisible) {
      // Try alternative selectors
      editButton = page.locator('button', { hasText: 'Edit' }).first();
      buttonVisible = await editButton.isVisible().catch(() => false);
    }
    
    if (!buttonVisible) {
      // Try as a link
      editButton = page.locator('a:has-text("Edit")').first();
      buttonVisible = await editButton.isVisible().catch(() => false);
    }
    
    if (!buttonVisible) {
      console.log('⚠ Edit button not found, attempting to find any edit UI element...');
      await page.screenshot({ path: 'test-results/bug-02b-edit-button-not-found.png', fullPage: true });
      // Look for any element with "edit" text
      const editElements = page.locator('text=/edit/i');
      const count = await editElements.count();
      console.log(`Found ${count} elements containing 'edit'`);
      if (count > 0) {
        editButton = editElements.first();
      } else {
        throw new Error('No Edit button or link found on page');
      }
    }
    
    console.log('✓ Edit button found');

    // Step 4: Click Edit button to open editor
    await editButton.click();
    await page.waitForTimeout(1000); // Wait for editor to open
    
    // Verify editor opened - should see Save button and textarea
    const saveButton = page.locator('button:has-text("Save")');
    await expect(saveButton).toBeVisible({ timeout: 5000 });
    
    const contentTextarea = page.locator('textarea[placeholder*="content" i]');
    await expect(contentTextarea).toBeVisible({ timeout: 5000 });
    console.log('✓ Editor opened with textarea and Save button');
    
    await page.screenshot({ path: 'test-results/bug-03-editor-open.png', fullPage: true });

    // Step 5: Enter test content in the textarea
    const testContent = `# Test Document for Bug Validation

## Overview
This document tests the critical bug where content does not display after save.

## Test Information
- **Date**: ${new Date().toISOString()}
- **Bug ID**: CRITICAL-CONTENT-DISPLAY
- **Document ID**: ${docId}

## Expected Behavior
After clicking Save, this content should be visible in the view mode.

## Test Steps
1. Edit content in textarea
2. Click Save button
3. Verify content displays in view mode
4. Refresh page
5. Verify content still displays

## Success Criteria
- Content displays after save
- Content persists after page refresh
- No placeholder text shown`;

    await contentTextarea.clear();
    await contentTextarea.fill(testContent);
    console.log('✓ Test content entered in editor');
    
    await page.screenshot({ path: 'test-results/bug-04-content-entered.png', fullPage: true });

    // Step 6: Click Save button
    await saveButton.click();
    console.log('✓ Save button clicked');
    
    // Wait for save to complete - look for success message or editor to close
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/bug-05-after-save.png', fullPage: true });

    // Step 7: CRITICAL TEST - Verify content is displayed (not placeholder text)
    // Wait a bit for content to load
    await page.waitForTimeout(1000);

    // Check if placeholder text is visible (BUG INDICATOR)
    const placeholderText = page.locator('text=Click "Edit" to modify this document');
    const hasPlaceholder = await placeholderText.isVisible().catch(() => false);

    // Check if any of our test content is visible
    const contentHeading = page.locator('h1:has-text("Test Document for Bug Validation")');
    const hasContent = await contentHeading.isVisible().catch(() => false);

    console.log(`Placeholder visible: ${hasPlaceholder}`);
    console.log(`Content visible: ${hasContent}`);

    // ASSERTION: Content should be visible, placeholder should NOT be visible
    if (hasPlaceholder) {
      console.error('❌ BUG CONFIRMED: Placeholder text is still visible after save');
      console.error('❌ Expected: Content should display');
      console.error('❌ Actual: Placeholder text displayed');
      await page.screenshot({ path: 'test-results/bug-FAILED-placeholder-visible.png', fullPage: true });
    }

    if (!hasContent) {
      console.error('❌ BUG CONFIRMED: Saved content is not visible');
      console.error('❌ Expected: "Test Document for Bug Validation" heading should be visible');
      console.error('❌ Actual: Content not found in view');
      await page.screenshot({ path: 'test-results/bug-FAILED-content-missing.png', fullPage: true });
    }

    // This test will FAIL until the bug is fixed
    expect(hasPlaceholder).toBe(false);
    expect(hasContent).toBe(true);

    // Step 8: Refresh page and verify content still displays
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/bug-06-after-refresh.png', fullPage: true });

    // Check again after refresh
    const hasPlaceholderAfterRefresh = await placeholderText.isVisible().catch(() => false);
    const hasContentAfterRefresh = await contentHeading.isVisible().catch(() => false);

    console.log(`After refresh - Placeholder visible: ${hasPlaceholderAfterRefresh}`);
    console.log(`After refresh - Content visible: ${hasContentAfterRefresh}`);

    expect(hasPlaceholderAfterRefresh).toBe(false);
    expect(hasContentAfterRefresh).toBe(true);

    console.log('✅ TEST PASSED: Content displays correctly after save and refresh');
  });

  test('CRITICAL: Content should be fetched from API after save', async ({ page }) => {
    // Monitor network requests to verify API calls
    const apiCalls: string[] = [];
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/v2/documents/') && url.includes('/content')) {
        apiCalls.push(`${request.method()} ${url}`);
        console.log(`📡 API Call: ${request.method()} ${url}`);
      }
    });

    // Step 1: Authenticate
    await authenticateUser(page);

    // Step 2: Create a new document
    const timestamp = Date.now();
    const documentTitle = `API Test RFC ${timestamp}`;
    const docId = await createNewRFC(page, documentTitle);

    // Clear API call log after creation
    apiCalls.length = 0;

    // Step 3: Edit and save
    await page.click('button:has-text("Edit")');
    await page.waitForTimeout(1000);

    const contentTextarea = page.locator('textarea[placeholder*="content" i]');
    await contentTextarea.clear();
    await contentTextarea.fill('# API Test Content\n\nThis tests API call behavior.');

    // Record API calls before save
    const callsBeforeSave = [...apiCalls];
    
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(2000);

    // Record API calls after save
    const callsAfterSave = [...apiCalls];

    console.log('API calls before save:', callsBeforeSave);
    console.log('API calls after save:', callsAfterSave);

    // CRITICAL: After save, there should be a PUT to save content
    const hasPutRequest = callsAfterSave.some(call => 
      call.startsWith('PUT') && call.includes(docId) && call.includes('/content')
    );
    expect(hasPutRequest).toBe(true);
    console.log('✓ PUT request to save content detected');

    // CRITICAL BUG: After save, there should be a GET to reload content
    // This is likely MISSING, causing the bug
    const hasGetAfterPut = callsAfterSave.some((call, index) => {
      const isPut = call.startsWith('PUT');
      if (isPut && index < callsAfterSave.length - 1) {
        // Check if next call is a GET
        return callsAfterSave[index + 1].startsWith('GET');
      }
      return false;
    });

    if (!hasGetAfterPut) {
      console.error('❌ BUG ROOT CAUSE: No GET request after PUT to reload content');
      console.error('❌ The frontend should call GET /api/v2/documents/{id}/content after successful save');
    }

    // This will FAIL until bug is fixed
    expect(hasGetAfterPut).toBe(true);
    
    console.log('✅ API test passed: Content reload API call detected after save');
  });
});
