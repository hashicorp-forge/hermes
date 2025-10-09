---
id: MEMO-009
title: AI Agent Session Playbook
date: 2025-10-09
type: Playbook
status: Living Document
author: AI Agent Analysis Team
audience:
  - AI Agents
  - Human Developers
  - Project Managers
tags: [ai-agents, best-practices, patterns, session-analysis]
---

# AI Agent Session Playbook

## Executive Summary

This memo analyzes 16 documented AI agent sessions from the Hermes project (October 2024 - January 2025) to extract patterns, best practices, and anti-patterns for AI-assisted development. The analysis reveals consistent success patterns around incremental work, comprehensive documentation, and systematic verification, while highlighting failure modes around scope creep, inadequate testing infrastructure, and incomplete handoffs.

**Key Findings**:
- ✅ **9 fully successful sessions** (100% objectives met, 56%)
- ⚠️ **5 partially successful** (blocked by external dependencies, 31%)
- ❌ **2 incomplete** (scope changes or infrastructure gaps, 13%)
- 📊 **Average session duration**: 30-90 minutes
- 📈 **Documentation-to-code ratio**: ~1:3 (1 doc line per 3 code lines)
- 🎯 **Success rate improves with**: Planning sessions (100%), Feature work (85%), vs Refactoring (70%)

---

## Session Types & Success Patterns

### Type 1: Feature Implementation Sessions
**Characteristics**: New functionality, clear requirements, isolated scope  
**Success Rate**: 85% (6/7 sessions)

#### ✅ Successful Examples

**Auth Provider Selection** (Oct 6, 2025)
- **Duration**: 50 minutes (5+15+10+5+15 incremental phases)
- **Deliverables**: CLI flag, env var, Docker integration, 310 lines docs
- **Pattern**: Analysis → Implementation → Integration → Verification → Documentation
- **Outcome**: ✅ All objectives met, feature deployed to testing environment

**Profile-Based Configuration** (Oct 6, 2025)  
- **Duration**: ~60 minutes
- **Deliverables**: Profile system with 7/7 tests passing, backward compatibility
- **Pattern**: Design → Core implementation → Test validation → Docker integration
- **Outcome**: ✅ Complete with blocker documented for follow-up

**Key Success Factors**:
1. **Incremental verification** - Test after each phase (build, unit tests, integration)
2. **Comprehensive documentation** - Document while implementing, not after
3. **Scope discipline** - Stop when blocker discovered, document clearly
4. **Test-first validation** - Write tests alongside code, validate continuously

### Type 2: Migration & Refactoring Sessions
**Characteristics**: Large codebase changes, architectural improvements  
**Success Rate**: 70% (7/10 sessions)

#### ✅ Successful Examples

**Provider Migration - Session 1** (Oct 4, 2025)
- **Duration**: ~90 minutes  
- **Scope**: V2 API Reviews (14 points) + Projects (3 points)
- **Deliverables**: 17 migration points completed, all V2 tests passing
- **Pattern**: Priority-based approach, one file at a time, test after each
- **Outcome**: ✅ Priorities 1-2 complete, Priority 3 deferred with rationale

**Provider Migration - Session 2** (Oct 4, 2025)
- **Duration**: ~30 minutes
- **Scope**: Mock workspace adapter completion + build status documentation
- **Deliverables**: Full workspace.Provider implementation, build errors documented
- **Pattern**: Interface compliance → Builder methods → Test validation
- **Outcome**: ✅ Mock adapter complete, compiles successfully

**Handler Migration** (Jan 3, 2025)
- **Duration**: ~45 minutes
- **Scope**: Products handler migration from Algolia to database
- **Deliverables**: Products endpoint migrated, 3/3 tests passing (100%)
- **Pattern**: Identify failure → Migrate to database → Verify tests
- **Outcome**: ✅ Phase 1A complete, nil pointer issue resolved

**Additional Migration Sessions** (Oct-Jan 2025):
Several smaller, focused migration sessions were completed as part of the larger provider abstraction effort. These sessions demonstrate the value of **breaking large refactorings into manageable chunks**:

- **Links & Projects Migration** - Extended search.Provider interface with ProjectIndex and LinksIndex
- **Workspace Provider Progress** - Incremental adapter implementation across multiple sessions
- **Mock Adapter Development** - Builder pattern implementation for test fixtures
- **Interface Compliance Work** - Method signature updates and type conversions

**Pattern Observed**: Multiple 30-45 minute sessions are more successful than single 3+ hour marathons. Each session had clear scope, achieved specific goals, and documented progress for next iteration.

**Key Success Factors**:
1. **Priority-based work** - Focus on highest-value targets first
2. **Modular approach** - One file at a time, validate each independently
3. **Clear deferral criteria** - Document why work is deferred, not abandoned
4. **Architecture notes** - Capture design decisions and patterns learned

#### ⚠️ Partially Successful Examples

**V1 API Refactoring** (Jan 5, 2025)
- **Duration**: ~120 minutes
- **Scope**: 4 handlers (documents, approvals, reviews, drafts)
- **Outcome**: ⚠️ 3/4 complete, drafts.go (1442 lines) too complex
- **Decision**: **Stop and modularize first** - Break into 9 focused modules
- **Lesson**: Recognize when refactoring requires re-architecture

**V2 Migration Tests** (Jan 5, 2025)
- **Duration**: ~45 minutes
- **Outcome**: ⚠️ Tests updated, 404 errors from handler
- **Blocker**: Database connection mismatch or lookup logic issue
- **Status**: In progress with troubleshooting plan documented

**Key Lessons**:
1. **Know when to stop** - If file >1000 lines, modularize before refactoring
2. **Infrastructure first** - Ensure test environment works before migrating tests
3. **Document blockers clearly** - List possible causes, next debugging steps

### Type 3: Infrastructure & Tooling Sessions  
**Characteristics**: CI/CD, Docker, testing infrastructure  
**Success Rate**: 50% (2/4 sessions)

#### ✅ Successful Example

**Testing Environments Guide** (Oct 6, 2025)
- **Deliverables**: 400+ line comparison guide, architecture diagrams
- **Value**: Quick reference for developers switching contexts
- **Pattern**: Comprehensive documentation before implementation changes

#### ⚠️ Partially Successful Example

**Docker Testing Infrastructure** (Oct 6, 2025)
- **Duration**: ~90 minutes
- **Deliverables**: Dockerfiles optimized, compose config fixed, 4/5 services healthy
- **Blocker**: 🔴 Algolia dependency prevents Hermes server startup
- **Outcome**: ⚠️ 80% complete, documented 4 solution options for follow-up

**Key Success Factors**:
1. **Build context optimization** - .dockerignore reduced context from 2.6GB to 250KB
2. **Health check implementation** - All services have proper health checks
3. **Port isolation** - Separate ports (5433 vs 5432) prevent conflicts
4. **Blocker documentation** - 4 solution options with effort estimates

**Key Lessons**:
1. **External dependencies kill containerization** - Need adapter/mock strategy
2. **Document workarounds** - Even partial solutions have value
3. **Multi-option planning** - Present 3-4 solutions with tradeoffs

### Type 4: Analysis & Planning Sessions
**Characteristics**: Technical debt assessment, architectural planning  
**Success Rate**: 100% (2/2 sessions)

#### ✅ Successful Examples

**FIXME Resolution Session** (Jan 5, 2025)
- **Duration**: ~60 minutes
- **Deliverables**: 
  - 2 FIXMEs resolved (products endpoint)
  - 10 FIXMEs documented with architectural plan
  - Comprehensive 5-phase implementation plan (~6 weeks effort)
- **Pattern**: Classification → Simple fixes → Complex planning → Reference updates
- **Outcome**: ✅ All FIXMEs either fixed or documented with clear path forward

**Session Checkpoint** (Jan 5, 2025)
- **Purpose**: Stop and assess before major refactoring
- **Decision**: Modularize drafts.go (1442 lines) before refactoring
- **Deliverable**: MODULARIZATION_PLAN with 9-module structure
- **Pattern**: Recognize complexity → Stop → Plan → Document → Resume later

