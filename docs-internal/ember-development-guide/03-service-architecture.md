# Service Architecture

**Guide**: Ember Development Guide for Hermes  
**Section**: 03 - Service Architecture  
**Audience**: Frontend developers working with Ember services

---

## Overview

Services in Ember are singleton objects that live for the lifetime of the application. They're used for shared state, API communication, and cross-cutting concerns. This guide covers service patterns used in Hermes.

---

## Service Basics

### Creating a Service

```typescript
// app/services/my-service.ts
import Service from '@ember/service';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import RouterService from '@ember/routing/router-service';

export default class MyService extends Service {
  // Inject other services
  @service declare router: RouterService;
  @service('fetch') declare fetchSvc: FetchService;
  
  // Tracked state
  @tracked data: Data[] = [];
  @tracked isLoading = false;
  
  // Computed property
  get sortedData(): Data[] {
    return [...this.data].sort((a, b) => a.name.localeCompare(b.name));
  }
  
  // Methods
  async loadData(): Promise<void> {
    this.isLoading = true;
    try {
      const response = await this.fetchSvc.fetch('/api/data');
      this.data = await response.json();
    } finally {
      this.isLoading = false;
    }
  }
}

// Declare the service in the type registry
declare module '@ember/service' {
  interface Registry {
    'my-service': MyService;
  }
}
```

### Using a Service

```typescript
// app/components/my-component.ts
import Component from '@glimmer/component';
import { service } from '@ember/service';
import MyService from 'hermes/services/my-service';

export default class MyComponent extends Component {
  @service declare myService: MyService;
  
  get data() {
    return this.myService.sortedData;
  }
}
```

---

## Core Hermes Services

### 1. ConfigService

Manages runtime configuration from the backend.

```typescript
// app/services/config.ts
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

interface HermesConfig {
  auth_provider: 'google' | 'okta' | 'dex';
  api_version: string;
  algolia_docs_index_name: string;
  algolia_drafts_index_name: string;
  support_link_url?: string;
  short_link_base_url?: string;
  feature_flags: Record<string, boolean>;
}

export default class ConfigService extends Service {
  @tracked config: HermesConfig = {
    // Defaults
  };
  
  setConfig(config: Partial<HermesConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  get apiVersion(): string {
    return this.config.feature_flags['use_v2_api'] ? 'v2' : 'v1';
  }
  
  get authProvider(): 'google' | 'okta' | 'dex' {
    return this.config.auth_provider;
  }
}
```

**Usage**:
```typescript
export default class MyComponent extends Component {
  @service declare config: ConfigService;
  
  get apiEndpoint(): string {
    return `/api/${this.config.apiVersion}/documents`;
  }
  
  get isGoogleAuth(): boolean {
    return this.config.authProvider === 'google';
  }
}
```

### 2. FetchService

Wraps `fetch()` with auth headers and error handling.

```typescript
// app/services/fetch.ts
import Service from '@ember/service';
import { service } from '@ember/service';
import ConfigService from './config';
import SessionService from './session';

export default class FetchService extends Service {
  @service declare config: ConfigService;
  @service declare session: SessionService;
  
  /**
   * Make an authenticated API request
   * @param url - API endpoint
   * @param options - Fetch options
   * @param isPoll - If true, treat 401 differently (polling scenario)
   */
  async fetch(
    url: string, 
    options: RequestInit = {}, 
    isPoll = false
  ): Promise<Response> {
    // Add auth headers
    const headers = new Headers(options.headers);
    
    if (this.isExternalURL(url)) {
      // External URLs don't get auth headers
    } else if (this.config.authProvider === 'google') {
      // Google: Use access token header
      const token = this.session.data.authenticated.access_token;
      if (token) {
        headers.set('Hermes-Google-Access-Token', token);
      }
    } else {
      // OIDC (Okta/Dex): Use Bearer token
      const token = this.session.data.authenticated.access_token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }
    
    const response = await fetch(url, { ...options, headers });
    
    // Handle 401 differently for polling
    if (response.status === 401 && isPoll) {
      this.session.set('pollResponseIs401', true);
    }
    
    return response;
  }
  
  private isExternalURL(url: string): boolean {
    return url.startsWith('http://') || url.startsWith('https://');
  }
}
```

