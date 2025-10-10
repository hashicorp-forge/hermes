# Component Development

**Guide**: Ember Development Guide for Hermes  
**Section**: 02 - Component Development  
**Audience**: Frontend developers building Ember components

---

## Overview

Hermes uses modern Glimmer components with TypeScript. This guide covers component patterns, template syntax, and best practices specific to the Hermes codebase.

---

## Component Architecture

### File Structure Options

#### Option 1: Separate Files (Recommended for complex components)

```
app/components/
├── document/
│   ├── sidebar.ts       # Component logic
│   └── sidebar.hbs      # Template
```

#### Option 2: Single File with `<template>` (Recommended for simple components)

```typescript
// app/components/status-badge.ts
import Component from '@glimmer/component';
import { service } from '@ember/service';

interface StatusBadgeSignature {
  Args: {
    status: 'draft' | 'published' | 'archived';
  };
}

export default class StatusBadge extends Component<StatusBadgeSignature> {
  get badgeColor(): string {
    const colors = {
      draft: 'warning',
      published: 'success',
      archived: 'neutral',
    };
    return colors[this.args.status];
  }
}

<template>
  <span class="badge badge-{{this.badgeColor}}">
    {{@status}}
  </span>
</template>
```

**When to use each**:
- **Separate files**: Components with complex logic (>200 lines), multiple helper methods, or extensive templates
- **Single file**: Simple presentational components, modifiers, helpers

---

## Component Template

### Basic Component Structure

```typescript
// app/components/user-profile.ts
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';
import FetchService from 'hermes/services/fetch';

interface UserProfileSignature {
  Args: {
    userId: string;
    editable?: boolean;
    onSave?: (data: UserData) => void;
  };
  Blocks: {
    header?: [];
    default: [user: UserData];
  };
}

interface UserData {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export default class UserProfile extends Component<UserProfileSignature> {
  @service declare fetch: FetchService;
  
  @tracked user: UserData | null = null;
  @tracked isLoading = false;
  @tracked error: string | null = null;
  
  constructor(owner: unknown, args: UserProfileSignature['Args']) {
    super(owner, args);
    void this.loadUser();
  }
  
  async loadUser(): Promise<void> {
    this.isLoading = true;
    this.error = null;
    
    try {
      const response = await this.fetch.fetch(`/api/v2/users/${this.args.userId}`);
      if (!response.ok) throw new Error('Failed to load user');
      
      this.user = await response.json() as UserData;
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.isLoading = false;
    }
  }
  
  @action
  async handleSave(data: UserData): Promise<void> {
    // Save logic
    this.args.onSave?.(data);
  }
}
```

```hbs
{{! app/components/user-profile.hbs }}
<div class="user-profile">
  {{#if @editable}}
    {{yield to="header"}}
  {{/if}}
  
  {{#if this.isLoading}}
    <LoadingSpinner />
  {{else if this.error}}
    <ErrorMessage @message={{this.error}} />
  {{else if this.user}}
    {{yield this.user}}
  {{/if}}
</div>
```

**Usage**:
```hbs
<UserProfile @userId="123" @editable={{true}} @onSave={{this.handleUserSave}} as |user|>
  <:header>
    <h2>Edit Profile</h2>
  </:header>
  
  <:default as |user|>
    <div class="user-info">
      <img src={{user.avatarUrl}} alt={{user.name}} />
      <h3>{{user.name}}</h3>
      <p>{{user.email}}</p>
    </div>
  </:default>
</UserProfile>
```

---

## Component Lifecycle

### Constructor

Use for initialization that doesn't depend on the DOM:

```typescript
export default class MyComponent extends Component<MyComponentSignature> {
  @service declare fetch: FetchService;
  @tracked data: Data[] = [];
  
  constructor(owner: unknown, args: MyComponentSignature['Args']) {
    super(owner, args);
    // ✅ Good: Load data, set up subscriptions
    void this.loadData();
    
    // ❌ Bad: Access DOM (doesn't exist yet)
    // document.querySelector('#my-element');
  }
  
  async loadData(): Promise<void> {
    const response = await this.fetch.fetch('/api/data');
    this.data = await response.json();
  }
}
```

### Modifiers for DOM Access

Use modifiers when you need to interact with DOM elements:

```typescript
import { modifier } from 'ember-modifier';

// Simple functional modifier
const focusInput = modifier((element: HTMLInputElement) => {
  element.focus();
});

// Modifier with cleanup
const setupChart = modifier((element: HTMLCanvasElement, [data]: [ChartData]) => {
  const chart = new Chart(element, { data });
  
  // Return cleanup function
  return () => {
    chart.destroy();
  };
});
```

**Usage in template**:
```hbs
<input {{focusInput}} />
<canvas {{setupChart this.chartData}}></canvas>
```

### willDestroy

Clean up resources when component is destroyed:

