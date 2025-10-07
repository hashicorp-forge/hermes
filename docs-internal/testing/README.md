# Hermes Testing Documentation

**Complete guide to testing the Hermes web application**

---

## 📚 Documentation Index

### Start Here

**New to testing Hermes?** Start with these in order:

1. **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** ⚡
   - Fast answers to common questions
   - How to run tests
   - How to write basic tests
   - Troubleshooting tips

2. **[HERMES_TESTING_PATTERNS.md](./HERMES_TESTING_PATTERNS.md)** 📖
   - Complete pattern library
   - Service, component, route, helper examples
   - TypeScript patterns
   - Glint & template tag components
   - Best practices

3. **[HERMES_TEST_STRATEGY_2025.md](./HERMES_TEST_STRATEGY_2025.md)** 🗺️
   - 12-week roadmap to 70%+ coverage
   - Phase-by-phase implementation plan
   - Priority targets
   - Success metrics

### Reference Docs

4. **[EMBER_TESTING_GUIDE.md](./EMBER_TESTING_GUIDE.md)** 🔧
   - General Ember testing setup
   - Coverage tool configuration
   - CI/CD integration examples

---

## 🚀 Quick Start

### Run Tests

```bash
cd /Users/jrepp/hc/hermes/web

# All tests
yarn test:ember

# Watch mode (recommended for development)
yarn test:ember:watch

# With coverage
yarn test:coverage

# Open coverage report
yarn test:coverage:report
```

### Write a Test

**Service Test**:
```bash
# Create test file
touch tests/unit/services/my-service-test.ts
```

```typescript
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Service | my-service', function (hooks) {
  setupTest(hooks);

  test('it works', function (assert) {
    const service = this.owner.lookup('service:my-service');
    assert.ok(service);
  });
});
```

**Component Test**:
```bash
# Create test file
touch tests/integration/components/my-component-test.ts
```

```typescript
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | my-component', function (hooks) {
  setupRenderingTest(hooks);

  test('renders', async function (assert) {
    await render(hbs`<MyComponent @title="Test" />`);
    assert.dom('[data-test-my-component]').exists();
  });
});
```

---

## 📊 Current State

**Test Infrastructure**: ✅ Ready
- ember-cli-code-coverage: Installed & configured
- Test scripts: Enhanced with coverage, filtering
- Coverage thresholds: Set at 60% (configurable)
- Test helpers: Available in `tests/helpers/`

**Test Suite**: ⚠️ Needs Attention
- ~248 test files exist
- Coverage: ~5-10% estimated (needs baseline measurement)
- Test runner: Has module loading issues
- Priority: Fix runner, then expand coverage

**Target** (12 weeks):
- 70%+ overall coverage
- All tests passing
- CI/CD enforcement
- Comprehensive documentation

---

## 📋 Testing Priorities

### Phase 0: Fix Test Runner (Week 1)
- [ ] Resolve module loading errors
- [ ] Get test suite running
- [ ] Establish baseline coverage

### Phase 1: Infrastructure (Week 2)
- [x] Coverage configuration
- [x] Enhanced test scripts
- [ ] Test helpers and factories
- [ ] Baseline measurement

### Phase 2: Critical Services (Weeks 3-5)
- [ ] session.ts (85% target)
- [ ] authenticated-user.ts (80% target)
- [ ] fetch.ts (85% target)
- [ ] algolia.ts (75% target)
- [ ] config.ts (90% target)

