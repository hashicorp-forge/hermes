# Hermes Web Test Strategy 2025
**Comprehensive Testing Roadmap for Modern Ember Application**

**Date**: October 6, 2025  
**Status**: Implementation Ready  
**Timeline**: 8-12 weeks to 70%+ coverage  
**Backward Compatibility**: Not a concern - modernize aggressively

---

## Executive Summary

**Mission**: Transform Hermes web from minimal test coverage (~5-10%) to comprehensive, maintainable test suite (70%+) using modern Ember testing practices.

**Current State**:
- ✅ Ember 6.7.0 with TypeScript 5.9
- ✅ ember-cli-code-coverage installed
- ✅ ~248 test files exist (good foundation)
- ✅ Modern tooling (Glint, template imports, test-selectors)
- ⚠️ Module loading issues in test runner
- ⚠️ Coverage never measured (<10% estimated)
- ❌ Test suite has global failures

**Target State** (12 weeks):
- ✅ 70%+ overall test coverage
- ✅ 80%+ coverage on critical services (session, fetch, algolia)
- ✅ 65%+ coverage on routes and components
- ✅ All tests passing consistently
- ✅ Coverage enforced in CI/CD
- ✅ Modern testing patterns documented

---

## Phase 0: Fix Test Runner (Week 1)

### Current Issues

**Global Test Failure**:
```
Error: Could not find module `@ember/test-waiters` 
imported from `ember-app-scheduler/scheduler`
```

**Priority**: CRITICAL - blocks all test execution

### Tasks

#### 1. Fix Module Resolution
```bash
# Clean build artifacts
cd /Users/jrepp/hc/hermes/web
rm -rf node_modules/.cache
rm -rf tmp/
rm -rf dist/

# Verify dependencies
yarn install --check-cache

# Check for peer dependency issues
yarn why @ember/test-waiters
```

#### 2. Verify Test Helper Configuration
- [ ] Review `tests/test-helper.ts`
- [ ] Ensure proper test loader setup
- [ ] Verify QUnit configuration
- [ ] Check deprecation workflow config

#### 3. Run Baseline Tests
```bash
# Try single test
ember test --filter="minimal-sanity"

# Try unit tests only
yarn test:unit

# Full suite
yarn test:ember
```

**Acceptance Criteria**:
- ✅ Test runner starts without module errors
- ✅ At least 1 test passes
- ✅ Can run tests in watch mode
- ✅ Coverage collection works: `COVERAGE=true ember test`

**Estimated**: 2-3 days

---

## Phase 1: Establish Baseline & Infrastructure (Week 2)

### Coverage Baseline

**Measure Current State**:
```bash
# Run all tests with coverage
COVERAGE=true yarn test:ember

# Generate report
open coverage/index.html

# Check thresholds (will fail initially)
node scripts/check-coverage.js
```

**Document Findings**:
- Current coverage % per category (services, components, routes, utils)
- Identify completely untested files
- Find critical gaps in business logic
- List high-value test targets

### Infrastructure Setup

#### 1. Coverage Configuration ✅
- [x] `.ember-cli-code-coverage.js` created
- [x] `ember-cli-build.js` updated
- [x] `scripts/check-coverage.js` created

#### 2. Enhanced Test Scripts ✅
- [x] `test:coverage` - Run with coverage
- [x] `test:coverage:report` - Open HTML report
- [x] `test:coverage:check` - Validate thresholds
- [x] `test:unit`, `test:integration`, `test:acceptance` - Filtered runs
- [x] `test:ember:watch` - Interactive mode

#### 3. Test Helpers & Utilities
```bash
# Create shared test helpers
mkdir -p tests/helpers
touch tests/helpers/mock-services.ts
touch tests/helpers/factories.ts
touch tests/helpers/assertions.ts
```

