---
id: TODO-015
title: People Database Not Populated - Dex OIDC Users Missing
date: 2025-10-09
type: TODO
priority: critical
status: open
progress: 0%
tags: [backend, authentication, dex, people-api, testing]
related:
  - TODO-014
  - TODO-011
blocking: TODO-011, TODO-014
---

# TODO-015: People Database Not Populated - Dex OIDC Users Missing

## Problem Statement

**Critical Blocker for E2E Testing**: Dex OIDC authenticated users (`test@hermes.local`, `admin@hermes.local`, `demo@hermes.local`) do not exist in the people database, preventing them from being added as document approvers.

**Impact**:
- ❌ Cannot add approvers to documents via sidebar UI
- ❌ E2E test TODO-011 fails at Phase 2 (dashboard check)
- ❌ Review workflow is broken for Dex-authenticated users
- ❌ Search returns "No results found" for valid users

**Discovered During**: Investigation of TODO-014 using playwright-mcp browser exploration

## Root Cause

### Current Behavior

1. User authenticates via Dex OIDC (`/auth/callback`)
2. Session is created, user can access Hermes
3. **User is NOT created in people database**
4. Approvers field searches `/api/v2/people` endpoint
5. Search returns empty results for authenticated users
6. Cannot add them as approvers

### Expected Behavior

1. User authenticates via Dex OIDC
2. Session created
3. **Person record auto-created in database** with email, name from OIDC claims
4. User appears in people search
5. Can be added as approver to documents

## Evidence

### Manual Test (playwright-mcp - 2025-10-09)

```
1. Logged in as admin@hermes.local via Dex OIDC ✅
2. Navigated to document page ✅
3. Clicked "Approvers" → "None" button ✅
4. Typed "test@hermes.local" in search ❌
   Result: "No results found"
5. Typed "test" in search ❌
   Result: "No results found"
6. Typed "admin" in search ❌
   Result: "No results found"
```

### API Check

```bash
# Expected: List of people including Dex users
curl -H "Cookie: hermes-session=..." http://localhost:8001/api/v2/people

# Actual: Empty or missing Dex users
```

## Solution Options

### ⭐ Option A: Auto-Create People on OIDC Login (RECOMMENDED)

**Approach**: Modify auth callback to ensure person record exists after successful authentication.

**Changes Needed**:

1. **`internal/auth/dex.go` (or similar auth handler)**:
   ```go
   // After successful OIDC token exchange
   user := userInfoFromOIDC(claims)
   
   // Ensure person exists in database
   person := &models.Person{
       EmailAddress: user.Email,
       GivenName:    user.GivenName,
       FamilyName:   user.FamilyName,
       PhotoURL:     user.Picture,
   }
   
   if err := person.Upsert(db); err != nil {
       log.Error("failed to upsert person", "email", user.Email, "error", err)
   }
   ```

2. **`pkg/models/person.go`**:
   ```go
   // Add Upsert method if it doesn't exist
   func (p *Person) Upsert(db *gorm.DB) error {
       return db.Where(Person{EmailAddress: p.EmailAddress}).
           Assign(p).
           FirstOrCreate(p).
           Error
   }
   ```

**Pros**:
- ✅ Works for all OIDC providers (Dex, Okta, Google)
- ✅ Automatic and transparent
- ✅ Production-ready solution
- ✅ No manual data seeding needed

**Cons**:
- Requires backend code changes
- Need to handle OIDC claim mapping
- Must test with all auth providers

**Estimated Effort**: 4-6 hours

---

### Option B: Seed People Database in Testing Environment

**Approach**: Add test users to database on testing environment startup.

**Changes Needed**:

1. **`testing/init-people.sql`** (new file):
   ```sql
   INSERT INTO people (email_address, given_name, family_name, created_at, updated_at)
   VALUES 
       ('test@hermes.local', 'Test', 'User', NOW(), NOW()),
       ('admin@hermes.local', 'Admin', 'User', NOW(), NOW()),
       ('demo@hermes.local', 'Demo', 'User', NOW(), NOW())
   ON CONFLICT (email_address) DO NOTHING;
   ```

