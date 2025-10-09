# Ember Upgrade Strategy: 6.7.0 → Latest Stable

**Date**: October 6, 2025  
**Current Version**: Ember 6.7.0  
**Target Version**: Ember 6.9.0 (Latest Stable) → Ember 7.0 (Future)  
**Status**: Planning Phase

---

## Executive Summary

**Current State**:
- ✅ Ember 6.7.0 (released mid-2024)
- ❌ Test suite broken (1 test, global failure)
- ⚠️ 43 ESLint errors (non-blocking)
- ✅ TypeScript compilation works
- ✅ Recent deprecation cleanup completed (inject as service, Ember barrel imports)

**Migration Goals**:
1. **Fix existing test suite** before upgrading
2. **Increase test coverage** from near-zero to >60%

---

## Phase 1: Fix Current Test Suite (Week 1-2)

### Current Issues

**Known Test Failure**:
```
not ok 1 Chrome 141.0 - [1 ms] - global failure
# tests 1
# pass  0
# fail  1
```

**Disabled Test**:
- `web/tests/integration/components/related-resources/add-test.ts.disabled`
- Syntax error on line 10: `@relatedDocuments={{array}}`

### Tasks

#### 1. Fix Test Runner Configuration
- [ ] Investigate global failure in test runner
- [ ] Check `tests/test-helper.ts` configuration
- [ ] Verify ember-cli-mirage setup
- [ ] Check deprecation workflow configuration

#### 2. Fix Syntax Errors in Tests
- [ ] Fix `add-test.ts` syntax error (line 10)
- [ ] Re-enable disabled test
- [ ] Run full test suite to identify other failures

#### 3. Baseline Test Coverage
- [ ] Install `ember-cli-code-coverage`
- [ ] Run coverage report to establish baseline
- [ ] Identify untested critical paths
- [ ] Document current coverage % (likely <10%)

**Acceptance Criteria**:
- ✅ All existing tests pass
- ✅ Test runner works without global failures
- ✅ Coverage reporting configured
- ✅ Baseline coverage documented

---

## Phase 2: Increase Test Coverage (Week 3-6)

### Target Coverage Goals

| Component Type | Current | Target | Priority |
|----------------|---------|--------|----------|
| **Services** | ~0% | 70% | High |
| **Routes** | ~0% | 60% | High |
| **Components** | ~10% | 65% | Medium |
| **Helpers** | ~0% | 80% | Medium |
| **Utils** | ~0% | 75% | Low |
| **Overall** | ~5% | 60% | - |

### Critical Services to Test (Priority Order)

#### High Priority (Authentication & Data Flow)
1. **`services/session.ts`** (240 lines)
   - Authentication flow
   - Token validation
   - Reauth logic
   - Provider-specific handling (Google/Okta/Dex)

2. **`services/fetch.ts`** (100+ lines)
   - API request wrapper
   - Auth header injection
   - Error handling
   - Provider-specific headers

3. **`services/algolia.ts`** (417 lines)
   - Search proxy configuration
   - Query building
   - Facet handling
   - Backend proxy logic

4. **`services/authenticated-user.ts`** (100+ lines)
   - User info loading
   - Subscription management
   - Multi-provider support

5. **`services/config.ts`** (50+ lines)
   - Runtime configuration
   - Provider detection
   - Feature flags

#### Medium Priority (Business Logic)
6. **`services/recently-viewed.ts`**
7. **`services/document-types.ts`**
8. **`services/product-areas.ts`**
9. **`services/active-filters.ts`**
10. **`services/modal-alerts.ts`**

### Route Testing Strategy

**Routes to Test** (10+ critical routes):
1. `authenticated.ts` - Auth provider detection
2. `authenticated/dashboard.ts` - Dashboard data loading
3. `authenticated/document.ts` - Document viewing
4. `authenticated/documents.ts` - Document listing
5. `authenticated/results.ts` - Search results
6. `authenticated/my/documents.ts` - User's documents
7. `authenticate.ts` - Login flow
8. `application.ts` - App initialization

