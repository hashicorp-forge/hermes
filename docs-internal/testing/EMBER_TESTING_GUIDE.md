# Ember Testing & Coverage Setup Guide

> **Note**: This is a general Ember testing guide. For Hermes-specific testing:
> - See [HERMES_TEST_STRATEGY_2025.md](./HERMES_TEST_STRATEGY_2025.md) for the complete roadmap
> - See [HERMES_TESTING_PATTERNS.md](./HERMES_TESTING_PATTERNS.md) for code examples
> - See [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) for fast answers

---

## Prerequisites

Ensure you have Ember 5.x+ installed:
```bash
npm install -g ember-cli
ember new my-app
cd my-app
```

## Install Coverage Tools

```bash
ember install ember-cli-code-coverage
```

This single addon handles everything: instrumentation, collection, and reporting.

**For Hermes**: Coverage is already installed and configured! See `.ember-cli-code-coverage.js`

## Configuration

**`.ember-cli-code-coverage.js`** in project root:
```javascript
module.exports = {
  reporters: ['lcov', 'html', 'text-summary'],
  coverageFolder: 'coverage',
  parallel: true,
  excludes: [
    '*/mirage/**/*',
    '*/tests/**/*',
  ]
};
```

**`ember-cli-build.js`** - add to existing file:
```javascript
const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function (defaults) {
  const app = new EmberApp(defaults, {
    'ember-cli-code-coverage': {
      modifyAssetLocation: function(path) {
        return path.replace('my-app', '');
      }
    }
  });

  return app.toTree();
};
```

## Running Tests with Coverage

```bash
# Run all tests with coverage
COVERAGE=true ember test

# Watch mode with coverage
COVERAGE=true ember test --server

# Filter specific tests
COVERAGE=true ember test --filter="unit"
```

View coverage report: `open coverage/index.html`

## Test Structure

### Component Integration Test
**`tests/integration/components/user-card-test.js`**
```javascript
import { module, test } from 'qunit';
import { setupRenderingTest } from 'my-app/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | user-card', function (hooks) {
  setupRenderingTest(hooks);

  test('renders user info', async function (assert) {
    this.user = { name: 'Alice', role: 'Developer' };
    
    await render(hbs`<UserCard @user={{this.user}} />`);
    
    assert.dom('[data-test-name]').hasText('Alice');
    assert.dom('[data-test-role]').hasText('Developer');
  });

  test('handles click action', async function (assert) {
    this.handleClick = () => assert.step('clicked');
    
    await render(hbs`<UserCard @onClick={{this.handleClick}} />`);
    await click('[data-test-button]');
    
    assert.verifySteps(['clicked']);
  });
});
```

### Unit Test
**`tests/unit/services/user-service-test.js`**
```javascript
import { module, test } from 'qunit';
import { setupTest } from 'my-app/tests/helpers';

module('Unit | Service | user', function (hooks) {
  setupTest(hooks);

  test('formats user display name', function (assert) {
    const service = this.owner.lookup('service:user');
    const result = service.formatName('alice', 'smith');
    
    assert.strictEqual(result, 'Alice Smith');
  });
});
```

### Acceptance Test
**`tests/acceptance/user-flow-test.js`**
```javascript
import { module, test } from 'qunit';
import { visit, click, fillIn, currentURL } from '@ember/test-helpers';
import { setupApplicationTest } from 'my-app/tests/helpers';

module('Acceptance | user flow', function (hooks) {
  setupApplicationTest(hooks);

  test('can create new user', async function (assert) {
    await visit('/users/new');
    
    await fillIn('[data-test-name-input]', 'Bob');
    await fillIn('[data-test-email-input]', 'bob@example.com');
    await click('[data-test-submit]');
    
    assert.strictEqual(currentURL(), '/users/1');
    assert.dom('[data-test-success]').exists();
  });
});
```

## Best Practices

### Use Data Attributes
```handlebars
<button data-test-submit {{on "click" this.save}}>
  Save
</button>
```

### Async Helpers
Always use `await` with DOM helpers:
```javascript
await render(hbs`<MyComponent />`);
await click('[data-test-button]');
await fillIn('input', 'value');
```

### Test Organization
```
tests/
├── integration/
│   ├── components/     # Component tests
│   └── helpers/        # Helper tests
├── unit/
│   ├── models/         # Model tests
│   ├── services/       # Service tests
│   └── utils/          # Utility tests
└── acceptance/         # End-to-end flows
```

## Coverage Targets

Add to `package.json`:
```json
{
  "scripts": {
    "test:coverage": "COVERAGE=true ember test",
    "test:coverage:check": "COVERAGE=true ember test && node scripts/check-coverage.js"
  }
}
```

**`scripts/check-coverage.js`**:
```javascript
const { readFileSync } = require('fs');
const coverage = JSON.parse(readFileSync('coverage/coverage-summary.json'));
const { total } = coverage;

const threshold = 80;
const metrics = ['lines', 'statements', 'functions', 'branches'];

let failed = false;
metrics.forEach(metric => {
  const pct = total[metric].pct;
  if (pct < threshold) {
    console.error(`❌ ${metric}: ${pct}% (threshold: ${threshold}%)`);
    failed = true;
  } else {
    console.log(`✅ ${metric}: ${pct}%`);
  }
});

process.exit(failed ? 1 : 0);
```

## CI Integration

**`.github/workflows/test.yml`**:
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: COVERAGE=true npm test
      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

## Quick Commands Reference

```bash
# Generate test file
ember generate component-test my-component
ember generate service-test my-service

# Run specific test
ember test --filter="user-card"

# Debug in browser
ember test --server

# Coverage report
COVERAGE=true ember test && open coverage/index.html
```

## Tips

1. **Parallel Testing**: Already enabled in modern Ember for speed
2. **Test Selectors**: Use `ember-test-selectors` for production-stripped attributes (already included in Ember 5+)
3. **Mirage**: Use `ember-cli-mirage` for API mocking
4. **Percy**: Add `@percy/ember` for visual regression testing

That's it! This setup gives you comprehensive testing with minimal configuration.