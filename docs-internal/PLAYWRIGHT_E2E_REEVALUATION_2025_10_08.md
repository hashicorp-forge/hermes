# Playwright E2E Testing Evaluation - Session Summary

**Date**: 2025-10-08  
**Task**: Re-evaluate Playwright E2E validation and make it agent-friendly

## Problem Identified

When running Playwright tests with `--headed` mode, the test execution hangs in the terminal:
- Browser window opens visually
- HTML report server starts on a random port (e.g., http://localhost:9323)
- Terminal blocks waiting for user interaction
- Test never completes, requiring Ctrl+Z to suspend

This makes `--headed` mode **unusable for AI agents** that need programmatic test results.

## Root Cause

The `--headed` flag in Playwright:
1. Opens a visible browser window (requires display/GUI)
2. Keeps browser open after test completes
3. Starts an interactive HTML report server
4. Waits for user to close browser or press Ctrl+C

This is designed for **human debugging**, not automated execution.

## Solution

### For Agents: Use Headless Mode with Appropriate Reporters

**Recommended Command Pattern**:
```bash
npx playwright test [file.spec.ts] --reporter=line --max-failures=1
```

**Key Options**:
- **No `--headed` flag** = runs headless (default)
- `--reporter=line` = Clean, single-line progress output (agent-friendly)
- `--max-failures=1` = Stop after first failure (fast feedback)
- `--reporter=json` = Machine-readable output for parsing
- Exit code `0` = success, `1` = failure (programmatically detectable)

### Available Reporter Formats

| Reporter | Use Case | Output Style |
|----------|----------|--------------|
| `line` | **Agent default** | Single line per test, clean progress |
| `list` | Verbose debugging | Multi-line with test steps |
| `json` | Parsing/CI | Machine-readable JSON |
| `dot` | Minimal | Just dots for progress |
| `junit` | CI integration | XML format for Jenkins/etc |
| `html` | Human review | Interactive HTML report |

### Execution Examples

**Basic Headless Run** (returns immediately with results):
```bash
cd /Users/jrepp/hc/hermes/tests/e2e-playwright
npx playwright test document-content-editor.spec.ts --reporter=line
```

**Output Example**:
```
Running 3 tests using 1 worker
[chromium] › tests/document-content-editor.spec.ts:168:7 › should edit... (5.2s)
  1 passed
  2 did not run
```

**With JSON Output** (for parsing):
```bash
npx playwright test --reporter=json > results.json
cat results.json | jq '.stats.expected, .stats.unexpected'
```

**Grep for Specific Test**:
```bash
npx playwright test -g "should edit document content" --reporter=line
```

## Two-Tier Testing Strategy

### Tier 1: playwright-mcp (Interactive) - PREFERRED for Agents

**Use When**:
- Exploring UI behavior
- Debugging authentication flows
- Creating new test scenarios
- Investigating failures
- Need screenshots/snapshots

**Advantages**:
- ✅ Full control over browser actions
- ✅ Take snapshots to see page state
- ✅ Capture screenshots for documentation
- ✅ No hanging, no terminal blocking
- ✅ Direct feedback on each action

**Example Usage**:
```javascript
// Navigate and explore
mcp_microsoft_pla_browser_navigate({ url: "http://localhost:4200/" })
mcp_microsoft_pla_browser_snapshot({})

// Take screenshots
mcp_microsoft_pla_browser_take_screenshot({ 
  filename: "auth-page.png",
  fullPage: true 
})

// Interact
mcp_microsoft_pla_browser_click({ element: "Button", ref: "e15" })
mcp_microsoft_pla_browser_type({ element: "Input", ref: "e20", text: "test@hermes.local" })
```

### Tier 2: Playwright Codified Tests (Headless) - For Validation & CI

**Use When**:
- Running full test suite
- Validating after changes
- CI/CD integration
- Regression testing
- Need structured reports

**Advantages**:
- ✅ Fast, deterministic results
- ✅ Runs without display/GUI
- ✅ Clear pass/fail exit codes
- ✅ Artifact generation (screenshots, traces, videos)
- ✅ Machine-readable output

**Example Usage**:
```bash
# Validate feature
npx playwright test document-content-editor.spec.ts --reporter=line --max-failures=1

# Check exit code
if [ $? -eq 0 ]; then
  echo "✅ Tests passed"
else
  echo "❌ Tests failed"
fi
```

## Environment Prerequisites

Before running Playwright tests, verify:

```bash
# Backend
curl -I http://localhost:8000/health || echo "❌ Backend not running"

# Frontend  
curl -I http://localhost:4200/ || echo "❌ Frontend not running"

# Dex
curl -s http://localhost:5556/dex/.well-known/openid-configuration | jq '.' || echo "❌ Dex not running"
```

**Required Setup**:
```bash
# Terminal 1: Backend
cd /Users/jrepp/hc/hermes
docker compose up -d dex postgres meilisearch
./hermes server -config=config.hcl

# Terminal 2: Frontend
cd /Users/jrepp/hc/hermes/web
MIRAGE_ENABLED=false yarn ember server --port 4200 --proxy http://127.0.0.1:8000
```

## Integration with Agent Workflow

### Recommended Decision Flow

```
Need E2E validation?
├─ Exploring/debugging? → Use playwright-mcp (interactive)
├─ Validating changes? → Use headless Playwright (--reporter=line)
├─ CI/CD pipeline? → Use headless Playwright (--reporter=json)
└─ Creating test? → Explore with playwright-mcp, then codify in .spec.ts file
```

### Example Validation Workflow

```bash
# 1. Check environment
echo "=== Checking Prerequisites ==="
curl -s http://localhost:8000/health && echo "✓ Backend OK" || echo "✗ Backend DOWN"
curl -s http://localhost:4200/ > /dev/null && echo "✓ Frontend OK" || echo "✗ Frontend DOWN"

# 2. Run specific test (fast feedback)
echo "=== Running Document Editor Tests ==="
cd /Users/jrepp/hc/hermes/tests/e2e-playwright
npx playwright test document-content-editor.spec.ts --reporter=line --max-failures=1

# 3. Check result
EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ All tests passed - functionality validated"
else
  echo "❌ Tests failed (exit code: $EXIT_CODE)"
  
  # Find latest failure artifacts
  find test-results -name "test-failed-*.png" -mtime -1 | head -1
  
  # Switch to playwright-mcp for debugging
  echo "💡 Tip: Use playwright-mcp for interactive debugging"
fi
```

## Handling Test Failures

### Failure Output Example

```
  1) [chromium] › tests/document-content-editor.spec.ts:168:7 › should edit document
     Error: expect(locator).toBeVisible()
     Expected: visible
     Timeout: 5000ms
     
     attachment #1: screenshot (test-results/.../test-failed-1.png)
     attachment #2: trace (test-results/.../trace.zip)
     
  1 failed
```

### Investigation Steps

1. **Read error message** - usually clear about what failed
2. **Check screenshot** - visual evidence of failure state
3. **Review trace file** - detailed execution timeline
4. **Switch to playwright-mcp** - interactive debugging if needed

```bash
# View screenshot
open test-results/*/test-failed-1.png

# View trace (interactive)
npx playwright show-trace test-results/*/trace.zip
```

## Artifacts Created

### Documentation
- **`docs-internal/PLAYWRIGHT_E2E_AGENT_GUIDE.md`**: Comprehensive 500+ line guide covering:
  - When to use playwright-mcp vs codified tests
  - Headless execution patterns
  - Reporter formats and parsing
  - Environment setup
  - Common issues and solutions
  - Best practices for agents
  - Integration workflows
  - Complete examples

### Copilot Instructions Update
- **`.github/copilot-instructions.md`**: Added E2E testing section with:
  - Quick reference for playwright-mcp
  - Headless execution commands
  - Key points and warnings
  - Common command patterns

## Key Takeaways for Agents

### DO ✅
- **Use headless mode** (`--reporter=line`) for programmatic execution
- **Check prerequisites** before running tests (services must be running)
- **Use playwright-mcp** for exploration and debugging
- **Parse exit codes** (0 = success, 1 = failure)
- **Read error messages** - they're clear and actionable
- **Check screenshots** on failures for visual context
- **Run single test files** for faster feedback

### DON'T ❌
- **Never use `--headed`** for agent execution (hangs terminal)
- **Don't skip environment verification** (leads to confusing failures)
- **Don't ignore exit codes** - they indicate success/failure
- **Don't use `--ui` mode** (interactive, blocks terminal)
- **Don't run full suite** if testing one feature (use `-g` grep)

## Command Reference

### Quick Commands

```bash
# Validate feature (preferred)
npx playwright test file.spec.ts --reporter=line --max-failures=1

# Run with JSON output
npx playwright test --reporter=json > results.json

# Grep for specific test
npx playwright test -g "test name" --reporter=line

# Check environment
curl -I http://localhost:8000/health
curl -I http://localhost:4200/

# View failure artifacts
find test-results -name "test-failed-*.png" | head -1
```

### Exit Codes

- `0`: All tests passed ✅
- `1`: One or more tests failed ❌
- `130`: Interrupted (Ctrl+C) ⚠️

## Summary

**Problem**: `--headed` mode hangs terminal, unusable for agents  
**Solution**: Use headless mode with `--reporter=line` for clean, agent-friendly output  
**Strategy**: playwright-mcp for exploration, headless Playwright for validation  
**Documentation**: Comprehensive guide created at `docs-internal/PLAYWRIGHT_E2E_AGENT_GUIDE.md`  
**Integration**: Updated Copilot instructions with E2E testing section  

**Result**: Agents now have clear guidance on:
- When to use each testing approach
- How to run tests programmatically
- How to parse results
- How to handle failures
- How to integrate tests into workflows

This enables efficient, non-blocking E2E validation while maintaining the value of codified Playwright tests for CI/CD pipelines.