**Test Approach**:
- Use acceptance tests for critical user flows
- Integration tests for route model hooks
- Mock external services (Algolia, backend API)

### Component Testing Strategy

**Critical Components** (20+ components):
1. **Header Components**
   - `header/toolbar.ts` - Search and filters
   - `header/search.ts` - Search input
   - `header/nav.ts` - Navigation

2. **Document Components**
   - `document/sidebar.ts` - Document metadata
   - `document/index.ts` - Document viewer
   - `related-resources.ts` - Resource linking

3. **Form Components**
   - `new/doc-form.ts` - Document creation
   - `new/project-form.ts` - Project creation
   - `inputs/people-select.ts` - User selection

4. **Dashboard Components**
   - `dashboard/index.ts`
   - `dashboard/latest-docs.ts`
   - `dashboard/recently-viewed.ts`

**Test Approach**:
- Rendering tests (component displays correctly)
- Interaction tests (clicks, inputs work)
- Integration tests (service interactions)
- Mock services and routes

### Test Implementation Plan

**Week 3-4: Services (High Priority)**
- Write unit tests for 5 critical services
- Target: 70% coverage for each
- Mock external dependencies
- Test provider-specific logic

**Week 5: Routes (Critical Paths)**
- Write integration tests for 8 routes
- Target: 60% coverage
- Use mirage for API mocking
- Test authentication flows

**Week 6: Components (User-Facing)**
- Write rendering/integration tests
- Target: 65% coverage for tested components
- Focus on critical user interactions
- Test accessibility

**Deliverables**:
- ✅ 60% overall test coverage
- ✅ All critical paths tested
- ✅ CI/CD integration
- ✅ Coverage reports in PRs

---

## Phase 3: Ember 6.8 Upgrade (Week 7)

### Pre-Upgrade Checklist
- [ ] All tests passing (from Phase 1)
- [ ] Test coverage ≥60% (from Phase 2)
- [ ] Deprecation warnings documented
- [ ] Team training completed

### Upgrade Steps

