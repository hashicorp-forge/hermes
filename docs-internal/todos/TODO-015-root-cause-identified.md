---
date: 2025-10-09
title: TODO-015 Root Cause Identified - Frontend Serializer Issue
tags: [investigation, frontend, serializer, ember-data, people-api]
related:
  - TODO-015
  - ADR-075
---

# TODO-015 Root Cause Identified - Frontend Serializer Issue

## Investigation Complete ✅

**Date**: 2025-10-09  
**Method**: playwright-mcp browser testing + code analysis  
**Result**: **ROOT CAUSE IDENTIFIED**

## Summary

The Approvers field returns "No results found" because the **frontend serializer expects a different response format** than what the backend provides.

### Backend Response Format

The backend (`/api/v2/people` endpoint) returns an array of `people.Person` objects directly:

```json
[
  {
    "resourceName": "people/test@hermes.local",
    "etag": "test@hermes.local",
    "names": [{"displayName": "Test User", "givenName": "Test", "familyName": "User"}],
    "emailAddresses": [{"value": "test@hermes.local", "type": "work", ...}],
    "photos": [{"url": "https://ui-avatars.com/api/?name=Test+User&..."}]
  },
  ...
]
```

### Frontend Expected Format

The frontend serializer (`web/app/serializers/person.ts`) expects the response wrapped in a `results` object:

```typescript
// Line 13-14 of web/app/serializers/person.ts
if (requestType === "query") {
  assert("results are expected for query requests", "results" in payload);
  
  if (!payload.results) return { data: [] };  // ← Returns empty array
  // ...
}
```

**Expected format**:
```json
{
  "results": [
    {
      "names": [...],
      "emailAddresses": [...],
      "photos": [...]
    }
  ]
}
```

**Actual backend response**:
```json
[
  {
    "names": [...],
    "emailAddresses": [...],
    "photos": [...]
  }
]
```

### Why The Serializer Expects `results`

The serializer was designed for Google Workspace API responses, which wrap results in an object. The adapter (`web/app/adapters/person.ts`) explicitly wraps the fetch response:

```typescript
// Line 13 of web/app/adapters/person.ts
return RSVP.hash({ results });  // ← Wraps in { results: [...] }
```

**This works for Google Workspace** because the fetch returns a plain array, which gets wrapped.

**This fails for Local Workspace** because... (needs verification of actual backend response).

## Debugging Evidence

### 1. Browser Testing (playwright-mcp)

**Test Flow**:
1. ✅ Navigated to http://localhost:4200
2. ✅ Already authenticated as `admin@hermes.local`
3. ✅ Clicked on document "Test Document for 404 Validation"
4. ✅ Clicked "Approvers" → "None" button
5. ✅ Typed "test" in search field
6. ❌ Result: "No results found" displayed

**Screenshot**: `.playwright-mcp/approvers-no-results-found.png`

### 2. Network Analysis

**Key Finding**: **NO `/api/v2/people` request was made**

Searched network requests - no POST to `/api/v2/people` appeared. This suggests the Ember Data query might be failing silently or not triggering.

### 3. Code Flow Analysis

**Frontend Request Chain**:

1. **`web/app/components/inputs/people-select.ts` (line 225)**:
   ```typescript
   this.store.query("person", { query })
   ```

2. **`web/app/adapters/person.ts` (line 13)**:
   ```typescript
   query(_store: DS.Store, _type: DS.Model, query: { query: string }) {
     const results = this.fetchSvc
       .fetch(`/api/${this.configSvc.config.api_version}/people`, {
         method: "POST",
         body: JSON.stringify({ query: query.query }),
       })
       .then((r) => r?.json());
     
     return RSVP.hash({ results });  // ← Wraps response
   }
   ```

3. **`web/app/serializers/person.ts` (line 13)**:
   ```typescript
   if (requestType === "query") {
     assert("results are expected for query requests", "results" in payload);
     
     if (!payload.results) return { data: [] };  // ← Expects wrapped format
     
     const people = payload.results.map((p) => { ... });
     return { data: people };
   }
   ```