**Usage**:
```typescript
export default class DocumentsList extends Component {
  @service('fetch') declare fetchSvc: FetchService;
  
  async loadDocuments(): Promise<void> {
    const response = await this.fetchSvc.fetch('/api/v2/documents');
    if (response.ok) {
      this.documents = await response.json();
    }
  }
}
```

### 3. SessionService

Manages authentication state and token validation.

```typescript
// app/services/_session.ts (prefixed with _ to avoid conflict)
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import ConfigService from './config';
import RouterService from '@ember/routing/router-service';

interface AuthData {
  authenticated: {
    access_token: string;
    expires_at: number;
  };
}

export default class HermesSessionService extends Service {
  @service declare config: ConfigService;
  @service declare router: RouterService;
  @service declare session: SessionService; // ember-simple-auth session
  
  @tracked tokenIsValid = true;
  @tracked pollResponseIs401 = false;
  
  get data(): AuthData {
    return this.session.data as AuthData;
  }
  
  get isAuthenticated(): boolean {
    return this.session.isAuthenticated && this.tokenIsValid;
  }
  
  async checkTokenValidity(): Promise<boolean> {
    const expiresAt = this.data.authenticated.expires_at;
    const now = Date.now() / 1000;
    
    if (expiresAt && expiresAt < now) {
      this.tokenIsValid = false;
      return false;
    }
    
    this.tokenIsValid = true;
    return true;
  }
  
  async invalidate(): Promise<void> {
    await this.session.invalidate();
    this.router.transitionTo('authenticated.dashboard');
  }
}
```

**Usage**:
```typescript
export default class HeaderComponent extends Component {
  @service('_session') declare sessionSvc: HermesSessionService;
  
  get isLoggedIn(): boolean {
    return this.sessionSvc.isAuthenticated;
  }
  
  @action
  async logout(): Promise<void> {
    await this.sessionSvc.invalidate();
  }
}
```

### 4. AlgoliaService

Manages search through backend proxy.

```typescript
// app/services/algolia.ts
import Service from '@ember/service';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import FetchService from './fetch';
import ConfigService from './config';

interface SearchOptions {
  query: string;
  facets?: string[];
  filters?: string;
  hitsPerPage?: number;
  page?: number;
}

interface SearchResponse {
  hits: any[];
  nbHits: number;
  page: number;
  nbPages: number;
  facets?: Record<string, Record<string, number>>;
}

export default class AlgoliaService extends Service {
  @service('fetch') declare fetchSvc: FetchService;
  @service declare config: ConfigService;
  
  /**
   * Search documents through backend proxy
   */
  async searchDocs(options: SearchOptions): Promise<SearchResponse> {
    const indexName = this.config.config.algolia_docs_index_name;
    const url = `/1/indexes/${indexName}/query`;
    
    const body = {
      query: options.query,
      facets: options.facets,
      filters: options.filters,
      hitsPerPage: options.hitsPerPage ?? 20,
      page: options.page ?? 0,
    };
    
    const response = await this.fetchSvc.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  /**
   * Get facet values for a given facet
   */
  async getFacetValues(facetName: string): Promise<string[]> {
    const response = await this.searchDocs({
      query: '',
      facets: [facetName],
    });
    
    return Object.keys(response.facets?.[facetName] ?? {});
  }
}
```

**Usage**:
```typescript
export default class SearchComponent extends Component {
  @service declare algolia: AlgoliaService;
  @tracked results: SearchResult[] = [];
  
  async performSearch(query: string): Promise<void> {
    const response = await this.algolia.searchDocs({
      query,
      facets: ['status', 'docType'],
      filters: 'status:published',
    });
    
    this.results = response.hits;
  }
}
```

### 5. FlashMessagesService

Displays temporary notifications.