**mock-services.ts**:
```typescript
import type Owner from '@ember/owner';
import type SessionService from 'hermes/services/session';
import type ConfigService from 'hermes/services/config';
import type FetchService from 'hermes/services/fetch';

export function mockAuthenticatedSession(owner: Owner) {
  const session = owner.lookup('service:session') as SessionService;
  session.data = {
    authenticated: {
      access_token: 'test-token',
      email: 'test@hashicorp.com',
    }
  };
  return session;
}

export function mockConfigService(
  owner: Owner, 
  config: Partial<any> = {}
) {
  const configService = owner.lookup('service:config') as ConfigService;
  configService.config = {
    auth_provider: 'google',
    features: { drafts: true, projects: true },
    ...config,
  };
  return configService;
}

export function mockFetchService(owner: Owner) {
  const fetch = owner.lookup('service:fetch') as FetchService;
  // Mock fetch implementation
  return fetch;
}
```

**factories.ts**:
```typescript
// Common test data factories
export function createDocument(overrides = {}) {
  return {
    id: 'doc-1',
    title: 'Test Document',
    docType: 'RFC',
    status: 'In-Review',
    product: 'Consul',
    owners: ['user@hashicorp.com'],
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createUser(overrides = {}) {
  return {
    email: 'user@hashicorp.com',
    name: 'Test User',
    photo: 'https://example.com/photo.jpg',
    ...overrides,
  };
}

export function createProject(overrides = {}) {
  return {
    id: 'proj-1',
    title: 'Test Project',
    description: 'A test project',
    documents: [],
    ...overrides,
  };
}
```

**assertions.ts**:
```typescript
import type { TestContext } from '@ember/test-helpers';

// Custom assertions for common patterns
export function assertDocumentCard(
  assert: Assert,
  selector: string,
  expected: { title: string; status: string }
) {
  assert.dom(`${selector} [data-test-document-title]`).hasText(expected.title);
  assert.dom(`${selector} [data-test-document-status]`).hasText(expected.status);
}

export function assertAuthenticatedUser(
  assert: Assert,
  email: string
) {
  assert.dom('[data-test-user-email]').hasText(email);
  assert.dom('[data-test-user-menu]').exists();
}
```

**Acceptance Criteria**:
- ✅ Baseline coverage measured and documented
- ✅ Coverage reports generated successfully
- ✅ Test helpers created and documented
- ✅ All infrastructure scripts working

**Estimated**: 3-4 days

---

## Phase 2: Critical Services (Weeks 3-5)

### Priority 1: Authentication & Session (Week 3)

#### Files to Test
1. **`services/session.ts`** (240+ lines)
   - Authentication flow
   - Token management
   - Redirect handling
   - Provider-specific logic

2. **`services/authenticated-user.ts`** (100+ lines)
   - User info loading
   - Profile management
   - Multi-provider support

3. **`services/config.ts`** (50+ lines)
   - Configuration loading
   - Provider detection
   - Feature flags

**Test Coverage Goals**:
- session.ts: 85%+
- authenticated-user.ts: 80%+
- config.ts: 90%+

**Test Cases** (session.ts example):
```typescript
module('Unit | Service | session', function (hooks) {
  setupTest(hooks);

  test('stores redirect URL in sessionStorage', function (assert) {
    // Test redirect storage
  });

  test('handles Google OAuth flow', function (assert) {
    // Test Google-specific auth
  });

  test('handles Okta OIDC flow', function (assert) {
    // Test Okta-specific auth
  });

  test('handles Dex OIDC flow', function (assert) {
    // Test Dex-specific auth
  });

  test('detects expired tokens', function (assert) {
    // Test token expiration
  });

  test('triggers reauthentication', function (assert) {
    // Test reauth flow
  });

  test('clears session on logout', function (assert) {
    // Test logout
  });
});
```

**Deliverables**:
- [ ] session-test.ts: comprehensive coverage
- [ ] authenticated-user-test.ts: all providers tested
- [ ] config-test.ts: all config scenarios
- [ ] Integration tests for auth flows

**Estimated**: 5-7 days

---

### Priority 2: Data Fetching & API (Week 4)

#### Files to Test
1. **`services/fetch.ts`** (100+ lines)
   - API request wrapper
   - Auth header injection
   - Error handling
   - Retry logic

2. **`services/algolia.ts`** (417 lines)
   - Search proxy
   - Query building
   - Facet handling
   - Backend integration

**Test Coverage Goals**:
- fetch.ts: 85%+
- algolia.ts: 75%+