2. **`testing/docker-compose.yml`**:
   ```yaml
   services:
     postgres:
       volumes:
         - ./init-people.sql:/docker-entrypoint-initdb.d/20-people.sql
   ```

   OR run migration after startup:
   
3. **`testing/Makefile`**:
   ```makefile
   seed-people:
       docker compose exec postgres psql -U postgres -d hermes_testing -f /init-people.sql
   ```

**Pros**:
- ✅ Quick fix for testing environment
- ✅ No backend code changes
- ✅ Can implement immediately

**Cons**:
- ❌ Only works in testing environment
- ❌ Doesn't solve production issue
- ❌ Manual maintenance of test users
- ❌ Database might reset, need re-seeding

**Estimated Effort**: 1-2 hours

---

### Option C: Allow Direct Email Input for Approvers

**Approach**: Modify approvers field to accept email addresses that don't exist in people database.

**Changes Needed**:

1. **`web/app/components/document/sidebar.ts`**:
   ```typescript
   // In updateApprovers or similar
   // Allow emails not in people database
   @action updateApprovers(approvers: string[]) {
       this.approvers = approvers; // Don't filter by existing people
   }
   ```

2. **`internal/api/v2/documents.go`**:
   ```go
   // When saving approvers, validate email format but don't require person record
   for _, approver := range approvers {
       if !isValidEmail(approver) {
           return fmt.Errorf("invalid email: %s", approver)
       }
   }
   ```

**Pros**:
- ✅ Flexible for external reviewers
- ✅ Works without person database

**Cons**:
- ❌ Breaks people search UX
- ❌ No name/photo for approvers
- ❌ Inconsistent with current design
- ❌ May cause issues with notifications

**Estimated Effort**: 3-4 hours

---

## Recommended Implementation Plan

### Phase 1: Short-Term Fix (Testing) - Option B
**Timeline**: 1-2 hours

1. Create `testing/init-people.sql` with test users
2. Update `testing/docker-compose.yml` to run init script
3. Test: `make down && make up`
4. Verify: `docker compose exec postgres psql -U postgres -d hermes_testing -c "SELECT email_address FROM people;"`
5. Update E2E test to add approvers via sidebar

### Phase 2: Long-Term Fix (Production) - Option A
**Timeline**: 4-6 hours

1. Add `Upsert` method to `pkg/models/person.go`
2. Modify Dex auth callback to create person on login
3. Test with all three Dex test users
4. Verify person creation: Check database after login
5. Add unit tests for person creation logic
6. Update Okta/Google auth handlers similarly

### Phase 3: Validation
**Timeline**: 2 hours

1. Run E2E test: `cd tests/e2e-playwright && npx playwright test dashboard-awaiting-review.spec.ts`
2. Expected results:
   - ✅ Phase 1: Document creation with contributors
   - ✅ Phase 2: Add approvers via sidebar (post-creation)
   - ✅ Phase 3: Change status to "In-Review"
   - ✅ Phase 4: Dashboard shows document in "Awaiting review"
   - ✅ Phase 5: Pip badge shows count

---

## Implementation Details

### Files to Modify

**Backend**:
- `internal/auth/dex.go` - Add person creation after OIDC callback
- `pkg/models/person.go` - Add `Upsert` method
- `internal/auth/okta.go` - Add person creation (if exists)
- `internal/auth/google.go` - Add person creation (if exists)

**Testing**:
- `testing/init-people.sql` - SQL script to seed test users
- `testing/docker-compose.yml` - Mount init script
- `testing/README.md` - Document seeding process

**E2E Test**:
- `tests/e2e-playwright/tests/dashboard-awaiting-review.spec.ts` - Add sidebar approvers step

### API Endpoints to Check

```bash
# People API - should return Dex users after fix
GET /api/v2/people

# Search people - should find test users
GET /api/v2/people?q=test

# Create person (if manual endpoint exists)
POST /api/v2/people
{
  "emailAddress": "test@hermes.local",
  "givenName": "Test",
  "familyName": "User"
}
```

### Database Schema Check

```sql
-- Check people table structure
\d people

-- Expected columns:
-- id, email_address, given_name, family_name, photo_url, created_at, updated_at

-- After fix, verify people exist:
SELECT id, email_address, given_name, family_name 
FROM people 
WHERE email_address LIKE '%@hermes.local';
```

