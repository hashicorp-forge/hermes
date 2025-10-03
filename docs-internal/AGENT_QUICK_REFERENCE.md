# Agent Quick Reference: Test Coverage Workflow

**Purpose**: One-page reference for AI agents improving test coverage  
**Full Workflow**: See `AGENT_WORKFLOW_TEST_COVERAGE.md`  
**Current Opportunities**: See `COVERAGE_OPPORTUNITIES.md`

## 🚀 Quick Start (Copy-Paste Ready)

### 1️⃣ Check Current State
```bash
cd /Users/jrepp/hc/hermes/tests/api
go test -short -coverprofile=coverage_unit.out -covermode=atomic -v
go tool cover -func=coverage_unit.out | tail -1
go tool cover -html=coverage_unit.out -o coverage_unit.html
```

### 2️⃣ Find Next Target
```bash
# See functions with <100% coverage
go tool cover -func=coverage_unit.out | awk '$NF < 100.0 && $1 != "total" {print $1, $2, $NF}'

# Open coverage opportunities list
cat /Users/jrepp/hc/hermes/docs-internal/COVERAGE_OPPORTUNITIES.md
```

### 3️⃣ Implement Tests
```bash
# Edit test file
code /Users/jrepp/hc/hermes/tests/api/unit_test.go

# Test pattern (add to unit_test.go):
func TestFunctionName_Scenario(t *testing.T) {
    testCases := []struct{
        name     string
        input    Type
        expected Type
    }{
        {"case1", input1, expected1},
    }
    for _, tc := range testCases {
        t.Run(tc.name, func(t *testing.T) {
            result := FunctionUnderTest(tc.input)
            assert.Equal(t, tc.expected, result)
        })
    }
}
```

### 4️⃣ Verify & Iterate
```bash
# Run new tests
go test -short -v -run TestFunctionName

# Check coverage improvement
go test -short -coverprofile=coverage_unit.out
go tool cover -func=coverage_unit.out | grep -E "FunctionName|total"

# If <100%, review HTML for missing branches
open coverage_unit.html
```

### 5️⃣ Document Results
```bash
# Update coverage reports (see templates below)
code /Users/jrepp/hc/hermes/tests/api/COVERAGE_REPORT.md
code /Users/jrepp/hc/hermes/docs-internal/COVERAGE_OPPORTUNITIES.md

# Mark target complete, update metrics, log iteration
```

## 📋 Agent Prompts

### Analyze Coverage
```
Check test coverage in tests/api/ and identify improvement opportunities:
1. Run: cd tests/api && go test -short -coverprofile=coverage.out -v
2. Run: go tool cover -func=coverage.out
3. List functions with <100% coverage
4. Filter for pure functions (no DB/HTTP/external dependencies)
5. Prioritize by: coverage gap, complexity, test effort
6. Update: docs-internal/COVERAGE_OPPORTUNITIES.md with top 3-5 targets
```

### Implement Tests
```
Add comprehensive tests for [FunctionName] targeting 100% coverage:
1. Review function in [file:line] to understand behavior
2. Identify all code paths (if/else, switch, early returns)
3. List edge cases: nil, empty, boundary values, all enum values
4. Create table-driven tests in tests/api/unit_test.go
5. Use naming: TestFunctionName_Scenario
6. Verify: go test -short -v -run TestFunctionName
7. Measure: go test -short -coverprofile=temp.out && go tool cover -func=temp.out | grep FunctionName
8. Target: 100% coverage on function
```

### Verify & Document
```
Verify coverage improvement and update documentation:
1. Run: cd tests/api && go test -short -coverprofile=coverage_unit.out -v
2. Measure: go tool cover -func=coverage_unit.out | grep -E "FunctionName|total"
3. Compare to baseline in tests/api/COVERAGE_REPORT.md
4. Calculate deltas: overall %, function %, test count, execution time
5. Update: tests/api/COVERAGE_REPORT.md (detailed metrics table)
6. Update: tests/api/COVERAGE_SUMMARY.md (progress bars)
7. Update: docs-internal/COVERAGE_OPPORTUNITIES.md (mark target complete, add to log)
8. If target not 100%, identify missing branches from HTML report and iterate
```

## 🎯 Decision Tree

```
START
  │
  ├─ Need to improve coverage?
  │   ├─ YES → Run "Analyze Coverage" prompt
  │   └─ NO  → Done
  │
  ├─ Found pure function target?
  │   ├─ YES → Run "Implement Tests" prompt
  │   └─ NO  → Document in COVERAGE_OPPORTUNITIES.md (defer to integration)
  │
  ├─ Coverage improved?
  │   ├─ YES → Run "Verify & Document" prompt
  │   └─ NO  → Review HTML report for missing branches, iterate
  │
  └─ More targets?
      ├─ YES → Return to "Analyze Coverage"
      └─ NO  → Phase complete
```

## 📊 Documentation Templates

### COVERAGE_REPORT.md Update
```markdown
**Last Updated**: YYYY-MM-DD HH:MM  
**Overall Coverage**: X.X% (was: Y.Y%, delta: +Z.Z%)

| Function | Coverage | Status |
|----------|----------|--------|
| FunctionName | 100.0% | ✅ Complete |
| total | X.X% | 🔄 In Progress |

**Test Suite Stats**:
- Tests Passing: N/N
- Execution Time: X.XXXs
- Test Functions: N (was: M, +P)
```

### COVERAGE_OPPORTUNITIES.md Update
```markdown
### Iteration N (YYYY-MM-DD) ✅ COMPLETE
**Target**: FunctionName (XX.X% → 100%)  
**Actions**: Added N test functions covering [scenarios]  
**Result**: 100% coverage achieved, overall X.X% (+Z.Z%)  
**Time**: X.XXXs → Y.YYYs  
**Tests**: M → N functions  
```

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| Tests fail | Fix compilation errors, check imports |
| Coverage unchanged | Review HTML report, focus on red lines |
| Tests too slow | Verify using `-short` flag, avoid DB/HTTP |
| Can't find target | Function may need integration tests (defer) |

## 🎓 Test Writing Best Practices

✅ **DO**:
- Use table-driven tests for multiple cases
- Test behavior, not implementation
- Name tests clearly: `TestFunction_Scenario`
- Add tests incrementally (1-3 at a time)
- Run tests after each addition

❌ **DON'T**:
- Test integration code in unit tests
- Duplicate existing test scenarios
- Add 10+ tests without verifying
- Test unexported implementation details
- Forget to update documentation

## 📈 Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Overall Coverage | >15% | 11.8% |
| Pure Function Coverage | 100% | 100% ✅ |
| Test Execution Time | <1s | 0.286s ✅ |
| Tests Passing | 100% | 100% ✅ |

## 🔗 Key Files

| File | Purpose |
|------|---------|
| `/tests/api/unit_test.go` | Unit test implementations |
| `/tests/api/COVERAGE_REPORT.md` | Detailed coverage metrics |
| `/tests/api/COVERAGE_SUMMARY.md` | Executive summary |
| `/docs-internal/COVERAGE_OPPORTUNITIES.md` | Next targets & iteration log |
| `/docs-internal/AGENT_WORKFLOW_TEST_COVERAGE.md` | Full workflow guide |

## 🔄 One-Line Resume

```bash
# Agent: Continue from last session
cd /Users/jrepp/hc/hermes && cat docs-internal/COVERAGE_OPPORTUNITIES.md | grep -A 20 "Next Targets"
```

---

**Last Updated**: 2025-10-03  
**Current Phase**: Unit Test Coverage (Phase 1)  
**Next Milestone**: >15% overall coverage, all pure functions at 100%