### Phase 3: Routes (Weeks 6-7)
- [ ] authenticated/* routes
- [ ] Dashboard, documents, search
- [ ] Document creation flow
- [ ] Project management

### Phase 4: Components (Weeks 8-10)
- [ ] Header components
- [ ] Document components
- [ ] Form components
- [ ] Dashboard components

### Phase 5: Helpers & Utils (Week 11)
- [ ] Template helpers (80% target)
- [ ] Utility functions (85% target)

### Phase 6: Integration & Polish (Week 12)
- [ ] End-to-end flows
- [ ] Coverage gaps filled
- [ ] CI/CD configured
- [ ] 70%+ achieved

**See**: [HERMES_TEST_STRATEGY_2025.md](./HERMES_TEST_STRATEGY_2025.md) for complete roadmap

---

## 🛠️ Tools & Configuration

### Coverage Tool
**ember-cli-code-coverage** v3.1.0
- Config: `web/.ember-cli-code-coverage.js`
- Thresholds: 60% statements/branches/functions/lines
- Reports: HTML, LCOV, JSON, text-summary
- Location: `web/coverage/`

### Test Framework
**QUnit** v2.24.1 with **ember-qunit** v9.0.4
- Modern async/await support
- qunit-dom for semantic assertions
- ember-test-helpers for test utilities

### API Mocking
**ember-cli-mirage** v2.4.0
- Development server mocking
- Test scenario support
- Factory support
- Location: `web/mirage/`

### Test Selectors
**ember-test-selectors** v7.1.0
- `data-test-*` attributes
- Stripped in production
- Self-documenting tests

### TypeScript
**TypeScript** v5.9.2
- Type-safe test contexts
- Glint template type checking
- Full IDE support

---

## 📁 Test Structure

```
web/tests/
├── acceptance/              # End-to-end user flows
│   ├── authenticated/       # Authenticated route tests
│   │   ├── dashboard-test.ts
│   │   ├── document-test.ts
│   │   ├── documents-test.ts
│   │   ├── drafts-test.ts
│   │   ├── my/
│   │   ├── new/
│   │   ├── product-areas/
│   │   ├── projects-test.ts
│   │   ├── results-test.ts
│   │   └── settings-test.ts
│   ├── 404-test.ts
│   ├── application-test.ts
│   ├── authenticate-test.ts
│   └── authenticated-test.ts
│
├── integration/             # Component & helper rendering tests
│   ├── components/          # Component integration tests
│   │   ├── header/
│   │   ├── doc/
│   │   ├── document/
│   │   ├── inputs/
│   │   ├── related-resources/
│   │   └── ...
│   └── helpers/             # Helper integration tests
│       ├── time-ago-test.ts
│       ├── get-facet-label-test.ts
│       └── ...
│
├── unit/                    # Pure logic tests
│   ├── services/            # Service unit tests
│   │   ├── session-test.ts
│   │   ├── fetch-test.ts
│   │   ├── config-test.ts
│   │   ├── algolia-test.ts
│   │   └── ...
│   └── utils/               # Utility function tests
│       ├── parse-date-test.ts
│       ├── time-ago-test.ts
│       └── ...
│
├── helpers/                 # Test helper functions
│   ├── mock-services.ts     # Service mocking utilities
│   ├── factories.ts         # Test data factories
│   └── assertions.ts        # Custom assertions
│
├── mirage-helpers/          # Mirage test utilities
│   └── utils.ts
│
└── test-helper.ts           # Main test configuration
```

---

## 💡 Best Practices

### ✅ Do

1. **Use data-test selectors** for all assertions
   ```handlebars
   <button data-test-submit {{on "click" this.save}}>Save</button>
   ```

2. **Mock services** instead of hitting real APIs
   ```typescript
   const configService = this.owner.lookup('service:config');
   configService.config = { auth_provider: 'google' };
   ```

3. **Use Mirage** for acceptance tests
   ```typescript
   this.server.get('/api/v2/documents', () => ({ documents: [] }));
   ```

4. **Test user flows**, not implementation details
   ```typescript
   test('user can create document', async function (assert) {
     await visit('/new/doc');
     await fillIn('[data-test-title]', 'My Doc');
     await click('[data-test-submit]');
     assert.strictEqual(currentURL(), '/document/1');
   });
   ```

5. **Keep tests focused** - one concept per test
   ```typescript
   test('validates required fields', function (assert) { /* ... */ });
   test('submits form data', function (assert) { /* ... */ });
   ```

### ❌ Don't

1. **Don't rely on timing** - use test helpers
   ```typescript
   // Bad
   setTimeout(() => assert.dom('[data-test]').exists(), 100);
   
   // Good
   await waitFor('[data-test]');
   assert.dom('[data-test]').exists();
   ```

2. **Don't test library code** - trust Ember
   ```typescript
   // Bad - testing Ember's routing
   test('route exists', function (assert) { /* ... */ });
   
   // Good - testing your logic
   test('loads document data', function (assert) { /* ... */ });
   ```

3. **Don't use arbitrary waits**
   ```typescript
   // Bad
   await new Promise(resolve => setTimeout(resolve, 500));
   
   // Good
   await waitFor('[data-test-loaded]');
   ```

4. **Don't test CSS classes** - use semantic selectors
   ```typescript
   // Bad
   assert.dom('.btn-primary').exists();
   
   // Good
   assert.dom('[data-test-submit-button]').exists();
   ```

5. **Don't ignore TypeScript** - fix type errors
   ```typescript
   // Bad
   // @ts-ignore
   service.someMethod();
   
   // Good
   const service = this.owner.lookup('service:my-service') as MyService;
   service.someMethod();
   ```

---

## 📈 Measuring Progress

### Check Coverage

```bash
# Run with coverage
COVERAGE=true yarn test:ember

