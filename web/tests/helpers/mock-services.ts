/**
 * Test helpers for mocking Hermes services and common test scenarios
 * 
 * These helpers provide consistent mocking patterns for testing services,
 * routes, and components without needing real backend or auth infrastructure.
 */

import { TestContext } from '@ember/test-helpers';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

/**
 * Mock ConfigService for testing
 * Provides sensible defaults for all config properties
 */
export class MockConfigService extends Service {
  @tracked config = {
    auth_provider: 'google' as 'google' | 'okta' | 'dex',
    api_version: 'v2',
    support_link_url: 'https://test-support.example.com',
    short_link_base_url: 'https://go.test/',
    jira_url: 'https://jira.test.com',
    google_doc_folders: '',
    feature_flags: {} as Record<string, boolean>,
    algolia_docs_index_name: 'test-docs',
    algolia_drafts_index_name: 'test-drafts',
    algolia_internal_index_name: 'test-internal',
    algolia_projects_index_name: 'test-projects',
  };

  setAuthProvider(provider: 'google' | 'okta' | 'dex') {
    this.config.auth_provider = provider;
  }

  setFeatureFlag(flag: string, value: boolean) {
    this.config.feature_flags[flag] = value;
  }
}

/**
 * Mock FetchService for testing
 * Tracks fetch calls and allows configuring responses
 */
export class MockFetchService extends Service {
  @tracked fetchCalls: Array<{ url: string; options?: RequestInit }> = [];
  @tracked mockResponses: Map<string, any> = new Map();
  @tracked shouldFail = false;
  @tracked failureResponse = { status: 500, statusText: 'Internal Server Error' };

  async fetch(url: string, options?: RequestInit, isPoll = false): Promise<Response> {
    this.fetchCalls.push({ url, options });

    if (this.shouldFail) {
      throw new Error(`Fetch failed: ${this.failureResponse.statusText}`);
    }

    const mockData = this.mockResponses.get(url);
    const responseData = mockData !== undefined ? mockData : { success: true };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  setMockResponse(url: string, data: any) {
    this.mockResponses.set(url, data);
  }

  simulateFailure(status = 500, statusText = 'Internal Server Error') {
    this.shouldFail = true;
    this.failureResponse = { status, statusText };
  }

  reset() {
    this.fetchCalls = [];
    this.mockResponses.clear();
    this.shouldFail = false;
  }
}

/**
 * Mock SessionService for testing
 * Simulates authentication state and token validation
 */
export class MockSessionService extends Service {
  @tracked isAuthenticated = true;
  @tracked tokenIsValid = true;
  @tracked pollResponseIs401 = false;
  @tracked preventReauthMessage = false;
  @tracked reauthFlashMessage: any = null;

  @tracked data = {
    authenticated: {
      access_token: 'mock-access-token',
      expires_in: 3600,
      token_type: 'Bearer',
    },
  };

  invalidate() {
    this.isAuthenticated = false;
    this.tokenIsValid = false;
    return Promise.resolve();
  }

  authenticate() {
    this.isAuthenticated = true;
    this.tokenIsValid = true;
    return Promise.resolve();
  }

  requireAuthentication() {
    return this.isAuthenticated;
  }

  get isUsingOIDC() {
    return false; // Can be overridden in tests
  }
}

/**
 * Mock AuthenticatedUserService for testing
 * Provides test user data
 */
export class MockAuthenticatedUserService extends Service {
  @tracked user = {
    id: 'test-user-id',
    email: 'testuser@example.com',
    name: 'Test User',
    given_name: 'Test',
    family_name: 'User',
    picture: 'https://example.com/avatar.jpg',
  };

  @tracked isLoading = false;
  @tracked subscriptions = [];

  async loadInfo() {
    this.isLoading = false;
    return this.user;
  }

  setUser(userData: any) {
    this.user = { ...this.user, ...userData };
  }
}

/**
 * Mock SearchService for testing
 * Simulates search functionality
 */
export class MockSearchService extends Service {
  @tracked searchCalls: Array<{ query: string; options?: any }> = [];
  @tracked mockResults: any[] = [];
  @tracked mockFacets: any = {};

