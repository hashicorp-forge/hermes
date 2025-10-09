# ADR-065: Promise Timeout Hang Fix

**Status**: Accepted  
**Date**: October 8, 2025  
**Type**: ADR (Frontend Decision)  
**Related**: memo/001 (Admin Login Hang), memo/075 (Root Cause Analysis)

## Context

Admin user authentication succeeded but dashboard showed loading spinner indefinitely. Root cause: API requests returning 401 Unauthorized caused promises to hang without timeout or error handling. The `store.maybeFetchPeople.perform()` task would wait forever for responses that never completed.

**Impact**: Application unusable when API endpoints fail or timeout - no user feedback, just infinite loading.

## Decision

Implement comprehensive timeout and error handling throughout frontend to prevent indefinite hangs.

**Components**:

1. **Promise Timeout Utility** (`web/app/utils/promise-timeout.ts`):
   - `withTimeout()` - Wraps promises with configurable timeout
   - `withTimeoutAndFallback()` - Returns fallback value on timeout/error
   - `withTimeoutError()` - Throws TimeoutError for debugging
   - Default: 30 seconds (configurable per use case)

2. **Store Service** (`web/app/services/_store.ts`):
   - 15-second timeouts for person/group API requests
   - Comprehensive logging for debugging
   - Non-throwing error handling (placeholder records on failure)

3. **LatestDocs Service** (`web/app/services/latest-docs.ts`):
   - 30-second timeout for search operations
   - 30-second timeout for maybeFetchPeople calls
   - Try-catch with error state handling

4. **RecentlyViewed Service** (`web/app/services/recently-viewed.ts`):
   - 30-second timeout for maybeFetchPeople calls

5. **Dashboard Route** (`web/app/routes/authenticated/dashboard.ts`):
   - Wrapped Promise.all in try-catch
   - Returns empty array on error (allows page render)
   - Non-critical error handling

## Implementation

**Before** (hangs forever):
```typescript
await this.store.maybeFetchPeople.perform(documents);
```

**After** (fails gracefully):
```typescript
await withTimeout(
  this.store.maybeFetchPeople.perform(documents),
  30000,
  'Fetching people for documents'
);
```

**Timeout Configuration**:
- **Person/Group API**: 15s (usually < 1s, allows for slow network)
- **Search Operations**: 30s (multiple backend calls, Algolia typically fast)
- **Fetch People Tasks**: 30s (parallel Promise.all aggregation)

## Consequences

### Positive
- ✅ No infinite loading states
- ✅ Graceful degradation on API failures
- ✅ Comprehensive error logging
- ✅ Page renders with available data
- ✅ Better user experience (shows errors, continues)
- ✅ Prevents cascade failures

### Negative
- ❌ Adds timeout configuration complexity
- ❌ May timeout on legitimately slow operations
- ❌ Requires tuning per endpoint/operation
- ❌ More error handling code

## Error Handling Strategy

**Non-Critical Errors** (degraded experience):
- Person/group API failures → Create placeholder records
- Recently viewed failures → Show empty widget
- Latest docs failures → Show empty list

**Critical Errors** (prevent cascade):
- Dashboard Promise.all failure → Return empty array
- Search service failures → Set empty state, throw error

**User Experience**:
- Before: Infinite spinner, no feedback, unusable
- After: Logs error, continues rendering, shows available data

## Alternatives Considered

1. **Global timeout for all promises**
   - ❌ One size doesn't fit all operations
   - ❌ Some operations legitimately take longer
   
2. **Retry logic instead of timeout**
   - ❌ Still needs timeout to prevent infinite retries
   - ❌ More complex, may not solve root cause
   
3. **Backend request timeout enforcement**
   - ❌ Doesn't help with network issues
   - ❌ Frontend still needs client-side protection
   
4. **Remove problematic features**
   - ❌ Loses functionality
   - ❌ Doesn't address underlying architecture issue

## Logging Added

All services now log:
- `🔄 Starting task...` - Task initiated
- `📡 Fetching...` - API request sent
- `📬 Response received` - API response arrived
- `✅ Complete` - Task successful
- `⚠️ Failed to fetch` - Non-critical error
- `❌ Error` - Critical error

## Verification

✅ Dashboard loads even with API failures  
✅ Timeouts trigger after configured duration  
✅ Error handlers catch and log failures  
✅ Fallback states applied (empty arrays, placeholders)  
✅ UI renders without hangs  
✅ Logs provide debugging information  

## Future Considerations

- Track timeout errors in production logs
- Alert on high timeout rates (backend issues)
- Monitor error rates in promise utilities
- Consider circuit breaker pattern for repeated failures
- Evaluate other `Promise.all` locations for similar fixes

**Locations to Check**:
- `web/app/routes/authenticated.ts` line 101
- `web/app/routes/authenticated/projects/project.ts` line 39
- `web/app/routes/authenticated/results.ts` lines 91, 118
- `web/app/components/inputs/people-select.ts` line 236
- `web/app/components/header/toolbar.ts` line 290

## References

- Source: `PROMISE_TIMEOUT_HANG_FIX_2025_10_08.md`
- Related: `ADMIN_LOGIN_HANG_ROOT_CAUSE_2025_10_08.md`, `ROOT_CAUSE_MAYBEFETCHPEOPLE_HANG_2025_10_08.md`