```typescript
// app/services/flash-messages.ts
import FlashObject from 'ember-cli-flash/flash/object';
import FlashMessagesService from 'ember-cli-flash/services/flash-messages';

export default class HermesFlashMessagesService extends FlashMessagesService {
  /**
   * Show success message
   */
  success(message: string): FlashObject {
    return this.add({
      message,
      type: 'success',
      timeout: 5000,
      sticky: false,
    });
  }
  
  /**
   * Show error message
   */
  error(message: string): FlashObject {
    return this.add({
      message,
      type: 'error',
      timeout: 0, // Errors stay until dismissed
      sticky: true,
    });
  }
  
  /**
   * Show info message
   */
  info(message: string): FlashObject {
    return this.add({
      message,
      type: 'info',
      timeout: 5000,
      sticky: false,
    });
  }
  
  /**
   * Show critical error that requires user action
   */
  critical(message: string): FlashObject {
    return this.add({
      message,
      type: 'error',
      timeout: 0,
      sticky: true,
      destroyOnClick: false, // Can't dismiss by clicking
    });
  }
}
```

**Usage**:
```typescript
export default class MyComponent extends Component {
  @service declare flashMessages: HermesFlashMessagesService;
  
  @action
  async save(): Promise<void> {
    try {
      await this.saveData();
      this.flashMessages.success('Document saved successfully');
    } catch (e) {
      this.flashMessages.error(`Save failed: ${(e as Error).message}`);
    }
  }
}
```

---

## Service Design Patterns

### 1. Repository Pattern

Service acts as data repository:

```typescript
// app/services/document-repository.ts
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import FetchService from './fetch';

export default class DocumentRepositoryService extends Service {
  @service('fetch') declare fetchSvc: FetchService;
  
  @tracked documents: Map<string, HermesDocument> = new Map();
  
  /**
   * Get document by ID, fetching if not in cache
   */
  async getDocument(id: string): Promise<HermesDocument | null> {
    // Check cache first
    if (this.documents.has(id)) {
      return this.documents.get(id)!;
    }
    
    // Fetch from API
    try {
      const response = await this.fetchSvc.fetch(`/api/v2/documents/${id}`);
      if (!response.ok) return null;
      
      const doc = await response.json() as HermesDocument;
      this.documents.set(id, doc);
      return doc;
    } catch {
      return null;
    }
  }
  
  /**
   * Update document in cache and API
   */
  async updateDocument(id: string, updates: Partial<HermesDocument>): Promise<void> {
    const response = await this.fetchSvc.fetch(`/api/v2/documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    
    if (response.ok) {
      const updated = await response.json() as HermesDocument;
      this.documents.set(id, updated);
    }
  }
  
  /**
   * Clear cache
   */
  clearCache(): void {
    this.documents.clear();
  }
}
```

### 2. State Management Pattern

Service manages global application state:

```typescript
// app/services/sidebar.ts
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class SidebarService extends Service {
  @tracked isOpen = true;
  @tracked currentTab: 'details' | 'related' | 'projects' = 'details';
  
  toggle(): void {
    this.isOpen = !this.isOpen;
  }
  
  open(): void {
    this.isOpen = true;
  }
  
  close(): void {
    this.isOpen = false;
  }
  
  setTab(tab: 'details' | 'related' | 'projects'): void {
    this.currentTab = tab;
    if (!this.isOpen) {
      this.open();
    }
  }
}
```

### 3. Facade Pattern

Service provides simplified interface to complex subsystems:

```typescript
// app/services/document-operations.ts
import Service from '@ember/service';
import { service } from '@ember/service';
import FetchService from './fetch';
import FlashMessagesService from './flash-messages';
import RouterService from '@ember/routing/router-service';

export default class DocumentOperationsService extends Service {
  @service('fetch') declare fetchSvc: FetchService;
  @service declare flashMessages: FlashMessagesService;
  @service declare router: RouterService;
  
  /**
   * Create new document from template
   */
  async createFromTemplate(
    templateId: string, 
    title: string
  ): Promise<HermesDocument | null> {
    try {
      const response = await this.fetchSvc.fetch('/api/v2/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateID: templateId,
          title,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create document');
      }
      
      const doc = await response.json() as HermesDocument;
      this.flashMessages.success('Document created successfully');
      this.router.transitionTo('document', doc.id);
      return doc;
    } catch (e) {
      this.flashMessages.error(`Failed to create document: ${(e as Error).message}`);
      return null;
    }
  }
  
