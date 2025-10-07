# Hermes Testing Quick Reference

**Fast answers to common testing questions**

---

## How do I...

### Run Tests?

```bash
# All tests
yarn test:ember

# Watch mode (interactive, recommended for development)
yarn test:ember:watch

# With coverage
yarn test:coverage

# Open coverage report
yarn test:coverage:report

# Only unit tests
yarn test:unit

# Only integration tests  
yarn test:integration

# Only acceptance tests
yarn test:acceptance

# Filter by name
ember test --filter="session"

# Quick sanity check
ember test --filter="minimal-sanity" --launch=Chrome
```

---

### Fix the Test Runner?

**If you see module loading errors:**

```bash
cd /Users/jrepp/hc/hermes/web

# Clean everything
rm -rf node_modules/.cache tmp/ dist/

# Reinstall
yarn install

# Try again
yarn test:ember
```

---

### Write a Service Test?

**Location**: `tests/unit/services/my-service-test.ts`

```typescript
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import type MyService from 'hermes/services/my-service';

module('Unit | Service | my-service', function (hooks) {
  setupTest(hooks);

  test('does something', function (assert) {
    const service = this.owner.lookup('service:my-service') as MyService;
    
    // Test service logic
    assert.ok(service);
  });
});
```

**See**: [HERMES_TESTING_PATTERNS.md](./HERMES_TESTING_PATTERNS.md#service-testing)

---

### Write a Component Test?

**Location**: `tests/integration/components/my-component-test.ts`

```typescript
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | my-component', function (hooks) {
  setupRenderingTest(hooks);

  test('renders', async function (assert) {
    await render(hbs`<MyComponent @title="Test" />`);
    
    assert.dom('[data-test-my-component]').exists();
    assert.dom('[data-test-title]').hasText('Test');
  });

  test('handles clicks', async function (assert) {
    this.set('handleClick', () => assert.step('clicked'));
    
    await render(hbs`<MyComponent @onClick={{this.handleClick}} />`);
    
    await click('[data-test-button]');
    
    assert.verifySteps(['clicked']);
  });
});
```

**See**: [HERMES_TESTING_PATTERNS.md](./HERMES_TESTING_PATTERNS.md#component-testing)

---

### Write an Acceptance Test?

**Location**: `tests/acceptance/my-route-test.ts`

```typescript
import { module, test } from 'qunit';
import { visit, currentURL, click } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';
import { setupMirage } from 'ember-cli-mirage/test-support';
import { authenticateTestUser } from 'hermes/mirage/utils';

module('Acceptance | my-route', function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function () {
    authenticateTestUser(this.server);
  });

  test('visiting /my-route', async function (assert) {
    await visit('/my-route');

    assert.strictEqual(currentURL(), '/my-route');
    assert.dom('[data-test-page-title]').hasText('My Route');
  });
});
```

**See**: [HERMES_TESTING_PATTERNS.md](./HERMES_TESTING_PATTERNS.md#route-testing)

---

### Mock an API Response?

**Using Mirage in tests:**

```typescript
import { setupMirage } from 'ember-cli-mirage/test-support';

module('My Test', function (hooks) {
  setupMirage(hooks);

  test('fetches data', async function (assert) {
    // Mock API response
    this.server.get('/api/v2/documents/:id', () => ({
      id: 'doc-1',
      title: 'Test Document',
      docType: 'RFC',
    }));
    
    // Your test code...
  });
});
```

**Mock error response:**

```typescript
this.server.get('/api/v2/documents/:id', () => {
  return new Response(404, {}, { error: 'Not found' });
});
```

---

### Mock a Service?

```typescript
test('uses config service', function (assert) {
  const configService = this.owner.lookup('service:config');
  
  // Set mock data
  configService.config = {
    auth_provider: 'google',
    features: { drafts: true },
  };
  
  // Test code that uses config...
  assert.strictEqual(configService.config.auth_provider, 'google');
});
```

**Or use helper:**

```typescript
import { mockConfigService } from 'hermes/tests/helpers/mock-services';

test('uses config', function (assert) {
  mockConfigService(this.owner, { auth_provider: 'okta' });
  
  // Test code...
});
```

---

### Test Multiple Auth Providers?

```typescript
module('Service | session', function (hooks) {
  setupTest(hooks);

  module('Google provider', function () {
    test('handles Google OAuth', function (assert) {
      const configService = this.owner.lookup('service:config');
      configService.config = { auth_provider: 'google' };
      
      // Test Google-specific logic
    });
  });

  module('Okta provider', function () {
    test('handles Okta OIDC', function (assert) {
      const configService = this.owner.lookup('service:config');
      configService.config = { auth_provider: 'okta' };
      
      // Test Okta-specific logic
    });
  });

  module('Dex provider', function () {
    test('handles Dex OIDC', function (assert) {
      const configService = this.owner.lookup('service:config');
      configService.config = { auth_provider: 'dex' };
      
      // Test Dex-specific logic
    });
  });
});
```

---

### Test Async Operations?

**Always use `await`:**

```typescript
test('loads data', async function (assert) {
  const service = this.owner.lookup('service:my-service');
  
  // Await async operations
  const result = await service.loadData();
  
  assert.ok(result);
});
```

**In templates:**

```typescript
test('renders async data', async function (assert) {
  await render(hbs`<MyComponent />`);
  
  // Wait for data to load and render
  await waitFor('[data-test-loaded]');
  
  assert.dom('[data-test-data]').exists();
});
```

---

### Use Test Selectors?

**In templates (`.hbs`, `.gts`):**

```handlebars
<button data-test-submit-button {{on "click" this.submit}}>
  Save
</button>

<div data-test-document-card={{@document.id}}>
  <h2 data-test-document-title>{{@document.title}}</h2>
</div>
```

**In tests:**

```typescript
assert.dom('[data-test-submit-button]').exists();
assert.dom('[data-test-document-card="doc-1"]').exists();
assert.dom('[data-test-document-title]').hasText('My Title');
```

**Why?** 
- `data-test-*` attributes are stripped in production builds
- More stable than CSS classes or IDs
- Self-documenting test intent

---

### Assert DOM State?

**Using qunit-dom:**

```typescript
// Existence
assert.dom('[data-test-element]').exists();
assert.dom('[data-test-element]').doesNotExist();

// Count
assert.dom('[data-test-item]').exists({ count: 3 });

// Text content
assert.dom('[data-test-title]').hasText('Expected Text');
assert.dom('[data-test-title]').includesText('Partial');

// Attributes
assert.dom('[data-test-button]').hasAttribute('disabled');
assert.dom('[data-test-link]').hasAttribute('href', '/expected');

// CSS classes
assert.dom('[data-test-element]').hasClass('active');
assert.dom('[data-test-element]').doesNotHaveClass('disabled');

// Visibility
assert.dom('[data-test-element]').isVisible();
assert.dom('[data-test-element]').isNotVisible();

// Value (inputs)
assert.dom('[data-test-input]').hasValue('expected');
```

**See**: [qunit-dom API](https://github.com/simplabs/qunit-dom/blob/master/API.md)

---

### Verify Action Calls?

```typescript
test('calls action', async function (assert) {
  this.set('myAction', (value: string) => {
    assert.step(`action called: ${value}`);
  });

  await render(hbs`<MyComponent @onAction={{this.myAction}} />`);
  
  await click('[data-test-trigger]');
  
  assert.verifySteps(['action called: test']);
});
```

---

### Test Error States?

```typescript
test('displays error message', async function (assert) {
  this.server.get('/api/v2/documents', () => {
    return new Response(500, {}, { error: 'Server error' });
  });

  await visit('/documents');

  assert.dom('[data-test-error-message]').exists();
  assert.dom('[data-test-error-message]').includesText('Server error');
});
```

---

### Test Loading States?

```typescript
test('shows loading spinner', async function (assert) {
  this.server.get('/api/v2/documents', () => {
    // Delay response
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ documents: [] });
      }, 100);
    });
  });

  const visitPromise = visit('/documents');

  // Check loading state before promise resolves
  assert.dom('[data-test-loading-spinner]').exists();

  await visitPromise;

  // Loading state should be gone
  assert.dom('[data-test-loading-spinner]').doesNotExist();
});
```

---

### Test Empty States?

```typescript
test('shows empty state', async function (assert) {
  this.server.get('/api/v2/documents', () => ({
    documents: [],
  }));

  await visit('/documents');

  assert.dom('[data-test-empty-state]').exists();
  assert.dom('[data-test-empty-state-message]').hasText('No documents found');
});
```

---

### Check Coverage?

```bash
# Run tests with coverage
COVERAGE=true yarn test:ember

# Open HTML report
open coverage/index.html

# Check thresholds (exits with error if below)
node scripts/check-coverage.js

# Check specific threshold
node scripts/check-coverage.js --threshold=70
```

**Coverage files:**
- `coverage/index.html` - Browsable HTML report
- `coverage/lcov.info` - LCOV format for tools
- `coverage/coverage-summary.json` - JSON summary

---

### Generate a Test File?

```bash
# Component test
ember generate component-test my-component

# Service test
ember generate service-test my-service

# Acceptance test
ember generate acceptance-test my-route

# Helper test
ember generate helper-test my-helper
```

---

### Debug a Failing Test?

**1. Run in watch mode:**
```bash
yarn test:ember:watch
```

**2. Filter to your test:**
```bash
ember test --filter="my failing test"
```

**3. Add debugging:**
```typescript
test('my test', async function (assert) {
  await render(hbs`<MyComponent />`);
  
  // Pause execution (Chrome DevTools)
  debugger;
  
  // Log DOM
  console.log(this.element.innerHTML);
  
  // Log service state
  const service = this.owner.lookup('service:my-service');
  console.log(service.someProperty);
});
```

**4. Check Mirage:**
```typescript
// Log all requests
this.server.logging = true;

// Inspect server state
console.log(this.server.db.documents);
```

---

### Find Untested Code?

```bash
# Run coverage
COVERAGE=true yarn test:ember

# Open report
open coverage/index.html

# Sort by "Uncovered Lines" to find gaps
```

**In HTML report:**
- **Red lines** = Never executed
- **Yellow branches** = Partially covered
- **Green** = Fully covered

**Priority**: Test files with 0% coverage first

---

## Common Patterns

### Test Setup

```typescript
module('My Test', function (hooks) {
  setupTest(hooks); // or setupRenderingTest, setupApplicationTest
  
  hooks.beforeEach(function () {
    // Runs before each test
  });
  
  hooks.afterEach(function () {
    // Runs after each test
  });
});
```

### Nested Modules

```typescript
module('Service | my-service', function (hooks) {
  setupTest(hooks);

  module('method1', function () {
    test('case 1', function (assert) {
      // Test case 1
    });

    test('case 2', function (assert) {
      // Test case 2
    });
  });

  module('method2', function () {
    test('case 1', function (assert) {
      // Test case 1
    });
  });
});
```

### Skip/Only Tests

```typescript
// Skip this test
test.skip('not implemented yet', function (assert) {
  // ...
});

// Only run this test (for debugging)
test.only('focus on this', function (assert) {
  // ...
});
```

---

## Troubleshooting

### "Module not found" errors

```bash
rm -rf node_modules/.cache tmp/ dist/
yarn install
```

### Tests hang/timeout

```typescript
// Make sure you're awaiting async operations
await render(hbs`...`);
await visit('/route');
await click('[selector]');
```

### "Element not found" errors

```typescript
// Wait for element to appear
import { waitFor } from '@ember/test-helpers';

await waitFor('[data-test-element]');

// Or check if it exists first
if (document.querySelector('[data-test-element]')) {
  await click('[data-test-element]');
}
```

### Flaky tests

```typescript
// Bad - timing dependent
setTimeout(() => {
  assert.dom('[data-test-element]').exists();
}, 100);

// Good - use test helpers
await waitFor('[data-test-element]');
assert.dom('[data-test-element]').exists();
```

### "Session not authenticated" in tests

```typescript
import { setupMirage } from 'ember-cli-mirage/test-support';
import { authenticateTestUser } from 'hermes/mirage/utils';

module('My Test', function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function () {
    authenticateTestUser(this.server);
  });
});
```

---

## Quick Reference Links

**Documentation**:
- [Full Testing Patterns](./HERMES_TESTING_PATTERNS.md)
- [Test Strategy Roadmap](./HERMES_TEST_STRATEGY_2025.md)
- [Ember Testing Guide](./EMBER_TESTING_GUIDE.md)

**External Docs**:
- [Ember Testing](https://guides.emberjs.com/release/testing/)
- [QUnit API](https://qunitjs.com/api/)
- [qunit-dom](https://github.com/simplabs/qunit-dom/blob/master/API.md)
- [Test Helpers](https://github.com/emberjs/ember-test-helpers/blob/master/API.md)
- [Mirage](https://miragejs.com/docs/)

---

## Need Help?

1. Check [HERMES_TESTING_PATTERNS.md](./HERMES_TESTING_PATTERNS.md) for detailed examples
2. Look at existing tests in `tests/` for patterns
3. Search for similar tests: `grep -r "test description" tests/`
4. Ask in team Slack channel
5. Review [Test Strategy Roadmap](./HERMES_TEST_STRATEGY_2025.md)

---

**Remember**: Tests are documentation. Write them clearly!
