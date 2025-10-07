# Hermes Web Testing Patterns & Best Practices

**Last Updated**: October 6, 2025  
**Ember Version**: 6.7.0  
**TypeScript**: 5.9.2

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Service Testing](#service-testing)
3. [Component Testing](#component-testing)
4. [Route Testing](#route-testing)
5. [Helper Testing](#helper-testing)
6. [Utility Testing](#utility-testing)
7. [Test Fixtures & Factories](#test-fixtures--factories)
8. [Mirage Configuration](#mirage-configuration)
9. [Test Selectors](#test-selectors)
10. [TypeScript Patterns](#typescript-patterns)
11. [Glint & Template Testing](#glint--template-testing)

---

## Quick Start

### Running Tests

```bash
# All tests
yarn test:ember

# Watch mode (interactive)
yarn test:ember:watch

# With coverage
yarn test:coverage

# Coverage with report
yarn test:coverage:report

# Filter tests
yarn test:unit
yarn test:integration
yarn test:acceptance

# Specific test
ember test --filter="session"
```

### Test Structure

```
tests/
├── acceptance/          # End-to-end user flows
│   └── authenticated/   # Authenticated routes
├── integration/         # Component & helper integration
│   ├── components/      # Component rendering tests
│   └── helpers/         # Helper tests
├── unit/               # Pure logic tests
│   ├── services/       # Service unit tests
│   ├── utils/          # Utility function tests
│   └── models/         # Model tests (if Ember Data)
├── helpers/            # Test helper functions
│   └── mock-services.ts
└── mirage-helpers/     # Mirage fixtures & utilities
    └── utils.ts
```

---

## Service Testing

### Pattern 1: Basic Service Test

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

  test('loads configuration from backend', async function (assert) {
    const service = this.owner.lookup('service:config') as ConfigService;
    
    // Mock the fetch response
    const mockConfig = {
      auth_provider: 'google',
      features: { drafts: true }
    };
    
    service.config = mockConfig;
    
    assert.strictEqual(service.config.auth_provider, 'google');
    assert.true(service.config.features.drafts);
  });
});
```

### Pattern 2: Service with Dependencies

```typescript
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { setupMirage } from 'ember-cli-mirage/test-support';
import type FetchService from 'hermes/services/fetch';
import type SessionService from 'hermes/services/session';

module('Unit | Service | fetch', function (hooks) {
  setupTest(hooks);
  setupMirage(hooks);

  test('adds auth headers to requests', async function (assert) {
    const fetchService = this.owner.lookup('service:fetch') as FetchService;
    const sessionService = this.owner.lookup('service:session') as SessionService;
    
    // Mock authenticated session
    sessionService.data = {
      authenticated: {
        access_token: 'test-token-123'
      }
    };
    
    // Setup mirage intercept
    this.server.get('/api/v2/documents', (schema, request) => {
      assert.ok(
        request.requestHeaders['Authorization'],
        'Authorization header is present'
      );
      return { documents: [] };
    });
    
    await fetchService.fetch('/api/v2/documents');
  });
});
```

### Pattern 3: Service with Provider Selection

```typescript
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import type AuthenticatedUserService from 'hermes/services/authenticated-user';

module('Unit | Service | authenticated-user', function (hooks) {
  setupTest(hooks);

  test('loads user info for Google provider', async function (assert) {
    const service = this.owner.lookup(
      'service:authenticated-user'
    ) as AuthenticatedUserService;
    
    // Mock config service
    const configService = this.owner.lookup('service:config');
    configService.config = { auth_provider: 'google' };
    
    // Mock API response
    const mockUser = {
      email: 'user@hashicorp.com',
      name: 'Test User',
      photo: 'https://example.com/photo.jpg'
    };
    
    // Test implementation...
    assert.ok(service);
  });

  test('loads user info for Okta provider', async function (assert) {
    const service = this.owner.lookup(
      'service:authenticated-user'
    ) as AuthenticatedUserService;
    
    const configService = this.owner.lookup('service:config');
    configService.config = { auth_provider: 'okta' };
    
    // Provider-specific logic...
    assert.ok(service);
  });
});
```

---

## Component Testing

### Pattern 1: Modern Template Tag Component (.gts)

```typescript
// tests/integration/components/action-test.ts
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | action', function (hooks) {
  setupRenderingTest(hooks);

  test('renders with text', async function (assert) {
    await render(hbs`
      <Action>
        Click me
      </Action>
    `);

    assert.dom('[data-test-action]').hasText('Click me');
  });

  test('handles click action', async function (assert) {
    this.set('handleClick', () => {
      assert.step('clicked');
    });

    await render(hbs`
      <Action @onClick={{this.handleClick}}>
        Button
      </Action>
    `);

    await click('[data-test-action]');
    
    assert.verifySteps(['clicked']);
  });

  test('applies disabled state', async function (assert) {
    await render(hbs`
      <Action @disabled={{true}}>
        Disabled
      </Action>
    `);

    assert.dom('[data-test-action]').hasAttribute('disabled');
  });
});
```

### Pattern 2: Component with Service Injection

```typescript
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import type SessionService from 'hermes/services/session';

module('Integration | Component | header/toolbar', function (hooks) {
  setupRenderingTest(hooks);

  test('shows user email when authenticated', async function (assert) {
    // Mock session service
    const sessionService = this.owner.lookup(
      'service:session'
    ) as SessionService;
    
    sessionService.data = {
      authenticated: {
        email: 'test@hashicorp.com'
      }
    };

    await render(hbs`<Header::Toolbar />`);

    assert.dom('[data-test-user-email]').hasText('test@hashicorp.com');
  });
});
```

### Pattern 3: Component with Complex State

```typescript
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, click, fillIn, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | inputs/people-select', function (hooks) {
  setupRenderingTest(hooks);

  test('searches for people', async function (assert) {
    this.set('people', [
      { email: 'alice@hashicorp.com', name: 'Alice' },
      { email: 'bob@hashicorp.com', name: 'Bob' },
    ]);
    
    this.set('selected', []);
    
    this.set('onChange', (person: any) => {
      this.set('selected', [...this.selected, person]);
      assert.step(`selected: ${person.name}`);
    });

    await render(hbs`
      <Inputs::PeopleSelect
        @people={{this.people}}
        @selected={{this.selected}}
        @onChange={{this.onChange}}
      />
    `);

    // Open dropdown
    await click('[data-test-people-select-trigger]');
    
    // Search
    await fillIn('[data-test-people-select-search]', 'alice');
    
    // Verify filtered results
    assert.strictEqual(
      findAll('[data-test-people-select-option]').length,
      1,
      'Shows only matching people'
    );
    
    // Select person
    await click('[data-test-people-select-option="alice@hashicorp.com"]');
    
    assert.verifySteps(['selected: Alice']);
    assert.strictEqual(this.selected.length, 1);
  });
});
```

---

## Route Testing

### Pattern 1: Acceptance Test for Route

```typescript
import { module, test } from 'qunit';
import { visit, currentURL, click } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';
import { setupMirage } from 'ember-cli-mirage/test-support';
import { authenticateTestUser } from 'hermes/mirage/utils';

module('Acceptance | authenticated/dashboard', function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function () {
    // Authenticate user
    authenticateTestUser(this.server);
    
    // Mock API responses
    this.server.get('/api/v2/documents', () => ({
      documents: [
        {
          id: 'doc-1',
          title: 'Test RFC',
          docType: 'RFC',
          status: 'In-Review',
        },
      ],
    }));
  });

  test('loads and displays recent documents', async function (assert) {
    await visit('/dashboard');

    assert.strictEqual(currentURL(), '/dashboard');
    assert.dom('[data-test-document-card]').exists({ count: 1 });
    assert.dom('[data-test-document-title]').hasText('Test RFC');
  });

  test('navigates to document detail', async function (assert) {
    await visit('/dashboard');
    
    await click('[data-test-document-card="doc-1"]');
    
    assert.strictEqual(currentURL(), '/document/doc-1');
  });
});
```

### Pattern 2: Route Model Hook Testing

```typescript
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { setupMirage } from 'ember-cli-mirage/test-support';
import type DocumentRoute from 'hermes/routes/authenticated/document';

module('Unit | Route | authenticated/document', function (hooks) {
  setupTest(hooks);
  setupMirage(hooks);

  test('loads document from API', async function (assert) {
    this.server.get('/api/v2/documents/:id', () => ({
      id: 'doc-123',
      title: 'Test Document',
      docType: 'RFC',
    }));

    const route = this.owner.lookup(
      'route:authenticated/document'
    ) as DocumentRoute;
    
    const model = await route.model({ document_id: 'doc-123' });
    
    assert.strictEqual(model.id, 'doc-123');
    assert.strictEqual(model.title, 'Test Document');
  });

  test('handles 404 errors', async function (assert) {
    this.server.get('/api/v2/documents/:id', () => {
      return new Response(404, {}, { error: 'Not found' });
    });

    const route = this.owner.lookup(
      'route:authenticated/document'
    ) as DocumentRoute;
    
    try {
      await route.model({ document_id: 'nonexistent' });
      assert.ok(false, 'Should have thrown');
    } catch (error) {
      assert.ok(true, 'Throws 404 error');
    }
  });
});
```

---

## Helper Testing

### Pattern 1: Rendering Helper

```typescript
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | time-ago', function (hooks) {
  setupRenderingTest(hooks);

  test('formats recent dates', async function (assert) {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    
    this.set('date', fiveMinutesAgo);

    await render(hbs`{{time-ago this.date}}`);

    assert.dom().hasText('5 minutes ago');
  });

  test('handles null dates', async function (assert) {
    this.set('date', null);

    await render(hbs`{{time-ago this.date}}`);

    assert.dom().hasText('');
  });
});
```

### Pattern 2: Computation Helper

```typescript
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | get-facet-label', function (hooks) {
  setupRenderingTest(hooks);

  test('returns correct label for facet', async function (assert) {
    this.set('facet', 'docType');

    await render(hbs`{{get-facet-label this.facet}}`);

    assert.dom().hasText('Type');
  });

  test('handles unknown facets', async function (assert) {
    this.set('facet', 'unknown');

    await render(hbs`{{get-facet-label this.facet}}`);

    assert.dom().hasText('');
  });
});
```

---

## Utility Testing

```typescript
import { module, test } from 'qunit';
import parseDate from 'hermes/utils/parse-date';
import timeAgo from 'hermes/utils/time-ago';
import isValidURL from 'hermes/utils/is-valid-u-r-l';

