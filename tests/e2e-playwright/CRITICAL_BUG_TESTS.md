# E2E Test Documentation - Critical Bug Validation

## Overview

This directory contains Playwright E2E tests that validate critical functionality in the Hermes document management system, including tests specifically designed to validate the **critical content display bug** discovered on October 9, 2025.

## Test Files

### 1. `document-content-display-bug.spec.ts` - CRITICAL BUG TEST

**Purpose**: Validates the critical bug where document content does not display after save operation.

**Bug Description**:
- **Issue**: After editing and saving document content, the content view shows placeholder text instead of the saved content
- **Backend Status**: ✅ Content IS saved correctly to disk
- **Frontend Status**: ❌ Content is NOT displayed after save
- **Root Cause**: Content component not reloading after save operation

**Test Scenarios**:
1. **Content Display After Save** (`test('CRITICAL: Content should display after save')`)
   - Creates a new document
   - Edits content in textarea
   - Saves the document
   - **Validates**: Content should display (not placeholder text)
   - **Validates**: Content persists after page refresh
   - **Status**: 🔴 EXPECTED TO FAIL until bug is fixed

2. **API Call Validation** (`test('CRITICAL: Content should be fetched from API after save')`)
   - Monitors network requests during edit/save flow
   - **Validates**: PUT request is made to save content
   - **Validates**: GET request is made AFTER PUT to reload content
   - **Status**: 🔴 EXPECTED TO FAIL - No GET after PUT (root cause)

**Expected Test Failure**:
```
❌ BUG CONFIRMED: Placeholder text is still visible after save
❌ Expected: Content should display
❌ Actual: Placeholder text displayed
```

**How to Fix the Bug**:
1. Locate the save handler in the document editor component
2. After successful PUT `/api/v2/documents/{id}/content`, add:
   ```javascript
   // Reload content from backend
   await fetch(`/api/v2/documents/${docId}/content`)
   // Update component state with new content
   this.content = await response.text()
   ```
3. Ensure Markdown rendering pipeline executes on new content
4. Run test again - should pass ✅

### 2. `document-creation.spec.ts` - UPDATED WITH TEMPLATE VALIDATION

**Purpose**: Validates document creation flow and ensures template markers are properly replaced.

**Updates Made**:
- Added validation to check for template markers like `{{title}}`, `{{owner}}`, `{{created_date}}`
- Validates that placeholder text is replaced with actual values
- Checks for presence of real metadata (owner email, product area, etc.)

**Test Scenario**: `test('should create a new RFC document successfully and validate no template markers remain')`

**Validation Steps**:
1. Creates new RFC document with title and summary
2. Waits for document creation to complete
3. **Scans entire page content** for template markers
4. Checks for common patterns:
   - `{{title}}`, `{{owner}}`, `{{created_date}}`, etc.
   - Any `{{...}}` pattern
5. Validates actual metadata is present:
   - Document title visible
   - Owner email present
   - Product area shown
   - Document type (RFC) displayed

**Expected Behavior**:
- ✅ All template markers replaced with actual values
- ✅ Document metadata visible
- ✅ No `{{...}}` patterns remain

**Failure Examples**:
```
❌ Found template marker in document: {{owner}}
❌ Found template marker in document: {{created_date}}
❌ VALIDATION FAILED: Found 2 template marker(s) in document
```

### 3. `document-content-editor.spec.ts` - EXISTING TEST

**Purpose**: General document content editing tests for local workspace provider.

## Running the Tests

### Prerequisites

Ensure testing environment is running:
```bash
cd testing
docker compose up -d

# Verify services are running
docker compose ps

# Should show:
# - hermes-server (backend on port 8001)
# - testing-postgres-1
# - testing-meilisearch-1
# - hermes-dex (OIDC on port 5558)
```

Start frontend proxy (in separate terminal):
```bash
cd web
MIRAGE_ENABLED=false yarn ember server --port 4200 --proxy http://127.0.0.1:8001
```

### Run All Tests

```bash
cd tests/e2e-playwright

# Run all tests in headless mode
npx playwright test --reporter=line

# Run with verbose output
npx playwright test --reporter=list

# Generate HTML report
npx playwright test --reporter=html
```

### Run Specific Tests

```bash
# Run only the critical bug test
npx playwright test document-content-display-bug.spec.ts --reporter=line

# Run only the document creation test with template validation
npx playwright test document-creation.spec.ts --reporter=line

# Run specific test by name
npx playwright test -g "CRITICAL: Content should display after save"
```

### Run Tests with Max Failures

```bash
# Stop after first failure (recommended for CI)
npx playwright test --max-failures=1 --reporter=line
```

### Debugging

```bash
# Run in headed mode (opens browser window)
npx playwright test document-content-display-bug.spec.ts --headed

# Run in debug mode with Playwright Inspector
npx playwright test document-content-display-bug.spec.ts --debug

# View test report
npx playwright show-report
```

## Test Results and Screenshots

Tests automatically capture screenshots at key points:

### Critical Bug Test Screenshots:
- `bug-01-authenticated.png` - After successful login
- `bug-02-document-created.png` - After creating document
- `bug-03-editor-open.png` - Editor textarea visible
- `bug-04-content-entered.png` - Content typed in editor
- `bug-05-after-save.png` - After clicking Save button
- `bug-06-after-refresh.png` - After page refresh
- `bug-FAILED-placeholder-visible.png` - If bug detected (placeholder shown)
- `bug-FAILED-content-missing.png` - If content not displayed

### Document Creation Test Screenshots:
- `01-authenticated.png` - After login
- `02-new-document-page.png` - Template selection page
- `02b-document-form.png` - Document creation form
- `03-form-filled.png` - Form with data entered
- `04-after-creation.png` - After document created
- `05-final-state.png` - Final document state
- `06-template-markers-found.png` - If template markers detected

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run E2E Tests
  run: |
    cd tests/e2e-playwright
    npx playwright test --reporter=line --max-failures=1
  
- name: Upload Test Results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-results
    path: tests/e2e-playwright/test-results/
```

### Expected Test Status (Current)

| Test | Status | Notes |
|------|--------|-------|
| document-creation.spec.ts | ✅ Should PASS | Template validation may reveal issues |
| document-content-display-bug.spec.ts | 🔴 Expected to FAIL | Bug not yet fixed |
| document-content-editor.spec.ts | ⚠️ May PASS or FAIL | Depends on content display |

## Fixing the Tests

### When the Content Display Bug is Fixed

1. The `document-content-display-bug.spec.ts` tests should start passing
2. Look for these success indicators:
   ```
   ✅ TEST PASSED: Content displays correctly after save and refresh
   ✅ API test passed: Content reload API call detected after save
   ```

### When Template Markers are Fixed

1. The `document-creation.spec.ts` validation should pass
2. Look for:
   ```
   ✅ No template markers found - all placeholders replaced correctly
   ✅ Owner email found in document
   ✅ Product area (Engineering) found in document
   ```

## Contributing

When adding new E2E tests:

1. Use descriptive test names
2. Add extensive console logging for debugging
3. Capture screenshots at key points
4. Document expected behavior in comments
5. Use the existing authentication helper
6. Follow the headless testing pattern (no `--headed` in scripts)

## References

- [Playwright Documentation](https://playwright.dev/)
- [E2E Testing Guide](../../docs-internal/PLAYWRIGHT_E2E_AGENT_GUIDE.md)
- [Bug Report](../../docs-internal/E2E_PLAYWRIGHT_MCP_TESTING_SUMMARY_2025_10_09.md)
