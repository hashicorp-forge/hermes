---
id: MEMO-058
title: Playwright E2E Agent Guide
date: 2025-10-09
type: Guide
status: Final
tags: [playwright, e2e-testing, automation, testing, debugging]
related:
  - MEMO-017
---

# Playwright E2E Testing: Agent Guide

## Overview

Hermes has two approaches to E2E testing:
1. **playwright-mcp** (Browser MCP): Interactive browser automation via MCP protocol - **PREFERRED for agents**
2. **Playwright Codified Tests**: Headless test automation for CI/CD - Use for validation and CI

## ⚡ Quick Decision Tree

```
Need to validate E2E functionality?
├─ Interactive exploration/debugging? → Use playwright-mcp (mcp_microsoft_pla_browser_*)
├─ Validate existing test suite? → Use headless Playwright (npx playwright test)
└─ Create new E2E test? → Write Playwright test file, validate with headless mode
```

## 🎯 When to Use Each Approach

### Use playwright-mcp (PREFERRED for agents) when:
- ✅ Exploring UI behavior interactively
- ✅ Debugging authentication flows
- ✅ Validating specific user interactions
- ✅ Need to inspect page state/DOM
- ✅ Creating new test scenarios
- ✅ Investigating test failures
- ✅ Need screenshots/snapshots for documentation

### Use Playwright Codified Tests when:
- ✅ Running full test suite for validation
- ✅ Preparing for CI/CD integration
- ✅ Need repeatable, deterministic test results
- ✅ Validating multiple scenarios in batch
- ✅ Checking for regressions after changes
- ✅ Need structured test reports (HTML/JSON)

## 🚀 Running Playwright Tests as an Agent

### Prerequisites Check

Before running Playwright tests, verify the environment is ready:

```bash
# 1. Check if backend is running
curl -s http://localhost:8000/health || echo "Backend not running on 8000"

# 2. Check if frontend is running  
curl -s http://localhost:4200/ | head -20 || echo "Frontend not running on 4200"

# 3. Check if Dex is running
curl -s http://localhost:5556/dex/.well-known/openid-configuration | jq '.issuer' || echo "Dex not running"
```

### Headless Execution (Agent-Friendly)

**Command Pattern**: Use `--reporter=line` for clear, parseable output

```bash
cd /Users/jrepp/hc/hermes/tests/e2e-playwright

# Run specific test file (recommended for agents)
npx playwright test document-content-editor.spec.ts \
  --reporter=line \
  --max-failures=1

# Run all tests
npx playwright test --reporter=line

# Run with JSON output for parsing
npx playwright test --reporter=json > results.json

# Run specific test by name (use grep)
npx playwright test -g "should edit document content" --reporter=line
```

**Key Options**:
- `--reporter=line`: Single-line output per test (clean, agent-friendly)
- `--reporter=list`: Detailed output with steps (more verbose)
- `--reporter=json`: Machine-readable output for parsing
- `--max-failures=1`: Stop after first failure (fast feedback)
- `--headed`: Show browser (for debugging only, blocks terminal)
- `-g <pattern>`: Grep filter for test names
- `--timeout=60000`: Set test timeout (default: 30000ms)

**Exit Codes**:
- `0`: All tests passed
- `1`: One or more tests failed
- `130`: Interrupted (Ctrl+C)

### Reading Test Results

**Line Reporter Output Pattern**:
```
Running 3 tests using 1 worker
[chromium] › tests/document-content-editor.spec.ts:168:7 › should edit... (5.2s)
  1 passed
  2 did not run
```

**Failure Output Pattern**:
```
  1) [chromium] › tests/file.spec.ts:10:7 › Test Name
     Error: expect(locator).toBeVisible()
     Expected: visible
     Timeout: 5000ms
     
     attachment #1: screenshot (...png)
     attachment #2: trace (...zip)
     
  1 failed
```

**Interpreting Results**:
- ✅ **"X passed"**: Tests successful, functionality validated
- ❌ **"X failed"**: Tests failed, check error details and attachments
- ⚠️ **"X did not run"**: Tests skipped (due to --max-failures or dependencies)
- 🔍 **"attachment #1: screenshot"**: Visual evidence of failure state
- 🔍 **"attachment #2: trace"**: Detailed execution trace for debugging

### Handling Test Failures