  /**
   * Delete document
   */
  async deleteDocument(id: string): Promise<boolean> {
    try {
      const response = await this.fetchSvc.fetch(`/api/v2/documents/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete document');
      }
      
      this.flashMessages.success('Document deleted');
      this.router.transitionTo('documents');
      return true;
    } catch (e) {
      this.flashMessages.error(`Failed to delete: ${(e as Error).message}`);
      return false;
    }
  }
}
```

---

## Service Lifecycle

### Initialization

Services are lazily instantiated when first injected:

```typescript
export default class MyService extends Service {
  constructor(owner: unknown) {
    super(owner);
    // Service initialization
    console.log('Service created');
  }
}
```

### Destruction

Services live for the lifetime of the application and are destroyed when the app shuts down:

```typescript
export default class MyService extends Service {
  subscription: Subscription | null = null;
  
  constructor(owner: unknown) {
    super(owner);
    this.subscription = someAPI.subscribe(() => {
      // Handle events
    });
  }
  
  willDestroy(): void {
    super.willDestroy();
    this.subscription?.unsubscribe();
  }
}
```

---

## Service Communication

### 1. Direct Method Calls

Services can call each other directly:

```typescript
export default class DocumentService extends Service {
  @service declare flashMessages: FlashMessagesService;
  @service declare router: RouterService;
  
  async loadDocument(id: string): Promise<void> {
    try {
      // Load document
      this.flashMessages.success('Document loaded');
    } catch (e) {
      this.flashMessages.error('Failed to load document');
      this.router.transitionTo('dashboard');
    }
  }
}
```

### 2. Event-Based Communication

Use Ember's eventing system for loose coupling:

```typescript
import Evented from '@ember/object/evented';
import { on } from '@ember/object/evented';

export default class EventBusService extends Service.extend(Evented) {
  triggerDocumentSaved(doc: HermesDocument): void {
    this.trigger('documentSaved', doc);
  }
}

// Listening service
export default class RecentDocumentsService extends Service {
  @service declare eventBus: EventBusService;
  
  constructor(owner: unknown) {
    super(owner);
    this.eventBus.on('documentSaved', this, this.handleDocumentSaved);
  }
  
  handleDocumentSaved(doc: HermesDocument): void {
    // Update recent documents
  }
  
  willDestroy(): void {
    super.willDestroy();
    this.eventBus.off('documentSaved', this, this.handleDocumentSaved);
  }
}
```

---

## Testing Services

```typescript
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Service | my-service', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    const service = this.owner.lookup('service:my-service');
    assert.ok(service);
  });

  test('loads data', async function (assert) {
    const service = this.owner.lookup('service:my-service');
    
    await service.loadData();
    
    assert.strictEqual(service.data.length, 3);
  });
  
  test('handles errors', async function (assert) {
    const service = this.owner.lookup('service:my-service');
    
    // Mock fetch to fail
    service.fetchSvc = {
      async fetch() {
        throw new Error('Network error');
      }
    };
    
    await service.loadData();
    
    assert.strictEqual(service.error, 'Network error');
  });
});
```

For comprehensive testing patterns, see [04-testing-strategy.md](./04-testing-strategy.md).

---

## Best Practices

### ✅ DO

- Use services for shared state and cross-cutting concerns
- Inject services with `@service` and type declarations
- Use `@tracked` for reactive state in services
- Keep services focused on a single responsibility
- Provide clear, type-safe APIs
- Document service methods with JSDoc
- Clean up resources in `willDestroy()`

### ❌ DON'T

- Don't use services for component-local state
- Don't create circular dependencies between services
- Don't access services outside of proper injection
- Don't store component-specific logic in services
- Don't use services as a dumping ground for misc. code
- Don't mutate tracked objects (reassign instead)

---

## Real-World Examples

See these Hermes services for real implementations:
- `web/app/services/fetch.ts` - API communication wrapper
- `web/app/services/config.ts` - Runtime configuration
- `web/app/services/algolia.ts` - Search integration (417 lines)
- `web/app/services/_session.ts` - Authentication management

---

## Next Steps

Continue to [04-testing-strategy.md](./04-testing-strategy.md) to learn about testing services and components.
