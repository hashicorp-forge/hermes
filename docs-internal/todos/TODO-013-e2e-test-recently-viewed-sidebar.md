---
id: TODO-013
title: E2E Test 'Recently Viewed' Sidebar on Dashboard
date: 2025-10-09
type: TODO
priority: high
status: open
progress: 0%
tags: [e2e-testing, dashboard, playwright, user-tracking]
related:
  - TODO-011
  - TODO-012
---

# TODO-013: E2E Test 'Recently Viewed' Sidebar on Dashboard

## Overview

Test that documents viewed by a user appear in the 'Recently Viewed' list on the right sidebar of the dashboard, with correct tracking, persistence across sessions, and re-ordering when documents are re-viewed.

## Backend Requirements

### Models

**`pkg/models/recently_viewed_docs.go`**: Ensure model supports:
- `user_id` (viewer)
- `document_id` (viewed document)
- `viewed_at` (timestamp)
- Composite unique key: `(user_id, document_id)`

### API Endpoints

**`POST /api/v2/documents/{id}/view`**: Track document view
- Creates or updates `recently_viewed_docs` record
- Updates `viewed_at` to current timestamp
- Returns: 204 No Content

**`GET /api/v2/me/recently-viewed?limit=5`**: Fetch recently viewed documents for authenticated user
- Order: `viewed_at DESC`
- Limit: 5 (configurable via query parameter)
- Response: `{ documents: [ { id, title, doc_number, viewed_at } ] }`

### Backend Tests

```bash
# Unit tests
go test -v ./pkg/models/recently_viewed_docs_test.go

# Integration tests
go test -v -tags=integration ./tests/integration/api_recently_viewed_test.go
```

## Frontend E2E Test

### Test File

**`tests/e2e-playwright/dashboard-recently-viewed.spec.ts`**

### Test Script

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

## Environment Setup

### Quick Start (Testing Environment)
```bash
# Start all services
cd testing
docker compose up -d

# Browser: http://localhost:4201
# Login: test@hermes.local / password
```

### Native Development
```bash
# Terminal 1: Backend
cp config-example.hcl config.hcl
make bin && ./hermes server -config=config.hcl

# Terminal 2: Frontend
cd web && yarn start:proxy

# Browser: http://localhost:4200
```

### Test Execution
```bash
cd tests/e2e-playwright
npx playwright test dashboard-recently-viewed.spec.ts --reporter=line --max-failures=1
```

## Test Users

From Dex configuration:
- `test@hermes.local` / `password` (document viewer)
- `admin@hermes.local` / `password` (alternative user)

## Acceptance Criteria

- [ ] `RecentlyViewedDocs` model implemented with composite unique key `(user_id, document_id)`
- [ ] `POST /api/v2/documents/{id}/view` endpoint implemented to track views
- [ ] `GET /api/v2/me/recently-viewed` endpoint implemented with limit parameter
- [ ] Unit tests pass: `pkg/models/recently_viewed_docs_test.go`
- [ ] Integration tests pass for view tracking and retrieval
- [ ] E2E test passes: `dashboard-recently-viewed.spec.ts`
- [ ] Sidebar appears on right side of dashboard
- [ ] Documents sorted by most recently viewed first (`viewed_at DESC`)
- [ ] List limited to 5 items (or configured limit)
- [ ] Re-viewing a document moves it to the top of the list
- [ ] View tracking persists across user sessions (database-backed)
- [ ] Screenshots captured and added to documentation

## Implementation Notes

### Backend Implementation Priority
1. Create `RecentlyViewedDocs` model with composite unique key
2. Implement POST /api/v2/documents/{id}/view endpoint (upsert logic)
3. Implement GET /api/v2/me/recently-viewed endpoint with limit
4. Write unit tests for RecentlyViewedDocs CRUD operations
5. Write integration tests for view tracking workflow

### Frontend Implementation Priority
1. Add data-test attributes to sidebar components
2. Implement 'Recently Viewed' sidebar UI on right side
3. Create document list item component
4. Call POST /api/v2/documents/{id}/view when document is viewed
5. Connect to GET /api/v2/me/recently-viewed endpoint
6. Write E2E test with playwright-mcp

### Database Schema
```sql
CREATE TABLE recently_viewed_docs (
  user_id INTEGER NOT NULL REFERENCES users(id),
  document_id INTEGER NOT NULL REFERENCES documents(id),
  viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, document_id)
);

CREATE INDEX idx_recently_viewed_user_viewed_at 
  ON recently_viewed_docs(user_id, viewed_at DESC);
```

### Implementation Considerations
- Use UPSERT (INSERT ... ON CONFLICT UPDATE) for view tracking
- Consider automatic cleanup of old entries (> 30 days or > 100 per user)
- Implement client-side debouncing to avoid excessive API calls
- Track views on initial page load (not on every scroll/interaction)

## Related Documentation

- [Playwright E2E Agent Guide](../../PLAYWRIGHT_E2E_AGENT_GUIDE.md)
- [Dashboard E2E Testing Overview](TODO-dashboard-e2e-testing.md)
- [Testing Environment](../../../testing/README.md)
- [Database Models](../../../pkg/models/)
