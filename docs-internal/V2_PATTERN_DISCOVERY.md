# V2 Documents Handler Analysis - Key Discovery! 🎉

**File**: `internal/api/v2/documents.go`  
**Size**: 1142 lines total  
**Pattern**: Uses `server.Server` + Database as source of truth  
**Key Insight**: **V2 doesn't use search provider for GET operations!**

---

## 🔍 V2 Pattern Analysis

### Function Signature ✅
```go
func DocumentHandler(srv server.Server) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Already using the pattern we want!
```

### Data Source Strategy
**V2 uses Database as primary source:**
```go
// Get document from database (NOT from search/Algolia)
model := models.Document{
    GoogleFileID: docID,
}
if err := model.Get(srv.DB); err != nil {
    if errors.Is(err, gorm.ErrRecordNotFound) {
        srv.Logger.Warn("document record not found", ...)
        http.Error(w, "Document not found", http.StatusNotFound)
        return
    }
    // ...
}
```

**V1 uses Algolia as primary source:**
```go
// Get document object from Algolia
var algoObj map[string]any
err = ar.Docs.GetObject(docID, &algoObj)
// Then convert to document...
```

---

## 💡 Key Implications

###This Changes Everything!

**V1 → V1.5 is NOT the right approach!**

Instead, we should recognize that:
1. **V2 already exists** with the pattern we want
2. **V2 is more correct** (database as source of truth)
3. **V1 is legacy** (Algolia as source of truth)
4. **Tests should target V2**, not create V1.5

### Recommended Strategy

#### Option 1: Update Tests to Use V2 ✅ RECOMMENDED
```go
// Don't create V1.5 handlers
// Instead, update skipped tests to use V2 endpoints

// In tests/api/documents_test.go:
func TestDocuments_Get(t *testing.T) {
    // Remove: t.Skip("...")
    
    suite := NewIntegrationSuite(t)
    defer suite.Cleanup()
    
    // Create document in DATABASE
    doc := fixtures.NewDocument().
        WithGoogleFileID("test-123").
        Create(t, suite.DB)
    
    // Test V2 endpoint (which uses database)
    resp := suite.Client.Get("/api/v2/documents/test-123")
    resp.AssertStatusOK()
}
```

**Benefits**:
- ✅ Zero new code to write
- ✅ Tests target the **correct, modern API** (V2)
- ✅ V1 remains untouched (backward compat)
- ✅ Can complete in 1-2 hours instead of 6-8 hours

**Drawbacks**:
- Tests won't cover V1 API (but V1 is legacy anyway)
- If V2 is missing some endpoints, we'd need to add them

#### Option 2: Create V1.5 (Original Plan)
Create new handlers that bridge V1 → V2 patterns

**Benefits**:
- Tests V1-style API with V2-style implementation

**Drawbacks**:
- ❌ 6-8 hours of work
- ❌ Creates technical debt (3 versions of API)
- ❌ V1 still exists and is still broken

---

## 🔎 Investigation Needed

### Check if V2 has all endpoints we need:

```bash
# Check V2 routes
grep -r "api/v2" internal/server/router.go

# Check which tests are failing
go test -tags=integration -v ./tests/api/ -run TestDocuments 2>&1 | grep -A5 "SKIP"
go test -tags=integration -v ./tests/api/ -run TestAPI 2>&1 | grep -A5 "SKIP"
```

### Questions to Answer:
1. Does V2 have all the endpoints V1 has?
2. Are the skipped tests targeting V1 or could they target V2?
3. Is V2 fully functional and tested?
4. Why were tests written against V1 instead of V2?

---

## 📋 Revised Recommendation

### Phase 1: Investigate V2 Coverage (30 minutes)
1. Check what routes V2 has
2. Check which V2 endpoints are tested
3. Identify gaps between V1 and V2

### Phase 2A: If V2 has all endpoints → Update Tests (2 hours)
1. Update 9 skipped tests to target `/api/v2/` endpoints
2. Ensure tests create data in database (not search)
3. Run tests and fix any issues
4. **Result**: 59/59 tests passing

### Phase 2B: If V2 missing endpoints → Implement in V2 (4-6 hours)
1. Add missing endpoints to V2 (cleaner than V1.5)
2. Update tests to target V2
3. Run tests
4. **Result**: 59/59 tests passing

---

## 🎯 Action Plan

**Let's investigate V2 first before committing to V1.5 approach.**

Commands to run:
```bash
# 1. Check V2 routes
grep -A2 "api/v2" internal/server/router.go | grep -E "documents|drafts|reviews|approvals|me"

# 2. Check which tests exist for V2
ls -la tests/api/*v2*.go
grep -l "api/v2" tests/api/*.go

# 3. List skipped tests and their target
grep -B5 "t.Skip" tests/api/*.go | grep -E "func Test|t.Skip"

# 4. Check V2 documents handler exports
grep "^func.*Handler" internal/api/v2/documents.go
```

Would you like me to run these investigations to determine the best path forward?
