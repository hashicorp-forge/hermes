---
id: TODO-011
title: E2E Test 'Awaiting Review' Dashboard View with Reviewer Notifications
date: 2025-10-09
type: TODO
priority: high
status: open
progress: 0%
tags: [e2e-testing, dashboard, playwright, reviews]
related:
  - TODO-012
  - TODO-013
---

# TODO-011: E2E Test 'Awaiting Review' Dashboard View

## Overview

Test complete workflow where User A authors an RFC and tags User B as a reviewer, then User B sees the document in their 'Awaiting Review' section with a pip count badge on the dashboard.

## Backend Requirements

### Models

**`pkg/models/document_review.go`**: Ensure DocumentReview model supports:
- `user_id` (reviewer)
- `document_id` (document being reviewed)
- `status` (pending, approved, rejected)
- `created_at`, `updated_at`

### API Endpoints

**`GET /api/v2/me/reviews`**: Fetch pending reviews for authenticated user
- Query: `status=pending`
- Response: `{ reviews: [ { document: {...}, created_at: "..." } ] }`

### Local Workspace Support

**`pkg/workspace/adapters/local/`**: Support reviewer metadata in document JSON
- Field: `reviewers: ["email1@domain.com", "email2@domain.com"]`
- Update on document save

### Backend Tests

```bash
# Unit tests
go test -v ./pkg/models/document_review_test.go

# Integration tests
go test -v -tags=integration ./tests/integration/api_reviews_test.go
```

## Frontend E2E Test

### Test File

**`tests/e2e-playwright/dashboard-awaiting-review.spec.ts`**

### Test Script

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

## Environment Setup

### Quick Start (Testing Environment)
```bash
# Start all services
cd testing
docker compose up -d

# Browser: http://localhost:4201
# Login: test@hermes.local / password or admin@hermes.local / password
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
npx playwright test dashboard-awaiting-review.spec.ts --reporter=line --max-failures=1
```

## Test Users

From Dex configuration:
- `test@hermes.local` / `password` (User A, document author)
- `admin@hermes.local` / `password` (User B, reviewer)
- `demo@hermes.local` / `password` (User C, additional user)

## Acceptance Criteria

- [ ] `DocumentReview` model has all required fields
- [ ] `GET /api/v2/me/reviews` endpoint implemented and tested
- [ ] Local workspace supports reviewer metadata in document JSON
- [ ] Unit tests pass: `pkg/models/document_review_test.go`
- [ ] Integration tests pass: `tests/integration/api_reviews_test.go`
- [ ] E2E test passes: `dashboard-awaiting-review.spec.ts`
- [ ] Pip badge displays correct count of pending reviews
- [ ] Clicking review item navigates to document
- [ ] Screenshots captured and added to documentation

## Implementation Notes

### Backend Implementation Priority
1. Add reviewer fields to DocumentReview model
2. Implement GET /api/v2/me/reviews endpoint
3. Add reviewer metadata support to local workspace adapter
4. Write unit tests for DocumentReview CRUD operations
5. Write integration tests for review assignment workflow

### Frontend Implementation Priority
1. Add data-test attributes to dashboard components
2. Implement 'Awaiting Review' section UI
3. Add pip badge component with count display
4. Connect to GET /api/v2/me/reviews endpoint
5. Write E2E test with playwright-mcp

## Related Documentation

- [Playwright E2E Agent Guide](../../PLAYWRIGHT_E2E_AGENT_GUIDE.md)
- [Dashboard E2E Testing Overview](TODO-dashboard-e2e-testing.md)
- [Testing Environment](../../../testing/README.md)