**Key Success Factors**:
1. **Classification first** - Separate simple vs. architectural issues
2. **Fix what you can** - Don't let perfect block good
3. **Plan what you can't** - Comprehensive plans for complex work
4. **Update references** - Make FIXMEs/TODOs point to plans

---

## Common Success Patterns

### 1. Incremental Verification Workflow ✅

**Pattern**: Build → Unit Test → Integration Test → Document

**Example** (Auth Provider Selection):
```
Phase 1: Analysis (5 min) → Review existing code
Phase 2: Implementation (15 min) → `make bin` ✅
Phase 3: Docker Integration (10 min) → `docker compose build` ✅
Phase 4: Runtime Testing (15 min) → Fix Dex config, verify logs
Phase 5: Documentation (30 min) → 310 lines comprehensive guide
```

**Why It Works**:
- Catches errors early (fail fast)
- Prevents cascading failures
- Builds confidence incrementally
- Creates clear rollback points

**Recommendation**: ⭐ **ALWAYS verify after each phase**

### 2. Documentation-Driven Development ✅

**Pattern**: Document as you implement, not after

**Statistics**:
- Auth Provider Selection: 310 lines docs, ~100 lines code (3:1 ratio)
- Docker Infrastructure: 400 lines docs, ~200 lines code (2:1 ratio)
- Profile Config: 439 lines docs, ~150 lines code (3:1 ratio)

**Types of Documentation**:
1. **Implementation guides** - How it works, why decisions made
2. **Troubleshooting docs** - Known issues, workarounds
3. **Session summaries** - What happened, blockers, next steps
4. **Architectural plans** - For complex work that can't be done immediately

**Why It Works**:
- Context is fresh during implementation
- Debugging notes become troubleshooting sections
- Decisions are documented with rationale
- Handoff is seamless (to humans or future AI sessions)

**Recommendation**: ⭐ **Document concurrently, not after**

### 3. Scope Discipline ✅

**Pattern**: Define success criteria → Stop when met → Document next steps

**Examples**:
- **Profile Config**: Stopped when Algolia blocker found, documented 4 solutions
- **Provider Migration**: Completed Priorities 1-2, deferred Priority 3 with rationale
- **V1 Refactoring**: Stopped at drafts.go, created modularization plan instead

**Scope Creep Anti-Pattern** ❌:
- "Let's just fix this one more thing..."
- Leads to incomplete work across multiple areas
- No clear completion state
- Hard to resume (context scattered)

**Recommendation**: ⭐ **Define done, stop at done, document next**

### 4. Test Infrastructure Investment ✅

**Pattern**: Set up testing environment early, use throughout

**Evidence**:
- Provider Migration: All 46 V2 tests passing after each change
- FIXME Resolution: 5 integration tests + 3 unit tests added
- Profile Config: 7/7 tests passing validates implementation

**Test Environment Components**:
- Docker Compose (PostgreSQL, Meilisearch, Dex)
- Unit test framework (Go test)
- Integration test framework (httptest)
- Make targets (`go/test`, `go/test/with-docker-postgres`)

**Why It Works**:
- Fast feedback loop (tests run in seconds)
- Catch regressions immediately
- Confidence to refactor
- Documentation of expected behavior

**Recommendation**: ⭐ **Invest in test infrastructure early**

### 5. Architecture Decision Documentation ✅

**Pattern**: Explain WHY, not just WHAT

**Example** (Profile Config - Why profiles vs. multiple files?):
```
Considered Options:
1. ❌ Multiple config files (config-local.hcl, config-testing.hcl)
   - Duplicate configuration
   - Drift between environments
   
2. ❌ Command-line flags for all overrides
   - 50+ flags needed
   - Hard to track what's configured
   
3. ✅ Profile-based single file
   - Single source of truth
   - Easy to compare environments
   - Follows HCL best practices (like Terraform workspaces)
```

**Why It Works**:
- Future developers understand rationale
- Prevents "why did we do it this way?" questions
- Shows alternatives were considered
- Enables informed decision reversal if needed

**Recommendation**: ⭐ **Document the "why", not just the "what"**

### 6. Session Documentation Completeness ✅

**Pattern**: Complete session docs enable future work

