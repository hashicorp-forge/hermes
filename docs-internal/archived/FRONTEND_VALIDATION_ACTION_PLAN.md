# Frontend Validation - Action Plan
## October 8, 2025

## Current Status

### ✅ Completed
1. **Session Store Fix** (Commit 924f8bc)
   - Created `web/app/session-stores/application.ts`
   - Fixed critical initialization crash
   - Application now loads without ember-simple-auth errors

2. **Backend Search Endpoint** (Commit 2b9e68c)
   - Implemented `/api/v2/search/{index}` endpoint
   - Provider-agnostic (works with Algolia, Meilisearch, etc.)
   - Comprehensive tests (15/15 passing)
   - Registered in server.go

3. **Validation Infrastructure**
   - Playwright MCP integration working
   - Docker Compose test environment running
   - Ember dev server with proxy mode operational
   - Documentation and validation reports complete

### ⚠️ Blocked/In Progress
- **Dashboard Loading**: Stuck on spinner due to failing search requests
- **Search Functionality**: Frontend using `/1/indexes/*` which returns 405
- **Authentication Flow**: Unable to test until dashboard loads

---

## Action Plan

### Phase 1: Fix Search Integration (HIGH PRIORITY)

#### Option A: Update Frontend to Use New API (Recommended)

**Goal**: Replace Algolia client with native fetch calls to `/api/v2/search/*`

**Files to Modify**:
- `web/app/services/search.ts`

**Changes Required**:

1. **Remove Algolia Client Dependency**
   ```typescript
   // REMOVE:
   import algoliaSearch, { SearchClient, SearchIndex } from "algoliasearch";
   import { SearchOptions, SearchResponse } from "@algolia/client-search";
   
   // KEEP:
   import { service } from "@ember/service";
   import ConfigService from "hermes/services/config";
   import SessionService from "hermes/services/session";
   ```

