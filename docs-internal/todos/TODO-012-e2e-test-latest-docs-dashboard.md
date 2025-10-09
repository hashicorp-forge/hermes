---
id: TODO-012
title: E2E Test 'Latest Docs' View on Dashboard
date: 2025-10-09
type: TODO
priority: high
status: open
progress: 0%
tags: [e2e-testing, dashboard, playwright, documents]
related:
  - TODO-011
  - TODO-013
---

# TODO-012: E2E Test 'Latest Docs' View on Dashboard

## Overview

Test that recently published documents appear in the 'Latest Docs' section below 'Awaiting Review', sorted by publish date descending (newest first).

## Backend Requirements

### API Endpoints

**`GET /api/v2/documents/recent?limit=10`**: Fetch recently published documents
- Filter: `status='Published'`
- Order: `published_at DESC`
- Limit: 10 (configurable via query parameter)
- Response: `{ documents: [ { id, title, doc_number, product, published_at } ] }`

### Backend Tests

```bash
# Unit tests
go test -v ./pkg/models/document_test.go -run TestRecentPublished

# Integration tests
go test -v -tags=integration ./tests/integration/api_documents_recent_test.go
```

## Frontend E2E Test

### Test File

**`tests/e2e-playwright/dashboard-latest-docs.spec.ts`**

### Test Script

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
npx playwright test dashboard-latest-docs.spec.ts --reporter=line --max-failures=1
```

## Test Users

From Dex configuration:
- `test@hermes.local` / `password` (document author)
- `admin@hermes.local` / `password` (alternative user)

## Acceptance Criteria

- [ ] `GET /api/v2/documents/recent` endpoint implemented
- [ ] Endpoint returns max 10 documents (configurable via query param)
- [ ] Documents sorted by `published_at DESC` (newest first)
- [ ] Unit tests pass for recent published document queries
- [ ] Integration tests pass for recent documents API
- [ ] E2E test passes: `dashboard-latest-docs.spec.ts`
- [ ] 'Latest Docs' section appears below 'Awaiting Review' on dashboard
- [ ] Document cards show all required metadata (title, doc number, product, published date)
- [ ] Navigation to documents works correctly
- [ ] Screenshots captured and added to documentation

## Implementation Notes

### Backend Implementation Priority
1. Add GET /api/v2/documents/recent endpoint with query parameters
2. Implement query logic: filter by status='Published', order by published_at DESC
3. Add limit parameter support (default: 10, max: 50)
4. Write unit tests for published date queries
5. Write integration tests for recent documents API

### Frontend Implementation Priority
1. Add data-test attributes to dashboard components
2. Implement 'Latest Docs' section UI below 'Awaiting Review'
3. Create document card component with metadata display
4. Connect to GET /api/v2/documents/recent endpoint
5. Write E2E test with playwright-mcp

### Query Optimization
- Add database index on `published_at` column for performance
- Consider caching recent documents for 1-5 minutes
- Implement pagination if more than 10 documents needed

## Related Documentation

- [Playwright E2E Agent Guide](../../PLAYWRIGHT_E2E_AGENT_GUIDE.md)
- [Dashboard E2E Testing Overview](TODO-dashboard-e2e-testing.md)
- [Testing Environment](../../../testing/README.md)
- [API Documentation](../../api-development/)