When tests fail, follow this workflow:

1. **Read the error message** (usually starts with "Error:")
2. **Check the test file and line number** (e.g., `file.spec.ts:168:7`)
3. **Review the screenshot** (if available): `open test-results/.../test-failed-1.png`
4. **Switch to playwright-mcp** for interactive debugging if needed

Example failure investigation:
```bash
# 1. Run test and capture output
npx playwright test document-content-editor.spec.ts --reporter=line > test-output.txt 2>&1

# 2. Check exit code
echo $?  # Non-zero = failure

# 3. Extract error details
grep -A 10 "Error:" test-output.txt

# 4. Find screenshot path
grep "attachment.*screenshot" test-output.txt

# 5. View screenshot (if needed)
open $(grep -o "test-results/.*/test-failed-1.png" test-output.txt | head -1)
```

## 🔧 Environment Setup for Tests

### Native Development Setup (Recommended)

This is what the tests expect:

```bash
# Terminal 1: Backend (root environment)
cd /Users/jrepp/hc/hermes
docker compose up -d dex postgres meilisearch  # Start dependencies
./hermes server -config=config.hcl            # Run backend natively

# Terminal 2: Frontend  
cd /Users/jrepp/hc/hermes/web
MIRAGE_ENABLED=false yarn ember server --port 4200 --proxy http://127.0.0.1:8000

# Terminal 3: Run tests
cd /Users/jrepp/hc/hermes/tests/e2e-playwright
npx playwright test --reporter=line
```

**Verification**:
```bash
# All should return 200/success
curl -I http://localhost:8000/health
curl -I http://localhost:4200/
curl -s http://localhost:5556/dex/.well-known/openid-configuration | jq '.issuer'
```

### Testing Environment Setup (Alternative)

Uses Docker for backend, native for frontend:

```bash
# Terminal 1: Start testing backend
cd /Users/jrepp/hc/hermes/testing
docker compose up -d postgres meilisearch
docker compose up -d hermes  # Backend on port 8001

# Terminal 2: Frontend (native)
cd /Users/jrepp/hc/hermes/web
MIRAGE_ENABLED=false yarn ember server --port 4200 --proxy http://127.0.0.1:8001

# Terminal 3: Run tests
cd /Users/jrepp/hc/hermes/tests/e2e-playwright
npx playwright test --reporter=line
```

**Note**: If using testing environment (port 8001), may need to update test baseURL in `playwright.config.ts`.

## 🎬 playwright-mcp Usage (Interactive)

**When to use**: Exploration, debugging, creating new tests

### Available Actions

The MCP browser tools provide full browser automation:

```typescript
// Navigate
mcp_microsoft_pla_browser_navigate({ url: "http://localhost:4200/" })

// Take snapshot (better than screenshot for agents)
mcp_microsoft_pla_browser_snapshot({})

// Take screenshot (for visual documentation)
mcp_microsoft_pla_browser_take_screenshot({ 
  filename: "auth-page.png",
  fullPage: true 
})

// Click elements
mcp_microsoft_pla_browser_click({ 
  element: "Log in with Email button",
  ref: "e15"  // From snapshot
})

// Type text
mcp_microsoft_pla_browser_type({
  element: "Email input field",
  ref: "e20",
  text: "test@hermes.local"
})

// Fill forms
mcp_microsoft_pla_browser_fill_form({
  fields: [
    { name: "email", type: "textbox", ref: "e20", value: "test@hermes.local" },
    { name: "password", type: "textbox", ref: "e21", value: "password" }
  ]
})

// Wait for conditions
mcp_microsoft_pla_browser_wait_for({ text: "Dashboard", time: 5 })

// Evaluate JavaScript
mcp_microsoft_pla_browser_evaluate({
  function: "() => document.title"
})
```

### Example: Interactive Auth Flow Validation