**Test Cases** (fetch.ts example):
```typescript
module('Unit | Service | fetch', function (hooks) {
  setupTest(hooks);
  setupMirage(hooks);

  test('adds Authorization header from session', async function (assert) {
    // Mock session
    // Make request
    // Verify header
  });

  test('adds X-Auth-Provider header', async function (assert) {
    // Test provider header
  });

  test('handles 401 errors with reauthentication', async function (assert) {
    // Test 401 response
    // Verify reauth triggered
  });

  test('retries failed requests', async function (assert) {
    // Mock failing request
    // Verify retry logic
  });

  test('parses JSON responses', async function (assert) {
    // Test response parsing
  });

  test('handles network errors', async function (assert) {
    // Test error handling
  });
});
```

**Deliverables**:
- [ ] fetch-test-comprehensive.ts: complete coverage
- [ ] algolia-test.ts: search functionality tested
- [ ] Integration tests for API flows

**Estimated**: 5-7 days

---

### Priority 3: Business Logic Services (Week 5)

#### Files to Test
1. **`services/recently-viewed.ts`**
   - Local storage management
   - Document tracking
   - List management

2. **`services/document-types.ts`**
   - Document type definitions
   - Type validation
   - Type-specific logic

3. **`services/product-areas.ts`**
   - Product area loading
   - Caching
   - Filtering

4. **`services/active-filters.ts`**
   - Filter state management
   - URL synchronization
   - Filter persistence

5. **`services/modal-alerts.ts`**
   - Alert display
   - Alert queueing
   - User dismissal

**Test Coverage Goals**:
- Each service: 70-80%+

**Deliverables**:
- [ ] Test file for each service
- [ ] Integration tests for service interactions
- [ ] Edge case coverage

**Estimated**: 5-7 days

---

## Phase 3: Routes & Controllers (Weeks 6-7)

### Critical Routes

#### Acceptance Tests (Higher Level)

**Priority Routes**:
1. `authenticated.ts` - Auth guard, provider detection
2. `authenticated/dashboard.ts` - Dashboard data loading
3. `authenticated/document.ts` - Document viewing
4. `authenticated/documents.ts` - Document listing
5. `authenticated/results.ts` - Search results
6. `authenticated/my/documents.ts` - User's documents
7. `authenticated/new/doc.ts` - Document creation
8. `authenticated/new/project.ts` - Project creation
9. `authenticated/drafts.ts` - Draft management
10. `authenticated/projects.ts` - Project listing

**Test Coverage Goals**:
- Each route: 60-70%+
- Critical paths: 80%+

**Test Pattern**:
```typescript
module('Acceptance | authenticated/dashboard', function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function () {
    authenticateTestUser(this.server);
    // Setup common mocks
  });

  test('displays recent documents', async function (assert) {
    // Create test data
    // Visit route
    // Assert elements present
  });

  test('handles empty state', async function (assert) {
    // No documents
    // Assert empty state shown
  });

  test('navigates to document detail', async function (assert) {
    // Click document
    // Assert transition
  });

  test('filters documents by type', async function (assert) {
    // Apply filter
    // Assert filtered results
  });
});
```

**Deliverables**:
- [ ] Acceptance test for each route
- [ ] Happy path coverage
- [ ] Error handling coverage
- [ ] Loading state coverage
- [ ] Empty state coverage

**Estimated**: 10-12 days

---

## Phase 4: Components (Weeks 8-10)

### Component Testing Strategy

**Prioritize by Usage**:
1. **Header components** (high visibility)
2. **Document components** (core functionality)
3. **Form components** (data entry)
4. **Dashboard components** (landing page)

### Priority 1: Header Components (Week 8)

**Components**:
- `header/toolbar.ts` - Search and filters
- `header/search.ts` - Search input
- `header/nav.ts` - Navigation menu
- `header/active-filter-list.ts` - Active filters display

**Test Coverage Goal**: 70%+

**Test Pattern**:
```typescript
module('Integration | Component | header/toolbar', function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  test('renders facet dropdowns', async function (assert) {
    this.set('facets', {
      docType: { RFC: { count: 5, isSelected: false } },
      status: { Approved: { count: 3, isSelected: false } },
    });

    await render(hbs`<Header::Toolbar @facets={{this.facets}} />`);

    assert.dom('[data-test-facet-dropdown]').exists({ count: 2 });
  });

  test('selects facet option', async function (assert) {
    // Setup facets
    // Click dropdown
    // Select option
    // Verify callback
  });

  test('clears selected facets', async function (assert) {
    // Setup selected facets
    // Click clear
    // Verify cleared
  });
});
```

