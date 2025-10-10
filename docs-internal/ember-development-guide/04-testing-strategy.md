# Testing Strategy

**Guide**: Ember Development Guide for Hermes  
**Section**: 04 - Testing Strategy  
**Audience**: Frontend developers writing tests

---

## Overview

Hermes uses QUnit and ember-qunit for testing. This guide covers testing patterns for unit, integration, and acceptance tests.

**Current Status** ⚠️: Test runner has known issues (see [07-common-pitfalls.md](./07-common-pitfalls.md#test-runner-issues)). Continue writing tests following these patterns - they will work once the loader issue is resolved.

---

## Test Types

| Test Type | Scope | Speed | Purpose |
|-----------|-------|-------|---------|
| **Unit** | Single class/function | Fast | Test logic in isolation |
| **Integration** | Component + template | Medium | Test component rendering & interaction |
| **Acceptance** | Full application | Slow | Test complete user workflows |

---

## Test Infrastructure

### Test Helper Setup

```typescript
// tests/test-helper.ts
import Application from 'hermes/app';
import config from 'hermes/config/environment';
import * as QUnit from 'qunit';
import { setApplication } from '@ember/test-helpers';
import { setup } from 'qunit-dom';
import { start } from 'ember-qunit';
import { loadTests } from 'ember-qunit/test-loader';

setApplication(Application.create(config.APP));
setup(QUnit.assert);
loadTests();
start();
```

### Mock Services

```typescript
// tests/helpers/mock-services.ts
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

/**
 * Mock ConfigService for testing
 */
export class MockConfigService extends Service {
  @tracked config = {
    auth_provider: 'google' as 'google' | 'okta' | 'dex',
    api_version: 'v2',
    algolia_docs_index_name: 'test-docs',
    feature_flags: {} as Record<string, boolean>,
  };

  setAuthProvider(provider: 'google' | 'okta' | 'dex') {
    this.config.auth_provider = provider;
  }
}

/**
 * Mock FetchService for testing
 */
export class MockFetchService extends Service {
  @tracked fetchCalls: Array<{ url: string; options?: RequestInit }> = [];
  @tracked mockResponses: Map<string, unknown> = new Map();

  async fetch(url: string, options?: RequestInit): Promise<Response> {
    this.fetchCalls.push({ url, options });
    
    const mockData = this.mockResponses.get(url);
    if (mockData) {
      return new Response(JSON.stringify(mockData), { status: 200 });
    }
    
    return new Response(null, { status: 404 });
  }
  
  setMockResponse(url: string, data: unknown): void {
    this.mockResponses.set(url, data);
  }
}

/**
 * Register mock services in test context
 */
export function registerMockServices(owner: Owner): void {
  owner.register('service:config', MockConfigService);
  owner.register('service:fetch', MockFetchService);
}
```

---

## Unit Tests

Test individual classes, functions, and services in isolation.

### Testing Services

```typescript
// tests/unit/services/config-test.ts
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import ConfigService from 'hermes/services/config';

module('Unit | Service | config', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    const service = this.owner.lookup('service:config') as ConfigService;
    assert.ok(service);
  });

  test('setConfig updates configuration', function (assert) {
    const service = this.owner.lookup('service:config') as ConfigService;
    
    service.setConfig({
      auth_provider: 'okta',
      api_version: 'v2',
    });
    
    assert.strictEqual(service.config.auth_provider, 'okta');
    assert.strictEqual(service.config.api_version, 'v2');
  });

  test('apiVersion returns correct version', function (assert) {
    const service = this.owner.lookup('service:config') as ConfigService;
    
    // Default
    assert.strictEqual(service.apiVersion, 'v1');
    
    // With feature flag
    service.setConfig({
      feature_flags: { 'use_v2_api': true },
    });
    
    assert.strictEqual(service.apiVersion, 'v2');
  });
});
```

### Testing Utilities

```typescript
// tests/unit/utils/clean-string-test.ts
import { module, test } from 'qunit';
import cleanString from 'hermes/utils/clean-string';

module('Unit | Utility | clean-string', function () {
  test('it removes extra whitespace', function (assert) {
    assert.strictEqual(cleanString('  hello  world  '), 'hello world');
  });

  test('it handles empty strings', function (assert) {
    assert.strictEqual(cleanString(''), '');
    assert.strictEqual(cleanString('   '), '');
  });

  test('it preserves single spaces', function (assert) {
    assert.strictEqual(cleanString('hello world'), 'hello world');
  });
});
```

### Testing with Mock Dependencies

```typescript
// tests/unit/services/document-repository-test.ts
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { MockFetchService } from 'hermes/tests/helpers/mock-services';

module('Unit | Service | document-repository', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    // Register mock fetch service
    this.owner.register('service:fetch', MockFetchService);
  });

  test('getDocument fetches from API', async function (assert) {
    const service = this.owner.lookup('service:document-repository');
    const fetchSvc = this.owner.lookup('service:fetch') as MockFetchService;
    
    // Mock the response
    fetchSvc.setMockResponse('/api/v2/documents/123', {
      id: '123',
      title: 'Test Document',
    });
    
    const doc = await service.getDocument('123');
    
    assert.strictEqual(doc.id, '123');
    assert.strictEqual(doc.title, 'Test Document');
    assert.strictEqual(fetchSvc.fetchCalls.length, 1);
    assert.strictEqual(fetchSvc.fetchCalls[0].url, '/api/v2/documents/123');
  });
});
```

---

## Integration Tests

Test components with their templates in a rendered context.

### Basic Component Test

```typescript
// tests/integration/components/status-badge-test.ts
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | status-badge', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders draft status', async function (assert) {
    await render(hbs`<StatusBadge @status="draft" />`);
    
    assert.dom('[data-test-status-badge]').exists();
    assert.dom('[data-test-status-badge]').hasText('draft');
    assert.dom('[data-test-status-badge]').hasClass('badge-warning');
  });

  test('it renders published status', async function (assert) {
    await render(hbs`<StatusBadge @status="published" />`);
    
    assert.dom('[data-test-status-badge]').hasText('published');
    assert.dom('[data-test-status-badge]').hasClass('badge-success');
  });
});
```

### Testing User Interactions

```typescript
// tests/integration/components/search-box-test.ts
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, fillIn, triggerEvent, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | search-box', function (hooks) {
  setupRenderingTest(hooks);

  test('it calls onSearch when input changes', async function (assert) {
    let searchQuery = '';
    this.set('handleSearch', (query: string) => {
      searchQuery = query;
    });

    await render(hbs`
      <SearchBox @onSearch={{this.handleSearch}} />
    `);

    await fillIn('[data-test-search-input]', 'test query');
    await triggerEvent('[data-test-search-input]', 'input');

    assert.strictEqual(searchQuery, 'test query');
  });

  test('it clears input when clear button clicked', async function (assert) {
    await render(hbs`<SearchBox />`);

    await fillIn('[data-test-search-input]', 'test query');
    await click('[data-test-clear-button]');

    assert.dom('[data-test-search-input]').hasValue('');
  });
});
```

### Testing with Mock Services

```typescript
// tests/integration/components/document-list-test.ts
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, waitFor } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { MockFetchService } from 'hermes/tests/helpers/mock-services';

module('Integration | Component | document-list', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('service:fetch', MockFetchService);
  });

  test('it loads and displays documents', async function (assert) {
    const fetchSvc = this.owner.lookup('service:fetch') as MockFetchService;
    
    fetchSvc.setMockResponse('/api/v2/documents', [
      { id: '1', title: 'Doc 1' },
      { id: '2', title: 'Doc 2' },
    ]);

    await render(hbs`<DocumentList />`);

    await waitFor('[data-test-document-item]');

    assert.dom('[data-test-document-item]').exists({ count: 2 });
    assert.dom('[data-test-document-item="1"]').hasText('Doc 1');
    assert.dom('[data-test-document-item="2"]').hasText('Doc 2');
  });

  test('it shows loading state', async function (assert) {
    await render(hbs`<DocumentList />`);

    assert.dom('[data-test-loading-spinner]').exists();
  });
});
```

### Testing Ember Concurrency Tasks

```typescript
// tests/integration/components/save-button-test.ts
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, click, waitUntil } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | save-button', function (hooks) {
  setupRenderingTest(hooks);

  test('it shows loading state while saving', async function (assert) {
    let resolveSave: () => void;
    const savePromise = new Promise<void>(resolve => {
      resolveSave = resolve;
    });

    this.set('handleSave', () => savePromise);

    await render(hbs`
      <SaveButton @onSave={{this.handleSave}} />
    `);

    const clickPromise = click('[data-test-save-button]');

    await waitUntil(() => 
      document.querySelector('[data-test-save-button]')?.getAttribute('disabled')
    );

    assert.dom('[data-test-save-button]').isDisabled();
    assert.dom('[data-test-save-button]').hasText('Saving...');

    resolveSave!();
    await clickPromise;

    assert.dom('[data-test-save-button]').isNotDisabled();
    assert.dom('[data-test-save-button]').hasText('Save');
  });
});
```

---

## Acceptance Tests

Test complete user workflows through the application.

### Basic Acceptance Test

```typescript
// tests/acceptance/document-creation-test.ts
import { module, test } from 'qunit';
import { visit, currentURL, fillIn, click } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';
import { setupMirage } from 'ember-cli-mirage/test-support';

module('Acceptance | document creation', function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  test('visiting /documents/new', async function (assert) {
    await visit('/documents/new');

    assert.strictEqual(currentURL(), '/documents/new');
    assert.dom('h1').hasText('Create New Document');
  });

  test('creating a new document', async function (assert) {
    await visit('/documents/new');

    await fillIn('[data-test-title-input]', 'My New Document');
    await fillIn('[data-test-summary-input]', 'This is a test document');
    await click('[data-test-doc-type-select]');
    await click('[data-test-doc-type-option="RFC"]');
    await click('[data-test-create-button]');

    assert.strictEqual(currentURL(), '/documents/RFC-001');
    assert.dom('h1').hasText('My New Document');
  });
});
```

### Testing Authentication Flows

```typescript
// tests/acceptance/authentication-test.ts
import { module, test } from 'qunit';
import { visit, currentURL, click } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';
import { setupMirage } from 'ember-cli-mirage/test-support';

module('Acceptance | authentication', function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  test('redirects to login when not authenticated', async function (assert) {
    await visit('/documents');

    assert.strictEqual(currentURL(), '/auth/login');
  });

  test('allows access when authenticated', async function (assert) {
    // Mock authentication
    this.server.post('/auth/authenticate', () => ({
      access_token: 'test-token',
      expires_at: Date.now() + 3600000,
    }));

    await visit('/auth/login');
    await click('[data-test-google-login-button]');

    assert.strictEqual(currentURL(), '/documents');
  });
});
```

---

## Mirage Setup

Mirage mocks API responses for testing.

### Basic Mirage Configuration

```typescript
// mirage/config.ts
import { Server } from 'miragejs';

export default function (this: Server) {
  this.namespace = 'api/v2';

  // Documents endpoints
  this.get('/documents', (schema) => {
    return schema.db.documents;
  });

  this.get('/documents/:id', (schema, request) => {
    const { id } = request.params;
    return schema.db.documents.find(id);
  });

  this.post('/documents', (schema, request) => {
    const attrs = JSON.parse(request.requestBody);
    return schema.db.documents.create(attrs);
  });

  this.patch('/documents/:id', (schema, request) => {
    const { id } = request.params;
    const attrs = JSON.parse(request.requestBody);
    return schema.db.documents.update(id, attrs);
  });

  this.delete('/documents/:id', (schema, request) => {
    const { id } = request.params;
    schema.db.documents.remove(id);
    return { success: true };
  });
}
```

### Seeding Test Data

```typescript
// mirage/scenarios/default.ts
import { Server } from 'miragejs';

export default function (server: Server) {
  // Create test documents
  server.create('document', {
    id: '1',
    title: 'Test RFC',
    docNumber: 'RFC-001',
    status: 'published',
  });

  server.create('document', {
    id: '2',
    title: 'Draft PRD',
    docNumber: 'PRD-042',
    status: 'draft',
  });
}
```

---

## Test Data Builders

Create reusable test data factories:

```typescript
// tests/helpers/test-data.ts

export function createMockDocument(overrides?: Partial<HermesDocument>): HermesDocument {
  return {
    id: '123',
    title: 'Test Document',
    docNumber: 'RFC-001',
    status: 'draft',
    owners: ['user@example.com'],
    createdTime: Date.now(),
    modifiedTime: Date.now(),
    ...overrides,
  };
}

export function createMockProject(overrides?: Partial<HermesProject>): HermesProject {
  return {
    id: 'proj-1',
    title: 'Test Project',
    description: 'A test project',
    status: 'active',
    ...overrides,
  };
}

export function createMockUser(overrides?: Partial<User>): User {
  return {
    email: 'test@example.com',
    name: 'Test User',
    photoUrl: 'https://example.com/photo.jpg',
    ...overrides,
  };
}
```

**Usage**:
```typescript
test('displays document info', async function (assert) {
  const doc = createMockDocument({
    title: 'My Special Doc',
    status: 'published',
  });

  this.set('document', doc);
  await render(hbs`<DocumentCard @document={{this.document}} />`);

  assert.dom('[data-test-title]').hasText('My Special Doc');
  assert.dom('[data-test-status]').hasText('published');
});
```

---

## Test Organization

### File Naming

- Unit tests: `tests/unit/<path>/<name>-test.ts`
- Integration tests: `tests/integration/components/<name>-test.ts`
- Acceptance tests: `tests/acceptance/<feature>-test.ts`

### Module Organization

Group related tests in modules:

```typescript
module('Unit | Service | algolia', function (hooks) {
  setupTest(hooks);

  module('searchDocs', function () {
    test('performs basic search', async function (assert) {
      // Test implementation
    });

    test('includes facets when requested', async function (assert) {
      // Test implementation
    });

    test('handles errors', async function (assert) {
      // Test implementation
    });
  });

  module('getFacetValues', function () {
    test('returns facet values', async function (assert) {
      // Test implementation
    });
  });
});
```

---

## Best Practices

### ✅ DO

- Use `data-test-*` attributes for test selectors
- Write descriptive test names that explain what is being tested
- Test one thing per test
- Use test helpers and factories for reusable setup
- Mock external dependencies (API, services)
- Test error states and edge cases
- Clean up after tests (timers, listeners, etc.)

### ❌ DON'T

- Don't test implementation details (test behavior, not internal state)
- Don't use brittle CSS selectors (use `data-test-*` instead)
- Don't make tests dependent on each other
- Don't use real API calls in tests
- Don't skip tests without a good reason
- Don't test framework behavior (trust Ember works)

---

## Running Tests

```bash
# Run all tests
yarn test

# Run unit tests only
yarn test:unit

# Run integration tests only
yarn test:integration

# Run acceptance tests only
yarn test:acceptance

# Run tests in watch mode
yarn test:ember:watch

# Run specific test file
yarn test:ember:filter="service/config"

# Run with coverage
yarn test:coverage
```

---

## Code Coverage

### Generating Coverage Reports

```bash
# Run tests with coverage
yarn test:coverage

# Open coverage report
yarn test:coverage:report
```

### Coverage Configuration

```javascript
// ember-cli-build.js
module.exports = function (defaults) {
  let app = new EmberApp(defaults, {
    'ember-cli-code-coverage': {
      modifyAssetLocation: function(path) {
        return path.replace('hermes', '');
      }
    },
  });
  return app.toTree();
};
```

---

## Debugging Tests

### Browser Debugging

```bash
# Start test server
yarn test:ember:watch

# Visit http://localhost:7357 in browser
# Open browser DevTools for debugging
```

### Console Logging

```typescript
test('debugs with console.log', async function (assert) {
  const service = this.owner.lookup('service:my-service');
  
  console.log('Service state:', service.data);
  
  await service.loadData();
  
  console.log('After load:', service.data);
  
  assert.ok(service.data.length > 0);
});
```

### Pausing Execution

```typescript
import { pauseTest, resumeTest } from '@ember/test-helpers';

test('pauses for inspection', async function (assert) {
  await render(hbs`<MyComponent />`);
  
  await pauseTest(); // Pauses test, keeps browser open
  
  // Interact with page manually in browser
  // Call resumeTest() in console to continue
});
```

---

## Next Steps

Continue to [05-linting-type-checking.md](./05-linting-type-checking.md) to learn about code quality tools.