---

## Testing Checklist

### Phase 1 (Seeding) - Testing Environment

- [ ] Create `testing/init-people.sql` with INSERT statements
- [ ] Update `testing/docker-compose.yml` to mount init script
- [ ] Restart testing environment: `cd testing && docker compose down && docker compose up -d`
- [ ] Verify people in database:
  ```bash
  docker compose exec postgres psql -U postgres -d hermes_testing \
    -c "SELECT email_address, given_name FROM people WHERE email_address LIKE '%@hermes.local';"
  ```
- [ ] Expected output: 3 rows (test, admin, demo)

### Phase 2 (Auto-Create) - Backend

- [ ] Implement `Upsert` method in `pkg/models/person.go`
- [ ] Write unit test for `Person.Upsert`
- [ ] Modify Dex auth callback to call `person.Upsert(db)`
- [ ] Test: Login via Dex, check database for new person record
- [ ] Verify all OIDC claims are mapped (email, givenName, familyName, picture)

### Phase 3 (E2E Test) - Update Test

- [ ] Update E2E test to navigate to document page after creation
- [ ] Add step: Click "Approvers" → "None" button
- [ ] Add step: Search for approver email
- [ ] Add step: Select approver from dropdown
- [ ] Add step: Click "Save" button
- [ ] Add step: Wait for PATCH request to complete
- [ ] Add step: Change status to "In-Review" (investigate how)
- [ ] Run full E2E test and verify all phases pass

### Phase 4 (Validation) - End-to-End

- [ ] Run E2E test: `npx playwright test dashboard-awaiting-review.spec.ts --reporter=line`
- [ ] Verify Phase 1: Document created ✅
- [ ] Verify Phase 2: Approver added via sidebar ✅
- [ ] Verify Phase 3: Status changed to "In-Review" ✅
- [ ] Verify Phase 4: Dashboard shows document ✅
- [ ] Verify Phase 5: Pip badge count correct ✅
- [ ] Check screenshots in `test-results/`
- [ ] Review trace if any failures: `npx playwright show-trace test-results/.../trace.zip`

---

## Success Criteria

- [ ] Dex OIDC users appear in `/api/v2/people` endpoint
- [ ] People search returns Dex users (test, admin, demo)
- [ ] Can add Dex users as approvers via document sidebar
- [ ] Approvers are saved to database (verify with database query)
- [ ] Approvers field in search index includes added users
- [ ] E2E test passes all phases without errors
- [ ] Dashboard "Awaiting review" section shows document
- [ ] Pip badge displays correct count

---

## Rollback Plan

If issues occur after implementing Option A (auto-create):

1. Remove person creation code from auth callback
2. Restart backend: `cd testing && docker compose restart hermes`
3. Rely on Option B (seeding) for testing environment
4. Investigate and fix issues
5. Re-deploy Option A with fixes

---

## Related Issues & PRs

- **TODO-014**: Contributors vs Approvers field gap (parent issue)
- **TODO-011**: E2E test awaiting review dashboard (blocked by this)
- **Investigation**: playwright-mcp exploration confirmed issue (2025-10-09)

---

## Documentation Updates Needed

After fix is implemented:

1. **`docs-internal/README-dex.md`**:
   - Add note about automatic person creation
   - Document test users (test, admin, demo)

2. **`testing/README.md`**:
   - Update quick start to mention pre-seeded users
   - Add troubleshooting section for people database

3. **`tests/e2e-playwright/README.md`**:
   - Document that test users must exist in people database
   - Add section on approvers workflow

4. **`docs-internal/todos/TODO-011-e2e-test-awaiting-review-dashboard.md`**:
   - Update status to reflect solution
   - Add link to TODO-015

---

## Next Steps

1. **Immediate**: Implement Phase 1 (Option B - Seeding) to unblock E2E test
2. **This Week**: Implement Phase 2 (Option A - Auto-create) for production
3. **After Fix**: Update E2E test to add approvers via sidebar
4. **Validation**: Run full E2E test suite to ensure dashboard workflow works

**Estimated Total Effort**: 7-10 hours (including testing and documentation)

**Priority**: CRITICAL - Blocks TODO-011 E2E test and review workflow