  async search(query: string, options?: any) {
    this.searchCalls.push({ query, options });

    return {
      hits: this.mockResults,
      nbHits: this.mockResults.length,
      page: 0,
      nbPages: 1,
      hitsPerPage: 20,
      facets: this.mockFacets,
      processingTimeMS: 1,
      query,
    };
  }

  setMockResults(results: any[]) {
    this.mockResults = results;
  }

  setMockFacets(facets: any) {
    this.mockFacets = facets;
  }

  reset() {
    this.searchCalls = [];
    this.mockResults = [];
    this.mockFacets = {};
  }
}

/**
 * Mock FlashMessagesService for testing
 * Captures flash messages instead of displaying them
 */
export class MockFlashMessagesService extends Service {
  @tracked messages: Array<{
    title?: string;
    message: string;
    type: string;
    sticky?: boolean;
  }> = [];

  add(flashObject: {
    title?: string;
    message: string;
    type: string;
    sticky?: boolean;
    [key: string]: any;
  }) {
    this.messages.push(flashObject);
    return {
      destroyMessage: () => {
        const index = this.messages.indexOf(flashObject as any);
        if (index > -1) {
          this.messages.splice(index, 1);
        }
      },
    };
  }

  clearMessages() {
    this.messages = [];
  }

  get hasMessages() {
    return this.messages.length > 0;
  }
}

/**
 * Helper to register all mock services in a test context
 */
export function registerMockServices(context: TestContext) {
  context.owner.register('service:config', MockConfigService);
  context.owner.register('service:fetch', MockFetchService);
  context.owner.register('service:session', MockSessionService);
  context.owner.register('service:authenticated-user', MockAuthenticatedUserService);
  context.owner.register('service:search', MockSearchService);
  context.owner.register('service:flash-messages', MockFlashMessagesService);
}

/**
 * Helper to get a mock service instance from the test context
 */
export function getMockService<T extends Service>(
  context: TestContext,
  serviceName: string
): T {
  return context.owner.lookup(`service:${serviceName}`) as T;
}

/**
 * Create a mock document for testing
 */
export function createMockDocument(overrides: any = {}) {
  return {
    objectID: 'doc-123',
    title: 'Test Document',
    docNumber: 'RFC-001',
    docType: 'RFC',
    status: 'Approved',
    product: 'Test Product',
    owners: ['testuser@example.com'],
    contributors: [],
    approvers: [],
    summary: 'This is a test document',
    createdTime: Date.now(),
    modifiedTime: Date.now(),
    ...overrides,
  };
}

/**
 * Create a mock project for testing
 */
export function createMockProject(overrides: any = {}) {
  return {
    id: 'project-123',
    title: 'Test Project',
    status: 'active',
    description: 'This is a test project',
    creator: 'testuser@example.com',
    created: Date.now(),
    modified: Date.now(),
    products: ['Test Product'],
    ...overrides,
  };
}

/**
 * Create a mock user for testing
 */
export function createMockUser(overrides: any = {}) {
  return {
    email: 'testuser@example.com',
    name: 'Test User',
    given_name: 'Test',
    family_name: 'User',
    picture: 'https://example.com/avatar.jpg',
    ...overrides,
  };
}

/**
 * Wait for a condition to be true with timeout
 */
export async function waitForCondition(
  condition: () => boolean,
  timeoutMs = 1000,
  intervalMs = 50
): Promise<void> {
  const startTime = Date.now();
  
  while (!condition()) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

/**
 * Assert that a flash message was shown with specific properties
 */
export function assertFlashMessage(
  flashService: MockFlashMessagesService,
  expected: { message?: string; type?: string; title?: string }
) {
  const hasMatch = flashService.messages.some((msg) => {
    return (
      (!expected.message || msg.message === expected.message) &&
      (!expected.type || msg.type === expected.type) &&
      (!expected.title || msg.title === expected.title)
    );
  });

  if (!hasMatch) {
    throw new Error(
      `Expected flash message not found.\nExpected: ${JSON.stringify(expected)}\nActual messages: ${JSON.stringify(flashService.messages)}`
    );
  }
}
