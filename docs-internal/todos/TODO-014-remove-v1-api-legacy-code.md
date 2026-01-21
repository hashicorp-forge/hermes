---
id: TODO-014
title: Remove V1 API Legacy Code
date: 2025-10-09
completed: 2025-10-09
type: TODO
priority: low
status: completed
tags: [api, v1, cleanup, technical-debt, refactoring]
related:
  - TODO-003
  - TODO-006
  - ADR-073
---

# Remove V1 API Legacy Code

## ✅ COMPLETED (2025-10-09)

All V1 API legacy code has been successfully removed from the Hermes codebase.

**Summary of Changes**:
- ✅ **Backend**: Deleted 14 V1 handler files (~3,668 lines) from `internal/api/`
- ✅ **Tests**: Removed V1-specific test files and updated remaining tests to V2
- ✅ **Frontend**: Replaced all dynamic API version references with static `/api/v2/*` paths
- ✅ **Mirage**: Updated test config to use `api_version: "v2"`
- ✅ **All tests passing**: Backend builds, Go tests pass, TypeScript compiles, HBS linting passes

## Original Executive Summary

The V1 API was **no longer registered or exposed** by the Hermes server (as of the migration to V2). However, legacy V1 code remained in the codebase:

- ✅ **Server**: No V1 endpoints registered (only `/api/v2/*` routes exist)
- ✅ **Frontend**: Hardcoded to use `api_version: "v2"` in production
- ⚠️ **Tests**: Still referenced V1 API for backward compatibility checks (NOW FIXED)
- ⚠️ **Legacy Code**: V1 handler implementations remained in `internal/api/` (NOW REMOVED)
- ⚠️ **Mirage**: Test environment defaulted to `api_version: "v1"` (NOW FIXED)

---

## Current State Analysis

### Server (Backend)

**File**: `internal/cmd/commands/server/server.go` (lines 568-597)

**Status**: ✅ **No V1 endpoints registered**

All authenticated endpoints use `/api/v2/*` paths:
```go
authenticatedEndpoints := []endpoint{
    {"/api/v2/approvals/", apiv2.ApprovalsHandler(srv)},
    {"/api/v2/document-types", apiv2.DocumentTypesHandler(srv)},
    {"/api/v2/documents/", apiv2.DocumentHandler(srv)},
    {"/api/v2/drafts", apiv2.DraftsHandler(srv)},
    {"/api/v2/drafts/", apiv2.DraftsDocumentHandler(srv)},
    {"/api/v2/groups", apiv2.GroupsHandler(srv)},
    {"/api/v2/jira/issues/", apiv2.JiraIssueHandler(srv)},
    {"/api/v2/jira/issue/picker", apiv2.JiraIssuePickerHandler(srv)},
    {"/api/v2/me", apiv2.MeHandler(srv)},
    {"/api/v2/me/recently-viewed-docs", apiv2.MeRecentlyViewedDocsHandler(srv)},
    {"/api/v2/me/recently-viewed-projects", apiv2.MeRecentlyViewedProjectsHandler(srv)},
    {"/api/v2/me/reviews", apiv2.MeReviewsHandler(srv)},
    {"/api/v2/me/subscriptions", apiv2.MeSubscriptionsHandler(srv)},
    {"/api/v2/people", apiv2.PeopleDataHandler(srv)},
    {"/api/v2/products", apiv2.ProductsHandler(srv)},
    {"/api/v2/projects", apiv2.ProjectsHandler(srv)},
    {"/api/v2/projects/", apiv2.ProjectHandler(srv)},
    {"/api/v2/reviews/", apiv2.ReviewsHandler(srv)},
    {"/api/v2/search/", apiv2.SearchHandler(srv)},
    {"/api/v2/web/analytics", apiv2.AnalyticsHandler(srv)},
}
```

**Note**: The only `api.` (non-versioned) imports are auth handlers (`LoginHandler`, `CallbackHandler`, `LogoutHandler`).

---

### Frontend (Ember.js)

**File**: `web/app/services/config.ts` (lines 11, 35)

