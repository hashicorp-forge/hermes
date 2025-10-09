# Dashboard E2E Testing TODOs

**Created**: October 9, 2025  
**Status**: Planning  
**Priority**: High  

## Overview

This document outlines the E2E testing strategy for three key dashboard features in Hermes:
1. **Awaiting Review** view (top of dashboard)
2. **Latest Docs** view (below Awaiting Review)
3. **Recently Viewed** sidebar (right side)

Each feature requires:
- Backend implementation with unit and integration tests
- E2E validation using playwright-mcp with Ember dev proxy
- Documentation with screenshots

## Testing Approach

### Backend Testing Strategy

**Unit Tests**:
- Test individual model operations (CRUD)
- Test business logic in isolation
- Mock external dependencies
- Run with: `make go/test` or `go test ./pkg/...`

**Integration Tests**:
- Test full API endpoints with real database
- Test workspace provider interactions
- Test complete user workflows
- Run with: `make integration/test` or `go test -tags=integration ./tests/integration/...`

### Frontend E2E Testing Strategy

**Tools**:
- `playwright-mcp`: Browser automation with snapshots
- Ember dev proxy: `make web/proxy` (auto-detects backend port)
- Native backend: `./hermes server -config=config-example.hcl`

**Environment Setup**:
```bash
# Terminal 1: Start backend
cp config-example.hcl config.hcl
make bin && ./hermes server -config=config.hcl

# Terminal 2: Start frontend with proxy
cd web && make web/proxy

# Terminal 3: Run E2E tests with playwright-mcp
cd tests/e2e-playwright
npx playwright test dashboard-awaiting-review.spec.ts --reporter=line
```

**Test Users** (from Dex config):
- `test@hermes.local` / `password` (User A, document author)
- `admin@hermes.local` / `password` (User B, reviewer)
- `demo@hermes.local` / `password` (User C, additional user)

## TODO 1: Awaiting Review Dashboard View

### Backend Requirements

#### Models
- `pkg/models/document_review.go`: Ensure DocumentReview model supports:
  - `user_id` (reviewer)
  - `document_id` (document being reviewed)
  - `status` (pending, approved, rejected)
  - `created_at`, `updated_at`

#### API Endpoints
- `GET /api/v2/me/reviews`: Fetch pending reviews for authenticated user
  - Query: `status=pending`
  - Response: `{ reviews: [ { document: {...}, created_at: "..." } ] }`

#### Local Workspace Support
- `pkg/workspace/adapters/local/`: Support reviewer metadata in document JSON
  - Field: `reviewers: ["email1@domain.com", "email2@domain.com"]`
  - Update on document save

#### Tests
```bash
# Unit tests
go test -v ./pkg/models/document_review_test.go

# Integration tests
go test -v -tags=integration ./tests/integration/api_reviews_test.go
```

### Frontend E2E Test Script

**File**: `tests/e2e-playwright/dashboard-awaiting-review.spec.ts`

```typescript
test('dashboard shows awaiting review with pip badge', async ({ page }) => {
  // Setup: User A creates RFC with User B as reviewer
  await page.goto('http://localhost:4200');
  await loginAs(page, 'test@hermes.local', 'password');
  
  const docTitle = `RFC Test ${Date.now()}`;
  await createDocument(page, 'RFC', docTitle);
  await addReviewer(page, 'admin@hermes.local');
  await publishDocument(page);
  
  await logout(page);
  
  // Test: User B sees document in Awaiting Review
  await loginAs(page, 'admin@hermes.local', 'password');
  await page.goto('http://localhost:4200/dashboard');
  
  // Verify Awaiting Review section exists
  const awaitingReviewSection = page.locator('[data-test-awaiting-review]');
  await expect(awaitingReviewSection).toBeVisible();
  
  // Verify pip badge shows count
  const pipBadge = page.locator('[data-test-review-count-badge]');
  await expect(pipBadge).toHaveText('1');
  
  // Verify document appears in list
  const reviewItem = page.locator(`[data-test-review-item]:has-text("${docTitle}")`);
  await expect(reviewItem).toBeVisible();
  
  // Click and verify navigation
  await reviewItem.click();
  await expect(page).toHaveURL(/\/documents\/RFC-\d+/);
});
```

### Acceptance Criteria