# Open report
open coverage/index.html

# Validate thresholds
node scripts/check-coverage.js
```

### Coverage Reports

**HTML Report** (`coverage/index.html`):
- Browsable file-by-file view
- Red/yellow/green highlighting
- Line-by-line coverage
- Branch coverage visualization

**LCOV Report** (`coverage/lcov.info`):
- Standard format for CI tools
- Codecov/Coveralls compatible
- Git diff overlays

**JSON Summary** (`coverage/coverage-summary.json`):
- Programmatic access
- Automated threshold checks
- Trend tracking

### Metrics to Track

**Coverage Percentages**:
- Lines: Executable lines covered
- Statements: Statements executed
- Functions: Functions called
- Branches: Conditional branches taken

**Target Goals**:
- Services: 75%+
- Routes: 65%+
- Components: 65%+
- Helpers: 80%+
- Utilities: 85%+
- **Overall: 70%+**

---

## 🔗 External Resources

### Ember Testing
- [Official Testing Guide](https://guides.emberjs.com/release/testing/)
- [ember-qunit API](https://github.com/emberjs/ember-qunit)
- [Test Helpers API](https://github.com/emberjs/ember-test-helpers/blob/master/API.md)

### QUnit
- [QUnit API](https://qunitjs.com/api/)
- [qunit-dom API](https://github.com/simplabs/qunit-dom/blob/master/API.md)

### Mirage
- [Mirage Guides](https://miragejs.com/docs/getting-started/introduction/)
- [Mirage API](https://miragejs.com/api/)

### Coverage
- [ember-cli-code-coverage](https://github.com/kategengler/ember-cli-code-coverage)
- [Istanbul Coverage](https://istanbul.js.org/)

---

## 🤝 Contributing

### Adding Tests

1. Identify untested code via coverage report
2. Write tests following patterns in [HERMES_TESTING_PATTERNS.md](./HERMES_TESTING_PATTERNS.md)
3. Run tests: `yarn test:ember`
4. Check coverage: `COVERAGE=true yarn test:ember`
5. Commit with descriptive message (see [AI Commit Standards](../COPILOT_INSTRUCTIONS.md))

### Updating Documentation

1. Keep patterns synchronized with code
2. Add examples for new testing scenarios
3. Update quick reference for common questions
4. Document any test infrastructure changes

### Reporting Issues

**Test failures**:
- Include test name and error message
- Provide steps to reproduce
- Check if flaky (runs sometimes pass)

**Coverage gaps**:
- Identify file and current coverage %
- Suggest test scenarios to add
- Consider priority (critical vs nice-to-have)

---

## 📞 Getting Help

1. **Quick questions**: See [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
2. **Code examples**: See [HERMES_TESTING_PATTERNS.md](./HERMES_TESTING_PATTERNS.md)
3. **Strategy questions**: See [HERMES_TEST_STRATEGY_2025.md](./HERMES_TEST_STRATEGY_2025.md)
4. **Ember-specific**: See [EMBER_TESTING_GUIDE.md](./EMBER_TESTING_GUIDE.md)
5. **Still stuck**: Ask in team Slack channel

---

## 🎯 Success Criteria

**We'll know we're successful when**:

✅ **Coverage**:
- 70%+ overall coverage
- 85%+ on critical services
- Coverage enforced in CI

✅ **Quality**:
- 100% test pass rate
- No flaky tests
- Tests run in <5 minutes

✅ **Developer Experience**:
- Easy to write tests
- Clear documentation
- Fast feedback loop
- Confidence in refactoring

✅ **Maintainability**:
- Tests are readable
- Minimal boilerplate
- Self-documenting
- Easy to update

---

**Ready to test!** 🚀

Start with [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) for immediate guidance, or dive into [HERMES_TEST_STRATEGY_2025.md](./HERMES_TEST_STRATEGY_2025.md) for the complete roadmap.