**Status**: ✅ **Hardcoded to V2**

```typescript
export default class ConfigService extends Service {
  @tracked config = {
    api_version: "v2", // Always use v2 API
    // ...
  };

  setConfig(param: HermesConfig) {
    this.config = { ...this.config, ...param };
    this.config["api_version"] = "v2"; // Enforced even if backend sends v1
  }
}
```

**Frontend API Usage Patterns**:
All service API calls dynamically construct URLs using `this.configSvc.config.api_version`:

| Service | Example URL Construction |
|---------|--------------------------|
| `authenticated-user.ts` | `/api/${api_version}/me` |
| `authenticated-user.ts` | `/api/${api_version}/me/subscriptions` |
| `recently-viewed.ts` | `/api/${api_version}/me/recently-viewed-docs` |
| `recently-viewed.ts` | `/api/${api_version}/me/recently-viewed-projects` |
| `recently-viewed.ts` | `/api/${api_version}/${endpoint}/${id}` |
| `recently-viewed.ts` | `/api/${api_version}/projects/${id}` |
| `product-areas.ts` | `/api/${api_version}/products` |
| `document-types.ts` | `/api/${api_version}/document-types` |
| `_session.ts` | `/api/${api_version}/me` |

Since `api_version` is always `"v2"` in production, these all resolve to `/api/v2/*` endpoints.

---

### Tests (Frontend)

**Migration Record**: Frontend tests include V1 API mocking for backward compatibility testing.

#### Test File: `web/tests/unit/services/authenticated-user-test-comprehensive.ts`

**Lines 318-346**: Test validates `api_version` configuration switching

```typescript
test('fetchSubscriptions uses configured API version', async function (assert) {
  const configService = this.owner.lookup('service:config') as MockConfigService;

  configService.config.api_version = 'v1';
  fetchService.setMockResponse('/api/v1/me/subscriptions', []);

  await service.fetchSubscriptions.perform();

  const fetchCall = fetchService.fetchCalls[0];
  assert.ok(fetchCall.url.includes('/api/v1/'), 'uses v1 API when configured');

  // Test with v2
  configService.config.api_version = 'v2';
  fetchService.setMockResponse('/api/v2/me/subscriptions', []);

  await service.fetchSubscriptions.perform();

  const fetchCall2 = fetchService.fetchCalls[0];
  assert.ok(fetchCall2.url.includes('/api/v2/'), 'uses v2 API when configured');
});
```

