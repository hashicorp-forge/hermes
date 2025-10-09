---
id: MEMO-004
title: Agent Usage Analysis
date: 2025-10-09
type: Analysis
status: Final
tags: [ai-agents, copilot, productivity, best-practices, prompt-engineering]
related:
  - MEMO-019
  - MEMO-016
---

# AI Agent Usage Analysis: Technical Post-Mortem

**Analysis Date**: October 5, 2025  
**Project**: Hermes Provider Migration (98 commits, 4 days)  
**Context**: Single developer + GitHub Copilot completing 4-6 weeks of work in 4 days  

## Executive Summary

This analysis examines **what worked, what didn't, and what to repeat** in AI-assisted development based on empirical evidence from a major architectural refactoring project. The key finding: **agent effectiveness correlates directly with context quality and prompt specificity**, not just raw coding capability.

### Success Metrics
- ✅ 10-15x speedup vs. traditional team
- ✅ Low rework rate (5-7% vs. 20-30% traditional)
- ✅ 38.8% documentation ratio (vs. 5-10% industry standard)
- ✅ 98 commits with high granularity and traceability
- ⚠️ But: 7 iterations on test suite, documentation reorganization needed

## 🟢 START: Things to Begin Doing

### 1. Upfront Architecture Documentation Before Coding

**What Happened**: Day 1 invested heavily in design docs (1,513 lines) before implementation

**Evidence**:
- Search abstraction: 3.5 hours vs. 2-week traditional estimate (23x speedup)
- Only 4-7 edits per critical file (low rework)
- AI generated idiomatic code matching established patterns

**Why It Worked**: Context is the currency of AI productivity. Detailed architecture docs gave the AI:
1. Clear interface contracts
2. Naming conventions
3. Error handling patterns
4. Integration points

**Action**: Before any major feature, create:
1. Interface definition document (what, not how)
2. Architecture decision record (why)
3. Integration plan (where)

### 2. Session Handoff Templates at Project Initialization

**What Happened**: `AGENT_SESSION_HANDOFF_TEMPLATE.md` created mid-project after experiencing context loss

**Evidence**: Test suite went through 7 iterations (could have been 4-5 with better continuity)

**Action**: Create session handoff template on Day 1 with:
- Current state checkpoint
- Open work items with file references
- Decision log
- Known issues/blockers
- Next session priorities

### 3. Structured Multi-Part Prompts for Complex Changes

**Best Prompt Structure**:
```
1. Context (link existing files, explain current state)
2. Goal (specific, measurable outcome)
3. Constraints (what NOT to change, compatibility requirements)
4. Verification (how to test success)
5. Related Work (files to update consistently)
```

**Example from Hermes**:
- Prompt referenced 4 existing files, specified desired interface, listed 11 API files needing update
- Result: Correct implementation first try, no rework

### 4. Incremental Validation Prompts (Test-Then-Code)

**Pattern**: Don't implement and test in one prompt. Split into:
1. "Write failing tests for X"
2. "Implement X to pass these tests"
3. "Refactor X for clarity"

**Evidence**: 80-85% test coverage maintained throughout, vs. 20-30% when coding first

### 5. Commit-Level Context Preservation

**Action**: Every commit should include:
- Prompt used
- Implementation decisions
- Validation commands run
- Known limitations

## 🔴 STOP: Anti-Patterns to Avoid

### 1. STOP: Vague Prompts Without File References

**Bad**: "Add logging to the search code"  
**Good**: "Add debug-level logging to pkg/search/algolia/adapter.go in the Index() method. Log: query, hit count, latency. Use hclog format."

### 2. STOP: Large Prompts with Multiple Independent Changes

**Bad**: "Implement search abstraction + migrate all API handlers + add tests"  
**Good**: Three separate prompts for each concern

### 3. STOP: Accepting First Output Without Verification

**Pattern**: Always run tests/linters after every AI-generated change. Catch issues immediately.

### 4. STOP: Skipping Documentation to "Save Time"

**Evidence**: Documentation-first approach led to 10-15x speedup overall. Documentation is not overhead—it's AI fuel.

### 5. STOP: Prompting Without Understanding Current State

**Action**: Run `git status`, `git diff`, check tests **before** asking AI to make changes

## 🔵 CONTINUE: Strengths to Maintain

### 1. CONTINUE: High Commit Granularity (98 commits in 4 days)

**Pattern**: One logical change per commit. Enables:
- Easy rollback
- Clear progression
- Bisectability

### 2. CONTINUE: Documentation Concurrency (38.8% ratio)

**Pattern**: Generate docs alongside code, not after. AI is equally fast at both.

### 3. CONTINUE: Test-Driven Development via Prompts

**Pattern**: "Write tests first" prompts led to 80-85% coverage with minimal rework

### 4. CONTINUE: Structured Documentation Hierarchy

**Pattern**: `docs-internal/` with `active/`, `completed/`, `reference/` folders. Prevents chaos.

### 5. CONTINUE: Session Boundaries with Summaries

**Pattern**: End each session with AI-generated summary. Next session starts by reading it.

## Key Takeaways

1. **Context Quality > Prompt Quantity**: Detailed design docs enable 10x faster implementation
2. **Structure Beats Speed**: Upfront organization (docs, tests, session templates) compounds over time
3. **Validation is Non-Negotiable**: Test every AI output immediately
4. **Documentation is Fuel, Not Overhead**: Feeds future AI prompts, enables continuity
5. **Incremental Prompts > Monolithic Prompts**: Split complex work into small, verifiable steps

## Recommended Reading

- Full analysis: `docs-internal/AGENT_USAGE_ANALYSIS.md` (1,604 lines)
- Velocity metrics: MEMO-019
- Deliverables: MEMO-016