**Deliverables**:
- [ ] Test for each header component
- [ ] User interaction tests
- [ ] State management tests

**Estimated**: 5-7 days

---

### Priority 2: Document Components (Week 9)

**Components**:
- `document/sidebar.ts` - Document metadata
- `document/index.ts` - Document viewer
- `doc/tile-medium.ts` - Document card
- `doc/folder-affordance.ts` - Folder display
- `doc/thumbnail.ts` - Document thumbnail

**Test Coverage Goal**: 65%+

**Deliverables**:
- [ ] Test for each document component
- [ ] Rendering tests
- [ ] Interaction tests
- [ ] Data binding tests

**Estimated**: 5-7 days

---

### Priority 3: Form & Input Components (Week 10)

**Components**:
- `new/doc-form.ts` - Document creation form
- `new/project-form.ts` - Project creation form
- `inputs/people-select.ts` - User selection
- `inputs/product-select.ts` - Product selection
- `editable-field.ts` - Inline editing
- `related-resources.ts` - Resource linking

**Test Coverage Goal**: 70%+

**Test Focus**:
- Form validation
- User input handling
- Error display
- Submit actions

**Deliverables**:
- [ ] Test for each form component
- [ ] Validation tests
- [ ] Error handling tests
- [ ] Success flow tests

**Estimated**: 5-7 days

---

## Phase 5: Helpers & Utilities (Week 11)

### Template Helpers

**Files** (~20+ helpers):
- `time-ago.ts`
- `get-facet-label.ts`
- `get-facet-query-hash.ts`
- `highlight-text.ts`
- `is-active-filter.ts`
- `model-or-models.ts`
- etc.

**Test Coverage Goal**: 80%+ (helpers are usually straightforward)

**Test Pattern**:
```typescript
module('Integration | Helper | time-ago', function (hooks) {
  setupRenderingTest(hooks);

  test('formats recent dates', async function (assert) {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    this.set('date', fiveMinutesAgo);
    await render(hbs`{{time-ago this.date}}`);
    assert.dom().hasText('5 minutes ago');
  });

  test('formats days', async function (assert) {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    this.set('date', threeDaysAgo);
    await render(hbs`{{time-ago this.date}}`);
    assert.dom().hasText('3 days ago');
  });

  test('handles null', async function (assert) {
    this.set('date', null);
    await render(hbs`{{time-ago this.date}}`);
    assert.dom().hasText('');
  });
});
```

### Utility Functions

**Files** (~10+ utilities):
- `utils/parse-date.ts`
- `utils/time-ago.ts`
- `utils/is-valid-u-r-l.ts`
- `utils/clean-string.ts`
- `utils/get-product-label.ts`
- `utils/update-related-resources-sort-order.ts`
- etc.

**Test Coverage Goal**: 85%+ (pure functions, easy to test)

**Test Pattern**:
```typescript
module('Unit | Utility | parse-date', function () {
  test('parses ISO strings', function (assert) {
    const result = parseDate('2025-10-06T12:00:00Z');
    assert.ok(result instanceof Date);
    assert.strictEqual(result.getUTCFullYear(), 2025);
  });

  test('handles invalid input', function (assert) {
    assert.strictEqual(parseDate('invalid'), null);
    assert.strictEqual(parseDate(null), null);
    assert.strictEqual(parseDate(undefined), null);
  });

  test('handles various formats', function (assert) {
    // Test different date formats
  });
});
```

**Deliverables**:
- [ ] Test for each helper
- [ ] Test for each utility
- [ ] Edge cases covered
- [ ] 85%+ coverage

**Estimated**: 3-4 days

---

## Phase 6: Integration & Polish (Week 12)

### Integration Testing

**End-to-End Flows**:
1. **Authentication Flow**
   - Login with Google
   - Login with Okta
   - Login with Dex
   - Session persistence
   - Reauthentication

2. **Document Lifecycle**
   - Create document
   - Edit document
   - Share document
   - Approve document
   - Archive document