module('Unit | Utility | parse-date', function () {
  test('parses ISO date strings', function (assert) {
    const date = parseDate('2025-10-06T12:00:00Z');
    assert.ok(date instanceof Date);
    assert.strictEqual(date.getUTCFullYear(), 2025);
  });

  test('handles invalid dates', function (assert) {
    const date = parseDate('invalid');
    assert.strictEqual(date, null);
  });
});

module('Unit | Utility | time-ago', function () {
  test('formats recent times', function (assert) {
    const now = Date.now();
    const fiveMinutes = now - 5 * 60 * 1000;
    
    const result = timeAgo(new Date(fiveMinutes));
    assert.strictEqual(result, '5 minutes ago');
  });
});

module('Unit | Utility | is-valid-url', function () {
  test('validates URLs', function (assert) {
    assert.true(isValidURL('https://hashicorp.com'));
    assert.true(isValidURL('http://localhost:8000'));
    assert.false(isValidURL('not a url'));
    assert.false(isValidURL(''));
  });
});
```

---

## Test Fixtures & Factories

### Creating Mirage Factories

```typescript
// tests/mirage-helpers/factories/document.ts
import { Factory } from 'miragejs';

export default Factory.extend({
  id(i: number) {
    return `doc-${i}`;
  },
  
  title(i: number) {
    return `Test Document ${i}`;
  },
  
  docType() {
    return 'RFC';
  },
  
  status() {
    return 'In-Review';
  },
  
  product() {
    return 'Consul';
  },
  
  owners() {
    return ['user@hashicorp.com'];
  },
  
  createdAt() {
    return new Date().toISOString();
  },
  
  modifiedAt() {
    return new Date().toISOString();
  },
});
```

### Using Factories in Tests

```typescript
test('displays multiple documents', async function (assert) {
  // Create 5 documents
  this.server.createList('document', 5);
  
  // Create specific document
  this.server.create('document', {
    title: 'Special Doc',
    status: 'Approved',
  });
  
  await visit('/documents');
  
  assert.dom('[data-test-document-card]').exists({ count: 6 });
});
```

---

## Mirage Configuration

### Setting Up Mirage for Tests

```typescript
// tests/helpers/setup-mirage.ts
import { setupMirage as baseSetupMirage } from 'ember-cli-mirage/test-support';
import { authenticateTestUser } from 'hermes/mirage/utils';