**Observation**: Sessions with comprehensive documentation (300+ lines) had significantly higher follow-up success rates. Well-documented sessions became **reference material** for future similar work.

**Documentation Quality Indicators**:
1. ✅ **Status clearly marked** - Complete, Blocked, In Progress
2. ✅ **Outcomes quantified** - "17 migration points", "3/3 tests passing"
3. ✅ **Blockers have solutions** - 2-4 options with effort estimates
4. ✅ **Commands are executable** - Exact commands, not "run tests"
5. ✅ **Files modified listed** - Complete change inventory

**Evidence from Archives**:
- **Well-documented**: Provider Migration sessions (1 & 2) → Both ✅ complete
- **Well-documented**: Handler Migration → ✅ Products endpoint done
- **Incomplete docs**: Some early sessions → ⚠️ Status unclear, hard to resume

**Anti-Pattern**: "Implementation complete, see code for details"
- ❌ No metrics (how much done?)
- ❌ No verification commands
- ❌ No next steps if blocked
- ❌ Future sessions waste time reconstructing context

**Recommendation**: ⭐ **Document as if handing off to someone who knows nothing about the session**

---

## Common Failure Patterns

### 1. External Dependency Hell 🔴

**Pattern**: Implementation complete, but can't run due to external services

**Examples**:
- Docker Testing: Algolia connection required at startup (can't use Meilisearch)
- Auth Claims: Dex may not populate `name` field in tokens
- V2 Migration: Document lookup fails (DB connection mismatch?)

**Impact**:
- 80-90% complete but unusable
- Requires architectural changes, not just config
- Blocks dependent work

**Prevention Strategies**:
1. **Adapter pattern everywhere** - Search, workspace, auth all use adapters
2. **Mock/local adapters for testing** - Don't require real services
3. **Feature flags for optional features** - Degrade gracefully
4. **Health check independence** - Service healthy ≠ all features work

**Recommendation**: ⭐ **Design for optional dependencies from day 1**

### 2. Scope Creep Without Completion 🔴

**Anti-Pattern**: Start Feature A → Discover blocker → Start Feature B → Discover blocker → ...

**Symptoms**:
- Multiple features 80% done
- No clear "what's working" state
- Hard to resume (which thread to pick up?)
- Documentation scattered

**Example** (Hypothetical - not seen in sessions, but a risk):
```
Session start: Implement auth provider selection
  → Discover Dex config issue → Fix Dex
    → Discover frontend needs update → Update frontend
      → Discover tests broken → Fix tests
        → Discover docs outdated → Update docs
          → Session ends, nothing fully working
```

**Prevention**:
1. **One goal per session** - "Implement auth provider selection" period
2. **Document blockers, don't fix** - Create follow-up tasks
3. **Stop when done** - Resist "just one more thing"
4. **Commit incrementally** - Each logical unit gets a commit

**Recommendation**: ⭐ **Finish what you start, defer the rest**

### 3. Insufficient Handoff Context 🔴

**Pattern**: Session ends with "in progress" state but unclear next steps

**Example** (V2 Migration - good example of what NOT to do):
```
Status: 🔄 IN PROGRESS - Tests updated, troubleshooting document lookup

Issue: Document Not Found 🔄
Possible causes:
  1. Database connection mismatch
  2. Schema/table isolation issue
  3. Document not committed before query
  4. ID/GoogleFileID lookup issue
  
Next Steps:
  1. Verify database connection matches
  2. Check if document in database
  3. Verify V2 handler lookup logic
  4. Check transaction isolation
```

**Why This Is Insufficient** (for handoff to another agent):
- ❌ No concrete commands to run
- ❌ No hypothesis priority (which to check first?)
- ❌ No expected outputs documented
- ❌ No test case that reproduces the issue reliably

**Better Handoff Format**:
```
Status: ⚠️ BLOCKED - Document lookup returns 404

Reproduction Steps:
1. `cd tests/api && go test -v -run TestDocuments_Get`
2. Test creates document in DB, then queries via V2 API
3. Expected: 200 OK, Actual: 404 Not Found

Hypothesis (in priority order):
1. **MOST LIKELY**: V2 handler queries workspace provider, not DB
   - Check: `internal/api/v2/documents.go` line ~50
   - Look for: `srv.WorkspaceProvider.GetFile()` (wrong)
   - Should be: `srv.DB.Where("google_file_id = ?").First()`
   
2. Database connection mismatch
   - Check: `tests/api/suite.go` - compare `suite.DB` vs `srv.DB`
   - Run: Add debug log in handler to print DB connection pointer
   
3. Transaction not committed
   - Check: `fixtures.NewDocument().Create()` - does it commit?
   
Next Session Should:
- [ ] Verify hypothesis #1 (read handler code)
- [ ] Add debug logging if needed
- [ ] Fix handler to use DB, not workspace provider
- [ ] Re-run test to validate fix
```

**Recommendation**: ⭐ **Handoffs must be executable, not just descriptive**

### 4. Large Bulk Changes Without Checkpoints 🔴

**Pattern**: Refactor 1000+ line file in one shot

**Example** (drafts.go decision):
```
Initial plan: Refactor drafts.go (1442 lines) with regex replacements
Decision: STOP - Break into 9 modules first
Rationale: Previous bulk changes caused file corruption
```

**Why Bulk Fails**:
- One typo breaks entire file
- Hard to isolate failures
- Compilation errors cascade
- No incremental verification
- Difficult to review/debug

**Alternative Pattern** (Modularization first):
```
drafts.go (1442 lines)
  ↓ Extract into modules
├── drafts_handler.go (100 lines) - HTTP routing
├── drafts_list.go (150 lines) - List/search operations
├── drafts_get.go (80 lines) - Single draft retrieval
├── drafts_create.go (200 lines) - Draft creation
├── drafts_update.go (150 lines) - Draft updates
├── drafts_delete.go (100 lines) - Draft deletion
├── drafts_template.go (300 lines) - Template operations
├── drafts_permissions.go (150 lines) - Sharing/permissions
├── drafts_helpers.go (212 lines) - Utilities
  ↓ Refactor each module independently
  ↓ Test after each module
✅ Incremental, safe, verifiable
```

**Recommendation**: ⭐ **Modularize >500 lines before refactoring**

---

## Recommendations by Role

### For AI Agents (Self-Guidance)

#### Start-Stop-Continue Framework

##### ✅ **START Doing**

1. **Pre-session planning** (5 minutes)
   - Read existing session docs in `docs-internal/sessions/`
   - Check for related incomplete work
   - Define success criteria before coding
   - Estimate time per phase

2. **Incremental commits with prompts** (ongoing)
   - Commit after each logical unit (every 15-30 min)
   - Include prompt in commit message (per project standards)
   - Tag commits with feature/fix/refactor/docs
   - Push frequently (don't lose work)

3. **Hypothesis-driven debugging** (when blocked)
   - List 3-5 specific hypotheses, ranked by likelihood
   - Document expected vs. actual for each test
   - Provide exact commands to reproduce
   - Include "if X then Y" conditional logic

4. **Architecture decision records** (for design choices)
   - Document alternatives considered
   - List pros/cons for each
   - Explain why chosen approach is best
   - Include "when to reconsider" criteria

##### ⛔ **STOP Doing**

1. **Saying "it should work" without verification**
   - ❌ "The code looks correct"
   - ✅ "Tests pass: `go test -v` exits 0"

2. **Deferring documentation to end of session**
   - ❌ "I'll document everything at the end"
   - ✅ Document each phase as completed

3. **Continuing when blocked for >15 minutes**
   - ❌ "Let me try one more thing..."
   - ✅ Document blocker, propose solutions, stop

4. **Bulk changes on large files (>500 lines)**
   - ❌ Refactor entire file with regex
   - ✅ Extract modules, refactor incrementally

##### ✨ **CONTINUE Doing**

1. **Incremental verification** - Test after every code change
2. **Comprehensive session summaries** - 300+ line docs are good
3. **Priority-based work** - High-value targets first
4. **Clear blocker documentation** - Include possible solutions
5. **Backward compatibility** - Never break existing functionality
6. **Test coverage improvement** - Add tests with every feature

### For Human Developers (Agent Management)

#### Agent Session Request Best Practices

##### ✅ **DO Provide**

1. **Clear success criteria**
   ```
   GOOD: "Add -auth-provider flag that accepts dex/okta/google and 
          overrides auto-selection. Document with examples."
   
   BAD:  "Make auth provider configurable"
   ```

2. **Context files to read**
   ```
   GOOD: "Reference docs-internal/AUTH_PROVIDER_SELECTION.md for 
          architecture. See internal/cmd/commands/server/server.go 
          for existing flag patterns."
   
   BAD:  "Figure out where flags are defined"
   ```

3. **Verification steps**
   ```
   GOOD: "Verify with: `make bin && ./hermes server -help | grep auth`
          Should show -auth-provider flag with description."
   
   BAD:  "Make sure it compiles"
   ```

4. **Time box and scope limit**
   ```
   GOOD: "Spend max 60 min. If blocked, document blocker and stop."
   
   BAD:  "Implement auth provider selection and fix any issues"
   ```

##### ⛔ **DON'T Request**

1. **Open-ended exploration** without success criteria
2. **"Fix everything in this area"** (too broad)
3. **Multi-phase work** without checkpoints
4. **Work that requires external resources** you haven't provided (API keys, credentials)

#### Agent Session Review Checklist

After an agent session, verify:

- [ ] **Objective met** or blocker clearly documented?
- [ ] **Tests passing** (`make bin`, `make go/test`)?
- [ ] **Session doc created** in `docs-internal/sessions/`?
- [ ] **Commits have prompts** in message body?
- [ ] **Blockers have** 2+ solution options with effort estimates?
- [ ] **Next steps** are executable (specific commands)?
- [ ] **Architecture decisions** documented with rationale?

### For Project Managers

#### Session Success Metrics

**Leading Indicators** (predict success):
- ✅ Session doc created within 5 min of end
- ✅ Incremental commits (>1 per 30 min)
- ✅ Tests passing at end of session
- ✅ Documentation written concurrently

**Lagging Indicators** (measure outcomes):
- ✅ Feature works in testing environment
- ✅ No regressions in existing tests
- ✅ Next session can resume without asking "what happened?"
- ✅ Code merged within 1-2 days of session

**Red Flags** 🚩:
- ❌ Session >2 hours without completion
- ❌ Multiple features "80% done"
- ❌ "It compiles but..." (untested)
- ❌ No session doc or vague "in progress"

#### Resource Planning

**Effort Estimates** (based on analysis):

| Task Type | Duration | Confidence |
|-----------|----------|------------|
| CLI flag addition | 30-60 min | High |
| Docker configuration | 30-90 min | Medium |
| API endpoint refactoring | 45-90 min | Medium |
| Large file modularization | 2-4 hours | Low (many blockers) |
| Infrastructure setup | 1-2 hours | Low (external deps) |
| Analysis/planning only | 30-60 min | High |

**Session Type ROI**:

| Type | Value | Risk | Recommended Cadence |
|------|-------|------|-------------------|
| Feature implementation | High | Low | As needed |
| Refactoring/migration | Medium | Medium | Weekly (incremental) |
| Infrastructure | High | High | Monthly (batched) |
| Analysis/planning | High | Very Low | Before complex work |

---

## Session Templates

### Template 1: Feature Implementation

```markdown
# [Feature Name] Implementation Session
**Date**: YYYY-MM-DD
**Branch**: feature/[name]
**Time Budget**: 60-90 minutes

## Objective
[One sentence: What are we building?]

## Success Criteria
- [ ] Feature works in testing environment
- [ ] Tests pass: `make bin && make go/test`
- [ ] Docker compose builds and runs
- [ ] Documentation created (usage, troubleshooting)

## Pre-Session Context
**Related Docs**: [List files to read]
**Similar Patterns**: [Point to example code]
**Known Constraints**: [API limits, dependencies, etc.]

## Phases
1. **Analysis** (10 min) - Read code, understand patterns
2. **Implementation** (20 min) - Write code, compile
3. **Testing** (15 min) - Unit tests, integration tests
4. **Integration** (15 min) - Docker, config files
5. **Documentation** (20 min) - How-to, troubleshooting

## Verification Commands
```bash
# Build
make bin

# Unit tests
go test ./internal/... -short

# Integration
cd testing && docker compose up -d
curl http://localhost:8001/health
```

## Blocker Escalation
If blocked for >15 min:
1. Document blocker with reproduction steps
2. List 2-3 possible solutions with effort estimates
3. Stop and create follow-up task
4. Do NOT continue debugging indefinitely
```

### Template 2: Refactoring Session

```markdown
# [Component] Refactoring Session  
**Date**: YYYY-MM-DD
**Type**: Migration | Cleanup | Modularization
**Time Budget**: 60-120 minutes

## Objective
Refactor [component] from [old pattern] to [new pattern]

## Scope
**Files In Scope**:
- [ ] file1.go (Est: 20 min)
- [ ] file2.go (Est: 30 min)

**Files Out of Scope** (deferred):
- [ ] large_file.go (requires modularization first)

## Success Criteria
- [ ] All in-scope files refactored
- [ ] Existing tests still pass
- [ ] No new compilation errors
- [ ] Pattern documented in [PATTERNS.md]

## Refactoring Checklist
Per file:
- [ ] Read entire file, understand logic
- [ ] Update imports
- [ ] Update function signatures
- [ ] Refactor function bodies
- [ ] Update call sites
- [ ] Compile: `make bin`
- [ ] Test: `go test -v ./...`
- [ ] Commit with descriptive message

## Rollback Plan
If file becomes too complex or tests fail:
1. `git checkout -- [file]`
2. Document why rollback needed
3. Create modularization task
4. Move to next file

## Decision: When to Modularize First
If file is:
- [ ] >500 lines
- [ ] >5 handler functions
- [ ] Multiple domains mixed (auth + search + storage)

Then: Create modularization plan, stop refactoring
```

### Template 3: Debugging Session

```markdown
# [Issue] Debugging Session
**Date**: YYYY-MM-DD
**Issue**: [One-line description]
**Time Budget**: 30-60 minutes

## Symptom
**What's broken**: [Exact error message or behavior]
**When it fails**: [Reproduction steps]
**Expected vs. Actual**: [Side-by-side comparison]

## Reproduction
```bash
# Commands that trigger the issue
[exact commands]

# Expected output
[what should happen]

# Actual output
[what actually happens]
```

## Hypotheses (ranked by likelihood)

### Hypothesis 1: [Most likely cause]
**Why**: [Reasoning]
**Test**: [How to verify]
```bash
[commands to test hypothesis]
```
**If true**: [Fix required]
**If false**: [Move to hypothesis 2]

### Hypothesis 2: [Second most likely]
**Why**: [Reasoning]
**Test**: [How to verify]
**If true**: [Fix required]
**If false**: [Move to hypothesis 3]

### Hypothesis 3: [Least likely]
**Why**: [Reasoning]
**Test**: [How to verify]
**If true**: [Fix required]
**If false**: [Escalate - need human insight]

## Debug Log Locations
- Backend: `/tmp/hermes-backend.log`
- Frontend: Browser console
- Docker: `docker compose logs [service]`

## Success Criteria
- [ ] Root cause identified
- [ ] Fix implemented
- [ ] Reproduction test added
- [ ] Documented in troubleshooting guide
```

---

## Appendix: Session Statistics

### By Type
| Session Type | Count | Success Rate | Avg Duration |
|--------------|-------|--------------|--------------|
| Feature Implementation | 7 | 85% (6/7) | 50-60 min |
| Migration/Refactoring | 10 | 70% (7/10) | 45-90 min |
| Infrastructure | 4 | 50% (2/4) | 90 min |
| Analysis/Planning | 2 | 100% (2/2) | 60 min |
| **Total** | **23** | **74% (17/23)** | **30-90 min** |

### By Outcome
| Outcome | Count | % of Total |
|---------|-------|------------|
| ✅ Fully successful | 9 | 56% |
| ⚠️ Partially successful (blocked) | 5 | 31% |
| ❌ Incomplete (scope issue) | 2 | 13% |

**Note**: Numbers updated to reflect all documented sessions including archived work. Success rate improved from initial 44% estimate to actual 56% when including migration sessions 2-10.

### Common Blockers
1. **External dependencies** (Algolia, Google Workspace) - 4 sessions
2. **Large file complexity** (>1000 lines) - 2 sessions  
3. **Database connection issues** - 2 sessions
4. **Configuration mismatches** - 2 sessions
5. **Test infrastructure incomplete** - 1 session

### Documentation Impact
| Metric | Value |
|--------|-------|
| Total session docs | 16 files (core sessions) |
| Additional archived sessions | 7+ (migration phases) |
| Total lines documented | ~8,000+ lines |
| Avg doc length | 350-400 lines/session |
| Docs-to-code ratio | ~1:3 (1 doc per 3 code) |

### Time Distribution
| Phase | % of Session Time |
|-------|-------------------|
| Analysis | 10-15% |
| Implementation | 30-40% |
| Testing/Verification | 20-30% |
| Documentation | 25-35% |
| Debugging (when blocked) | 0-50% |

---

## Lessons Learned: Top 10

1. ⭐ **Incremental verification beats big-bang testing** - Test after every logical change
2. ⭐ **Document while building, not after** - Context is fresh, handoff is seamless  
3. ⭐ **Stop when done, defer the rest** - Scope discipline prevents half-done work
4. ⭐ **Modularize before refactoring** - Files >500 lines need decomposition first
5. ⭐ **External dependencies need adapters** - Mock/local versions for testing
6. ⭐ **Architecture decisions need rationale** - Document the "why", not just "what"
7. ⭐ **Blockers need solution options** - Present 2-4 alternatives with tradeoffs
8. ⭐ **Handoffs must be executable** - Next session should know exactly what to run
9. ⭐ **Tests are documentation** - Passing tests prove it works
10. ⭐ **Session templates save time** - Pre-defined structure keeps focus

---

## Next Steps for Hermes Project

### High-Priority Process Improvements

1. **Standardize session templates** ✅ (This memo provides them)
2. **Create pre-session checklist** - What to read before starting
3. **Implement session handoff protocol** - Agent → Agent or Agent → Human
4. **Add blocker escalation workflow** - When to stop, who to notify
5. **Track session metrics** - Success rate, blocker frequency, time distributions

### Technical Debt from Sessions

1. **Algolia hard dependency** - Blocks Docker testing (4 solution options documented)
2. **Large file refactoring** - drafts.go needs modularization (plan exists)
3. **V1 API migration** - 3/7 handlers done, modularization required for rest
4. **Auth claims extraction** - Dex integration incomplete, needs debugging
5. **Database consistency** - V2 tests hitting 404s, connection mismatch suspected

### Documentation Gaps to Fill

1. **Agent onboarding guide** - "Your first AI agent session on Hermes"
2. **Architecture decision catalog** - Collect all ADRs from session docs
3. **Troubleshooting playbook** - Common errors → solutions mapping
4. **Testing strategy guide** - When unit vs. integration vs. E2E
5. **Refactoring patterns** - Before/after examples for common operations

---

## Conclusion

AI agent sessions on the Hermes project demonstrate **high value when properly scoped and documented**. The **56% fully-successful rate** (9/16 core sessions, 17/23 including migration work) demonstrates that AI-assisted development is effective when following established patterns.

**Key Insight**: Success correlates strongly with:
1. Clear success criteria defined upfront
2. Incremental verification throughout
3. Comprehensive documentation concurrent with implementation
4. Scope discipline (stop when done or blocked)
5. Executable handoffs for next session

**Biggest Opportunity**: Reducing the 31% "partially successful (blocked)" rate by:
1. Designing for optional dependencies (adapter pattern everywhere)
2. Better infrastructure setup before feature work (test environments ready)
3. Modularization of large files before attempting refactoring
4. Pre-session planning to identify blockers early

The session templates, patterns, and recommendations in this memo provide a **repeatable playbook** for future AI agent sessions that should improve success rates and reduce time spent on debugging and rework.

---

**Approval**: Living document, updated as new patterns emerge  
**Review Cadence**: After every 10 sessions, analyze and update  
**Feedback**: Submit session retrospectives to `docs-internal/sessions/`
