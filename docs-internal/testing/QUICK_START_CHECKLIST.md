# Testing Quick Start Checklist

**Get started testing Hermes in 10 minutes**

---

## ✅ Phase 0: Fix Test Runner (Do This First!)

### 1. Clean Your Environment
```bash
cd /Users/jrepp/hc/hermes/web

# Remove cached files
rm -rf node_modules/.cache
rm -rf tmp/
rm -rf dist/

# Reinstall dependencies
yarn install
```

### 2. Try Running Tests
```bash
# Run all tests
yarn test:ember
```

**If you see errors**: This is expected! Proceed to fix them.

**Common error**: "Could not find module `@ember/test-waiters`"
- Solution: Check if test helper is loading correctly
- Check: `tests/test-helper.ts`

### 3. Try Coverage
```bash
# Run with coverage enabled
COVERAGE=true yarn test:ember

# Did it complete? Great!
# Check coverage report
open coverage/index.html
```

**Goal**: Get at least 1 test passing before proceeding

---

## ✅ Phase 1: Measure Baseline (Week 2)

### 1. Run Coverage Report
```bash
cd /Users/jrepp/hc/hermes/web

# Generate coverage
COVERAGE=true yarn test:ember

# View HTML report
open coverage/index.html

# Check console output for summary
```

### 2. Document Current Coverage
In the HTML report, find the summary at the top:
- Statements: ____%
- Branches: ____%
- Functions: ____%
- Lines: ____%

**Write these down** - this is your baseline!

### 3. Find Untested Files
In coverage report:
1. Click on any directory (e.g., `services/`)
2. Sort by "% Stmts" column
3. Files with 0% = completely untested
4. Files with <20% = high priority

**Make a list** of the 5 most critical untested files.

---

## ✅ Your First Test

### Write a Service Test

1. **Pick a simple service**:
   ```bash
   ls web/app/services/
   # Choose something like: config.ts, viewport.ts, etc.
   ```

2. **Create test file**:
   ```bash
   touch web/tests/unit/services/config-test.ts
   ```

3. **Copy this template**:
   ```typescript
   import { module, test } from 'qunit';
   import { setupTest } from 'ember-qunit';
   import type ConfigService from 'hermes/services/config';

   module('Unit | Service | config', function (hooks) {
     setupTest(hooks);

     test('it exists', function (assert) {
       const service = this.owner.lookup('service:config') as ConfigService;
       assert.ok(service);
     });

     test('has default configuration', function (assert) {
       const service = this.owner.lookup('service:config') as ConfigService;
       // Add your test here
       assert.ok(true, 'placeholder test');
     });
   });
   ```

4. **Run your test**:
   ```bash
   yarn test:ember --filter="config"
   ```

5. **See it pass**: ✅ Celebrate! You wrote a test!

---

## ✅ Daily Testing Workflow

### Morning Routine
```bash
# 1. Pull latest code
git pull

# 2. Update dependencies
cd web && yarn install

# 3. Run tests
yarn test:ember
```

### Writing Code
```bash
# Run tests in watch mode
yarn test:ember:watch

# Make changes, tests auto-run
# Fix any failures before committing
```

### Before Committing
```bash
# Run full test suite
yarn test:ember

# Check coverage on your files
COVERAGE=true yarn test:ember
open coverage/index.html
# Find your files, check coverage
```

### After Committing
```bash
# CI will run tests automatically
# Check GitHub Actions for results
```

---

## ✅ Common Commands Reference

```bash
# Run all tests
yarn test:ember

# Watch mode (auto-rerun on changes)
yarn test:ember:watch

# Run with coverage
yarn test:coverage

# View coverage report
yarn test:coverage:report

# Only unit tests
yarn test:unit

# Only integration tests
yarn test:integration

# Only acceptance tests
yarn test:acceptance

# Filter by name
yarn test:ember --filter="session"

# Quick sanity check
yarn test:quick
```

---

## ✅ When Tests Fail

### 1. Read the Error Message
```
not ok 1 Chrome 141.0 - [22 ms] - Unit | Service | config: it exists
    ---
        message: >
            service is undefined
        stack: >
            at Object.<anonymous> (tests/unit/services/config-test.ts:10)
```

**The error says**: "service is undefined"  
**The location**: Line 10 in config-test.ts  
**The fix**: Check if service is being looked up correctly

### 2. Debug in Browser
```bash
# Run in watch mode
yarn test:ember:watch

# In browser:
# 1. Click on failing test
# 2. Open DevTools (F12)
# 3. Look at Console for errors
# 4. Add debugger; statements in code
```

### 3. Check Test Setup
```typescript
module('Unit | Service | config', function (hooks) {
  setupTest(hooks);  // ← Is this here?

  test('it works', function (assert) {
    // Is 'assert' available?
    // Is 'this.owner' available?
  });
});
```

### 4. Ask for Help
- Check [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
- Search existing tests for similar patterns
- Ask in team Slack

---

## ✅ Success Milestones

### Week 1: Test Runner Working
- ✅ Tests run without crashes
- ✅ At least 1 test passing
- ✅ Coverage report generated

### Week 2: Baseline Established
- ✅ Current coverage documented
- ✅ Critical files identified
- ✅ First new test written

### Week 4: First Service Covered
- ✅ One service at 80%+ coverage
- ✅ Team comfortable with patterns
- ✅ Test helpers in use

### Week 8: 50% Coverage
- ✅ Critical services tested
- ✅ Some routes tested
- ✅ Momentum building

### Week 12: 70% Coverage 🎯
- ✅ All critical paths tested
- ✅ CI enforcing coverage
- ✅ Team testing by default

---

## ✅ Resources

**Quick Answers**: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)  
**Code Examples**: [HERMES_TESTING_PATTERNS.md](./HERMES_TESTING_PATTERNS.md)  
**Full Strategy**: [HERMES_TEST_STRATEGY_2025.md](./HERMES_TEST_STRATEGY_2025.md)  
**Navigation**: [README.md](./README.md)

---

## ✅ Remember

1. **Fix test runner first** - nothing else matters if tests don't run
2. **Start small** - one test is better than no tests
3. **Use patterns** - copy working examples
4. **Measure progress** - coverage shows improvement
5. **Celebrate wins** - every new test is progress

---

**You've got this!** 🚀

Now go fix that test runner and write your first test!
