# Unit Test Failures Analysis - October 6, 2025

## Summary
**Unit Tests**: 32 passing / 5 failing (out of 37 total)
**Success Rate**: 86.5%

## Test Failures

### 1. ❌ config service: version and short_revision are set
**File**: `tests/unit/services/config-test.ts`
**Line**: 14066
**Issue**: Version is not defined in test environment
```
Expected: true
Actual: false
Message: "version is defined"
```

**Root Cause**: The `version` and `short_revision` values are injected at build time but not properly mocked in tests.

**Fix Strategy**: Mock the version/short_revision in the test setup.

---

### 2. ❌ latest service: it fetches latest docs
**File**: `tests/unit/services/latest-docs-test.ts`  
**Issue**: Mirage route not defined for Algolia proxy request

```
Error: Your app tried to POST 'http://localhost:7357/1/indexes/docs_createdTime_desc/query?x-algolia-agent=Algolia for JavaScript (4.25.2)%3B Browser',
but there was no route defined to handle this request.
```

**Root Cause**: The latest-docs service uses Algolia search which now proxies through the backend at `/1/indexes/*`. The Mirage config doesn't have this route defined for unit tests.

**Fix Strategy**: Add Mirage route for `/1/indexes/docs_createdTime_desc/query` in test setup or mock the Algolia service.

---

### 3. ❌ recently-viewed service: it fetches recently viewed items
**File**: `tests/unit/services/recently-viewed-test.ts`
**Line**: 14474
**Issue**: Index not populated correctly

```
Expected: 10
Actual: (not 10)
Message: "the index is populated"
Browser Log: "Error fetching recently viewed docs [object Object]"
```

**Root Cause**: Service fails to fetch recently viewed documents, likely due to missing Mirage routes or authentication issues.

**Fix Strategy**: Check Mirage configuration for recently viewed endpoints, ensure proper authentication mocking.

---

### 4. ❌ recently-viewed service: it ignores errors when fetching the index  
**File**: `tests/unit/services/recently-viewed-test.ts`
**Line**: 14489
**Issue**: Inaccessible document not properly ignored

```
Expected: 5
Actual: (not 5)
Message: "the inaccessible document is ignored"
Browser Log: "Error fetching recently viewed docs [object Object]"
```

**Root Cause**: Same as #3 - recently-viewed service API calls failing.

**Fix Strategy**: Same as #3.

---

### 5. ❌ blink-element utility: it blinks an element
**File**: `tests/unit/utils/blink-element-test.ts`
**Line**: 14583
**Issue**: waitUntil timeout

```
Error: waitUntil timed out
```

**Root Cause**: The blink animation utility test is waiting for a condition that never occurs. Likely timing/animation issue in test environment.

**Fix Strategy**: 
- Review the blink-element implementation
- Adjust wait conditions or use fake timers (sinon.useFakeTimers)
- May need to increase timeout or change assertion strategy

---

## Common Patterns

### Mirage Configuration Issues (3 tests)
Tests #2, #3, #4 all fail due to missing or misconfigured Mirage routes:
- Algolia proxy routes not defined
- Recently viewed API endpoints not mocked

**Action**: Review and update `web/mirage/config.ts` to add missing routes.

### Build-Time Variables Not Mocked (1 test)
Test #1 fails because build-time injected variables aren't available in test environment.

**Action**: Mock version/revision in test helper or config test setup.

### Timing/Animation Issues (1 test)
Test #5 fails due to async timing in animations.

**Action**: Use fake timers or adjust wait strategy.

---

## Recommendations

### Priority Order
1. **HIGH**: Fix Mirage configuration for Algolia and recently-viewed routes (fixes 3 tests)
2. **MEDIUM**: Mock build-time version variables (fixes 1 test)
3. **LOW**: Fix blink-element timing (fixes 1 test, but utility may not be critical)

### Next Steps
1. Review `web/mirage/config.ts` for Algolia proxy routes
2. Add test fixture for recently-viewed API endpoints  
3. Mock version/short_revision in test helper
4. Consider using sinon fake timers for blink-element test

---

## Test Output Quality ✅

**Good news**: With deprecation warnings silenced, test output is clean and readable:
- No spam from external library deprecations
- Clear pass/fail indicators
- Easy to identify failing tests
- Browser logs visible for debugging

This makes debugging much easier!