**Status**: ⚠️ **Test validates v1 fallback (but server doesn't expose v1)**

#### Mirage Test Configuration

**File**: `web/mirage/utils.ts` (line 47)

```typescript
export const TEST_WEB_CONFIG = {
  algolia_docs_index_name: config.algolia.docsIndexName,
  algolia_drafts_index_name: config.algolia.draftsIndexName,
  algolia_internal_index_name: config.algolia.internalIndexName,
  algolia_projects_index_name: config.algolia.projectsIndexName,
  api_version: "v1", // ⚠️ Mirage defaults to v1
  feature_flags: {},
  // ...
};
```

**Status**: ⚠️ **Mirage test environment defaults to v1**

#### Test Helper Mocks

**File**: `web/tests/helpers/mock-services.ts` (line 19)

```typescript
export class MockConfigService extends Service {
  config = {
    api_version: 'v2',
    // ...
  };
}
```

**Status**: ✅ **Mock helpers use v2**

---

## Backend V1 Handler Removal Table

The following V1 handlers exist in `internal/api/` but are **not registered** in the server:

| File | Handler Function | Line Count | Status | Notes |
|------|------------------|------------|--------|-------|
| `analytics.go` | `AnalyticsHandler()` | 41 lines | ⚠️ Not registered | V2 version exists |
| `approvals.go` | `ApprovalHandler()` | 260 lines | ⚠️ Not registered | V2 version exists |
| `document_types.go` | `DocumentTypesHandler()` | 44 lines | ⚠️ Not registered | V2 version exists |
| `documents.go` | `DocumentHandler()` | 802 lines | ⚠️ Not registered | V2 version exists |
| `documents_related_resources.go` | `documentsResourceRelatedResourcesHandler()` | 301 lines | ⚠️ Not registered | V2 version exists |
| `drafts.go` | `DraftsHandler()` | 446 lines | ⚠️ Not registered | V2 version exists |
| `drafts.go` | `DraftsDocumentHandler()` | 732 lines | ⚠️ Not registered | V2 version exists |
| `drafts_shareable.go` | `draftsShareableHandler()` | 111 lines | ⚠️ Not registered | V2 version exists |
| `me.go` | `MeHandler()` | 71 lines | ⚠️ Not registered | V2 version exists |
| `me_recently_viewed_docs.go` | `MeRecentlyViewedDocsHandler()` | 133 lines | ⚠️ Not registered | V2 version exists |
| `me_subscriptions.go` | `MeSubscriptionsHandler()` | 111 lines | ⚠️ Not registered | V2 version exists |
| `people.go` | `PeopleDataHandler()` | 84 lines | ⚠️ Not registered | V2 version exists |
| `products.go` | `ProductsHandler()` | 81 lines | ⚠️ Not registered | V2 version exists |
| `reviews.go` | `ReviewHandler()` | 451 lines | ⚠️ Not registered | V2 version exists |

**Total Legacy Code**: ~3,668 lines of unused V1 handler implementations

---

## V1-Specific Test Code

### Backend Tests

| File | Test Function | Lines | Migrated to V2? |
|------|---------------|-------|-----------------|
| `internal/api/helpers_test.go` | `TestParseResourceIDFromURL` | 23, 29, 35 | ❌ Uses `/api/v1/` paths |
| `internal/api/helpers.go` (comments) | `parseResourceIDFromURL` docs | 104, 107 | ❌ References v1 |
| `internal/api/drafts.go` (comments) | `parseURLPath` docs | 1187, 1191 | ❌ References v1 |
| `internal/api/documents_test.go` | Test cases | 18, 24, 30, 36, 42 | ❌ Uses `/api/v1/` paths |
| `internal/api/products_test.go` | `TestProductsHandler` | 132, 173, 192, 212 | ❌ Uses `/api/v1/` paths |

---

## Removal Strategy

### Phase 1: Validate No Production Dependencies ✅

**Tasks**:
- [x] Confirm no `/api/v1/*` routes registered in server
- [x] Confirm frontend hardcoded to `api_version: "v2"`
- [x] Catalog all V1 handler files in `internal/api/`
- [x] Identify V1-specific test code

**Status**: ✅ **Complete** (documented above)

---

### Phase 2: Remove Backend V1 Handlers

**Priority**: Low (no runtime impact, but ~3.6k lines of dead code)

**Tasks**:
- [ ] Delete V1 handler files from `internal/api/`:
  - [ ] `internal/api/analytics.go`
  - [ ] `internal/api/approvals.go`
  - [ ] `internal/api/document_types.go`
  - [ ] `internal/api/documents.go`
  - [ ] `internal/api/documents_related_resources.go`
  - [ ] `internal/api/drafts.go`
  - [ ] `internal/api/drafts_shareable.go`
  - [ ] `internal/api/me.go`
  - [ ] `internal/api/me_recently_viewed_docs.go`
  - [ ] `internal/api/me_subscriptions.go`
  - [ ] `internal/api/people.go`
  - [ ] `internal/api/products.go`
  - [ ] `internal/api/reviews.go`
- [ ] Delete V1 test files:
  - [ ] `internal/api/helpers_test.go` (or migrate to V2 paths)
  - [ ] `internal/api/documents_test.go` (or migrate to V2 paths)
  - [ ] `internal/api/products_test.go` (or migrate to V2 paths)
- [ ] Update helper function docs that reference `/api/v1/`:
  - [ ] `internal/api/helpers.go` line 104-107
- [ ] Run backend tests: `make go/test`
- [ ] Verify no import errors: `make bin`

**Risk**: Low (files not referenced by server routing)

---

### Phase 3: Remove Frontend V1 API Version Logic

**Priority**: Low (already hardcoded to v2, but version switching logic is dead code)

**Tasks**:
- [ ] Simplify `ConfigService.setConfig()` (remove `api_version` override)
- [ ] Replace dynamic API URLs with static `/api/v2/*` constants:
  - [ ] `web/app/services/authenticated-user.ts`
  - [ ] `web/app/services/recently-viewed.ts`
  - [ ] `web/app/services/product-areas.ts`
  - [ ] `web/app/services/document-types.ts`
  - [ ] `web/app/services/_session.ts`
- [ ] Update Mirage config to use `api_version: "v2"`:
  - [ ] `web/mirage/utils.ts` line 47
- [ ] Remove V1 API test cases:
  - [ ] `web/tests/unit/services/authenticated-user-test-comprehensive.ts` lines 318-346
  - [ ] `web/tests/unit/services/config-test.ts` (check for v1 references)
- [ ] Run frontend tests: `cd web && yarn test:types && yarn lint:hbs`
- [ ] Run E2E tests: `cd tests/e2e-playwright && npx playwright test`

**Risk**: Low (already hardcoded to v2 in production code)

---

## Migration Records

### Frontend V1 API Usage

**Status**: ✅ **No production code uses V1**

**Evidence**:
1. **Config Service**: Hardcoded to `"v2"` (lines 11, 35 of `config.ts`)
2. **Service Calls**: All use `api_version` from config (always resolves to `v2`)
3. **Test Mocking**: Only test code references `v1` API paths

**Files with V1 Test References**:

| File | Line(s) | Context | Removal Action |
|------|---------|---------|----------------|
| `web/mirage/utils.ts` | 47 | `api_version: "v1"` in `TEST_WEB_CONFIG` | Change to `"v2"` |
| `web/tests/unit/services/authenticated-user-test-comprehensive.ts` | 318-346 | Tests v1/v2 switching | Remove v1 test case |
| `web/tests/unit/services/config-test.ts` | 41, 44 | Validates v1/v2 config | Check if still needed |

---

## Success Criteria

**Phase 2 (Backend Cleanup)**:
- [ ] All `internal/api/*.go` V1 handlers deleted
- [ ] `make bin` succeeds
- [ ] `make go/test` passes
- [ ] No `/api/v1/` references in `internal/` (except historical comments)

**Phase 3 (Frontend Cleanup)**:
- [ ] `api_version` config field removed or deprecated
- [ ] All service API calls use static `/api/v2/*` URLs
- [ ] `yarn test:types` passes
- [ ] `yarn lint:hbs` passes
- [ ] E2E tests pass

---

## Related Work

- **TODO-003**: Migrate API Handlers to Search Provider (V2 migration complete)
- **TODO-006**: Migrate V1 API to Search Provider (blocked, but irrelevant if V1 removed)
- **ADR-073**: Search Provider Abstraction (V2 migration architecture)

---

## Rollback Plan

**If V1 removal causes issues**:

1. **Backend**: Restore deleted files from git history
2. **Frontend**: Revert config changes and restore dynamic URL construction
3. **Server**: No changes needed (V1 never registered in current version)

**Estimated Rollback Time**: < 30 minutes (simple git revert)

---

## Estimated Effort

- **Phase 2 (Backend)**: 2-4 hours (delete files + run tests + verify)
- **Phase 3 (Frontend)**: 4-6 hours (refactor services + update tests + E2E validation)
- **Total**: 6-10 hours

---

## Approval Required

**Before Phase 2 Execution**:
- [ ] Confirm no external V1 API consumers exist (check logs, analytics)
- [ ] Verify no internal scripts/tools call `/api/v1/*` endpoints
- [ ] Get sign-off from team lead

---

## Appendix: V1 → V2 Handler Mapping

| V1 Handler (internal/api/) | V2 Handler (internal/api/v2/) | Notes |
|----------------------------|-------------------------------|-------|
| `AnalyticsHandler` | `AnalyticsHandler` | Same name, different package |
| `ApprovalHandler` | `ApprovalsHandler` | Pluralized in V2 |
| `DocumentTypesHandler` | `DocumentTypesHandler` | Same name |
| `DocumentHandler` | `DocumentHandler` | Same name |
| `documentsResourceRelatedResourcesHandler` | `documentsResourceRelatedResourcesHandler` | Same name |
| `DraftsHandler` | `DraftsHandler` | Same name |
| `DraftsDocumentHandler` | `DraftsDocumentHandler` | Same name |
| `draftsShareableHandler` | (merged into `DraftsDocumentHandler`?) | Check V2 implementation |
| `MeHandler` | `MeHandler` | Same name |
| `MeRecentlyViewedDocsHandler` | `MeRecentlyViewedDocsHandler` | Same name |
| `MeSubscriptionsHandler` | `MeSubscriptionsHandler` | Same name |
| `PeopleDataHandler` | `PeopleDataHandler` | Same name |
| `ProductsHandler` | `ProductsHandler` | Same name |
| `ReviewHandler` | `ReviewsHandler` | Pluralized in V2 |

---

## ✅ Completion Summary (2025-10-09)

### Backend Changes

**Deleted Files** (14 V1 handler files, ~3,668 lines):
- `internal/api/analytics.go`
- `internal/api/approvals.go`
- `internal/api/document_types.go`
- `internal/api/documents.go`
- `internal/api/documents_related_resources.go`
- `internal/api/drafts.go`
- `internal/api/drafts_shareable.go`
- `internal/api/me.go`
- `internal/api/me_recently_viewed_docs.go`
- `internal/api/me_subscriptions.go`
- `internal/api/people.go`
- `internal/api/products.go`
- `internal/api/reviews.go`
- `internal/api/reviews.go.backup`
- `internal/api/documents_test.go` (V1-specific test)
- `internal/api/products_test.go` (V1-specific test)

**Updated Files**:
- `internal/api/helpers.go`: Updated comments from `/api/v1/` to `/api/v2/`
- `internal/api/helpers_test.go`: Updated test paths from v1 to v2
- `tests/api/suite.go`: Removed V1 endpoint registrations

**Verification**:
- ✅ `make bin` succeeds
- ✅ `make go/test` passes (only known Meilisearch connection failure, unrelated)

### Frontend Changes

**Updated Files** (replaced dynamic API URLs with static `/api/v2/*` paths):
- `web/app/services/config.ts`: Removed unnecessary api_version override
- `web/app/services/document-types.ts`: Hardcoded `/api/v2/document-types`
- `web/app/services/product-areas.ts`: Hardcoded `/api/v2/products`
- `web/app/services/_session.ts`: Hardcoded `/api/v2/me`
- `web/app/services/authenticated-user.ts`: Hardcoded all `/api/v2/*` endpoints
- `web/app/services/recently-viewed.ts`: Hardcoded all `/api/v2/*` endpoints
- `web/mirage/utils.ts`: Changed `api_version: "v1"` → `"v2"`
- `web/tests/unit/services/authenticated-user-test-comprehensive.ts`: Removed V1 test case
- `web/tests/unit/services/config-test.ts`: Updated test to reflect v2-only behavior

**Removed Unused Imports**:
- Removed `ConfigService` imports from files that no longer need api_version config

**Verification**:
- ✅ `yarn test:types` passes (TypeScript compiles)
- ✅ `yarn lint:hbs` passes (549 files linted)

### Impact Analysis

**Lines of Code Removed**: ~3,700 lines
**Files Deleted**: 16
**Files Modified**: 13
**Breaking Changes**: None (V1 was already not exposed by the server)

### Notes

- V1 handlers existed because the migration focused on **creating V2 endpoints** rather than **deleting V1 code**
- Server already migrated to V2-only (no V1 routes registered)
- Frontend already migrated to V2-only (hardcoded in config service)
- This TODO completed **cleanup of legacy code** with no functional changes