- [ ] `DocumentReview` model has all required fields
- [ ] `GET /api/v2/me/reviews` endpoint implemented and tested
- [ ] Local workspace supports reviewer metadata
- [ ] Unit tests pass: `pkg/models/document_review_test.go`
- [ ] Integration tests pass: `tests/integration/api_reviews_test.go`
- [ ] E2E test passes: `dashboard-awaiting-review.spec.ts`
- [ ] Pip badge displays correct count
- [ ] Clicking review navigates to document
- [ ] Screenshots captured and added to docs

## TODO 2: Latest Docs Dashboard View

### Backend Requirements

#### API Endpoints
- `GET /api/v2/documents/recent?limit=10`: Fetch recently published documents
  - Filter: `status='Published'`
  - Order: `published_at DESC`
  - Limit: 10 (configurable)
  - Response: `{ documents: [ { id, title, doc_number, product, published_at } ] }`

#### Tests
```bash
# Unit tests
go test -v ./pkg/models/document_test.go -run TestRecentPublished

# Integration tests
go test -v -tags=integration ./tests/integration/api_documents_recent_test.go
```

### Frontend E2E Test Script

**File**: `tests/e2e-playwright/dashboard-latest-docs.spec.ts`

```typescript
test('dashboard shows latest docs in chronological order', async ({ page }) => {
  await page.goto('http://localhost:4200');
  await loginAs(page, 'test@hermes.local', 'password');
  
  // Create and publish 3 documents with delays
  const docs = [];
  for (let i = 1; i <= 3; i++) {
    const title = `RFC Latest Test ${i} ${Date.now()}`;
    await createDocument(page, 'RFC', title);
    await publishDocument(page);
    docs.push(title);
    await page.waitForTimeout(1000); // Ensure different timestamps
  }
  
  // Navigate to dashboard
  await page.goto('http://localhost:4200/dashboard');
  
  // Verify Latest Docs section exists
  const latestDocsSection = page.locator('[data-test-latest-docs]');
  await expect(latestDocsSection).toBeVisible();
  
  // Verify documents appear in reverse chronological order
  const docCards = page.locator('[data-test-doc-card]');
  await expect(docCards).toHaveCount(3);
  
  // Newest should be first
  const firstCard = docCards.nth(0);
  await expect(firstCard).toContainText(docs[2]);
  
  // Verify metadata displayed
  await expect(firstCard.locator('[data-test-doc-number]')).toBeVisible();
  await expect(firstCard.locator('[data-test-product]')).toBeVisible();
  await expect(firstCard.locator('[data-test-published-date]')).toBeVisible();
  
  // Test navigation
  await firstCard.click();
  await expect(page).toHaveURL(/\/documents\/RFC-\d+/);
});
```

### Acceptance Criteria

- [ ] `GET /api/v2/documents/recent` endpoint implemented
- [ ] Endpoint returns max 10 documents
- [ ] Documents sorted by `published_at DESC`
- [ ] Unit tests pass for recent query
- [ ] Integration tests pass
- [ ] E2E test passes: `dashboard-latest-docs.spec.ts`
- [ ] Latest Docs section appears below Awaiting Review
- [ ] Document cards show all required metadata
- [ ] Navigation to documents works
- [ ] Screenshots captured

## TODO 3: Recently Viewed Sidebar

### Backend Requirements

#### Models
- `pkg/models/recently_viewed_docs.go`: Ensure model supports:
  - `user_id` (viewer)
  - `document_id` (viewed document)
  - `viewed_at` (timestamp)
  - Composite unique key: `(user_id, document_id)`

#### API Endpoints
- `POST /api/v2/documents/{id}/view`: Track document view
  - Creates or updates `recently_viewed_docs` record
  - Updates `viewed_at` to current timestamp
  
- `GET /api/v2/me/recently-viewed?limit=5`: Fetch recently viewed for user
  - Order: `viewed_at DESC`
  - Limit: 5 (configurable)
  - Response: `{ documents: [ { id, title, doc_number, viewed_at } ] }`

#### Tests
```bash
# Unit tests
go test -v ./pkg/models/recently_viewed_docs_test.go

# Integration tests
go test -v -tags=integration ./tests/integration/api_recently_viewed_test.go
```

### Frontend E2E Test Script

**File**: `tests/e2e-playwright/dashboard-recently-viewed.spec.ts`

