# Admin Login Loading Spinner Issue - Root Cause Found - 2025-10-08

## Problem Summary

Admin user (admin@hermes.local) authentication works correctly, but the dashboard page gets stuck showing a loading spinner indefinitely.

## Root Cause Identified ✅

Using instrumented logging, we discovered the dashboard route **hangs during the `Promise.all()` call** that loads:
1. Docs awaiting review ✅ (completes)
2. Latest docs ❌ (hangs)
3. Recently viewed items ❌ (possibly hangs)

## Evidence from Console Logs

### What Successfully Loads:
```
[AuthenticatedRoute] ✅ User is authenticated, continuing...
[AuthenticatedUser] ✅ User info loaded successfully: admin@hermes.local
[ProductAreas] ✅ Product areas loaded: 8 products
[DashboardRoute] ✅ Docs awaiting review loaded: 0
```

### Where It Stops:
```
[DashboardRoute] 📚 Fetching latest docs for first time
[DashboardRoute] 🕐 Fetching recently viewed items
[DashboardRoute] ⏳ Waiting for all promises to resolve...
[DashboardRoute] ✅ Docs awaiting review loaded: 0
```

### Missing Logs (Never Appear):
```
[DashboardRoute] ✅ All dashboard data loaded
[DashboardRoute] 👥 Loading owner information...
[DashboardRoute] 🎉 Dashboard route model complete
```

## Technical Details

### Code Location
**File**: `web/app/routes/authenticated/dashboard.ts`

**Problem Code** (lines ~95-105):
```typescript
console.log('[DashboardRoute] ⏳ Waiting for all promises to resolve...');
const [docsAwaitingReview] = await Promise.all(promises);

console.log('[DashboardRoute] ✅ All dashboard data loaded');  // ❌ NEVER REACHES HERE
```

### The `promises` Array Contains:
1. `docsAwaitingReviewPromise` - **COMPLETES** ✅
2. `this.latestDocs.fetchAll.perform()` - **HANGS** ❌  
3. `this.recentlyViewed.fetchAll.perform()` - **Status Unknown** ⚠️

## Next Steps to Debug

### 1. Add Instrumentation to LatestDocs Service

**File**: `web/app/services/latest-docs.ts`

Add logging to the `fetchAll` task to see where it hangs:
```typescript
fetchAll = task(async () => {
  console.log('[LatestDocs] 🔄 Starting fetchAll task...');
  try {
    // ... existing code with added logs
    console.log('[LatestDocs] ✅ FetchAll complete');
  } catch (error) {
    console.error('[LatestDocs] ❌ Error in fetchAll:', error);
    throw error;
  }
});
```

### 2. Add Instrumentation to RecentlyViewed Service

**File**: `web/app/services/recently-viewed.ts`

Similar logging pattern:
```typescript
fetchAll = task(async () => {
  console.log('[RecentlyViewed] 🔄 Starting fetchAll task...');
  // ...
});
```

### 3. Check Search Service

The latest docs service likely uses the search service, which may be the actual hanging point:
- Meilisearch adapter
- Search index operations
- Network timeouts

## Hypothesis

The most likely cause is that one of these services is:

1. **Making a request that never completes** (network timeout)
2. **Waiting for a response that never arrives** (backend 500 error silently failing)
3. **Stuck in an infinite loop** (less likely given no CPU spike)
4. **Blocked by a failed promise** that doesn't reject properly

## Comparison: test@hermes.local vs admin@hermes.local

**Question**: Why does test@hermes.local work but admin@hermes.local doesn't?

**Possible Reasons**:
1. Test user has existing dashboard data cached
2. Admin user has no documents/recently viewed items causing edge case
3. Different permissions/groups triggering different code paths
4. Test user session was established before the latest code changes

## Files Modified (Instrumentation Added)

1. `web/app/services/authenticated-user.ts` - ✅ Complete logging
2. `web/app/routes/authenticated.ts` - ✅ Complete logging  
3. `web/app/routes/authenticated/dashboard.ts` - ✅ Complete logging
4. `web/app/services/product-areas.ts` - ✅ Complete logging

## Files Still Need Instrumentation

1. `web/app/services/latest-docs.ts` - ⏳ Pending
2. `web/app/services/recently-viewed.ts` - ⏳ Pending
3. `web/app/services/search.ts` - ⏳ Pending

## Immediate Action

Add instrumentation to `latest-docs.ts` and `recently-viewed.ts` services to pinpoint exactly which service call is hanging.

## Console Log Timeline

```
Time | Event
-----|------
T+0  | [AuthenticatedRoute] beforeModel starts
T+1  | [AuthenticatedUser] loadInfo starts  
T+2  | [ProductAreas] fetch starts
T+3  | User info loaded ✅
T+4  | Product areas loaded ✅
T+5  | [DashboardRoute] model starts
T+6  | Latest docs fetch triggered
T+7  | Recently viewed fetch triggered
T+8  | Promise.all called
T+9  | Docs awaiting review loaded ✅
T+∞  | **HANGS FOREVER** ❌
```

## Network Requests to Check

```bash
# Check if there are any pending/failed requests
curl -s http://localhost:8001/api/v2/me/recently-viewed-docs
curl -s http://localhost:8001/api/v2/me/recently-viewed-projects  
curl -s -X POST http://localhost:8001/api/v2/search/docs_createdTime_desc
```

## Success Criteria

When fixed, console logs should show:
```
[DashboardRoute] ⏳ Waiting for all promises to resolve...
[DashboardRoute] ✅ All dashboard data loaded
[DashboardRoute] 🎉 Dashboard route model complete, returning X docs
```

And the page should render the dashboard with the admin user's avatar visible in the top-right corner.