```javascript
// 1. Navigate to app
mcp_microsoft_pla_browser_navigate({ url: "http://localhost:4200/" })

// 2. Take snapshot to see page state
mcp_microsoft_pla_browser_snapshot({})
// Returns: { refs: [...], text: "..." }

// 3. Should redirect to auth - wait for it
mcp_microsoft_pla_browser_wait_for({ text: "Log in to dex", time: 5 })

// 4. Take screenshot for documentation
mcp_microsoft_pla_browser_take_screenshot({ 
  filename: "dex-login-page.png" 
})

// 5. Click "Log in with Email"
mcp_microsoft_pla_browser_click({ 
  element: "Log in with Email link",
  ref: "e15"  // Get from snapshot
})

// 6. Fill credentials
mcp_microsoft_pla_browser_fill_form({
  fields: [
    { name: "login", type: "textbox", ref: "e20", value: "test@hermes.local" },
    { name: "password", type: "textbox", ref: "e21", value: "password" }
  ]
})

// 7. Submit
mcp_microsoft_pla_browser_click({ element: "Submit button", ref: "e25" })

// 8. Wait for redirect to dashboard
mcp_microsoft_pla_browser_wait_for({ text: "Dashboard", time: 10 })

// 9. Verify authentication succeeded
mcp_microsoft_pla_browser_snapshot({})
// Should show authenticated app state
```

## 📝 Writing New Playwright Tests

### Test File Structure

```typescript
import { test, expect, Page } from '@playwright/test';

// Helper functions
async function authenticateUser(page: Page) {
  await page.goto('http://localhost:4200/');
  await page.waitForURL(/5556.*\/auth/);
  await page.click('text=Log in with Email');
  await page.fill('input[name="login"]', 'test@hermes.local');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:4200/**');
}

// Test suite
test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page);
  });

  test('should do something', async ({ page }) => {
    // Arrange
    await page.goto('http://localhost:4200/some/path');
    
    // Act
    await page.click('button:has-text("Action")');
    
    // Assert
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

### Test Development Workflow

1. **Explore with playwright-mcp** first to understand the flow
2. **Write test code** based on exploration
3. **Run headless** to validate: `npx playwright test new-test.spec.ts --reporter=line`
4. **Debug failures** with playwright-mcp or `--headed` mode
5. **Iterate** until test passes consistently
6. **Document** test purpose and setup requirements

## 🔍 Common Issues & Solutions

### Issue: Tests hang with `--headed` mode

**Symptom**: Terminal blocks, HTML report server starts, test never completes  
**Cause**: `--headed` keeps browser open and starts interactive report server  
**Solution**: Use headless mode (default) with `--reporter=line`

```bash
# ❌ BAD: Hangs for agent
npx playwright test --headed

# ✅ GOOD: Returns immediately with results  
npx playwright test --reporter=line --max-failures=1
```

### Issue: Connection refused errors

**Symptom**: `net::ERR_CONNECTION_REFUSED at http://localhost:4200/`  
**Cause**: Frontend or backend not running  
**Solution**: Check services and start if needed

```bash
# Check what's running
lsof -i :4200  # Frontend
lsof -i :8000  # Backend  
lsof -i :5556  # Dex

# Start missing services (see Environment Setup above)
```

### Issue: Authentication redirect fails

**Symptom**: Test times out waiting for Dex redirect  
**Cause**: Backend can't reach Dex, or redirect URL misconfigured  
**Solution**: Verify Dex is accessible and config is correct

```bash
# Test Dex accessibility
curl -s http://localhost:5556/dex/.well-known/openid-configuration | jq '.'

# Check backend config
grep -A 5 "dex {" config.hcl

# Check redirect URL matches
# Should be: redirect_url = "http://localhost:8000/auth/callback"
```

### Issue: Test passes locally but fails in CI

**Symptom**: Tests work on dev machine but fail in GitHub Actions  
**Cause**: Timing issues, different environment, missing dependencies  
**Solution**: Add explicit waits, check CI environment setup

```typescript
// Add explicit waits
await page.waitForLoadState('networkidle');
await page.waitForSelector('text=Expected Text', { timeout: 10000 });

// CI-specific config in playwright.config.ts
retries: process.env.CI ? 2 : 0,
timeout: process.env.CI ? 60000 : 30000,
```

## 📊 Test Reporting for Agents

### Recommended Reporter Formats

1. **line** (default, best for agents): Clean single-line progress
2. **json**: Machine-readable, can parse with jq
3. **list**: Verbose with test steps

### Example: Parsing JSON Output

```bash
# Run tests and save JSON
npx playwright test --reporter=json > results.json

# Parse results
cat results.json | jq '{
  passed: .suites[].specs[] | select(.ok == true) | .title,
  failed: .suites[].specs[] | select(.ok == false) | .title,
  duration: .stats.duration
}'

# Check if all passed
cat results.json | jq '.stats.expected' # Should equal total tests
```