#### 1. Review 6.8 Release Notes
- [ ] Read [Ember 6.8.0 release notes](https://github.com/emberjs/ember.js/releases)
- [ ] Check deprecations added in 6.8
- [ ] Review breaking changes
- [ ] Check dependency compatibility

#### 2. Update Dependencies
```bash
cd web

# Update ember-source
yarn upgrade ember-source@6.8.0

# Update related packages
yarn upgrade ember-cli@6.8.0
yarn upgrade ember-data@~4.12.0
yarn upgrade @ember/test-helpers@^5.3.0

# Update ember-cli-babel for latest support
yarn upgrade ember-cli-babel@^8.2.0
```

#### 3. Run Codemods
```bash
# Update to latest ember-cli-update
npx ember-cli-update --to 6.8.0

# Run any available codemods
npx ember-codemods
```

#### 4. Fix New Deprecations
- [ ] Run `yarn build` and collect deprecation warnings
- [ ] Address each deprecation with proper fix
- [ ] Document any deferred deprecations

#### 5. Test Suite Verification
```bash
# Run full test suite
yarn test:ember

# Run type checking
yarn test:types

# Run linting
yarn lint

# Generate coverage report
yarn test:coverage
```

#### 6. Manual Testing
- [ ] Test authentication flows (Google/Okta/Dex)
- [ ] Test search functionality
- [ ] Test document creation/editing
- [ ] Test project management
- [ ] Test on multiple browsers

**Acceptance Criteria**:
- ✅ All tests pass on Ember 6.8
- ✅ Test coverage maintained ≥60%
- ✅ No new deprecation warnings
- ✅ Manual testing complete
- ✅ Production deploy successful

---

## Phase 4: Ember 6.9 Upgrade (Week 8)

### Why 6.9?
- Latest stable release
- Final 6.x release before 7.0
- LTS candidate
- Most bug fixes and stability improvements

### Upgrade Steps

**Similar process to 6.8**:
1. Review release notes
2. Update dependencies to 6.9.0
3. Run codemods
4. Fix deprecations
5. Test thoroughly
6. Deploy to production

**Additional Focus**:
- [ ] Prepare for Ember 7.0 breaking changes
- [ ] Review Ember 7.0 RFC
- [ ] Plan 7.0 migration timeline
- [ ] Update team documentation

---

## Phase 5: Ember 7.0 Migration (Future - 3-6 months)

### Ember 7.0 Breaking Changes (Projected)

Based on current deprecations, Ember 7.0 will likely remove:
1. ~~`inject as service`~~ ✅ Already fixed
2. ~~`import Ember from 'ember'`~~ ✅ Already fixed
3. Classic Ember.Component (migrate to Glimmer)
4. Mixins (refactor to TypeScript classes/decorators)
5. Legacy computed property syntax
6. Various deprecated APIs from Ember 4.x-6.x

### 7.0 Preparation (During 6.9 Stability)

#### 1. Audit Classic Components
```bash
# Find classic components
grep -r "export default Component.extend" web/app/components/
```
- [ ] List all classic components
- [ ] Plan migration to Glimmer components
- [ ] Create migration guide

#### 2. Audit Mixins
```bash
# Find mixins usage
grep -r "Mixin" web/app/
```
- [ ] List all mixin usage
- [ ] Refactor to TypeScript classes/decorators
- [ ] Remove mixin dependencies

#### 3. Review All Deprecations
```bash
# Run app and collect deprecations
ember serve
# Check browser console for deprecation warnings
```

#### 4. Create 7.0 Migration Checklist
- [ ] Component refactoring plan
- [ ] Mixin removal strategy
- [ ] API migration guide
- [ ] Testing strategy for 7.0

---

## Testing Infrastructure Improvements

### Tools to Install

#### 1. ember-cli-code-coverage
```bash
yarn add --dev ember-cli-code-coverage
```
**Benefits**:
- Istanbul coverage reports
- Coverage thresholds in CI
- Per-file coverage metrics

#### 2. ember-test-selectors
```bash
yarn add --dev ember-test-selectors
```
**Benefits**:
- Better test selectors (`data-test-*`)
- Production stripping (smaller bundle)
- Clearer test intent

#### 3. qunit-dom (already installed)
**Verify usage**:
- Semantic DOM assertions
- Better error messages

#### 4. ember-cli-mirage (already installed)
**Enhance usage**:
- More realistic API mocking
- Scenario-based testing
- Shared fixtures

### CI/CD Integration

#### GitHub Actions (or equivalent)

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

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
      
      - name: Run tests
        run: cd web && yarn test:ember
      
      - name: Coverage report
        run: cd web && yarn test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./web/coverage/lcov.info
      
      - name: Check coverage threshold
        run: cd web && yarn test:coverage:check --threshold 60
```

#### Pre-commit Hooks

```bash
# Install husky
yarn add --dev husky lint-staged

# Configure .husky/pre-commit
#!/bin/sh
cd web && yarn lint-staged
```

**lint-staged config** (package.json):
```json
{
  "lint-staged": {
    "*.{js,ts}": ["eslint --fix", "git add"],
    "*.hbs": ["ember-template-lint --fix", "git add"]
  }
}
```

---

## Risk Mitigation

### Rollback Strategy

**For each upgrade**:
1. Create feature branch (`upgrade/ember-6.8`)
2. Keep main branch on stable version
3. Deploy to staging environment first
4. Monitor for 48 hours before production
5. Have rollback plan ready

### Feature Flags

**Use existing feature flag system**:
```hcl
# config.hcl
feature_flags {
  ember_6_8_features = true  # Toggle new behavior
}
```

### Gradual Rollout

**For major changes**:
1. Deploy to 10% of users (canary)
2. Monitor metrics/errors for 24 hours
3. Increase to 50% if stable
4. Full rollout after 48 hours

### Monitoring

**Track during/after upgrade**:
- [ ] JavaScript error rates
- [ ] Page load times
- [ ] Test pass rates
- [ ] User-reported issues
- [ ] Browser compatibility

---

## Success Metrics

### Test Coverage Metrics
- **Baseline**: ~5% (current)
- **Phase 2 Target**: 60%
- **Phase 4 Target**: 65%
- **Phase 5 Target**: 70%

### Quality Metrics
- **Test Pass Rate**: 100% (all tests passing)
- **Build Time**: <5 minutes
- **Zero Deprecation Warnings**: On each version
- **ESLint Errors**: 0 (fix current 43)

### Performance Metrics
- **Bundle Size**: ≤current ±5%
- **Page Load Time**: ≤current ±10%
- **Time to Interactive**: ≤current ±10%

### Stability Metrics
- **Production Errors**: No increase after upgrade
- **User-Reported Issues**: <5 per upgrade phase
- **Rollback Rate**: 0%

---

## Timeline Summary

| Phase | Duration | Focus | Deliverable |
|-------|----------|-------|-------------|
| **Phase 1** | 2 weeks | Fix tests | All tests passing |
| **Phase 2** | 4 weeks | Test coverage | 60% coverage |
| **Phase 3** | 1 week | Ember 6.8 | Stable on 6.8 |
| **Phase 4** | 1 week | Ember 6.9 | Stable on 6.9 |
| **Phase 5** | 3-6 months | Ember 7.0 prep | Ready for 7.0 |
| **Total** | ~3 months for 6.9, 6 months for 7.0 prep | | |

---

## Team Resources

### Documentation to Create
1. **Testing Guide** - How to write tests for Hermes components
2. **Migration Runbook** - Step-by-step upgrade procedures
3. **Deprecation Fixes** - Common patterns and solutions
4. **Component Patterns** - Modern Ember patterns in use

### Training Sessions
1. **Modern Ember Testing** (2 hours)
2. **TypeScript in Ember** (2 hours)
3. **Glimmer Components** (2 hours)
4. **Debugging Strategies** (1 hour)

### Reference Materials
- [Ember Guides](https://guides.emberjs.com/)
- [Ember CLI Guides](https://cli.emberjs.com/)
- [Ember TypeScript Guide](https://docs.ember-cli-typescript.com/)
- [Ember Deprecations](https://deprecations.emberjs.com/)

---

## Next Steps (Immediate Actions)

### This Week
1. ✅ Create this migration strategy document
2. [ ] Review with team for feedback
3. [ ] Get approval to proceed
4. [ ] Set up project tracking (Jira/GitHub Issues)

### Next Week (Phase 1 Start)
1. [ ] Fix test runner global failure
2. [ ] Re-enable disabled test
3. [ ] Install ember-cli-code-coverage
4. [ ] Run baseline coverage report
5. [ ] Create test-writing guide

### Week 3 (Phase 2 Start)
1. [ ] Begin service testing (session.ts first)
2. [ ] Set up CI/CD for test coverage
3. [ ] Create test fixtures/helpers
4. [ ] Weekly coverage progress reports

---

## Conclusion

This migration strategy prioritizes **stability and testing** above all else. By:
1. **Fixing current tests first** - Establish solid foundation
2. **Building comprehensive test coverage** - Safety net for upgrades
3. **Incremental upgrades** - Minimize risk at each step
4. **Thorough validation** - Catch issues before production

We ensure that **Hermes remains stable and reliable** throughout the Ember upgrade process, while **improving code quality** and **reducing technical debt**.

**Estimated Total Time**: 3 months to Ember 6.9 (latest stable), 6 months to Ember 7.0 readiness.

**Next Review**: After Phase 1 completion (2 weeks)
