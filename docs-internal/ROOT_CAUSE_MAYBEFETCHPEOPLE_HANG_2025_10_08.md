# 🎯 ROOT CAUSE FOUND: Admin Login Spinner Issue - 2025-10-08

## Executive Summary

**Problem**: admin@hermes.local authentication succeeds but dashboard shows loading spinner indefinitely.

**Root Cause**: `store.maybeFetchPeople.perform()` task **hangs indefinitely** when called from `LatestDocs.fetchAll`.

**Location**: `web/app/services/latest-docs.ts` line ~50

## Evidence from Instrumented Logs

### Complete Log Sequence

```
[LatestDocs] 🔄 Starting fetchAll task...
[LatestDocs] 🔍 Searching index: docs_createdTime_desc
[LatestDocs] 📬 Search response received, hits: 2
[LatestDocs] 🗺️ Mapping 2 hits to documents
[LatestDocs] 👥 Loading owner information for 2 documents   ← **HANGS HERE**
❌ [LatestDocs] ✅ FetchAll complete                          ← **NEVER REACHES**
```

### Parallel Tasks Status

1. **Docs Awaiting Review** ✅ Completes (0 docs)
2. **Recently Viewed** ✅ Completes (0 items)
3. **Latest Docs** ❌ **HANGS** at `maybeFetchPeople` call

## The Hanging Code

**File**: `web/app/services/latest-docs.ts`

```typescript
fetchAll = keepLatestTask(async () => {
  // ... search completes successfully ...
  
  this.index = response.hits.map((hit) => { /* ... */ });
  
  // 🔴 HANGS HERE - Never resolves
  await this.store.maybeFetchPeople.perform(this.index);
  
  // ❌ Never reaches this line
  this.nbPages = response.nbPages;
});
```

## Investigation: store.maybeFetchPeople

**File**: `web/app/services/store.ts`

This task is responsible for:
1. Extracting owner emails from documents
2. Fetching person records from `/api/v2/people?emailAddress=...`
3. Creating or updating person records in Ember Data store

**Likely Issues**:
1. **API endpoint hanging/timing out**
2. **Infinite loop in the task**
3. **Ember Data store lock/deadlock**
4. **Network request never completing**

## Next Steps

### 1. Add Instrumentation to store.maybeFetchPeople

**File**: `web/app/services/store.ts`

```typescript
maybeFetchPeople = task(async (docs) => {
  console.log('[Store] 🔄 maybeFetchPeople starting, docs:', docs?.length);
  
  // Extract owner emails
  const ownerEmails = /* ... */;
  console.log('[Store] 📧 Owner emails to fetch:', ownerEmails);
  
  // Fetch people
  console.log('[Store] 📡 Fetching people from API...');
  const response = await fetch(/* ... */);
  console.log('[Store] 📬 People response received');
  
  // Create/update records
  console.log('[Store] 💾 Creating/updating person records...');
  // ...
  console.log('[Store] ✅ maybeFetchPeople complete');
});
```

### 2. Check API Endpoint Directly

```bash
# Test the people endpoint with owner emails from the docs
curl -s "http://localhost:8001/api/v2/people?emailAddress=test@hermes.local" | jq
```

### 3. Check for Ember Data Store Issues

Possible Ember Data problems:
- Store adapter not configured correctly
- Person model serialization issues
- Infinite loop in model hooks
- Missing/incorrect relationships

## Why test@hermes.local Works But admin@hermes.local Doesn't

**Hypothesis**: 
- test@hermes.local may have cached person records
- admin@hermes.local triggers a fresh fetch that hangs
- The owner of the 2 documents may be causing the issue

## Documents Being Loaded

From logs:
```
[LatestDocs] 📬 Search response received, hits: 2
```

These are likely:
1. RFC Template (owner: test@hermes.local)
2. PRD Template (owner: test@hermes.local)

So the system is trying to fetch person record for `test@hermes.local` when logged in as `admin@hermes.local`.

## Comparison with Other Routes

**Works**: `/api/v2/me` returns admin user info successfully ✅

**Hangs**: `/api/v2/people?emailAddress=test@hermes.local` (hypothesis) ❌

## API Endpoints to Test

```bash
# 1. Check if /me works (we know this works)
curl -s http://localhost:8001/api/v2/me

# 2. Check if /people works
curl -s "http://localhost:8001/api/v2/people?emailAddress=test@hermes.local"

# 3. Check backend logs for any errors
docker compose logs hermes --tail=50 | grep -i "people\|error"
```

## Files Modified (Instrumentation)

1. ✅ `web/app/services/authenticated-user.ts`
2. ✅ `web/app/routes/authenticated.ts`
3. ✅ `web/app/routes/authenticated/dashboard.ts`
4. ✅ `web/app/services/product-areas.ts`
5. ✅ `web/app/services/latest-docs.ts`
6. ✅ `web/app/services/recently-viewed.ts`
7. ⏳ `web/app/services/store.ts` - **NEEDS INSTRUMENTATION**

## Exact Hanging Point

**Service**: LatestDocsService  
**Task**: `fetchAll`  
**Line**: `await this.store.maybeFetchPeople.perform(this.index);`  
**Input**: Array of 2 documents (RFC Template, PRD Template)  
**Owners**: test@hermes.local (both documents)

## Success Criteria

When fixed, logs should show:
```
[LatestDocs] 👥 Loading owner information for 2 documents
[Store] 🔄 maybeFetchPeople starting, docs: 2
[Store] 📧 Owner emails to fetch: ['test@hermes.local']
[Store] 📡 Fetching people from API...
[Store] 📬 People response received
[Store] 💾 Creating/updating person records...
[Store] ✅ maybeFetchPeople complete
[LatestDocs] ✅ FetchAll complete
[DashboardRoute] ✅ All dashboard data loaded
[DashboardRoute] 🎉 Dashboard route model complete
```

And the dashboard page should render with admin user's avatar visible.

## Recommended Fix Priority

1. **HIGH**: Add instrumentation to `store.maybeFetchPeople` to find exact hang point
2. **HIGH**: Test `/api/v2/people` endpoint manually
3. **MEDIUM**: Check Ember Data store configuration
4. **MEDIUM**: Review person model and adapter
5. **LOW**: Add timeout to maybeFetchPeople task

## Related Issues

This same pattern is called in:
- `dashboard.ts` (line ~107) - After loading docs awaiting review
- `recently-viewed.ts` (line ~260) - After loading recently viewed items  
- Both of these calls **complete successfully** ✅

So the issue is **specific to the LatestDocs context** or the **data being loaded**.
