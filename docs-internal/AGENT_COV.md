# 🚀 AGENT: Start Here for Test Coverage Work

## ⚡ Quick Resume (30 seconds)

```bash
# Check what's next
cat /Users/jrepp/hc/hermes/docs-internal/COVERAGE_OPPORTUNITIES.md | grep -A 30 "Next Targets"

# See current coverage
cd /Users/jrepp/hc/hermes/tests/api
go test -short -coverprofile=coverage_unit.out -v
go tool cover -func=coverage_unit.out | tail -1
```

**Current State**: 11.8% overall, ModelToSearchDocument @ 100% ✅

---

## 📚 Which Document to Read?

### "I need to start working NOW"
→ Read: `docs-internal/AGENT_QUICK_REFERENCE.md` (5 min)  
Contains: All commands, prompts, and workflows on one page

### "I want to understand the full process"
→ Read: `docs-internal/AGENT_WORKFLOW_TEST_COVERAGE.md` (20 min)  
Contains: Complete methodology, examples, pitfalls, best practices

### "What should I work on next?"
→ Read: `docs-internal/COVERAGE_OPPORTUNITIES.md` (3 min)  
Contains: Prioritized target list, effort estimates, success criteria

### "I want to document my session"
→ Use: `docs-internal/AGENT_SESSION_HANDOFF_TEMPLATE.md`  
Contains: Template to fill out at end of session

### "I need to find a specific document"
→ Read: `docs-internal/README.md` (2 min)  
Contains: Index of all internal documentation

---

## 🎯 Recommended Next Action

**Target**: Implement tests for `contains()` helper function  
**Reason**: Pure function, low complexity, easy win  
**Estimated Effort**: 1 test function, ~20 lines, 5-10 minutes  
**Expected Gain**: +0.5-1% coverage

**Alternative**: Implement tests for fixture builders (higher effort, more impact)

---

## 📊 Progress Dashboard

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Overall Coverage | 11.8% | >15% | 🟡 78% to target |
| Pure Functions | 100% | 100% | 🟢 Complete |
| Test Count | 15 | - | 🟢 Growing |
| Execution Time | 0.286s | <1s | 🟢 Fast |

---

## 🔗 Key Files

| File | Purpose |
|------|---------|
| `/tests/api/unit_test.go` | Add tests here |
| `/tests/api/suite.go` | Functions to test |
| `/tests/api/COVERAGE_REPORT.md` | Update metrics here |
| `/docs-internal/COVERAGE_OPPORTUNITIES.md` | Update iteration log here |

---

## ✅ Success Checklist

When you complete a test improvement session:

- [ ] Coverage improved (target function + overall)
- [ ] All tests passing (`go test -short -v`)
- [ ] Execution time <1s
- [ ] Updated `tests/api/COVERAGE_REPORT.md` with new metrics
- [ ] Updated `docs-internal/COVERAGE_OPPORTUNITIES.md` iteration log
- [ ] Filled out session handoff template (optional but recommended)

---

## 🆘 If Stuck

**Can't decide what to test?**
→ Run: `go tool cover -func=coverage_unit.out | awk '$NF < 100.0'`  
→ Pick simplest pure function from list

**Tests won't compile?**
→ Check imports (fmt, models, assert)  
→ Review examples in `unit_test.go` lines 16-200

**Coverage not improving?**
→ Open `coverage_unit.html` in browser  
→ Focus tests on red (uncovered) lines

**Need help with test pattern?**
→ See `AGENT_WORKFLOW_TEST_COVERAGE.md` section 2.1  
→ Copy structure from existing tests

---

## 🎓 Workflow at a Glance

```
1. ANALYZE
   ↓
   Run coverage → Identify <100% functions → Pick pure functions
   
2. PLAN
   ↓
   List edge cases → Estimate effort → Create test structure
   
3. IMPLEMENT
   ↓
   Add 1-3 tests → Verify compilation → Run tests
   
4. VERIFY
   ↓
   Check coverage → All pass? → Update docs
   
5. ITERATE
   ↓
   More targets? → Return to step 1
```

---

## 💡 Pro Tips

✨ **Start small**: Add 1-3 tests at a time, verify each batch  
✨ **Use tables**: Table-driven tests make adding cases trivial  
✨ **Test nil**: Always test nil safety for pointer types  
✨ **Check HTML**: Visual coverage report shows exact missing lines  
✨ **Document as you go**: Don't leave documentation to the end

---

## 📞 Questions?

- Process questions → `AGENT_WORKFLOW_TEST_COVERAGE.md`
- Command help → `AGENT_QUICK_REFERENCE.md`
- Current state → `COVERAGE_OPPORTUNITIES.md`
- What to test → `COVERAGE_OPPORTUNITIES.md` Priority sections

---

**Ready to start?** Open `AGENT_QUICK_REFERENCE.md` and follow the 5-step process! 🚀