3. **Search Flow**
   - Search documents
   - Apply filters
   - Navigate results
   - View document
   - Return to results

4. **Project Management**
   - Create project
   - Add documents
   - Remove documents
   - Reorder documents
   - Share project

**Test Coverage Goal**: 60%+ for integration tests

### Coverage Polish

**Identify Gaps**:
```bash
# Generate coverage report
COVERAGE=true yarn test:ember

# Open report
open coverage/index.html

# Find files below threshold
node scripts/check-coverage.js
```

**Fill Gaps**:
- [ ] Add tests for uncovered files
- [ ] Increase coverage on low-coverage files
- [ ] Add edge case tests
- [ ] Add error handling tests

### CI/CD Integration

**GitHub Actions Workflow**:
```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'yarn'
      
      - name: Install dependencies
        run: cd web && yarn install --frozen-lockfile
      
      - name: Type check
        run: cd web && yarn test:types
      
      - name: Lint
        run: cd web && yarn lint
      
      - name: Run tests with coverage
        run: cd web && yarn test:coverage
      
      - name: Check coverage thresholds
        run: cd web && node scripts/check-coverage.js
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./web/coverage/lcov.info
          fail_ci_if_error: true
      
      - name: Comment coverage on PR
        uses: romeovs/lcov-reporter-action@v0.3.1
        with:
          lcov-file: ./web/coverage/lcov.info
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

**Pre-commit Hooks**:
```bash
# Install husky
cd web
yarn add --dev husky lint-staged

