# E2E Test Implementation Summary

**Date**: October 9, 2025  
**Task**: Define headless Playwright E2E tests for critical failures and template marker validation

## Files Created

### 1. `document-content-display-bug.spec.ts`
**Purpose**: Headless E2E test to validate the critical content display bug

**Test Cases**:
1. `CRITICAL: Content should display after save`
   - Tests that content displays in view mode after editing and saving
   - Validates content persists after page refresh
   - Expected to FAIL until bug is fixed
   
2. `CRITICAL: Content should be fetched from API after save`
   - Monitors network requests during edit/save flow
   - Validates PUT request saves content
   - Validates GET request reloads content after save
   - Expected to FAIL - no GET after PUT (root cause)

**Status**: ⚠️ Needs environment-specific adjustments for document setup

### 2. Updated `document-creation.spec.ts`
**Enhancement**: Added template marker validation

**New Validation Logic**:
- Scans page content after document creation
- Checks for template markers: `{{title}}`, `{{owner}}`, `{{created_date}}`, etc.
- Uses regex pattern `/\{\{[^}]+\}\}/g` to find all `{{...}}` patterns
- Validates actual metadata is present (not placeholders)
- Reports context around any found markers for debugging

**Example Assertions**:
```typescript
// Should NOT find template markers
expect(foundMarkers.length).toBe(0);

// Should find actual metadata
expect(pageContent?.includes(documentTitle)).toBe(true);
expect(pageContent?.includes('@hermes.local')).toBe(true);
```

### 3. `CRITICAL_BUG_TESTS.md`
**Purpose**: Comprehensive documentation for E2E tests

**Contents**:
- Test descriptions and purposes
- Expected behavior vs actual behavior
- How to run tests (headless mode)
- How to fix the bugs
- Screenshot documentation
- CI/CD integration examples

## Test Execution Commands

### Run All Tests (Headless)
```bash
cd tests/e2e-playwright
npx playwright test --reporter=line
```

### Run Specific Tests
```bash
# Critical bug test
npx playwright test document-content-display-bug.spec.ts --reporter=line

# Document creation with template validation
npx playwright test document-creation.spec.ts --reporter=line

# Run with pattern match
npx playwright test -g "template markers" --reporter=line
```

### CI/CD Usage
```bash
# Stop on first failure (recommended for CI)
npx playwright test --max-failures=1 --reporter=line

# Generate JSON report for parsing
npx playwright test --reporter=json > results.json

# HTML report for review
npx playwright test --reporter=html
npx playwright show-report
```

## Key Features

### 1. Headless by Default
- Tests run without opening browser windows
- Suitable for CI/CD pipelines
- Fast execution
- Terminal-friendly output

### 2. Comprehensive Logging
```typescript
console.log('✓ User test@hermes.local authenticated successfully');
console.log('✅ No template markers found');
console.error('❌ BUG CONFIRMED: Placeholder text visible');
```

### 3. Screenshot Evidence
- Captures screenshots at every step
- Saves failure screenshots with descriptive names
- Includes full page screenshots for context

### 4. Network Monitoring
```typescript
page.on('request', request => {
  if (url.includes('/api/v2/documents/') && url.includes('/content')) {
    console.log(`📡 API Call: ${request.method()} ${url}`);
  }
});
```

### 5. Flexible Element Finding
- Multiple selector strategies
- Fallback patterns for different UI states
- Clear error messages when elements not found

## Template Marker Validation Logic

The updated `document-creation.spec.ts` includes sophisticated template marker detection:

```typescript
// Common markers to check
const templateMarkers = [
  '{{title}}', '{{owner}}', '{{created_date}}',
  '{{stakeholders}}', '{{contributors}}', ...
];

// Regex pattern for any {{...}} template
const doubleCurlyPattern = /\{\{[^}]+\}\}/g;

// Scan page content
const pageContent = await page.textContent('body');
const matches = pageContent?.match(doubleCurlyPattern);

// Report findings with context
for (const marker of foundMarkers) {
  const index = pageContent?.indexOf(marker);
  const context = pageContent?.substring(index - 50, index + 100);
  console.error(`Context: ...${context}...`);
}

// Assert no markers remain
expect(foundMarkers.length).toBe(0);
```

## Expected Test Outcomes

### Current State (Before Bug Fixes)

| Test | Expected Result | Actual Result |
|------|----------------|---------------|
| document-content-display-bug.spec.ts | 🔴 FAIL | 🔴 FAIL (as designed) |
| document-creation.spec.ts (markers) | ✅ PASS or 🔴 FAIL | TBD - depends on template processing |

### After Bug Fixes

| Test | Expected Result |
|------|----------------|
| All tests | ✅ PASS |

## Integration with Testing Environment

These tests work with the `./testing` Docker Compose environment:

```bash
# Start backend services
cd testing
docker compose up -d

# Verify
docker compose ps  # hermes-server on port 8001

# Start frontend (if needed)
cd ../web
MIRAGE_ENABLED=false yarn ember server --port 4200 --proxy http://127.0.0.1:8001

# Run tests
cd ../tests/e2e-playwright
npx playwright test --reporter=line
```

## Troubleshooting

### Test Hangs
- Check that backend and frontend are running
- Verify Dex is accessible on port 5558
- Check for JavaScript errors in console

### Authentication Fails
- Verify Dex configuration
- Check test user exists: `test@hermes.local` / `password`
- Review Dex logs: `docker compose logs dex`

### Element Not Found
- Review screenshots in `test-results/`
- Check if UI changed
- Update selectors in test file

### Template Markers Present
- Check backend template processing logic
- Review document creation API response
- Verify frontmatter replacement in local workspace provider

## Next Steps

1. **Fix Content Display Bug**
   - Add content reload after save in document editor component
   - Run `document-content-display-bug.spec.ts` - should pass

2. **Validate Template Processing**
   - Run `document-creation.spec.ts`
   - If markers found, fix template replacement logic
   - Re-run until pass

3. **Add More E2E Tests**
   - Document metadata editing
   - Related resources management
   - Publishing workflow
   - Search functionality

## Benefits of These Tests

1. **Validates Critical Bugs**: Tests specifically target known issues
2. **Prevents Regressions**: Catches if bugs reappear
3. **Documents Expected Behavior**: Test code serves as specification
4. **CI/CD Ready**: Headless execution suitable for automation
5. **Evidence Based**: Screenshots provide visual proof of issues
6. **Network Aware**: Monitors API calls to identify root causes

## Commit Message Template

```
test: add E2E tests for critical content display bug and template markers

**Prompt Used**:
Define a headless playwright e2e test for the critical failure scenario.
Update the headless document creation e2e test so that it validates that
no template markers remain in the document when it is visible after creation.

**AI Implementation Summary**:
- Created document-content-display-bug.spec.ts with 2 test cases
  - Validates content displays after save (expected to fail)
  - Monitors network requests to identify missing GET after PUT
- Updated document-creation.spec.ts with template marker validation
  - Scans page content for {{...}} patterns
  - Reports found markers with context
  - Validates actual metadata present
- Created CRITICAL_BUG_TESTS.md documentation
  - Test descriptions and execution commands
  - Expected behaviors and troubleshooting
  - CI/CD integration examples

**Verification**:
cd tests/e2e-playwright
npx playwright test document-creation.spec.ts --reporter=line
npx playwright test document-content-display-bug.spec.ts --reporter=line
```