### Example: Creating Summary Report

```bash
# Run tests and capture output
npx playwright test --reporter=line > test-results.txt 2>&1
EXIT_CODE=$?

# Create summary
cat > TEST_SUMMARY.md << 'EOF'
# E2E Test Results

**Date**: $(date)
**Exit Code**: $EXIT_CODE

## Summary
$(grep -E "passed|failed|did not run" test-results.txt | tail -5)

## Details
$(grep -A 5 "Error:" test-results.txt || echo "All tests passed!")

## Artifacts
$(find test-results -name "*.png" -o -name "*.zip" | head -10)
EOF
```

## 🎯 Best Practices for Agents

### DO ✅

- **Always use headless mode** with `--reporter=line` for programmatic execution
- **Check prerequisites** before running tests (services, ports)
- **Use playwright-mcp** for exploration and debugging
- **Read error messages carefully** - they're usually clear about what failed
- **Check screenshots** when visual verification is needed
- **Run single test files** for faster feedback (`test file.spec.ts`)
- **Set timeouts** appropriately for async operations
- **Document test failures** with screenshots and trace files

### DON'T ❌

- **Don't use `--headed`** when running tests programmatically (hangs terminal)
- **Don't run full suite** if only validating one feature (use `-g` grep)
- **Don't ignore exit codes** - they indicate success/failure
- **Don't skip environment verification** - leads to confusing failures
- **Don't create new tests without playwright-mcp exploration** first
- **Don't use interactive reporters** (`--ui`) in automated workflows
- **Don't run tests without backend/frontend** running

## 🔄 Integration with Agent Workflow

### Example: Complete Validation Session

```bash
# 1. Verify environment
echo "=== Checking Environment ==="
curl -s http://localhost:8000/health && echo "✓ Backend OK"
curl -s http://localhost:4200/ > /dev/null && echo "✓ Frontend OK"
curl -s http://localhost:5556/dex/.well-known/openid-configuration > /dev/null && echo "✓ Dex OK"

# 2. Run specific test
echo "=== Running Document Editor Tests ==="
cd /Users/jrepp/hc/hermes/tests/e2e-playwright
npx playwright test document-content-editor.spec.ts --reporter=line --max-failures=1

# 3. Check results
if [ $? -eq 0 ]; then
  echo "✅ All tests passed - functionality validated"
else
  echo "❌ Tests failed - investigating..."
  
  # Show last failure
  find test-results -name "test-failed-*.png" -mtime -1 | head -1
  
  # Extract error message
  grep -A 10 "Error:" test-results/last-run.txt
fi

# 4. Document results
echo "=== Test Summary ===" > TEST_VALIDATION.md
date >> TEST_VALIDATION.md
grep -E "passed|failed" test-results/*.txt >> TEST_VALIDATION.md
```

## 📚 Additional Resources

- **Playwright Docs**: https://playwright.dev/docs/intro
- **Test Files**: `/Users/jrepp/hc/hermes/tests/e2e-playwright/tests/`
- **Config**: `/Users/jrepp/hc/hermes/tests/e2e-playwright/playwright.config.ts`
- **Test Reports**: `/Users/jrepp/hc/hermes/tests/e2e-playwright/playwright-report/`
- **MCP Browser Docs**: Check playwright-mcp documentation in MCP registry

## 🎓 Summary

**For Agents**:
- ✅ **Exploration/Debugging**: Use playwright-mcp (interactive)
- ✅ **Validation/CI**: Use headless Playwright tests (`--reporter=line`)
- ✅ **Always check prerequisites** before running tests
- ✅ **Parse output programmatically** - don't rely on visual inspection
- ✅ **Document findings** with screenshots and test results

**Key Commands**:
```bash
# Validate feature (preferred)
npx playwright test feature.spec.ts --reporter=line --max-failures=1

# Explore interactively (when debugging)
# Use mcp_microsoft_pla_browser_* tools

# Check environment
curl -I http://localhost:8000/health
curl -I http://localhost:4200/
```

**Remember**: Playwright tests are for **validation**, playwright-mcp is for **exploration**. Use the right tool for the job!
