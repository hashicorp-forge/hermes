# Quick Start: Continue API Test Suite Development

## ⚡ Resume Work (30 seconds)

```bash
cd /Users/jrepp/hc/hermes/tests/api

# Check what was done
cat API_TEST_PROGRESS.md

# Run existing API tests
go test -tags=integration -v -run "TestAPI_" -timeout 5m

# See what's next
cat /Users/jrepp/hc/hermes/docs-internal/TODO_API_TEST_SUITE.md
```

## 📍 Current State

**Last Session**: October 3, 2025  
**Status**: ✅ 2 API endpoints fully tested (12 tests passing)  
**Next**: Build mock infrastructure OR test more simple endpoints

## 🎯 What's Done

### ✅ Completed
- DocumentTypesHandler (5 tests)
- AnalyticsHandler (7 tests)
- Test infrastructure with testcontainers
- Documentation and progress tracking

### ⏸️ Documented Skips
- ProductsHandler (needs search mock)
- All complex endpoints (need auth/Google mocks)

## 🚀 Next Actions (Pick One)

### Option A: Test More Simple Endpoints
**Best for**: Quick wins, building coverage

```bash
# Look at v2 API handlers
ls /Users/jrepp/hc/hermes/internal/api/v2/

# Test similar simple handlers:
# - v2/DocumentTypesHandler
# - v2/AnalyticsHandler
```

### Option B: Build Mock Infrastructure
**Best for**: Enabling complex endpoint tests

Create mock for:
1. Search provider (Algolia/Meilisearch abstraction)
2. Google Workspace APIs
3. Authentication

### Option C: Test Helper Functions
**Best for**: Improving unit test coverage

From `internal/api/helpers.go`:
- `getBooleanValue()`
- `getInt64Value()`
- `getStringValue()`
- `getStringSliceValue()`

## 📁 Key Files

| File | Purpose |
|------|---------|
| `tests/api/api_v1_test.go` | Add more v1 tests here |
| `tests/api/API_TEST_PROGRESS.md` | Detailed session notes |
| `docs-internal/TODO_API_TEST_SUITE.md` | Overall roadmap |
| `docs-internal/API_TEST_SESSION_SUMMARY.md` | Last session summary |

## 🔧 Test Pattern (Copy-Paste)

```go
// TestAPI_NewHandler tests the GET /api/v1/endpoint endpoint
func TestAPI_NewHandler(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	// Setup
	log := hclog.NewNullLogger()
	handler := api.NewHandler(cfg, log)

	t.Run("Success case", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/endpoint", nil)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		// Add more assertions
	})

	t.Run("Error case", func(t *testing.T) {
		// Test error handling
	})
}
```

## 📊 Progress Metrics

| Metric | Current | Target |
|--------|---------|--------|
| v1 Endpoints Tested | 2/8 | 8/8 |
| v2 Endpoints Tested | 0/12 | 12/12 |
| API Tests Passing | 12 | 50+ |
| Mock Infrastructure | 0% | 100% |

## 🎓 Following Workflow

Using: `docs-internal/AGENT_COV.md`

1. **Analyze** - Identify endpoint to test
2. **Plan** - List test scenarios
3. **Implement** - Write tests in api_v1_test.go (or new file)
4. **Verify** - Run `go test -tags=integration -v -run TestAPI_Name`
5. **Document** - Update API_TEST_PROGRESS.md

## 🆘 If Issues

**Tests won't compile?**
→ Check imports (strings, json, httptest)
→ Check config types (use pointers)

**Containers failing?**
→ Ensure Docker is running
→ Check container logs in test output

**Handler needs external service?**
→ Document with t.Skip("Reason") 
→ Add to mock infrastructure backlog

**Need examples?**
→ See existing tests in api_v1_test.go
→ Lines 19-160 have complete examples

## 📞 Quick Commands

```bash
# Run only new API tests
go test -tags=integration -v -run "TestAPI_" -timeout 5m

# Run all integration tests
go test -tags=integration -v -timeout 15m

# Run unit tests only
go test -short -v

# Check test coverage
go test -tags=integration -coverprofile=coverage.out -v
go tool cover -html=coverage.out
```

## 💡 Pro Tips

✨ Start with handlers that don't need DB/auth (like DocumentTypes)  
✨ Use httptest for direct handler testing (faster than HTTP client)  
✨ Document all skips with clear reasons  
✨ Test all HTTP methods, not just success paths  
✨ Keep tests focused - one handler per test function  

---

**Ready?** Open `tests/api/api_v1_test.go` and add more tests! 🚀