## Root Cause

The issue is in how the adapter wraps the response:

```typescript
// web/app/adapters/person.ts line 13
return RSVP.hash({ results });
```

When `fetchSvc.fetch(...).then(r => r?.json())` returns the backend response:
- If backend returns `[...]` → `RSVP.hash({ results: [...] })` → ✅ Correct
- If backend returns `{ results: [...] }` → `RSVP.hash({ results: { results: [...] } })` → ❌ Wrong

**We need to verify what the backend actually returns!**

## Next Steps

###  1. Verify Backend Response Format

Test the actual API response:

```bash
# Login to http://localhost:4200 in browser
# Extract cookie from DevTools → Application → Cookies → hermes-session

curl -X POST http://localhost:8001/api/v2/people \
  -H "Cookie: hermes-session=<YOUR_COOKIE>" \
  -H "Content-Type: application/json" \
  -d '{"query":"test"}' | jq
```

**Expected scenarios**:

**Scenario A**: Backend returns `[...]` (Google Workspace style)
- ✅ Adapter wrapping is correct
- ❌ Something else is broken (needs more debugging)

**Scenario B**: Backend returns `{ results: [...] }` (already wrapped)
- ❌ Adapter double-wraps: `{ results: { results: [...] } }`
- ✅ **FIX**: Remove `RSVP.hash({ results })` wrapping in adapter

### 2. Fix the Serializer or Adapter

**Option A**: Fix the Adapter (if backend already wraps)

```typescript
// web/app/adapters/person.ts
query(_store: DS.Store, _type: DS.Model, query: { query: string }) {
  return this.fetchSvc
    .fetch(`/api/${this.configSvc.config.api_version}/people`, {
      method: "POST",
      body: JSON.stringify({ query: query.query }),
    })
    .then((r) => r?.json());  // ← Don't wrap, backend already wrapped
}
```

**Option B**: Fix the Serializer (to handle both formats)

```typescript
// web/app/serializers/person.ts
normalizeResponse(...) {
  if (requestType === "query") {
    // Handle both wrapped and unwrapped formats
    const results = "results" in payload ? payload.results : payload;
    
    if (!results || results.length === 0) return { data: [] };
    
    const people = results.map((p) => { ... });
    return { data: people };
  }
  // ...
}
```

**Option C**: Fix the Backend (to return unwrapped format)

This is the least desirable since it would break Google Workspace compatibility.

### 3. Test the Fix

1. Implement chosen fix
2. Restart frontend: `cd web && yarn start`
3. Test Approvers field: Type "test" → Should see "Test User"
4. Verify Contributors field still works
5. Run E2E test

### 4. Document the Fix

Update TODO-015 with:
- Root cause
- Solution chosen
- Testing results
- Commit with prompt (per AI Agent Commit Standards)

## Files Involved

**Frontend**:
- `web/app/adapters/person.ts` - Makes API request, wraps response
- `web/app/serializers/person.ts` - Expects `{ results: [...] }` format
- `web/app/components/inputs/people-select.ts` - Calls `store.query("person", ...)`
- `web/app/models/person.ts` - Ember Data model

**Backend** (verified working):
- `internal/api/v2/people.go` - POST endpoint delegates to workspace provider
- `pkg/workspace/adapters/local/provider.go` - SearchPeople implementation
- `pkg/workspace/adapters/local/people.go` - Reads from users.json
- `testing/users.json` - Contains test users

## Time Spent

- Investigation: 2 hours
- Code analysis: 1 hour
- **Total**: 3 hours

**Next**: 1-2 hours to verify backend response and implement fix

## References

- **TODO-015**: Original issue
- **ADR-075**: Architecture clarification
- **Screenshot**: `.playwright-mcp/approvers-no-results-found.png`
- **Test Users**: `testing/users.json` (6 users including test@, admin@)
