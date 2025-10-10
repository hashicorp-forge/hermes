# TypeScript Setup & Patterns

**Guide**: Ember Development Guide for Hermes  
**Section**: 01 - TypeScript Setup & Patterns  
**Audience**: Frontend developers working with TypeScript in Ember

---

## Overview

Hermes uses TypeScript 5.x with Ember 6.7.0, providing type safety across the application. This guide covers TypeScript configuration, common patterns, and best practices specific to Ember + TypeScript development.

---

## TypeScript Configuration

### `tsconfig.json` Structure

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "types": ["ember-source/types"],
    "paths": {
      "hermes/*": ["app/*"],
      "hermes/tests/*": ["tests/*"],
      "*": ["types/*"]
    },
    "strict": false,  // Currently disabled (technical debt)
    "noEmit": true,   // Type checking only, no JS output
    "allowJs": true,
    "skipLibCheck": true
  },
  "include": [
    "app/**/*",
    "tests/**/*",
    "types/**/*"
  ],
  "glint": {
    "environment": ["ember-loose", "ember-template-imports"]
  }
}
```

**Key Points**:
- `"strict": false` - Not currently enforced (technical debt to address)
- `"noEmit": true` - TypeScript only validates types, doesn't generate output
- **Glint integration** - Provides type checking for Handlebars templates
- **Path mappings** - `hermes/*` resolves to `app/*` for imports

### Checking TypeScript Compilation

```bash
# Fast type check (no build)
yarn test:types

# Full build (includes type checking)
yarn build
```

---

## Ember-Specific TypeScript Patterns

### 1. Component Signatures

Components use a signature interface to define Args, Blocks, and Element:

```typescript
import Component from '@glimmer/component';

interface MyComponentSignature {
  Args: {
    title: string;
    count?: number;           // Optional arg
    onSave: (value: string) => void;
  };
  Blocks: {
    default: [message: string];  // Block params
  };
  Element: HTMLDivElement;       // Root element type
}

export default class MyComponent extends Component<MyComponentSignature> {
  // Access args with type safety
  get displayTitle(): string {
    return this.args.title.toUpperCase();
  }
}
```

**Template Usage**:
```hbs
<MyComponent 
  @title="Hello" 
  @count={{5}} 
  @onSave={{this.handleSave}}
as |message|>
  {{message}}
</MyComponent>
```

### 2. Service Injection

Services must be declared with explicit types:

```typescript
import Component from '@glimmer/component';
import { service } from '@ember/service';
import FetchService from 'hermes/services/fetch';
import ConfigService from 'hermes/services/config';
import RouterService from '@ember/routing/router-service';

export default class MyComponent extends Component {
  // Custom service with full type path
  @service('fetch') declare fetchSvc: FetchService;
  
  // Ember built-in service
  @service declare router: RouterService;
  
  // Custom service (name matches service file name)
  @service declare config: ConfigService;
}
```

**Service Declaration Pattern**:
```typescript
// app/services/my-service.ts
import Service from '@ember/service';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class MyService extends Service {
  @service declare router: RouterService;
  
  @tracked myState = '';
  
  async doSomething(): Promise<void> {
    // Implementation
  }
}

// Don't forget to declare the service globally
declare module '@ember/service' {
  interface Registry {
    'my-service': MyService;
  }
}
```

### 3. Tracked Properties

Use `@tracked` for reactive state that updates the UI:

```typescript
import { tracked } from '@glimmer/tracking';

export default class MyComponent extends Component {
  // Primitive tracking
  @tracked count = 0;
  @tracked isLoading = false;
  
  // Object tracking (requires reassignment)
  @tracked user = { name: 'Alice', age: 30 };
  
  updateUser() {
    // ✅ This works - reassignment triggers reactivity
    this.user = { ...this.user, age: 31 };
    
    // ❌ This doesn't work - mutation doesn't trigger reactivity
    this.user.age = 31;  
  }
  
  // Array tracking (requires reassignment)
  @tracked items: string[] = [];
  
  addItem(item: string) {
    // ✅ This works - creates new array
    this.items = [...this.items, item];
    
    // ❌ This doesn't work - mutation doesn't trigger reactivity
    this.items.push(item);
  }
}
```

**Key Rule**: `@tracked` detects reassignment, not mutation. Always create new objects/arrays.

### 4. Actions

Use `@action` to bind methods for template usage:

```typescript
import { action } from '@ember/object';

export default class MyComponent extends Component {
  @action
  handleClick(event: MouseEvent): void {
    // `this` is automatically bound
    console.log('Clicked', this.args.title);
  }
  
  @action
  async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    // Async actions are fine
    await this.saveData();
  }
  
  // Helper method (not an action)
  private async saveData(): Promise<void> {
    // Implementation
  }
}
```

**Template Usage**:
```hbs
<button {{on "click" this.handleClick}}>
  Click Me
</button>

<form {{on "submit" this.handleSubmit}}>
  <button type="submit">Submit</button>
</form>
```

---

## Glint - Template Type Checking

### What is Glint?

Glint provides TypeScript-style type checking for Ember templates. It understands:
- Component signatures
- Helper return types
- Argument types
- Block parameters

### Example with Type Checking

```typescript
// component.ts
interface UserCardSignature {
  Args: {
    user: { name: string; email: string };
    editable?: boolean;
  };
}

export default class UserCard extends Component<UserCardSignature> {
  @action
  handleEdit(): void {
    console.log('Edit', this.args.user.name);
  }
}
```

```hbs
{{! component.hbs - Glint checks these types }}
<div class="user-card">
  <h3>{{@user.name}}</h3>
  <p>{{@user.email}}</p>
  
  {{! Glint error: @user.phone doesn't exist in type }}
  {{!-- <p>{{@user.phone}}</p> --}}
  
  {{#if @editable}}
    <button {{on "click" this.handleEdit}}>Edit</button>
  {{/if}}
</div>
```

### Glint Configuration

Already configured in `tsconfig.json`:

```json
{
  "glint": {
    "environment": [
      "ember-loose",              // Allows untyped components
      "ember-template-imports"    // Supports <template> tag
    ]
  }
}
```

---

## Common Type Patterns

### 1. Type Files

Store shared types in `app/types/`:

```typescript
// app/types/document.ts
export interface HermesDocument {
  id: string;
  title: string;
  docNumber: string;
  status: DocumentStatus;
  owners: string[];
  createdTime: number;
  modifiedTime: number;
  customFields?: CustomEditableField[];
}

export enum DocumentStatus {
  WIP = 'WIP',
  InReview = 'In-Review',
  Approved = 'Approved',
  Obsolete = 'Obsolete',
}

export interface CustomEditableField {
  name: string;
  value: string;
  type: 'STRING' | 'PEOPLE';
}
```

**Usage**:
```typescript
import { HermesDocument, DocumentStatus } from 'hermes/types/document';

export default class DocumentList extends Component {
  documents: HermesDocument[] = [];
  
  get publishedDocs(): HermesDocument[] {
    return this.documents.filter(d => d.status === DocumentStatus.Approved);
  }
}
```

### 2. Generic Utility Types

```typescript
// Type for async task results
type AsyncResult<T> = Promise<T | null>;

// Type for event handlers
type EventHandler<T = Event> = (event: T) => void;

// Type for fetch responses
interface ApiResponse<T> {
  data: T;
  meta?: {
    page: number;
    total: number;
  };
}

// Usage
async fetchDocuments(): AsyncResult<HermesDocument[]> {
  const response = await this.fetchSvc.fetch('/api/v2/documents');
  if (!response.ok) return null;
  
  const json: ApiResponse<HermesDocument[]> = await response.json();
  return json.data;
}
```

### 3. Type Guards

```typescript
// Type guard for runtime type checking
function isDocument(obj: unknown): obj is HermesDocument {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'title' in obj &&
    'docNumber' in obj
  );
}

// Usage
async loadDocument(data: unknown): Promise<void> {
  if (!isDocument(data)) {
    throw new Error('Invalid document data');
  }
  
  // TypeScript now knows `data` is HermesDocument
  this.document = data;
}
```

### 4. Ember Data Models

```typescript
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import type PersonModel from './person';
import type DocumentModel from './document';

export default class ProjectModel extends Model {
  @attr('string') declare title: string;
  @attr('string') declare description: string;
  @attr('number') declare createdTime: number;
  
  @belongsTo('person', { async: false, inverse: null })
  declare creator: PersonModel;
  
  @hasMany('document', { async: false, inverse: null })
  declare documents: DocumentModel[];
}

// Module declaration for type registry
declare module 'ember-data/types/registries/model' {
  export default interface ModelRegistry {
    project: ProjectModel;
  }
}
```

---

## Type Safety Best Practices

### ✅ DO

```typescript
// Use explicit return types for public methods
async fetchData(): Promise<HermesDocument[]> {
  // Implementation
}

// Use strict null checking
function getTitle(doc: HermesDocument | null): string {
  return doc?.title ?? 'Untitled';
}

// Use type assertions sparingly and safely
const element = document.querySelector('#my-id') as HTMLInputElement;
if (element) {
  console.log(element.value);
}

// Use discriminated unions for state
type LoadingState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: HermesDocument[] }
  | { status: 'error'; error: Error };
```

### ❌ DON'T

```typescript
// Don't use `any` without justification
function doSomething(data: any) {  // ❌ Too loose
  return data.whatever;
}

// Don't ignore TypeScript errors with @ts-ignore
// @ts-ignore  // ❌ Hides real issues
this.router.transitionTo('invalid-route');

// Don't use non-null assertions carelessly
const doc = this.documents.find(d => d.id === '123')!;  // ❌ May be undefined

// Don't cast between incompatible types
const num = 'hello' as unknown as number;  // ❌ Dangerous
```

---

## Debugging Type Issues

### Issue: Service Injection Not Typed

```typescript
// ❌ Problem: Service has `any` type
@service fetch;

// ✅ Solution: Add type declaration
@service declare fetch: FetchService;
```

### Issue: Component Args Not Typed

```typescript
// ❌ Problem: Can't validate args
export default class MyComponent extends Component {
  get title() {
    return this.args.title;  // `args` is `any`
  }
}

// ✅ Solution: Add signature interface
interface MyComponentSignature {
  Args: { title: string };
}

export default class MyComponent extends Component<MyComponentSignature> {
  get title() {
    return this.args.title;  // Type-safe!
  }
}
```

### Issue: Template Block Parameters Not Typed

```typescript
// ❌ Problem: Block param has `any` type
interface MyComponentSignature {
  Args: { items: string[] };
}

// ✅ Solution: Define block signature
interface MyComponentSignature {
  Args: { items: string[] };
  Blocks: {
    default: [item: string, index: number];  // Block param types
  };
}
```

---

## Migration from JavaScript

### Step-by-Step TypeScript Migration

1. **Rename file from `.js` to `.ts`**
   ```bash
   mv app/components/my-component.js app/components/my-component.ts
   ```

2. **Add signature interface**
   ```typescript
   interface MyComponentSignature {
     Args: {
       // Document all @args
     };
   }
   
   export default class MyComponent extends Component<MyComponentSignature> {
   ```

3. **Add type declarations to services**
   ```typescript
   @service declare fetch: FetchService;
   @service declare router: RouterService;
   ```

4. **Add return types to methods**
   ```typescript
   async loadData(): Promise<void> {
     // Implementation
   }
   ```

5. **Fix type errors revealed by TypeScript**
   ```bash
   yarn test:types
   ```

---

## Resources

- **Ember TypeScript Guide**: https://docs.ember-cli-typescript.com/
- **Glint Documentation**: https://typed-ember.gitbook.io/glint/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/handbook/
- **Ember TypeScript Examples**: See `web/app/components/` for real examples

---

## Next Steps

Continue to [02-component-development.md](./02-component-development.md) to learn about Glimmer component patterns.
