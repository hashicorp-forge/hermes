# Hermes Web Test Baseline Status

**Date**: October 6, 2025  
**Executor**: GitHub Copilot (via QUICK_START_CHECKLIST.md execution)  
**Ember Version**: 6.7.0  
**Node Version**: 24.x

---

## Summary

✅ **Test Runner**: Working  
❌ **Full Test Suite**: 8/483 passing (1.66%)  
❌ **Unit Tests Only**: 8/37 passing (21.6%)  
⚠️ **Coverage Reports**: Not generating (too many failures)

---

## Current Test Status

### Passing Tests (8 total)

All passing tests are **utility function tests** that do NOT use `setupTest(hooks)`:

1. ✅ Unit | Minimal Test: sanity check
2. ✅ Unit | Utility | clean-string: it correctly cleans strings
3. ✅ Unit | Utility | get-product-id: it returns the product ID if it exists
4. ✅ Unit | Utility | get-product-label: it returns the correct label
5. ✅ Unit | Utility | html-element: it asserts and returns valid html elements
6. ✅ Unit | Utility | is-valid-u-r-l: it returns whether a url is valid
7. ✅ Unit | Utility | parse-date: it parses dates
8. ✅ Unit | Utility | time-ago: it returns a "time ago" value for a date

### Failing Tests (475 total)

**Primary Blocker**: `service:router-scroll` initialization failure

#### Root Cause Analysis

1. **`ember-router-scroll@4.1.2`** requires **`ember-app-scheduler@^5.1.2 || ^6.0.0 || ^7.0.0`**
2. Yarn resolves to **`ember-app-scheduler@7.0.1`**
3. `ember-app-scheduler@7.0.1` imports **`@ember/test-waiters`** from its `scheduler` module
4. In the test build, the module resolution fails:
   ```
   Error: Could not find module `@ember/test-waiters` imported from `ember-app-scheduler/scheduler`
   ```
5. This causes `service:router-scroll` to fail initialization in **ALL** tests that use `setupTest(hooks)`

#### Impact Breakdown

| Test Type | Total | Failing Due to router-scroll | Other Failures | Passing |
|-----------|-------|------------------------------|----------------|---------|
| Acceptance | ~400 | ~399 | ~1 | 0 |
| Integration | ~46 | ~45 | ~1 | 0 |
| Unit Services | 13 | 13 | 0 | 0 |
| Unit Utilities | 24 | 1 | 15 | 8 |
| **Total** | **483** | **458** | **17** | **8** |

---

## Working Test Pattern

Tests that **DO NOT** use `setupTest(hooks)` are passing. These tests:

- Import the function/utility directly
- Do NOT require Ember app initialization
- Do NOT lookup services from `this.owner`
- Test pure JavaScript/TypeScript logic

### Example Working Test

```typescript
import { module, test } from "qunit";
import cleanString from "hermes/utils/clean-string";

module("Unit | Utility | clean-string", function () {
  test("it correctly cleans strings", function (assert) {
    assert.equal(cleanString("pøkémöñ"), "pokemon");
  });
});
```

---

## Blocked Test Pattern

Tests that **DO** use `setupTest(hooks)` are failing. These tests:

- Require full Ember app initialization
- Lookup services from `this.owner.lookup('service:...')`
- Trigger instance initializers (including router-scroll)
- Are blocked by the module resolution issue

### Example Blocked Test

```typescript
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import ConfigService from 'hermes/services/config';

module('Unit | Service | config', function (hooks) {
  setupTest(hooks);  // ❌ This triggers router-scroll initialization

  test('it exists', function (assert) {
    const service = this.owner.lookup('service:config') as ConfigService;
    assert.ok(service);
  });
});
```

**Error**: "Failed to create an instance of 'service:router-scroll'"

---

## Attempted Fixes

### ✅ Environment Cleanup
- Removed `node_modules/.cache`, `tmp/`, `dist/`
- Ran `yarn install` and `yarn install --check-cache`
- **Result**: No change, module resolution issue persists

### ⚠️ Dependency Check
- `@ember/test-waiters@4.1.1` IS installed
- `yarn why @ember/test-waiters` shows it's required by multiple packages
- **Issue**: It's not being resolved at runtime in the test build

---

## Next Steps (Priority Order)

### 1. Fix router-scroll Module Resolution ⚠️ HIGH PRIORITY

**Options**:

a) **Upgrade ember-router-scroll** to a version compatible with Ember 6.7
   ```bash
   cd web
   yarn upgrade ember-router-scroll --latest
   ```

b) **Disable router-scroll in tests** by creating a test-specific initializer:
   ```typescript
   // web/tests/helpers/disable-router-scroll.ts
   export function setupTestWithoutRouterScroll(hooks) {
     // Override instance initializer
   }
   ```

c) **Add explicit ember-auto-import configuration** for `@ember/test-waiters`:
   ```javascript
   // ember-cli-build.js
   app = new EmberApp(defaults, {
     autoImport: {
       webpack: {
         resolve: {
           alias: {
             '@ember/test-waiters': require.resolve('@ember/test-waiters')
           }
         }
       }
     }
   });
   ```

d) **Downgrade ember-app-scheduler** to version 6.x to avoid the issue

### 2. Document Working Patterns 📝 CAN DO NOW

- Create example tests for utilities (already working)
- Document the `setupTest()` limitation
- Create workaround patterns for service testing

### 3. Establish Coverage Baseline 📊 BLOCKED BY #1

Once router-scroll is fixed:
- Run `COVERAGE=true yarn test:ember`
- Generate HTML report
- Document coverage percentages
- Identify untested files

### 4. Write New Tests ✍️ CAN DO NOW (LIMITED)

Can write tests for:
- New utility functions (pure JS/TS)
- Helper functions that don't need services
- Any code that doesn't require Ember app context

Cannot write tests for:
- Services (requires `setupTest()`)
- Components (requires `setupRenderingTest()`)
- Routes (requires full app initialization)
- Acceptance tests (requires `setupApplicationTest()`)

---

## Recommendations

1. **IMMEDIATE**: Try Option 1.a (upgrade ember-router-scroll) as it's the least invasive
2. **IF THAT FAILS**: Try Option 1.c (explicit auto-import config)
3. **MEANWHILE**: Continue documenting patterns and testing utilities
4. **DOCUMENT**: Add this status to `.github/copilot-instructions.md` so future agents know the current state

---

## Files Modified/Created

- ✅ Cleaned: `web/node_modules/.cache`, `web/tmp/`, `web/dist/`
- ✅ Created: This status document

## Test Commands Used

```bash
# Full test suite
yarn test:ember

# Unit tests only
yarn test:unit

# Specific test filter
yarn ember test --filter="Unit | Service | config"

# With coverage (blocked)
COVERAGE=true yarn test:ember
```

---

## Known Good Test Examples

Reference these for writing new tests:

- ✅ `tests/unit/utils/clean-string-test.ts` - Pure utility test
- ✅ `tests/unit/utils/get-product-id-test.ts` - Pure utility test
- ✅ `tests/unit/utils/html-element-test.ts` - Pure utility test
- ❌ `tests/unit/services/config-test.ts` - Blocked by router-scroll (13 tests)
- ❌ `tests/unit/services/session-test.ts` - Blocked by router-scroll

---

**Status**: Ready for router-scroll fix. Testing infrastructure is working, but blocked by module resolution issue affecting 95% of tests.