# Setup
npx husky install
npx husky add .husky/pre-commit "cd web && npx lint-staged"
```

**lint-staged config** (package.json):
```json
{
  "lint-staged": {
    "*.{js,ts,gts}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.hbs": [
      "ember-template-lint --fix"
    ]
  }
}
```

**Deliverables**:
- [ ] Integration tests for critical flows
- [ ] Coverage gaps filled
- [ ] CI/CD pipeline configured
- [ ] Pre-commit hooks setup
- [ ] 70%+ overall coverage achieved

**Estimated**: 5-7 days

---

## Coverage Targets

### Overall Goals

| Category | Current | Target (Week 12) | Stretch Goal |
|----------|---------|------------------|--------------|
| **Services** | ~10% | 75% | 85% |
| **Routes** | ~20% | 65% | 75% |
| **Components** | ~15% | 65% | 75% |
| **Helpers** | ~30% | 80% | 90% |
| **Utils** | ~25% | 85% | 95% |
| **Overall** | ~15% | **70%** | **80%** |

### Critical Service Targets

| Service | Priority | Target | Rationale |
|---------|----------|--------|-----------|
| session.ts | Critical | 85% | Core auth logic |
| authenticated-user.ts | Critical | 80% | User management |
| fetch.ts | Critical | 85% | API communication |
| algolia.ts | High | 75% | Search functionality |
| config.ts | High | 90% | Configuration |
| recently-viewed.ts | Medium | 70% | User experience |
| document-types.ts | Medium | 75% | Business logic |
| product-areas.ts | Medium | 70% | Data management |
| active-filters.ts | Medium | 70% | State management |
| modal-alerts.ts | Low | 60% | UI feedback |

---

## Success Metrics

### Quantitative Metrics

**Coverage**:
- ✅ 70%+ overall coverage
- ✅ 85%+ on critical services
- ✅ 65%+ on routes
- ✅ 65%+ on components
- ✅ 80%+ on helpers
- ✅ 85%+ on utilities

**Quality**:
- ✅ 100% test pass rate
- ✅ <5 minutes test execution time
- ✅ Coverage checked in CI
- ✅ No flaky tests

**Velocity**:
- ✅ Tests run on every commit
- ✅ Coverage reports on every PR
- ✅ Failing tests block merges
- ✅ <2 hours to fix breaking changes

### Qualitative Metrics

**Developer Experience**:
- ✅ Comprehensive testing documentation
- ✅ Easy-to-follow test patterns
- ✅ Fast test feedback loop
- ✅ Confidence in refactoring

**Maintainability**:
- ✅ Tests are readable and maintainable
- ✅ Test helpers reduce boilerplate
- ✅ Fixtures simplify test data
- ✅ Clear test organization

---

## Risk Mitigation

### Potential Blockers

**1. Module Resolution Issues**
- **Risk**: Test runner fails to start
- **Mitigation**: Phase 0 dedicated to fixing infrastructure
- **Fallback**: Upgrade/downgrade dependencies if needed

**2. Flaky Tests**
- **Risk**: Timing-dependent test failures
- **Mitigation**: Use test helpers, avoid arbitrary waits
- **Fallback**: Add test-waiter where needed

**3. Mirage Configuration**
- **Risk**: Complex API mocking
- **Mitigation**: Start simple, add complexity gradually
- **Fallback**: Use real backend in development

**4. Time Constraints**
- **Risk**: 12-week timeline too aggressive
- **Mitigation**: Prioritize critical paths first
- **Fallback**: Extend to 16 weeks, maintain 60% target

**5. Knowledge Gaps**
- **Risk**: Team unfamiliar with Ember testing
- **Mitigation**: Comprehensive documentation and patterns
- **Fallback**: Pair programming, code reviews

---

## Maintenance Plan

### Ongoing Activities

**Weekly**:
- [ ] Review coverage reports
- [ ] Identify new gaps
- [ ] Fix flaky tests
- [ ] Update documentation

**Monthly**:
- [ ] Audit test quality
- [ ] Refactor test helpers
- [ ] Update test patterns
- [ ] Review coverage goals

**Quarterly**:
- [ ] Major test suite review
- [ ] Performance optimization
- [ ] Tool upgrades
- [ ] Strategy adjustment

### Long-Term Goals

**6 Months**:
- 75%+ coverage
- Visual regression testing (Percy)
- Performance benchmarking
- Accessibility testing

**12 Months**:
- 80%+ coverage
- E2E testing (Playwright)
- Mutation testing
- Property-based testing

---

## Resources

### Documentation
- [Hermes Testing Patterns](./HERMES_TESTING_PATTERNS.md)
- [Ember Testing Guide](./EMBER_TESTING_GUIDE.md)
- [Ember Upgrade Strategy](../EMBER_UPGRADE_STRATEGY.md)

### Tools
- [ember-cli-code-coverage](https://github.com/kategengler/ember-cli-code-coverage)
- [ember-qunit](https://github.com/emberjs/ember-qunit)
- [qunit-dom](https://github.com/simplabs/qunit-dom)
- [ember-cli-mirage](https://miragejs.com/)
- [ember-test-selectors](https://github.com/simplabs/ember-test-selectors)

### External Resources
- [Ember Testing Guides](https://guides.emberjs.com/release/testing/)
- [QUnit API](https://qunitjs.com/api/)
- [Test Helpers API](https://github.com/emberjs/ember-test-helpers/blob/master/API.md)

---

## Next Steps (Immediate Actions)

### This Week
1. ✅ **Review this strategy** with team
2. ✅ **Get buy-in** from stakeholders
3. ✅ **Set up project tracking** (GitHub project board)
4. ✅ **Assign Phase 0 tasks** to team member
5. ✅ **Schedule kickoff meeting**

### Week 1
1. [ ] **Fix test runner** (Phase 0)
2. [ ] **Establish baseline** (Phase 1)
3. [ ] **Create test helpers** (Phase 1)
4. [ ] **Document progress** in team standup

### Week 2
1. [ ] **Start service testing** (Phase 2)
2. [ ] **Track coverage daily**
3. [ ] **Pair on complex tests**
4. [ ] **Celebrate first wins** 🎉

---

## Conclusion

This strategy provides a clear, achievable path from minimal test coverage to comprehensive testing in 12 weeks. The phased approach prioritizes critical functionality while building sustainable testing practices.

**Key Principles**:
1. **Fix infrastructure first** - nothing works without a stable test runner
2. **Prioritize ruthlessly** - test critical paths before edge cases
3. **Build momentum** - early wins motivate the team
4. **Document everything** - make testing accessible to all
5. **Measure progress** - coverage metrics drive improvement

**Expected Outcome**: A modern, well-tested Ember application with 70%+ coverage, comprehensive documentation, and sustainable testing practices that support rapid, confident development.

**Ready to begin!** 🚀