2. **Replace Client Getter**
   ```typescript
   // BEFORE:
   private get client(): SearchClient {
     if (!this._client) {
       this._client = algoliaSearch("", "", {
         hosts: [{ protocol, url: window.location.hostname + ":" + window.location.port }]
       });
     }
     return this._client;
   }
   
   // AFTER:
   private getBaseURL(): string {
     const protocol = 
       window.location.hostname === "127.0.0.1" || 
       window.location.hostname === "localhost" 
         ? "http" 
         : "https";
     return `${protocol}://${window.location.hostname}:${window.location.port}`;
   }
   ```

3. **Replace Search Methods**
   ```typescript
   // BEFORE:
   async search(indexName: string, query: string, options: SearchOptions): Promise<SearchResponse> {
     let index: SearchIndex = this.client.initIndex(indexName);
     return index.search(query, options);
   }
   
   // AFTER:
   async search(indexName: string, query: string, options: any): Promise<any> {
     const response = await fetch(`${this.getBaseURL()}/api/v2/search/${indexName}`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         ...this.getAuthHeaders(),
       },
       credentials: 'include', // Important for Dex session cookies
       body: JSON.stringify({
         query: query || '',
         page: options.page || 0,
         hitsPerPage: options.hitsPerPage || 20,
         filters: options.filters || [],
         facets: options.facets || [],
         sortBy: options.sortBy,
         sortOrder: options.sortOrder,
       }),
     });
     
     if (!response.ok) {
       throw new Error(`Search failed: ${response.status} ${response.statusText}`);
     }
     
     const result = await response.json();
     
     // Transform backend response to match Algolia format (if needed)
     return {
       hits: result.Hits || [],
       nbHits: result.TotalHits || 0,
       page: result.Page || 0,
       nbPages: result.TotalPages || 0,
       hitsPerPage: result.PerPage || 20,
       facets: result.Facets || {},
       processingTimeMS: result.QueryTime ? result.QueryTime / 1000000 : 0,
     };
   }
   ```

4. **Update Other Search Methods**
   - `searchForFacetValues()` - Convert to fetch-based
   - `getDocuments()` - Use `/api/v2/search/docs`
   - `getDrafts()` - Use `/api/v2/search/drafts`
   - `getProjects()` - Use `/api/v2/search/projects`

**Benefits**:
- ✅ Works with all search providers
- ✅ Removes Algolia SDK dependency (~200KB)
- ✅ Consistent with other API calls
- ✅ Better error handling
- ✅ Easier debugging

**Testing Steps**:
1. Update search.ts as described
2. Restart Ember dev server
3. Navigate with Playwright to http://localhost:4201
4. Verify no 405 errors in console
5. Verify dashboard loads
6. Take success screenshot

**Estimated Effort**: 2-3 hours

---

#### Option B: Add Backend Proxy for `/1/indexes/*` (Alternative)

**Goal**: Create proxy handler that forwards `/1/indexes/*` to `/api/v2/search/*`

**Files to Modify**:
- `internal/api/v2/search.go` (add proxy handler)
- `internal/cmd/commands/server/server.go` (register proxy)

**Changes Required**:

1. **Create Algolia-Compatible Proxy**
   ```go
   // File: internal/api/v2/algolia_proxy.go
   
   func AlgoliaProxyHandler(srv server.Server) http.Handler {
       return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
           // Parse URL: /1/indexes/{index}/query
           parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
           if len(parts) < 3 || parts[0] != "1" || parts[1] != "indexes" {
               http.Error(w, "Invalid path", http.StatusBadRequest)
               return
           }
           
           indexName := parts[2]
           
           // Read Algolia request body
           var algoliaReq map[string]interface{}
           if err := json.NewDecoder(r.Body).Decode(&algoliaReq); err != nil {
               http.Error(w, "Invalid request", http.StatusBadRequest)
               return
           }
           
           // Convert to SearchProvider request
           searchReq := convertAlgoliaToSearchRequest(algoliaReq)
           
           // Call internal search handler
           // ... forward to SearchHandler logic
       })
   }
   ```

2. **Register Proxy for All Providers**
   ```go
   // File: internal/cmd/commands/server/server.go
   
   authenticatedEndpoints = append(authenticatedEndpoints, endpoint{
       "/1/indexes/",
       apiv2.AlgoliaProxyHandler(srv), // Always register, not just for Algolia
   })
   ```

**Benefits**:
- ✅ No frontend changes needed
- ✅ Backward compatible
- ✅ Works with existing Algolia client

**Drawbacks**:
- ❌ Maintains Algolia SDK dependency
- ❌ Extra translation layer
- ❌ More complex to maintain

**Estimated Effort**: 3-4 hours

---

### Phase 2: Complete Dashboard Validation

Once search is fixed:

#### 2.1 Verify Dashboard Loads

**Steps**:
1. Navigate to http://localhost:4201
2. Wait for dashboard to load (no spinner)
3. Verify content visible
4. Take screenshot
5. Check console for errors

**Success Criteria**:
- ✅ No loading spinner
- ✅ Dashboard content visible
- ✅ No console errors
- ✅ All API requests return 200

#### 2.2 Test Authentication Flow

**Steps**:
1. Clear cookies/session
2. Navigate to http://localhost:4201
3. Should redirect to /auth/login
4. Should redirect to Dex login page
5. Enter credentials: test-user-1@example.com / password
6. Submit form
7. Should redirect back to dashboard
8. Verify user logged in

**Success Criteria**:
- ✅ OAuth redirect works
- ✅ Dex login page loads
- ✅ Authentication succeeds
- ✅ Redirects to dashboard
- ✅ User info displayed

#### 2.3 Test Search Functionality

**Steps**:
1. Enter search query in search bar
2. Press Enter or click search button
3. Verify search results display
4. Check network requests
5. Verify using `/api/v2/search/*` endpoint

**Success Criteria**:
- ✅ Search bar functional
- ✅ Results display correctly
- ✅ No 405 errors
- ✅ Using new endpoint
- ✅ Pagination works

#### 2.4 Test Navigation

**Steps**:
1. Click on various menu items
2. Verify routes load
3. Check for errors
4. Test back/forward navigation

**Success Criteria**:
- ✅ All routes accessible
- ✅ Navigation smooth
- ✅ No errors

---

### Phase 3: Documentation and Cleanup

#### 3.1 Update Documentation

**Files to Update**:
- `docs-internal/EMBER_DATA_STORE_ERROR_FIX_2025_10_08.md`
  - Add session store fix
  - Document validation results
  - Update status to RESOLVED
  
- `docs-internal/SEARCH_ENDPOINT_IMPLEMENTATION_2025_10_08.md`
  - Add frontend integration section
  - Document search.ts changes
  - Add validation results
  
- `.github/copilot-instructions.md`
  - Add session store requirement
  - Document search endpoint usage
  - Update testing procedures

#### 3.2 Create Automated Tests

**File**: `testing/playwright/frontend-validation.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Hermes Frontend Validation', () => {
  test('should load without errors', async ({ page }) => {
    await page.goto('http://localhost:4201');
    
    // Should not have initialization errors
    const errors = await page.evaluate(() => {
      return window.console.error.calls || [];
    });
    expect(errors.filter(e => e.includes('ember-simple-auth'))).toHaveLength(0);
    
    // Should make successful API calls
    const response = await page.waitForResponse(
      resp => resp.url().includes('/api/v2/me') && resp.status() === 200
    );
    expect(response).toBeTruthy();
  });
  
  test('should use new search endpoint', async ({ page }) => {
    await page.goto('http://localhost:4201');
    
    // Wait for search requests
    const searchRequests = [];
    page.on('request', req => {
      if (req.url().includes('/api/v2/search/')) {
        searchRequests.push(req);
      }
    });
    
    await page.waitForTimeout(5000);
    
    // Should use /api/v2/search/* not /1/indexes/*
    expect(searchRequests.length).toBeGreaterThan(0);
  });
  
  test('should load dashboard', async ({ page }) => {
    // This test requires authentication setup
    // TODO: Implement after Dex authentication is working
  });
});
```

#### 3.3 Clean Up

- Remove unused Algolia SDK imports (if Option A chosen)
- Update package.json dependencies
- Run linters and fix warnings
- Update tests

---

## Timeline

### Sprint 1 (2-3 days)
- ✅ Fix search integration (Option A recommended)
- ✅ Verify dashboard loads
- ✅ Test search functionality

### Sprint 2 (1-2 days)
- ✅ Test authentication flow
- ✅ Complete navigation testing
- ✅ Document results

### Sprint 3 (1 day)
- ✅ Create automated tests
- ✅ Update documentation
- ✅ Clean up code

**Total Estimated Time**: 4-6 days

---

## Risk Assessment

### High Risk
- **Search Integration Complexity**: 
  - Risk: Frontend relies heavily on Algolia client structure
  - Mitigation: Careful mapping of response formats
  - Fallback: Use Option B (proxy) if needed

### Medium Risk
- **Type Compatibility**:
  - Risk: TypeScript types may not match between Algolia and custom implementation
  - Mitigation: Create type adapters/interfaces
  - Fallback: Use `any` temporarily, refine later

### Low Risk
- **Authentication Flow**:
  - Risk: Dex redirect may have issues
  - Mitigation: Well-documented, working in Docker environment
  - Fallback: Manual testing, adjust redirect URLs

---

## Success Metrics

### Must Have ✅
- [ ] Dashboard loads without spinner
- [ ] No console errors on page load
- [ ] All API endpoints return 200
- [ ] Search requests use `/api/v2/search/*`
- [ ] No 405 errors

### Should Have 🎯
- [ ] Authentication flow working
- [ ] Search results display correctly
- [ ] Navigation between routes works
- [ ] Automated Playwright tests passing

### Nice to Have 💡
- [ ] Performance benchmarks documented
- [ ] Error handling validated
- [ ] Edge cases tested
- [ ] CI/CD integration

---

## Decision: Recommendation

### Primary Path: Option A (Update Frontend)

**Rationale**:
1. **Cleaner Architecture**: Direct API calls, no proxy layer
2. **Better Maintainability**: One less abstraction to maintain
3. **Smaller Bundle**: Remove Algolia SDK (~200KB)
4. **Consistency**: Matches other API calls in the app
5. **Future-Proof**: Easier to add features to `/api/v2/search/*`

**Next Steps**:
1. Create feature branch: `feature/frontend-search-integration`
2. Update `web/app/services/search.ts`
3. Test with Playwright MCP
4. Create PR with validation results
5. Merge after review

### Fallback: Option B (Backend Proxy)

**When to Use**:
- Frontend changes prove too complex
- Time constraints require quick fix
- Need backward compatibility with external tools

---

## Appendix: Reference Commands

### Start Test Environment
```bash
cd /Users/jrepp/hc/hermes/testing
docker compose up -d
docker compose ps  # Verify all healthy
```

### Start Ember Dev Server
```bash
cd /Users/jrepp/hc/hermes/web
pkill -f "ember server"  # Kill any existing
MIRAGE_ENABLED=false yarn ember server --port 4201 --proxy http://127.0.0.1:8001
```

### Playwright Validation
```bash
# From VS Code Copilot:
playwright.navigate('http://localhost:4201/')
playwright.waitFor({ time: 5 })
playwright.snapshot()
playwright.consoleMessages({ onlyErrors: true })
playwright.networkRequests()
playwright.takeScreenshot({ filename: 'test.png' })
```

### Check Logs
```bash
# Backend
docker compose logs -f hermes

# Frontend
tail -f /tmp/ember-dev-server-fixed.log

# Search for errors
docker compose logs hermes | grep -i error
```

---

**Document Version**: 1.0  
**Created**: October 8, 2025  
**Status**: READY FOR EXECUTION  
**Recommended Path**: Option A - Update Frontend  
**Estimated Completion**: 4-6 days
