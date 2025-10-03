# AGENT WORKFLOW: Test Coverage Improvement

**Purpose**: Iterative workflow for AI agents to systematically improve test coverage across the Hermes codebase  
**Status**: Active  
**Created**: 2025-10-03  
**Last Updated**: 2025-10-03  

## Overview

This document provides a repeatable workflow for AI coding agents to identify, implement, and validate test coverage improvements. It captures the methodology used to improve `tests/api/` coverage from 8.5% → 11.8% and achieve 100% coverage on pure logic functions.

## Workflow Stages

### Stage 1: Assessment & Planning

#### 1.1 Generate Current Coverage Report
```bash
cd tests/api
go test -short -coverprofile=coverage_unit.out -covermode=atomic -v
go tool cover -html=coverage_unit.out -o coverage_unit.html
go tool cover -func=coverage_unit.out > coverage_breakdown.txt
```

**Agent Actions**:
- Capture baseline metrics: overall %, per-function %, test count, execution time
- Document in `COVERAGE_REPORT.md` with timestamp
- Identify functions with <100% coverage
- Create priority matrix (high-value + low-complexity first)

#### 1.2 Analyze Low-Hanging Fruit
**Criteria for "Low-Hanging Fruit"**:
- ✅ Pure functions (no DB, no HTTP, no external services)
- ✅ <100% coverage currently
- ✅ Clear input/output contracts
- ✅ Testable edge cases (nil, empty, boundary values)
- ✅ No complex setup required

**Agent Prompt**:
```
Analyze coverage_breakdown.txt and identify functions matching:
1. Pure logic functions (data transformation, validation, formatting)
2. Current coverage <100%
3. Missing test cases for: nil safety, edge cases, all enum values, error paths
4. Can be tested in <10 lines of test code per case
```

**Output**: Prioritized list in `COVERAGE_OPPORTUNITIES.md`

#### 1.3 Create Test Plan
For each target function, document:
- Current coverage %
- Missing test scenarios (enumerate specific cases)
- Expected assertions
- Estimated test complexity (lines of code)

**Example**:
```markdown
### ModelToSearchDocument (74.1% → Target: 100%)

Missing scenarios:
1. All status enumerations (WIP, In-Review, Approved, Obsolete, Unspecified)
2. Nil owner (should use empty string)
3. Nil contributors with nil entries in slice
4. Nil approvers with nil entries in slice
5. Custom fields iteration with nil entries
6. Document number formatting edge cases (0, negative, large numbers)
7. Timestamp conversion accuracy

Estimated: 8 test functions, ~150 lines of code
```

### Stage 2: Implementation

#### 2.1 Test Writing Guidelines
**Structure**:
```go
func TestFunctionName_Scenario(t *testing.T) {
    // Use table-driven tests for multiple cases
    testCases := []struct{
        name     string
        input    InputType
        expected OutputType
    }{
        {"case1", input1, expected1},
        {"case2", input2, expected2},
    }
    
    for _, tc := range testCases {
        t.Run(tc.name, func(t *testing.T) {
            result := FunctionUnderTest(tc.input)
            assert.Equal(t, tc.expected, result)
        })
    }
}
```

**Naming Convention**:
- `TestFunctionName_Unit` - Basic happy path
- `TestFunctionName_AllEnums` - All enum values
- `TestFunctionName_NilSafety` - Nil pointer handling
- `TestFunctionName_EdgeCases` - Boundary values
- `TestFunctionName_ErrorCases` - Error conditions

#### 2.2 Implementation Checklist
For each new test function:
- [ ] Named clearly (describes scenario)
- [ ] Uses table-driven structure when testing >2 cases
- [ ] Has descriptive subtest names (`t.Run(...)`)
- [ ] Uses appropriate assertions (Equal, NotNil, Contains, etc.)
- [ ] Tests ONE logical scenario (not multiple unrelated cases)
- [ ] Includes comments for non-obvious test logic
- [ ] Compiles without errors
- [ ] Passes when run