```typescript
test('dashboard shows recently viewed in sidebar', async ({ page }) => {
  await page.goto('http://localhost:4200');
  await loginAs(page, 'test@hermes.local', 'password');
  
  // Create 5 documents
  const docTitles = [];
  for (let i = 1; i <= 5; i++) {
    const title = `RFC Viewed Test ${i} ${Date.now()}`;
    await createDocument(page, 'RFC', title);
    await publishDocument(page);
    docTitles.push(title);
  }
  
  // View documents in specific order: A → B → C → D → E
  for (const title of docTitles) {
    await page.goto('http://localhost:4200/dashboard');
    const docCard = page.locator(`[data-test-doc-card]:has-text("${title}")`);
    await docCard.click();
    await page.waitForURL(/\/documents\/RFC-\d+/);
    await page.waitForTimeout(500); // Ensure view tracked
  }
  
  // Navigate to dashboard
  await page.goto('http://localhost:4200/dashboard');
  
  // Verify Recently Viewed sidebar
  const recentlyViewedSidebar = page.locator('[data-test-recently-viewed-sidebar]');
  await expect(recentlyViewedSidebar).toBeVisible();
  
  // Verify documents in reverse order (E, D, C, B, A)
  const viewedItems = page.locator('[data-test-recently-viewed-item]');
  await expect(viewedItems).toHaveCount(5);
  
  // Most recent should be first
  const firstItem = viewedItems.nth(0);
  await expect(firstItem).toContainText(docTitles[4]); // Doc E
  
  const secondItem = viewedItems.nth(1);
  await expect(secondItem).toContainText(docTitles[3]); // Doc D
  
  // Re-view first document (Doc A)
  await page.goto('http://localhost:4200/dashboard');
  const docA = page.locator(`[data-test-doc-card]:has-text("${docTitles[0]}")`);
  await docA.click();
  await page.waitForURL(/\/documents\/RFC-\d+/);
  
  // Go back to dashboard
  await page.goto('http://localhost:4200/dashboard');
  
  // Verify Doc A now at top
  const updatedFirstItem = viewedItems.nth(0);
  await expect(updatedFirstItem).toContainText(docTitles[0]);
});
```

### Acceptance Criteria

- [ ] `RecentlyViewedDocs` model implemented with composite key
- [ ] `POST /api/v2/documents/{id}/view` endpoint implemented
- [ ] `GET /api/v2/me/recently-viewed` endpoint implemented
- [ ] Unit tests pass: `pkg/models/recently_viewed_docs_test.go`
- [ ] Integration tests pass
- [ ] E2E test passes: `dashboard-recently-viewed.spec.ts`
- [ ] Sidebar appears on right side of dashboard
- [ ] Documents sorted by most recently viewed first
- [ ] List limited to 5 items
- [ ] Re-viewing moves document to top
- [ ] View tracking persists across sessions
- [ ] Screenshots captured

## Implementation Order

**Recommended sequence**:

1. **TODO 3: Recently Viewed** (simplest, good warmup)
   - Simpler data model (just tracking views)
   - No complex business logic
   - Good pattern to establish for other TODOs

2. **TODO 2: Latest Docs** (medium complexity)
   - Builds on existing document queries
   - No new relationships required
   - Tests sorting and filtering

3. **TODO 1: Awaiting Review** (most complex)
   - Requires reviewer assignment workflow
   - Multi-user interaction testing
   - Pip badge UI component
   - Notification system integration

## Testing Environment Notes

### Database State
- Use dedicated test database: `hermes_test`
- Reset between test runs for consistency
- Consider fixtures for common data

### Local Workspace
- Test data stored in `/tmp/hermes_workspace_test`
- Clean up between test runs: `rm -rf /tmp/hermes_workspace_test`

### Frontend Proxy
- Auto-detects backend on port 8000 (native) or 8001 (Docker)
- Proxies API requests to backend
- Hot reload enabled for fast iteration

### Screenshot Location
- Save to: `tests/e2e-playwright/test-results/`
- Include in docs: `docs-internal/testing/screenshots/`

## See Also

- [Playwright E2E Agent Guide](PLAYWRIGHT_E2E_AGENT_GUIDE.md)
- [Testing Environment](../../testing/README.md)
- [API Documentation](../api-development/)
- [Makefile Targets](MAKEFILE_ROOT_TARGETS.md)
