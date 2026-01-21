# Common Pitfalls

**Guide**: Ember Development Guide for Hermes  
**Section**: 07 - Common Pitfalls  
**Audience**: Frontend developers avoiding common mistakes

---

## Overview

This guide documents common issues developers encounter in the Hermes Ember codebase and their solutions.

---

## Test Runner Issues

### Problem: QUnit Reports "No Tests Were Run"

**Symptoms**:
- Test files exist and compile successfully
- Test files are in the compiled `tests.js` bundle
- No JavaScript errors in console
- QUnit reports "No tests were run"

**Root Cause**: `QUnit.start()` is called before test modules register with QUnit. The test files ARE in the bundle, but QUnit's module system hasn't executed them yet when `start()` is called.

**Current Status**: Known issue under investigation (see `docs-internal/TEST_COVERAGE_PROGRESS.md`)

**Workaround**: Continue writing tests following best practices. Tests are syntactically correct and will work once the loader issue is resolved.

**Potential Solutions** (requires investigation):
1. Remove explicit `start()` call and use `QUnit.config.autostart = true`
2. Check ember-qunit version compatibility with Ember 6.7.0
3. Verify test-loader configuration
4. Try manually calling `QUnit.start()` after a delay
5. Check for race condition in asset loading order

---

## Tracked Property Issues

### Problem: UI Doesn't Update When Property Changes

**Symptoms**:
- Change property value
- UI doesn't reflect the change
- No errors in console

**Root Cause**: Property is not tracked, or tracked object/array is mutated instead of reassigned.

**Examples**:

```typescript
// ❌ Bad: Property not tracked
export default class MyComponent extends Component {
  count = 0; // Not tracked!
  
  @action
  increment() {
    this.count++; // UI won't update
  }
}

// ✅ Good: Property tracked
export default class MyComponent extends Component {
  @tracked count = 0; // Tracked!
  
  @action
  increment() {
    this.count++; // UI updates
  }
}
```

```typescript
// ❌ Bad: Mutating tracked array
export default class MyComponent extends Component {
  @tracked items = ['a', 'b'];
  
  @action
  addItem() {
    this.items.push('c'); // UI won't update!
  }
}

// ✅ Good: Reassigning tracked array
export default class MyComponent extends Component {
  @tracked items = ['a', 'b'];
  
  @action
  addItem() {
    this.items = [...this.items, 'c']; // UI updates!
  }
}
```

```typescript
// ❌ Bad: Mutating tracked object
export default class MyComponent extends Component {
  @tracked user = { name: 'Alice', age: 30 };
  
  @action
  updateAge() {
    this.user.age = 31; // UI won't update!
  }
}

// ✅ Good: Reassigning tracked object
export default class MyComponent extends Component {
  @tracked user = { name: 'Alice', age: 30 };
  
  @action
  updateAge() {
    this.user = { ...this.user, age: 31 }; // UI updates!
  }
}
```

**Solution**: Always reassign tracked objects/arrays, don't mutate them.

---

## Ember Concurrency Testing

### Problem: Can't Mock ember-concurrency Tasks

**Symptoms**:
- Component uses tasks from `ember-concurrency`
- Can't easily mock tasks in tests
- Tests can't control task execution

**Root Cause**: Tasks are created with `task()` decorator/function and can't be easily stubbed.

**Workaround 1: Extract Logic**

```typescript
// ❌ Hard to test
export default class MyComponent extends Component {
  @task
  *loadData() {
    const response = yield this.fetchSvc.fetch('/api/data');
    const data = yield response.json();
    this.data = data;
  }
}

// ✅ Easier to test
export default class MyComponent extends Component {
  @task
  *loadData() {
    const data = yield this.fetchData();
    this.data = data;
  }
  
  // Separate method can be stubbed
  async fetchData() {
    const response = await this.fetchSvc.fetch('/api/data');
    return await response.json();
  }
}
```

**Workaround 2: Use `perform()`**

```typescript
// Test
test('it loads data', async function (assert) {
  const component = this.owner.factoryFor('component:my-component').create();
  
  // Stub the underlying method
  component.fetchData = async () => [{ id: 1 }];
  
  // Perform the task
  await component.loadData.perform();
  
  assert.strictEqual(component.data.length, 1);
});
```