#### 2.3 Add Tests Incrementally
**Process**:
1. Add 1-3 test functions
2. Run `go test -short -v` to verify compilation and passing
3. Check coverage: `go test -short -coverprofile=temp.out && go tool cover -func=temp.out | grep FunctionName`
4. If coverage improved → commit and continue
5. If coverage unchanged → review untested branches

**Anti-Patterns to Avoid**:
- ❌ Adding 10+ tests without running (risk of batch failures)
- ❌ Testing integration code in unit tests (breaks fast execution)
- ❌ Duplicating existing test scenarios
- ❌ Testing implementation details instead of behavior

### Stage 3: Validation

#### 3.1 Verify Coverage Improvement
```bash
cd tests/api
go test -short -coverprofile=coverage_unit.out -covermode=atomic -v
go tool cover -func=coverage_unit.out | grep -E "FunctionName|total"
```

**Success Criteria**:
- ✅ Target function coverage increased
- ✅ Overall coverage increased (or maintained)
- ✅ All tests pass
- ✅ Execution time <1s for unit tests
- ✅ No new dependencies added

#### 3.2 Update Documentation
**Files to Update**:
1. `COVERAGE_REPORT.md` - Full detailed metrics
   - Overall coverage %
   - Per-function coverage table
   - Test count
   - Execution time
   - Coverage breakdown by file

2. `COVERAGE_SUMMARY.md` - Executive summary
   - Progress bars/visual indicators
   - Before/after metrics
   - Status badges
   - Priority areas

3. `COVERAGE_EXECUTIVE_SUMMARY.md` - High-level status
   - Overall progress
   - Key achievements
   - Next priorities

**Template Updates**:
```markdown
| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Overall Coverage | X.X% | Y.Y% | +Z.Z% |
| FunctionName | XX.X% | 100% | +ZZ.Z% |
| Test Count | N | M | +P |
| Execution Time | X.XXXs | Y.YYYs | -Z% |
```

#### 3.3 Generate Visual Report
```bash
go tool cover -html=coverage_unit.out -o coverage_unit.html
open coverage_unit.html  # Review red/green highlighting
```

**Agent Review**:
- Identify remaining red (uncovered) lines
- Categorize: pure logic vs integration code
- Update test plan for next iteration

### Stage 4: Iteration

#### 4.1 Decide Next Target
**Decision Tree**:
```
Is overall coverage >90%?
├─ YES → Move to integration tests
└─ NO → Are there more pure functions <100%?
    ├─ YES → Return to Stage 1.2 (analyze next function)
    └─ NO → Are there testable utils/helpers <100%?
        ├─ YES → Return to Stage 1.2 (analyze helpers)
        └─ NO → Document completion, move to integration
```

#### 4.2 Track Progress
**Maintain Running Log**:
```markdown
## Coverage Progress Log

### Iteration 1 (2025-10-03)
- Baseline: 8.5% (7 tests)
- Target: ModelToSearchDocument 74.1% → 100%
- Actions: Added 8 test functions (TestModelToSearchDocument_*)
- Result: 11.8% overall (+3.3%), 100% on target (✅)
- Time: 0.472s → 0.286s (39% faster)

### Iteration 2 (YYYY-MM-DD)
- Baseline: 11.8% (15 tests)
- Target: [Next function/area]
- Actions: [Planned test additions]
- Result: [To be filled]
```

## Agent Prompts Library

### Prompt 1: Initial Coverage Analysis
```
Analyze the current test coverage in tests/api/:
1. Run: go test -short -coverprofile=coverage.out -covermode=atomic
2. Run: go tool cover -func=coverage.out
3. Identify functions with <100% coverage
4. Filter for pure functions (no external dependencies)
5. Create prioritized list ordered by:
   - Coverage gap size (larger gaps first)
   - Function complexity (simpler first)
   - Test effort (lower effort first)
6. Document in COVERAGE_OPPORTUNITIES.md
```