```typescript
export default class MyComponent extends Component {
  subscription: Subscription | null = null;
  
  constructor(owner: unknown, args: MyComponentSignature['Args']) {
    super(owner, args);
    this.subscription = someService.subscribe(() => {
      // Handle updates
    });
  }
  
  willDestroy(): void {
    super.willDestroy();
    this.subscription?.unsubscribe();
  }
}
```

---

## State Management Patterns

### Local Component State

```typescript
export default class SearchBox extends Component {
  @tracked query = '';
  @tracked results: SearchResult[] = [];
  @tracked isSearching = false;
  
  @action
  handleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.query = input.value;
    // Trigger search
    void this.performSearch();
  }
  
  async performSearch(): Promise<void> {
    this.isSearching = true;
    try {
      this.results = await searchAPI(this.query);
    } finally {
      this.isSearching = false;
    }
  }
}
```

### Lifting State Up

When multiple components need to share state, lift it to a parent component or service:

```typescript
// Parent component manages shared state
export default class DocumentEditor extends Component {
  @tracked document: HermesDocument | null = null;
  @tracked isSaving = false;
  
  @action
  async handleSave(updates: Partial<HermesDocument>): Promise<void> {
    this.isSaving = true;
    try {
      await this.saveDocument(updates);
    } finally {
      this.isSaving = false;
    }
  }
}
```

```hbs
{{! Parent passes state and handlers to children }}
<DocumentHeader 
  @document={{this.document}} 
  @isSaving={{this.isSaving}}
/>

<DocumentSidebar 
  @document={{this.document}}
  @onSave={{this.handleSave}}
/>

<DocumentContent 
  @document={{this.document}}
  @onSave={{this.handleSave}}
/>
```

### Service-Level State

For global state, use a service:

```typescript
// app/services/document-editor.ts
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class DocumentEditorService extends Service {
  @tracked currentDocument: HermesDocument | null = null;
  @tracked isEditing = false;
  
  startEditing(document: HermesDocument): void {
    this.currentDocument = document;
    this.isEditing = true;
  }
  
  stopEditing(): void {
    this.currentDocument = null;
    this.isEditing = false;
  }
}
```

```typescript
// Components inject and use the service
export default class DocumentSidebar extends Component {
  @service declare documentEditor: DocumentEditorService;
  
  get document(): HermesDocument | null {
    return this.documentEditor.currentDocument;
  }
}
```

---

## Component Communication

### 1. Data Down, Actions Up (DDAU)

**Parent controls state, child triggers actions**:

```typescript
// Parent Component
export default class ParentComponent extends Component {
  @tracked items: string[] = ['a', 'b', 'c'];
  
  @action
  addItem(item: string): void {
    this.items = [...this.items, item];
  }
  
  @action
  removeItem(item: string): void {
    this.items = this.items.filter(i => i !== item);
  }
}
```

```hbs
{{! Parent template }}
<ItemList 
  @items={{this.items}} 
  @onAdd={{this.addItem}}
  @onRemove={{this.removeItem}}
/>
```

```typescript
// Child Component
interface ItemListSignature {
  Args: {
    items: string[];
    onAdd: (item: string) => void;
    onRemove: (item: string) => void;
  };
}

export default class ItemList extends Component<ItemListSignature> {
  @action
  handleAddClick(): void {
    // Child calls parent's action
    this.args.onAdd('new-item');
  }
  
  @action
  handleRemoveClick(item: string): void {
    this.args.onRemove(item);
  }
}
```

### 2. Events with `{{on}}` Modifier

```hbs
{{! Direct DOM event handling }}
<button {{on "click" this.handleClick}}>
  Click Me
</button>

<form {{on "submit" this.handleSubmit}}>
  <input {{on "input" this.handleInput}} />
  <button type="submit">Submit</button>
</form>
```

```typescript
export default class MyComponent extends Component {
  @action
  handleClick(event: MouseEvent): void {
    console.log('Button clicked', event.target);
  }
  
  @action
  handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    // Handle form submission
  }
  
  @action
  handleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    console.log('Input value', input.value);
  }
}
```

### 3. Service-Mediated Communication

For loosely coupled components:

```typescript
// Service acts as message bus
export default class NotificationsService extends Service {
  @tracked notifications: Notification[] = [];
  
  addNotification(message: string, type: 'info' | 'error' | 'success'): void {
    this.notifications = [...this.notifications, { message, type, id: generateId() }];
  }
  
  removeNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }
}
```

```typescript
// Component A triggers notification
export default class FormComponent extends Component {
  @service declare notifications: NotificationsService;
  
  @action
  async handleSave(): Promise<void> {
    try {
      await this.saveData();
      this.notifications.addNotification('Saved successfully', 'success');
    } catch (e) {
      this.notifications.addNotification('Save failed', 'error');
    }
  }
}
```

```typescript
// Component B displays notifications
export default class NotificationDisplay extends Component {
  @service declare notifications: NotificationsService;
  
  get activeNotifications(): Notification[] {
    return this.notifications.notifications;
  }
}
```

---

## HashiCorp Design System (HDS)