**Workaround 3: Mock Fetch Service**

```typescript
test('it handles API errors', async function (assert) {
  this.owner.register('service:fetch', MockFetchService);
  const fetchSvc = this.owner.lookup('service:fetch');
  
  // Mock fetch to fail
  fetchSvc.setMockResponse('/api/data', { error: 'Not found' });
  
  await render(hbs`<MyComponent />`);
  
  assert.dom('[data-test-error]').exists();
});
```

---

## Service Injection Issues

### Problem: Service Has `any` Type

**Symptoms**:
- TypeScript doesn't provide autocomplete for service
- No type checking on service methods
- Service shows as `any` in IDE

**Root Cause**: Missing type declaration on `@service`.

**Example**:

```typescript
// ❌ Bad: No type declaration
export default class MyComponent extends Component {
  @service fetch; // Type is 'any'
  
  async load() {
    this.fetch.feetch(); // Typo not caught!
  }
}

// ✅ Good: Type declaration
export default class MyComponent extends Component {
  @service declare fetch: FetchService; // Type-safe!
  
  async load() {
    this.fetch.feetch(); // ❌ TypeScript error!
    this.fetch.fetch(); // ✅ Correct
  }
}
```

**Solution**: Always use `declare` with explicit type:
```typescript
@service declare serviceName: ServiceType;
```

---

## Component Args Issues

### Problem: Component Args Are Untyped

**Symptoms**:
- `this.args` has `any` type
- No autocomplete for args
- No validation of arg types

**Root Cause**: Missing signature interface.

**Example**:

```typescript
// ❌ Bad: No signature
export default class MyComponent extends Component {
  get title() {
    return this.args.title; // 'any' type
  }
}

// ✅ Good: With signature
interface MyComponentSignature {
  Args: {
    title: string;
    count?: number;
  };
}

export default class MyComponent extends Component<MyComponentSignature> {
  get title() {
    return this.args.title; // 'string' type
  }
}
```

**Solution**: Always define component signature interface.

---

## Template Syntax Errors

### Problem: Template Syntax Not Recognized

**Symptoms**:
- Build fails with template syntax error
- Ember can't parse template

**Common Issues**:

#### Missing `this.` in Template

```hbs
{{! ❌ Bad: Implicit this (unless allowed) }}
{{title}}

{{! ✅ Good: Explicit this }}
{{this.title}}
```

#### Incorrect Angle Bracket Syntax

```hbs
{{! ❌ Bad: Mixing curly and angle bracket syntax }}
<MyComponent 
  @title={{title}}
/>

{{! ✅ Good: Use this. for component properties }}
<MyComponent 
  @title={{this.title}}
/>
```

#### Incorrect Block Parameters

```hbs
{{! ❌ Bad: Wrong block parameter syntax }}
{{#each items as item}}
  {{item.name}}
{{/each}}

{{! ✅ Good: Use pipe syntax }}
{{#each this.items as |item|}}
  {{item.name}}
{{/each}}
```

---

## Build Errors

### Problem: "Cannot find module" During Build

**Symptoms**:
- Build fails with module not found error
- Module exists in `node_modules`

**Solutions**:

1. **Clear cache and reinstall**:
   ```bash
   rm -rf node_modules tmp dist
   yarn install
   ```

