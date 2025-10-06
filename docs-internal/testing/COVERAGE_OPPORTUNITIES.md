# Test Coverage Opportunities

**Last Updated**: 2025-10-03  
**Current Coverage**: 11.8% (tests/api/ unit tests)  
**Status**: Ready for next iteration

## Current State Summary

### Completed ✅
- **ModelToSearchDocument**: 74.1% → **100%** (Perfect!)
- **Client.SetAuth**: 0% → **100%**
- **DocumentTypes**: Basic structure tests added
- **Overall**: 8.5% → **11.8%** (+3.3 percentage points)

### Test Suite Stats
- **Test Functions**: 15 (up from 7)
- **Execution Time**: 0.286s (down from 0.472s)
- **All Tests Passing**: ✅ 15/15

## Next Targets (Priority Order)

### Priority 1: Pure Logic Functions <100%

#### 1. `contains()` helper function
**Location**: `tests/api/suite.go` (unexported)  
**Current Coverage**: Unknown (not in coverage report - unexported)  
**Complexity**: Low  
**Test Scenarios**:
- Empty slice
- String found (beginning, middle, end)
- String not found
- Case sensitivity
- Nil slice

**Estimated Effort**: 1 test function, 5 subtests, ~20 lines  
**Value**: Utility function, easy win

---

#### 2. Document Status String Conversion
**Location**: Likely in `pkg/models/document.go`  
**Current Coverage**: Unknown (need to check)  
**Complexity**: Low  
**Test Scenarios**:
- All enum values → string
- Invalid/undefined values
- Zero value handling

**Estimated Effort**: 1 test function, 5 subtests, ~15 lines  
**Value**: Core domain logic

---

#### 3. Fixture Builders - Build() methods
**Location**: `tests/api/fixtures/`  
**Current Coverage**: Not measured yet  
**Complexity**: Low-Medium  
**Test Scenarios**:
- Build with minimal fields
- Build with all fields populated
- Build with nil product
- Build with nil contributors
- Verify all fields copied correctly

**Estimated Effort**: 3-5 test functions, ~80 lines  
**Value**: Ensure test data integrity

---

### Priority 2: Helper Functions

#### 4. Auth Validation Helpers
**Location**: `tests/api/suite.go`  
**Current Coverage**: Partial (WithValidAuthFunc tested, others unknown)  
**Complexity**: Low  
**Functions to test**:
- `WithValidAuth()`
- `WithInvalidAuth()`
- Any other auth helper variations

**Estimated Effort**: 2 test functions, ~30 lines  
**Value**: Critical for security testing

---

#### 5. HTTP Request Helpers
**Location**: `tests/api/client.go`  
**Current Coverage**: Unknown  
**Complexity**: Medium  
**Test Scenarios**:
- GET requests
- POST requests
- PUT requests
- DELETE requests
- With query parameters
- With headers
- Error responses

**Estimated Effort**: 5-7 test functions, ~120 lines  
**Value**: Foundation for all API tests

---

### Priority 3: Data Transformation

#### 6. Document → SearchDocument Field Mappings
**Location**: `tests/api/suite.go`  
**Current Coverage**: 100% for ModelToSearchDocument ✅  
**Status**: COMPLETE - No action needed

---

#### 7. Response Serialization
**Location**: Likely in `internal/api/` handlers  
**Current Coverage**: Unknown (requires integration)  
**Complexity**: High (requires HTTP server)  
**Status**: **DEFER to integration tests**

---

## Not Suitable for Unit Tests (Integration Required)

These functions require external dependencies and should be tested in integration tests:

### Database Operations
- `NewSuite()` / `NewIntegrationSuite()` - Requires PostgreSQL
- `seedDatabase()` - Requires PostgreSQL
- Any GORM model operations

### Search Operations  
- Meilisearch client methods
- Index creation/updating
- Search queries

### HTTP Server
- Route handlers
- Middleware
- Response encoding

### External Services
- Google Workspace API calls
- Algolia API calls
- Email sending

**Action**: Document these in `TODO_INTEGRATION_TESTS.md` for Phase 2

## Investigation Needed

### Unknown Coverage Areas
These need coverage analysis before planning:

1. **pkg/models/** - Model validation logic
   - Command: `cd pkg/models && go test -coverprofile=coverage.out`
   - Focus: Pure validation functions (not DB operations)

2. **pkg/document/replace_header.go** - Header replacement logic
   - Command: `cd pkg/document && go test -coverprofile=coverage.out`
   - Focus: String manipulation, regex patterns

3. **pkg/hashicorpdocs/** - Document type handlers
   - Command: `cd pkg/hashicorpdocs && go test -coverprofile=coverage.out`
   - Check: `rfc_test.go` exists, what about PRD/FRD?

4. **pkg/links/** - Short link generation
   - Command: `cd pkg/links && go test -coverprofile=coverage.out`
   - Focus: URL encoding, data transformation

**Next Agent Action**: Run coverage on these packages to identify specific targets

## How to Use This Document

### For AI Agents
1. Pick highest priority uncompleted target
2. Review test scenarios listed
3. Implement tests following `AGENT_WORKFLOW_TEST_COVERAGE.md`
4. Update this document with results
5. Move to next target

### For Humans
1. Review priority order
2. Adjust based on business needs
3. Add new opportunities as code changes
4. Remove completed items

## Iteration Log

### Iteration 1 (2025-10-03) ✅ COMPLETE
**Target**: ModelToSearchDocument (74.1% → 100%)  
**Actions**: Added 8 test functions covering status enums, nil safety, custom fields, timestamps, doc numbers  
**Result**: 100% coverage achieved, overall 11.8% (+3.3%)  
**Time**: 0.472s → 0.286s  
**Tests**: 7 → 15 functions  

### Iteration 2 (Planned)
**Target**: TBD - Pick from Priority 1 list  
**Goal**: +2-3% overall coverage  
**Estimated Tests**: 3-5 new functions  

## Quick Start for Next Iteration

```bash
# 1. Check current state
cd /Users/jrepp/hc/hermes/tests/api
go test -short -coverprofile=coverage_unit.out -covermode=atomic -v
go tool cover -func=coverage_unit.out | grep -E "suite\.go|total"

# 2. Identify next target (example: contains function)
grep -n "func contains" suite.go

# 3. Review function implementation
cat -n suite.go | sed -n 'START,END p'  # Replace START,END with line numbers

# 4. Create test plan
# - List all code paths
# - Enumerate edge cases
# - Plan test structure

# 5. Add tests to unit_test.go
# - Follow naming convention: TestFunctionName_Scenario
# - Use table-driven tests
# - Add incrementally (1-3 functions at a time)

# 6. Verify
go test -short -v -run TestFunctionName
go test -short -coverprofile=temp.out && go tool cover -func=temp.out | grep FunctionName

# 7. Update documentation
# - This file (mark target complete, add to iteration log)
# - COVERAGE_REPORT.md (new metrics)
# - COVERAGE_SUMMARY.md (progress update)
```

## Coverage Analysis Commands

```bash
# Generate full coverage breakdown
cd tests/api
go test -short -coverprofile=coverage.out
go tool cover -func=coverage.out > coverage_breakdown.txt
cat coverage_breakdown.txt

# Filter for <100% coverage
go tool cover -func=coverage.out | awk '$NF < 100.0 {print}'

# Check specific file
go tool cover -func=coverage.out | grep suite.go

# Visual HTML report
go tool cover -html=coverage.out -o coverage.html
open coverage.html  # macOS
```

## Success Criteria

### Per-Target Success
- ✅ Target function reaches 100% coverage (or maximum possible)
- ✅ All new tests pass
- ✅ No performance regression (execution time)
- ✅ Documentation updated

### Overall Success (End of Phase 1)
- ✅ All pure logic functions at 100%
- ✅ Overall unit coverage >15%
- ✅ Test suite executes in <1s
- ✅ Zero flaky tests
- ✅ All documentation complete

## Notes

- Focus on **pure functions first** - highest value, lowest effort
- **Avoid integration code** in unit tests - maintain fast execution
- **Test behavior, not implementation** - use public APIs
- **Use table-driven tests** - easier to add cases later
- **Document as you go** - don't leave it to the end

## References

- Workflow guide: `AGENT_WORKFLOW_TEST_COVERAGE.md`
- Current coverage: `COVERAGE_REPORT.md`
- Test code: `/tests/api/unit_test.go`
- Integration setup: `/tests/api/integration_containers_test.go`