### Prompt 2: Test Implementation
```
Implement comprehensive tests for [FunctionName] targeting 100% coverage:
1. Review function signature and behavior in [file]
2. Identify all code paths (if/else, switch, loops)
3. Enumerate edge cases:
   - Nil/empty inputs
   - All enum values
   - Boundary values (0, negative, max)
   - Error conditions
4. Create table-driven tests in unit_test.go
5. Use naming: TestFunctionName_Scenario
6. Run and verify: go test -short -v
7. Measure coverage: go test -short -coverprofile=temp.out && go tool cover -func=temp.out | grep FunctionName
```

### Prompt 3: Coverage Verification
```
Verify and document coverage improvements:
1. Run full unit test suite with coverage
2. Compare to previous baseline:
   - Overall coverage delta
   - Target function coverage (before/after)
   - Test count change
   - Execution time change
3. Update COVERAGE_REPORT.md with new metrics
4. Update COVERAGE_SUMMARY.md with progress
5. Regenerate HTML report: go tool cover -html
6. If target not reached, identify missing branches and return to implementation
```

### Prompt 4: Identify Next Target
```
Analyze coverage data to identify next improvement target:
1. Review coverage_breakdown.txt
2. Filter for functions with coverage <100%
3. Exclude integration code (requires DB/HTTP/external services)
4. Rank by:
   - Pure function (highest priority)
   - Coverage gap (larger gaps = more impact)
   - Lines of code (smaller functions = faster wins)
5. Select top 1-3 functions
6. Create test plan with specific scenarios to test
7. Document in COVERAGE_OPPORTUNITIES.md
```

## Success Metrics

### Per-Iteration Metrics
- **Coverage Delta**: Target +2-5% per iteration for unit tests
- **Test Count**: Add 5-10 test functions per iteration
- **Execution Time**: Maintain <1s for unit test suite
- **All Tests Pass**: 100% pass rate required
- **Documentation**: All reports updated within iteration

### Milestone Targets
- **Phase 1**: Pure logic functions at 100% (target: 2-3 iterations)
- **Phase 2**: Helper/utility functions at >90% (target: 3-5 iterations)
- **Phase 3**: Overall unit coverage at >15% (realistic for test infrastructure code)
- **Phase 4**: Integration tests at >85% (requires testcontainers)

## Common Pitfalls & Solutions

### Pitfall 1: Coverage Plateaus
**Symptom**: Adding tests but coverage not increasing  
**Cause**: Testing already-covered code paths  
**Solution**:
1. Review HTML coverage report (red = uncovered)
2. Focus tests on red lines specifically
3. Use `go test -coverprofile` with `-v` to see which tests run which code

### Pitfall 2: Tests Require External Dependencies
**Symptom**: Tests need DB/HTTP to run  
**Cause**: Targeting integration code in unit test phase  
**Solution**:
1. Skip this function for now (mark in COVERAGE_OPPORTUNITIES.md)
2. Move to integration test plan (TODO_INTEGRATION_TESTS.md)
3. Focus on pure functions first

### Pitfall 3: Tests Too Brittle
**Symptom**: Tests break when implementation changes  
**Cause**: Testing implementation details instead of behavior  
**Solution**:
1. Test public API/exported functions
2. Assert on outputs, not internal state
3. Use table-driven tests for flexibility