2. **Check tsconfig.json path mappings**:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "hermes/*": ["app/*"]
       }
     }
   }
   ```

3. **Check ember-cli-build.js aliases**:
   ```javascript
   autoImport: {
     webpack: {
       resolve: {
         alias: {
           'my-module': require.resolve('my-module')
         }
       }
     }
   }
   ```

### Problem: SASS Compilation Fails

**Symptoms**:
- Build fails with PostCSS or SASS error
- Error points to `.scss` file

**Solutions**:

1. **Check SASS syntax**:
   ```bash
   npx sass --check app/styles/app.scss
   ```

2. **Verify include paths**:
   ```javascript
   // ember-cli-build.js
   postcssOptions: {
     compile: {
       plugins: [
         {
           module: require('@csstools/postcss-sass'),
           options: {
             includePaths: [
               'node_modules',
               './node_modules/@hashicorp/design-system-tokens/dist/products/css'
             ]
           }
         }
       ]
     }
   }
   ```

---

## Routing Issues

### Problem: Route Not Found

**Symptoms**:
- Navigate to route, get 404 or error
- Route exists in `app/routes/`

**Solutions**:

1. **Check router.js**:
   ```javascript
   // app/router.js
   Router.map(function() {
     this.route('documents', function() {
       this.route('show', { path: '/:document_id' });
     });
   });
   ```

2. **Check route file naming**:
   ```
   app/routes/
   ├── documents.ts         # /documents
   └── documents/
       └── show.ts          # /documents/:document_id
   ```

3. **Check link-to usage**:
   ```hbs
   {{! ❌ Bad: Wrong route name }}
   <LinkTo @route="document" @model={{doc.id}}>

   {{! ✅ Good: Correct route name }}
   <LinkTo @route="documents.show" @model={{doc.id}}>
   ```

---

## Authentication Issues

### Problem: 401 Errors Despite Being Logged In

**Symptoms**:
- User is authenticated
- API requests return 401
- Token exists in session

**Solutions**:

1. **Check fetch service auth header**:
   ```typescript
   // services/fetch.ts
   async fetch(url: string, options: RequestInit = {}) {
     const headers = new Headers(options.headers);
     
     if (this.config.authProvider === 'google') {
       headers.set('Hermes-Google-Access-Token', this.session.data.authenticated.access_token);
     } else {
       headers.set('Authorization', `Bearer ${this.session.data.authenticated.access_token}`);
     }
     
     return fetch(url, { ...options, headers });
   }
   ```

2. **Check token expiration**:
   ```typescript
   get isAuthenticated(): boolean {
     if (!this.session.isAuthenticated) return false;
     
     const expiresAt = this.session.data.authenticated.expires_at;
     const now = Date.now() / 1000;
     
     return expiresAt > now;
   }
   ```

3. **Check backend auth provider config**:
   ```hcl
   # config.hcl
   auth {
     provider = "google"  # Must match frontend
   }
   ```

---

## HDS Component Issues

### Problem: HDS Component Not Rendering

**Symptoms**:
- HDS component doesn't display
- No error in console
- Component syntax looks correct

**Solutions**:

1. **Check HDS package is installed**:
   ```bash
   yarn list @hashicorp/design-system-components
   ```

2. **Check import syntax**:
   ```hbs
   {{! ✅ Correct: Angle bracket invocation }}
   <Hds::Button @text="Click Me" @color="primary" />
   
   {{! ❌ Wrong: Curly brace invocation }}
   {{hds/button text="Click Me"}}
   ```

3. **Check required args**:
   ```hbs
   {{! ❌ Missing required arg }}
   <Hds::Button @color="primary" />
   
   {{! ✅ Has required @text arg }}
   <Hds::Button @text="Click Me" @color="primary" />
   ```

---

## Debugging Tips

### Use Ember Inspector

Install Ember Inspector browser extension for:
- Component tree inspection
- Route inspection
- Service inspection
- Data inspection

### Use `debugger` Statement

```typescript
@action
handleClick() {
  debugger; // Pauses execution, opens DevTools
  console.log('Debug info:', this.myProperty);
}
```

### Use `console.log` Strategically

```typescript
@action
async loadData() {
  console.log('Loading data...');
  console.log('Current state:', this.data);
  
  const result = await this.fetchData();
  console.log('Fetched data:', result);
  
  this.data = result;
  console.log('New state:', this.data);
}
```

### Check Browser Console

Always check browser console for:
- JavaScript errors
- Network errors
- Ember deprecation warnings
- Custom console.log statements

---

## Best Practices to Avoid Issues

### ✅ DO

- Always use `@tracked` for reactive state
- Always use `declare` with `@service`
- Always define component signatures
- Always use `this.` in templates (unless explicitly allowed)
- Run `yarn test:types` frequently
- Clear build cache when encountering strange errors

### ❌ DON'T

- Don't mutate tracked objects/arrays
- Don't forget to clean up in `willDestroy()`
- Don't disable TypeScript/ESLint rules without understanding why
- Don't skip validation before committing
- Don't ignore deprecation warnings

---

## Next Steps

Continue to [08-migration-guide.md](./08-migration-guide.md) to learn about upgrading Ember and handling deprecations.