export function setupMirageWithAuth(hooks: NestedHooks) {
  baseSetupMirage(hooks);
  
  hooks.beforeEach(function () {
    // Authenticate by default
    authenticateTestUser(this.server);
    
    // Setup common mocks
    this.server.get('/api/v2/web/config', () => ({
      auth_provider: 'google',
      features: { drafts: true, projects: true },
    }));
    
    this.server.get('/api/v2/me', () => ({
      email: 'test@hashicorp.com',
      name: 'Test User',
    }));
  });
}
```

---

## Test Selectors

### Best Practices

```handlebars
{{! ✅ Good - semantic test selectors }}
<button data-test-submit-button {{on "click" this.submit}}>
  Save
</button>

<div data-test-document-card={{@document.id}}>
  <h2 data-test-document-title>{{@document.title}}</h2>
  <span data-test-document-status>{{@document.status}}</span>
</div>

{{! ❌ Bad - relying on classes or IDs }}
<button class="submit-btn" {{on "click" this.submit}}>
  Save
</button>
```

### Using ember-test-selectors

The `ember-test-selectors` addon (already installed) strips `data-test-*` attributes in production builds, keeping bundle size small while making tests maintainable.

---

## TypeScript Patterns

### Type-Safe Test Contexts

```typescript
import { TestContext } from 'ember-test-helpers';