### Pitfall 4: Slow Test Execution
**Symptom**: Unit tests take >5s to run  
**Cause**: Accidentally running integration tests or creating heavyweight objects  
**Solution**:
1. Verify using `go test -short` flag
2. Check for DB/HTTP calls in unit tests
3. Use minimal test fixtures (don't create 100 objects)

## Integration with Existing Workflow

### Relationship to Other TODOs
- **TODO_UNIT_TESTS.md**: This workflow implements that TODO systematically
- **TODO_INTEGRATION_TESTS.md**: Next phase after unit coverage >15%
- **TODO_API_TEST_SUITE.md**: Long-term comprehensive suite (weeks-long project)

### When to Use This Workflow
✅ **Use when**:
- Current coverage <target for a module
- Refactoring code (want safety net)
- Found bugs (add regression tests)
- Starting new feature (TDD approach)

❌ **Don't use when**:
- Code is temporary/prototype
- Coverage already >95%
- No pure functions to test (all integration)
- Under time pressure (cover high-value code only)

## Command Reference

### Quick Commands
```bash
# Run unit tests only (fast)
cd tests/api && go test -short -v

# Run unit tests with coverage
cd tests/api && go test -short -coverprofile=coverage_unit.out -covermode=atomic

# Generate HTML coverage report
go tool cover -html=coverage_unit.out -o coverage_unit.html

# Show coverage by function
go tool cover -func=coverage_unit.out

# Check specific function coverage
go tool cover -func=coverage_unit.out | grep FunctionName

# Count test functions
grep -E "^func Test.*\(t \*testing\.T\)" unit_test.go | wc -l

# Run specific test
go test -short -v -run TestFunctionName

# Run tests matching pattern
go test -short -v -run "TestModel.*"
```

### Makefile Targets
```bash
# Run all API unit tests
make test/api/unit

# Run all API integration tests (requires Docker)
make test/api/integration

# Run all API tests
make test/api

# Run all unit tests (project-wide)
make test/unit

# Run all tests (unit + integration)
make test
```

## Example Session Transcript

### Session 1: Improving ModelToSearchDocument Coverage

**Starting State**:
- Coverage: 8.5% overall, 74.1% on ModelToSearchDocument
- Tests: 7 functions
- Time: 0.472s

**Agent Actions**:
1. Analyzed coverage HTML report → identified red lines in ModelToSearchDocument
2. Listed missing scenarios:
   - Status enum handling (only tested WIP)
   - Nil safety (owner, contributors, approvers, custom fields)
   - Document number formatting
   - Timestamp conversion
3. Created test plan with 8 test functions
4. Implemented incrementally:
   - TestModelToSearchDocument_AllStatuses (5 subtests)
   - TestModelToSearchDocument_NilSafety (7 subtests)
   - TestModelToSearchDocument_CustomFields (2 subtests)
   - TestModelToSearchDocument_Timestamps (1 test)
   - TestModelToSearchDocument_DocNumber (5 subtests)
   - TestClient_SetAuth (2 tests)
   - TestDocumentTypes_Unit (3 tests)
   - TestWithValidAuthFunc (2 tests)
5. Verified after each addition: `go test -short -v`
6. Generated final coverage: 11.8% overall, 100% on ModelToSearchDocument

**Ending State**:
- Coverage: 11.8% overall (+3.3%), 100% on ModelToSearchDocument (+25.9%)
- Tests: 15 functions (+8)
- Time: 0.286s (39% faster)

**Documentation Updated**:
- COVERAGE_REPORT.md (detailed metrics)
- COVERAGE_SUMMARY.md (executive summary)
- COVERAGE_EXECUTIVE_SUMMARY.md (high-level status)

**Next Action**: Analyze coverage for next pure function target

## Continuous Improvement

### Feedback Loop
After each iteration:
1. **What worked well?** (techniques that improved coverage efficiently)
2. **What didn't work?** (wasted effort, wrong targets)
3. **What to try next?** (new strategies, tools, approaches)

### Update This Document
When discovering new patterns:
1. Add to "Agent Prompts Library"
2. Update "Common Pitfalls & Solutions"
3. Add to "Command Reference" if new commands used
4. Update success metrics if targets change

### Share Learnings
Document insights in:
- `COVERAGE_OPPORTUNITIES.md` - What to test next
- `TESTING_BEST_PRACTICES.md` - Reusable patterns
- This document - Workflow improvements

## References

- Project docs: `/docs-internal/TODO_UNIT_TESTS.md`
- Test suite: `/tests/api/`
- Coverage reports: `/tests/api/COVERAGE_*.md`
- Makefile: `/Makefile` (test targets)
- Go testing: https://pkg.go.dev/testing
- Coverage tools: https://go.dev/blog/cover