Hermes uses HDS components extensively. Import and use them directly:

```typescript
import Component from '@glimmer/component';

interface MyFormSignature {
  Args: {
    onSubmit: (data: FormData) => void;
  };
}

export default class MyForm extends Component<MyFormSignature> {
  @action
  handleSubmit(): void {
    const data = { /* form data */ };
    this.args.onSubmit(data);
  }
}
```

```hbs
<Hds::Form::TextInput::Field 
  @isRequired={{true}}
  @type="text"
  @value={{this.name}}
  @onInput={{this.handleNameInput}}
as |F|>
  <F.Label>Name</F.Label>
  <F.HelperText>Enter your full name</F.HelperText>
  <F.Error>Name is required</F.Error>
</Hds::Form::TextInput::Field>

<Hds::Button
  @text="Save"
  @color="primary"
  @icon="check"
  @isLoading={{this.isSaving}}
  {{on "click" this.handleSubmit}}
/>

<Hds::Alert 
  @type="inline"
  @color="success"
as |A|>
  <A.Title>Success</A.Title>
  <A.Description>Your changes have been saved.</A.Description>
</Hds::Alert>
```

**Common HDS Components**:
- `Hds::Button` - Buttons with various styles
- `Hds::Form::*` - Form inputs, checkboxes, radios
- `Hds::Alert` - Alert messages
- `Hds::Modal` - Modal dialogs
- `Hds::Toast` - Toast notifications
- `Hds::Dropdown` - Dropdown menus
- `Hds::Badge` - Status badges
- `Hds::Icon` - Icons from Flight icon set

**Reference**: https://design-system-components.vercel.app/

---

## Async Patterns with ember-concurrency

### Basic Task

```typescript
import { task } from 'ember-concurrency';

export default class MyComponent extends Component {
  @task
  *loadData() {
    yield timeout(1000);
    const response = yield fetch('/api/data');
    const data = yield response.json();
    return data;
  }
}
```

```hbs
<button {{on "click" (perform this.loadData)}}>
  {{#if this.loadData.isRunning}}
    Loading...
  {{else}}
    Load Data
  {{/if}}
</button>

{{#if this.loadData.last.value}}
  <ul>
    {{#each this.loadData.last.value as |item|}}
      <li>{{item}}</li>
    {{/each}}
  </ul>
{{/if}}
```

### Task Modifiers

```typescript
import { task, timeout, restartableTask, dropTask, enqueueTask } from 'ember-concurrency';

export default class SearchComponent extends Component {
  // Cancels previous, starts new (good for search)
  @restartableTask
  *search(query: string) {
    yield timeout(300); // Debounce
    const results = yield this.fetchSvc.fetch(`/api/search?q=${query}`);
    return yield results.json();
  }
  
  // Drops new attempts while running (good for save)
  @dropTask
  *save() {
    yield this.fetchSvc.fetch('/api/save', { method: 'POST' });
  }
  
  // Queues tasks (good for sequential operations)
  @enqueueTask
  *processItem(item: Item) {
    yield this.process(item);
  }
}
```

### Task States

```typescript
// Check task state
this.loadData.isRunning    // true while executing
this.loadData.isIdle       // true when not running
this.loadData.last.value   // Return value of last run
this.loadData.last.error   // Error from last run
```

---

## Component Testing Patterns

See [04-testing-strategy.md](./04-testing-strategy.md) for comprehensive testing guide.

Quick example:

```typescript
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | my-component', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    await render(hbs`<MyComponent @title="Test" />`);
    assert.dom('[data-test-title]').hasText('Test');
  });

  test('it handles click', async function (assert) {
    let clicked = false;
    this.set('handleClick', () => { clicked = true; });

    await render(hbs`<MyComponent @onClick={{this.handleClick}} />`);
    await click('[data-test-button]');

    assert.true(clicked);
  });
});
```

---

## Best Practices

### ✅ DO

- Use `@tracked` for all state that affects the UI
- Define component signatures for type safety
- Keep components focused and single-purpose
- Use `@action` for methods called from templates
- Prefer data down, actions up (DDAU) pattern
- Use HDS components for consistent UI
- Use ember-concurrency for async operations
- Add `data-test-*` attributes for testing

### ❌ DON'T

- Don't mutate `@tracked` objects/arrays (reassign instead)
- Don't access DOM in constructor (use modifiers)
- Don't forget to call `super.willDestroy()` in willDestroy
- Don't use jQuery (use native DOM APIs)
- Don't use `this.set()` or `this.get()` (not needed in Octane)
- Don't use `@computed` (use native getters instead)
- Don't use mixins (use services or inheritance)

---

## Real-World Example

See `web/app/components/document/sidebar.ts` (1394 lines) for a complex real-world component that demonstrates:
- Service injection
- Tracked state management
- Multiple actions
- ember-concurrency tasks
- Complex template interactions
- HDS component usage

---

## Next Steps

Continue to [03-service-architecture.md](./03-service-architecture.md) to learn about service patterns and dependency injection.