interface DocumentTestContext extends TestContext {
  document: {
    id: string;
    title: string;
    status: string;
  };
  handleSave: (doc: any) => void;
}

module('Integration | Component | doc/form', function (hooks) {
  setupRenderingTest(hooks);

  test('saves document', async function (this: DocumentTestContext, assert) {
    this.set('document', {
      id: 'doc-1',
      title: 'Test',
      status: 'Draft',
    });
    
    this.set('handleSave', (doc) => {
      assert.strictEqual(doc.id, 'doc-1');
    });

    await render<DocumentTestContext>(hbs`
      <Doc::Form
        @document={{this.document}}
        @onSave={{this.handleSave}}
      />
    `);
    
    await click('[data-test-save]');
  });
});
```

---

## Glint & Template Testing

### Testing Template Tag Components

```typescript
// app/components/my-component.gts
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { on } from '@ember/modifier';

export interface MyComponentSignature {
  Args: {
    title: string;
    onAction: () => void;
  };
}

export default class MyComponent extends Component<MyComponentSignature> {
  @tracked count = 0;

  increment = () => {
    this.count++;
  };

  <template>
    <div data-test-my-component>
      <h1 data-test-title>{{@title}}</h1>
      <p data-test-count>{{this.count}}</p>
      <button
        data-test-increment
        type="button"
        {{on "click" this.increment}}
      >
        Increment
      </button>
      <button
        data-test-action
        type="button"
        {{on "click" @onAction}}
      >
        Action
      </button>
    </div>
  </template>
}
```

```typescript
// tests/integration/components/my-component-test.ts
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, click } from '@ember/test-helpers';
import MyComponent from 'hermes/components/my-component';

module('Integration | Component | my-component', function (hooks) {
  setupRenderingTest(hooks);

  test('renders with args', async function (assert) {
    await render(
      <template>
        <MyComponent @title="Test Title" @onAction={{fn (mut this.clicked) true}} />
      </template>
    );

    assert.dom('[data-test-title]').hasText('Test Title');
    assert.dom('[data-test-count]').hasText('0');
  });

  test('increments count', async function (assert) {
    await render(
      <template>
        <MyComponent @title="Test" @onAction={{fn (noop)}} />
      </template>
    );

    await click('[data-test-increment]');
    assert.dom('[data-test-count]').hasText('1');
    
    await click('[data-test-increment]');
    assert.dom('[data-test-count]').hasText('2');
  });
});
```

---

## Best Practices Summary

### ✅ Do

1. **Use data-test selectors** for all test assertions
2. **Mock services** instead of hitting real APIs
3. **Use Mirage** for acceptance tests
4. **Test user flows**, not implementation details
5. **Keep tests focused** - one concept per test
6. **Use type-safe contexts** with TypeScript
7. **Async/await** for all asynchronous operations
8. **Verify steps** for action sequences
9. **Clean up** in afterEach hooks
10. **Run coverage** regularly to find gaps

### ❌ Don't

1. **Don't rely on timing** - use test helpers
2. **Don't test library code** - trust Ember
3. **Don't use arbitrary waits** - use waitFor/waitUntil
4. **Don't test CSS classes** - use semantic selectors
5. **Don't duplicate tests** - use beforeEach for setup
6. **Don't ignore TypeScript** - fix type errors
7. **Don't skip cleanup** - prevent test pollution
8. **Don't test private methods** - test public API
9. **Don't mock everything** - balance isolation and integration
10. **Don't ignore coverage** - aim for >60%

---

## Resources

- [Ember Guides - Testing](https://guides.emberjs.com/release/testing/)
- [Ember QUnit Docs](https://github.com/emberjs/ember-qunit)
- [QUnit DOM API](https://github.com/simplabs/qunit-dom/blob/master/API.md)
- [Mirage Docs](https://miragejs.com/docs/getting-started/introduction/)
- [Test Helpers](https://github.com/emberjs/ember-test-helpers/blob/master/API.md)
- [Hermes Testing Guide](./EMBER_TESTING_GUIDE.md)
- [Coverage Reports](../../coverage/index.html)

---

## Next Steps

1. Read the [Test Strategy Roadmap](./HERMES_TEST_STRATEGY_2025.md)
2. Review [Upgrade Strategy](../EMBER_UPGRADE_STRATEGY.md)
3. Set up coverage monitoring in CI
4. Start with high-priority service tests
5. Gradually increase coverage to 60%+ target
