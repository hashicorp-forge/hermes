# AI Agent Prompt Templates for Software Projects
## Proven Patterns from Hermes Provider Migration (October 2025)

**Source**: 98 commits over 4 days, 10-15x productivity gain  
**Context**: Single developer + GitHub Copilot completing 4-6 weeks of team work  
**Purpose**: Reusable prompt templates for AI-assisted development

---

## 📋 Table of Contents

1. [Project Initialization Prompts](#project-initialization-prompts)
2. [Design & Architecture Prompts](#design--architecture-prompts)
3. [Implementation Prompts](#implementation-prompts)
4. [Testing Prompts](#testing-prompts)
5. [Documentation Prompts](#documentation-prompts)
6. [Refactoring Prompts](#refactoring-prompts)
7. [Session Management Prompts](#session-management-prompts)
8. [Git & Commit Prompts](#git--commit-prompts)

---

## Project Initialization Prompts

### 1. Extract Existing Code Patterns

```markdown
Analyze the existing codebase to extract patterns I should follow for new code.

**Files to analyze**: [list 3-5 representative files from similar features]

**Extract and document**:
1. **Naming Conventions**:
   - Interfaces: [pattern] (e.g., `FooProvider`, `BarService`)
   - Constructors: [pattern] (e.g., `NewFoo()`, `CreateBar()`)
   - Error variables: [pattern] (e.g., `ErrNotFound`, `ErrInvalidInput`)
   - Test functions: [pattern] (e.g., `TestFoo`, `Test_foo_whenCondition`)

2. **Error Handling Pattern**:
   ```go
   // Show actual example from codebase
   ```

3. **Testing Structure**:
   ```go
   // Show actual test structure from codebase
   ```

4. **Documentation Style**:
   ```go
   // Show godoc example from codebase
   ```

5. **Package Organization**:
   - Where do interfaces go? [path]
   - Where do implementations go? [path]
   - Where do tests go? [path]

Save output as: `docs-internal/design/EXISTING_PATTERNS.md`

Include **5 concrete code examples** for each pattern.
```

**Real Example from Hermes**:
```
Analyze pkg/search/adapters/algolia/ and pkg/workspace/adapters/google/ 

Extract:
- Interface naming: `[Noun]Provider` (SearchProvider, WorkspaceProvider)
- Constructor: `New[Type]Adapter(config)` returns (Adapter, error)
- Error wrapping: `fmt.Errorf("operation failed: %w", err)`
- Test structure: Table-driven tests with t.Run() subtests
```

---

### 2. Create Documentation Structure

```markdown
Create a documentation structure for this project following best practices.

**Project**: [project name]
**Estimated duration**: [X weeks/months]
**Team size**: [N developers + AI agents]

**Create this folder structure**:
```
docs-internal/
├── design/              # Architecture decisions and designs
├── in-progress/         # Active work documentation
├── completed/           # Finished work archives
├── testing/             # Test strategies and patterns
├── sessions/            # Daily session notes
├── todos/               # Future work planning
└── README.md            # Navigation hub
```

**For each folder, create a README.md** with:
- Purpose of this folder
- What types of docs belong here
- Naming conventions for files
- When to move docs between folders

**Main README.md should include**:
- Quick navigation by role (Developer, AI Agent, PM)
- Metrics dashboard (blank initially, will fill)
- Getting started commands
- Link to most important docs

Save output as executable bash script: `setup_docs.sh`
```

**Real Example from Hermes**:
Created 6-folder structure on Day 4 after realizing flat structure was unmaintainable. **Better to create upfront.**

---

### 3. Create Session Handoff Template

```markdown
Create a session handoff template for AI agents to resume work effectively.

**Requirements**:
- Must enable new session to start in <15 minutes
- Must capture decisions made, not just actions taken
- Must include specific next steps (not vague "continue work")

**Template should include**:
1. Current state section (last commit, active files, current focus)
2. Decisions made table (decision | rationale | date | alternatives rejected)
3. Active patterns being used (naming, error handling, testing)
4. Next session checklist (3-5 specific tasks with time estimates)
5. Known issues / warnings section

Save as: `docs-internal/SESSION_HANDOFF.md`

**Include example entries** showing how to fill each section.
```

**Real Example Template**:
```markdown
# Session Handoff

## Current State (Updated: 2025-10-03)
- **Last Commit**: 3f64102 - refactor(api/v2): use workspace provider
- **Active Files**: internal/api/v2/drafts.go, internal/api/v2/documents.go
- **Current Focus**: Migrating V2 API handlers to workspace.Provider

## Decisions Made
| Decision | Rationale | Date | Alternatives Rejected |
|----------|-----------|------|----------------------|
| Use Provider pattern | Enables multi-backend support | Oct 2 | Direct injection (tight coupling) |
| Phase V2 before V1 | Lower risk, learning phase | Oct 3 | All at once (high risk) |

## Active Patterns
- **Interface naming**: `workspace.Provider`, `search.Provider`
- **Error handling**: Wrap with context: `fmt.Errorf("migrating drafts: %w", err)`
- **Testing**: Mock adapters for unit, testcontainers for integration

## Next Session: Start Here
1. [ ] Complete internal/api/v2/drafts.go migration (~2 hours)
   - Replace gw.Service calls with workspace.Provider
   - Update error handling to use wrapped errors
   - Verify tests pass: `cd tests/api && go test -run TestV2Drafts`
2. [ ] Migrate internal/api/v2/documents.go (~1.5 hours)
   - Same pattern as drafts.go
3. [ ] Update test fixtures (~30 min)
   - Add workspace.Provider mock to suite.go

## Known Issues / Warnings
- drafts.go has 1442 lines - needs modularization before refactoring
- Some V1 endpoints return 501 until fully migrated
```

---

## Design & Architecture Prompts

### 4. Create Architecture Design Document

```markdown
Design the architecture for [FEATURE_NAME] before writing any code.

**Problem Statement**:
[Describe what you're trying to solve in 2-3 sentences]

**Requirements**:
- Functional: [list 3-5 must-haves]
- Non-functional: [list 2-3 quality attributes like performance, scalability]

**Create design document with**:

1. **Interface Definitions**:
   ```go
   // Show proposed interfaces with method signatures
   // Include godoc comments explaining each method
   ```

2. **Integration Points**:
   - Files that will be modified: [list with brief description]
   - New files to create: [list with brief description]
   - Dependencies to add: [list packages]

3. **Migration Strategy** (if refactoring):
   - Phase 1: [description with affected files]
   - Phase 2: [description with affected files]
   - Rollback plan: [how to revert if needed]

4. **Alternatives Considered**:
   | Approach | Pros | Cons | Why Rejected |
   |----------|------|------|--------------|
   | [Option A] | [pros] | [cons] | [reason] |
   | [Option B] | [pros] | [cons] | [reason] |

5. **Trade-offs**:
   - Performance vs. [X]: [decision and justification]
   - Complexity vs. [Y]: [decision and justification]

6. **Success Criteria**:
   - How will we measure success?
   - What metrics will improve?
   - What should stay the same (backward compatibility)?

7. **Timeline Estimate**:
   - Design: [X hours]
   - Implementation: [Y hours]
   - Testing: [Z hours]
   - Total: [T hours]

Save as: `docs-internal/design/[FEATURE_NAME]_DESIGN.md`

Include **code examples** from existing codebase following established patterns.
```

**Real Example from Hermes** (Search Abstraction):
```markdown
Design search abstraction layer to support multiple search backends.

Problem: Direct Algolia coupling in 15+ API handlers prevents using Meilisearch.

Interfaces:
```go
type Provider interface {
    DraftsIndex() DraftsIndex
    DocumentsIndex() DocumentsIndex
    // ... other indexes
}

type DraftsIndex interface {
    Search(ctx context.Context, query string, opts SearchOptions) ([]Document, error)
    Index(ctx context.Context, doc Document) error
}
```

Integration: Modify internal/api/*.go to accept search.Provider instead of algolia.Client

Phases:
1. Create pkg/search/ with interfaces and Algolia adapter (Day 2)
2. Add Meilisearch adapter with tests (Day 2)
3. Migrate V2 API handlers (Day 3)
4. Migrate V1 API handlers (Day 4)

Alternatives rejected:
- Adapter pattern per handler (too much duplication)
- Feature flags for Algolia/Meilisearch (complex conditional logic)

Trade-offs: Added abstraction layer (complexity) for backend flexibility (value)
```

---

### 5. Define Test Strategy Before Implementation

```markdown
Define the test strategy for [FEATURE_NAME] before writing any code.

**Feature**: [brief description]
**Estimated code size**: [X lines]

**Define testing approach**:

1. **Unit Testing Strategy**:
   - What to mock: [list dependencies]
   - What to use real: [list components]
   - Test fixtures approach: [builders / factories / plain structs]
   - Target coverage: [X%]

2. **Integration Testing Strategy**:
   - What external services: [list: database, search, etc.]
   - How to run them: [testcontainers / docker-compose / fakes]
   - Resource sharing: [shared container / per-test isolation]
   - Why this approach: [performance / accuracy trade-off]

3. **Test Structure Pattern**:
   ```go
   func TestFeature(t *testing.T) {
       // Show exact structure to follow
       // Include table-driven test example if applicable
   }
   ```

4. **Performance Targets**:
   - Unit tests: All tests should complete in [X seconds]
   - Integration tests: Should complete in [Y seconds]
   - If slower, what optimizations: [list]

5. **Test Data Strategy**:
   - Fixtures location: [path]
   - Factory functions: [list with signatures]
   - Test database: [empty / seeded / per-test setup]

6. **Success Criteria**:
   - [ ] All tests pass
   - [ ] Coverage >= [X%]
   - [ ] Test suite runs in < [Y seconds]
   - [ ] No flaky tests (run 10x, all pass)

Save as: `docs-internal/testing/[FEATURE_NAME]_TEST_STRATEGY.md`

**Reference existing test patterns** from: [list similar test files]
```

**Real Example from Hermes**:
```markdown
Test strategy for search abstraction layer.

Unit Testing:
- Mock external Algolia/Meilisearch APIs
- Test adapter logic (query building, error handling)
- Target: 80% coverage on adapter code

Integration Testing:
- Real Meilisearch via testcontainers
- Shared container per test package (startup time: 2-3s once)
- Transactions for database isolation
- Target: <30s for full suite

Structure:
```go
func TestMeilisearchAdapter_Search(t *testing.T) {
    suite := setupIntegrationSuite(t)
    defer suite.Cleanup()
    
    tests := []struct{
        name string
        query string
        want []Document
    }{
        // test cases
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // test implementation
        })
    }
}
```

Performance:
- Unit: <1s for all adapters
- Integration: <30s with parallelization
```

---

## Implementation Prompts

### 6. Implement Feature Following TDD

```markdown
Implement [FEATURE_NAME] using test-driven development.

**Design document**: [path to design doc]
**Test strategy**: [path to test strategy]
**Patterns to follow**: [path to patterns doc]

**Process**:

**STEP 1: Interface First**
Create the interface definitions:
- Location: [package path]
- Follow naming pattern: [from patterns doc]
- Include godoc comments explaining purpose and usage
- List all error conditions in godoc

**STEP 2: Tests Second**
Write tests BEFORE implementation:
- Unit tests in [file path]
- Follow test structure from: [test strategy doc]
- Test cases to cover:
  * Happy path (valid inputs)
  * Error conditions (invalid inputs, external failures)
  * Edge cases (empty, nil, boundary values)
- Use test fixtures from: [fixtures location]

**STEP 3: Mock Implementation** (if needed)
Create mock for interface:
- Location: [path]/mock/
- Purpose: Allow other code to test against this interface
- Validate that interface design is usable

**STEP 4: Real Implementation**
Implement the interface:
- Location: [package path]
- Follow patterns from: [patterns doc]
- Make the tests pass
- Add godoc comments with usage examples

**STEP 5: Integration Tests** (if applicable)
Add end-to-end tests:
- Use real dependencies (testcontainers)
- Test actual behavior, not mocks
- Verify performance expectations

**STEP 6: Verification**
Before committing:
```bash
# Build
make bin

# Run tests
go test ./[package]/...

# Check coverage
go test -coverprofile=coverage.out ./[package]/...
go tool cover -func=coverage.out

# Verify no regressions
make test
```

**Commit after each step** with descriptive message following pattern:
- Step 1-2: `feat: add [feature] interfaces and tests`
- Step 3: `feat: add mock [feature] for testing`
- Step 4: `feat: implement [feature]`
- Step 5: `test: add [feature] integration tests`
```

**Real Example from Hermes** (Meilisearch Adapter):
```
Implement Meilisearch adapter for search.Provider interface.

STEP 1: Interface already defined in pkg/search/search.go
STEP 2: Create pkg/search/adapters/meilisearch/adapter_test.go
  - TestMeilisearchAdapter_Search (5 test cases)
  - TestMeilisearchAdapter_Index (3 test cases)
  - TestMeilisearchAdapter_Delete (2 test cases)

STEP 3: Skip (no mock needed for adapter)

STEP 4: Implement pkg/search/adapters/meilisearch/adapter.go
  - 528 lines implementing search.Provider
  - Follows error wrapping pattern: fmt.Errorf("searching drafts: %w", err)
  - Includes retry logic for eventual consistency

STEP 5: Add tests/integration/search/meilisearch_adapter_test.go
  - Real Meilisearch container via testcontainers
  - Test actual search behavior with indexing delays
  - 327 lines of integration tests

Verification:
go test -v ./pkg/search/adapters/meilisearch/...  # Unit tests
go test -v ./tests/integration/search/...         # Integration tests
Coverage: 85% (target: 80%)
```

---

### 7. Refactor Large File into Modules

```markdown
Refactor [FILE_NAME] ([CURRENT_LINES] lines) into smaller, focused modules.

**Current file**: [path] ([N] lines)
**Problem**: [why it needs refactoring]
**Goal**: Break into [X] modules, each < [Y] lines

**Analysis**:

1. **Identify logical modules**:
   Analyze [FILE_NAME] and group functions by responsibility:
   ```
   Module 1: [Name] - [Functions list] - [Estimated lines]
   Module 2: [Name] - [Functions list] - [Estimated lines]
   ...
   ```

2. **Determine dependencies**:
   Create dependency graph showing which modules depend on others:
   ```
   [Module A] → [Module B]
   [Module B] → [Module C]
   [Module D] → [Module B]
   ```
   
   Extraction order (least dependencies first):
   1. [Module with no dependencies]
   2. [Module depending only on extracted modules]
   ...

3. **Create extraction plan**:
   
   **Phase 1: Setup** (~30 min)
   - [ ] Create package structure: [package path]
   - [ ] Create types.go with shared types
   - [ ] Commit: `refactor: create [package] structure`

   **Phase 2: Extract Module 1** (~X hours)
   - [ ] Create [package]/[module1].go
   - [ ] Copy functions: [list]
   - [ ] Update imports in original file
   - [ ] Create [package]/[module1]_test.go with [N] test cases
   - [ ] Verify: `go test ./[package]/...`
   - [ ] Commit: `refactor: extract [module1] from [file]`

   [Repeat for each module]

   **Phase 3: Integration** (~1 hour)
   - [ ] Update [original file] to use new modules
   - [ ] Verify all tests pass: `make test`
   - [ ] Check coverage: `make coverage`
   - [ ] Commit: `refactor: integrate modularized [package]`

   **Phase 4: Cleanup** (~30 min)
   - [ ] Remove old code from [original file]
   - [ ] Update documentation
   - [ ] Commit: `refactor: remove old [file] implementation`

4. **Rollback plan**:
   If any step fails:
   ```bash
   git reset --hard [last-good-commit]
   ```
   Each phase is independently revertible.

5. **Timeline**:
   - Total estimated: [X] hours over [Y] days
   - Safe stopping points: After each phase completion

Save plan as: `docs-internal/design/[FILE]_MODULARIZATION_PLAN.md`

**Execute incrementally**, commit after each successful extraction.
```

**Real Example from Hermes** (drafts.go modularization):
```markdown
Refactor internal/api/drafts.go (1442 lines) into modules.

Modules identified:
1. Types - 50 lines (request/response structs)
2. Validation - 120 lines (input validation helpers)
3. Permissions - 180 lines (ownership, collaboration checks)
4. Search - 200 lines (Algolia search operations)
5. CRUD - 400 lines (create, read, update, delete)
6. Lifecycle - 300 lines (publish, unpublish, archive)
7. Integration - 192 lines (remaining glue code)

Dependency graph:
Types → all others
Validation → CRUD, Lifecycle
Permissions → CRUD, Lifecycle
Search → CRUD

Extraction order:
1. Types (no dependencies)
2. Validation (depends only on Types)
3. Permissions (depends on Types)
4. Search (depends on Types)
5. CRUD (depends on Types, Validation, Permissions, Search)
6. Lifecycle (depends on Types, CRUD)

Timeline: 8-9 hours over 2-3 days
Each module ~1-1.5 hours to extract + test
```

---

## Testing Prompts

### 8. Generate Comprehensive Tests for Existing Code

```markdown
Generate comprehensive test coverage for [FUNCTION/MODULE].

**Target**: [package path]
**Current coverage**: [X%]
**Target coverage**: [Y%]

**Analysis**:

1. **Identify untested code**:
   ```bash
   go test -coverprofile=coverage.out ./[package]/...
   go tool cover -func=coverage.out | grep -E ":[0-9]+.*0\.0%"
   ```
   
   List functions with 0% coverage:
   - [Function 1] - [complexity: low/medium/high]
   - [Function 2] - [complexity: low/medium/high]
   ...

2. **Prioritize by impact**:
   High priority (critical path, used frequently):
   - [Function A]
   - [Function B]
   
   Medium priority (important but less frequent):
   - [Function C]
   
   Low priority (edge cases, rarely used):
   - [Function D]

3. **Generate tests**:
   
   For each high-priority function, create:
   
   **Test file**: [package]/[file]_test.go
   
   ```go
   func Test[FunctionName](t *testing.T) {
       tests := []struct {
           name    string
           input   [type]
           want    [type]
           wantErr bool
       }{
           {
               name: "happy path - valid input",
               input: [example],
               want: [expected],
               wantErr: false,
           },
           {
               name: "error case - nil input",
               input: nil,
               wantErr: true,
           },
           {
               name: "edge case - empty input",
               input: [empty example],
               want: [expected for empty],
               wantErr: false,
           },
           // Add more cases to cover all branches
       }
       
       for _, tt := range tests {
           t.Run(tt.name, func(t *testing.T) {
               got, err := [FunctionName](tt.input)
               if (err != nil) != tt.wantErr {
                   t.Errorf("got error = %v, wantErr = %v", err, tt.wantErr)
                   return
               }
               if !reflect.DeepEqual(got, tt.want) {
                   t.Errorf("got = %v, want = %v", got, tt.want)
               }
           })
       }
   }
   ```

4. **Verification**:
   After generating tests:
   ```bash
   # Run new tests
   go test -v ./[package]/ -run Test[FunctionName]
   
   # Check coverage improvement
   go test -coverprofile=coverage.out ./[package]/...
   go tool cover -func=coverage.out
   
   # Expected: [old X%] → [new Y%]
   ```

5. **Commit**:
   ```bash
   git add [test files]
   git commit -m "test: add comprehensive tests for [module]
   
   - Test[Function1]: [N] test cases covering [scenarios]
   - Test[Function2]: [M] test cases covering [scenarios]
   - Coverage: [X%] → [Y%] (+[Z]pp)"
   ```

Generate tests for **high-priority functions first**, verify coverage improvement, then commit.
```

**Real Example from Hermes**:
```markdown
Generate tests for tests/api/suite.go helper functions.

Current coverage: 8.5%
Target: 15%

Untested functions (go tool cover analysis):
- suite.DoGET() - 0% coverage (high priority - used in 20+ tests)
- suite.DoPOST() - 0% coverage (high priority - used in 15+ tests)
- suite.DoPUT() - 0% coverage (high priority - used in 10+ tests)
- suite.AssertStatusOK() - 0% coverage (medium priority)
- buildRequestURL() - 0% coverage (low priority - internal helper)

Generated tests/api/suite_test.go:
```go
func TestSuite_DoGET(t *testing.T) {
    tests := []struct {
        name       string
        path       string
        wantStatus int
    }{
        {"valid path", "/api/v1/me", 200},
        {"missing slash", "api/v1/me", 200}, // Should handle
        {"with query params", "/api/v1/drafts?limit=10", 200},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            suite := setupTestSuite(t)
            defer suite.Cleanup()
            
            resp := suite.DoGET(tt.path)
            assert.Equal(t, tt.wantStatus, resp.Code)
        })
    }
}
```

Coverage after: 11.8% (+ 3.3pp)
```

---

### 9. Add Integration Tests for New Feature

```markdown
Add integration tests for [FEATURE_NAME] using real dependencies.

**Feature**: [brief description]
**Dependencies**: [list: database, search, external APIs]
**Test file**: [path]

**Requirements**:
- Use testcontainers for external services
- Test actual behavior, not mocks
- Cover full user workflows (not just individual functions)
- Run in < [X seconds]

**Structure**:

1. **Setup test infrastructure**:
   ```go
   // tests/integration/[feature]/main_test.go
   var suite *TestSuite
   
   func TestMain(m *testing.M) {
       var err error
       suite, err = setupIntegrationSuite()
       if err != nil {
           log.Fatal(err)
       }
       defer suite.Cleanup()
       
       os.Exit(m.Run())
   }
   
   func setupIntegrationSuite() (*TestSuite, error) {
       // Start containers
       postgresContainer := // testcontainer for postgres
       searchContainer := // testcontainer for meilisearch
       
       // Initialize clients
       db := // connect to postgres
       search := // connect to meilisearch
       
       return &TestSuite{
           DB: db,
           Search: search,
           // ... other clients
       }, nil
   }
   ```

2. **Write test scenarios**:
   
   Test format: "As a [user], I want to [action], so that [benefit]"
   
   ```go
   func TestFeature_CompleteUserWorkflow(t *testing.T) {
       t.Run("user creates draft, publishes, and searches", func(t *testing.T) {
           // Step 1: Create draft
           draft := createTestDraft(t, suite)
           assert.NotEmpty(t, draft.ID)
           
           // Step 2: Publish draft
           doc := publishDraft(t, suite, draft.ID)
           assert.Equal(t, "published", doc.Status)
           
           // Step 3: Search finds document
           results := searchDocuments(t, suite, draft.Title)
           assert.Contains(t, results, doc.ID)
       })
   }
   ```

3. **Scenarios to cover**:
   - [ ] Happy path: [describe complete workflow]
   - [ ] Error cases: [describe failure scenarios]
   - [ ] Concurrent access: [describe multi-user scenarios]
   - [ ] Edge cases: [describe boundary conditions]

4. **Performance requirements**:
   - Each test should complete in < [X seconds]
   - Full suite should complete in < [Y seconds]
   - If slower, optimize by:
     * Sharing containers across tests
     * Using transactions for isolation
     * Running tests in parallel

5. **Verification**:
   ```bash
   # Run integration tests
   go test -v ./tests/integration/[feature]/...
   
   # Check timing
   go test -v -timeout 30s ./tests/integration/[feature]/...
   
   # Run with race detector
   go test -race ./tests/integration/[feature]/...
   ```

Save test plan as: `docs-internal/testing/[FEATURE]_INTEGRATION_TESTS.md`
Then implement tests following the plan.
```

**Real Example from Hermes** (Meilisearch integration):
```markdown
Add integration tests for Meilisearch search adapter.

Dependencies: Meilisearch (via testcontainers), PostgreSQL

Test file: tests/integration/search/meilisearch_adapter_test.go

Setup:
```go
func TestMain(m *testing.M) {
    ctx := context.Background()
    
    // Start Meilisearch container
    meilisearchC, _ := testcontainers.GenericContainer(ctx, 
        testcontainers.GenericContainerRequest{
            ContainerRequest: testcontainers.ContainerRequest{
                Image: "getmeili/meilisearch:v1.3",
                ExposedPorts: []string{"7700/tcp"},
            },
        })
    
    // Initialize adapter
    client := meilisearch.NewClient(config)
    adapter := search.NewMeilisearchAdapter(client)
    
    sharedSuite = &IntegrationSuite{Adapter: adapter}
    os.Exit(m.Run())
}
```

Scenarios:
1. Document indexing and immediate search (tests eventual consistency)
2. Filtering by multiple fields (draft status, product, owner)
3. Pagination and sorting
4. Update and delete operations
5. Concurrent indexing from multiple goroutines

Performance: Each test <3s, full suite <15s with shared container
```

---

## Documentation Prompts

### 10. Generate Comprehensive Documentation for Feature

```markdown
Generate comprehensive documentation for [FEATURE_NAME] that was just implemented.

**Code files**: [list files modified/created]
**Design doc**: [path if exists]
**Related docs**: [list related documentation]

**Generate THREE types of documentation**:

---

**1. CODE DOCUMENTATION**:

Add godoc comments to all exported symbols in [files]:

```go
// [Type/Function name] [one-line description].
//
// [Detailed description explaining what it does, when to use it,
// and any important considerations.]
//
// [If applicable: Usage example]
//
// [If applicable: Error conditions]
```

For each package, create/update `doc.go`:
```go
// Package [name] [one-line description].
//
// [Paragraph explaining package purpose and main concepts.]
//
// # Usage
//
// [Code example showing typical usage]
//
// # Architecture
//
// [Brief explanation of design decisions]
package [name]
```

---

**2. USER DOCUMENTATION**:

Create `docs-internal/[category]/[FEATURE]_COMPLETE.md`:

```markdown
# [Feature Name] - Complete

**Status**: ✅ Complete  
**Completed**: [date]  
**Files Changed**: [N] files (+[X] lines, -[Y] lines)

## Overview
[2-3 paragraphs explaining what was built and why]

## Architecture
[Diagram or text explaining structure]
- Component A: [purpose]
- Component B: [purpose]
- How they interact: [explanation]

## Usage Examples

### Example 1: [Common Use Case]
```go
// Show complete working example
```

### Example 2: [Another Use Case]
```go
// Show complete working example
```

## API Reference
[If applicable, list public interfaces/functions with brief descriptions]

## Testing
- Unit tests: [N] tests in [files]
- Integration tests: [M] tests in [files]
- Coverage: [X%]

To run tests:
```bash
[commands]
```

## Configuration
[If applicable, show configuration options]

## Metrics
| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| [metric1] | [value] | [value] | [change] |
| [metric2] | [value] | [value] | [change] |

## Known Limitations
- [limitation 1]
- [limitation 2]

## Future Work
- [ ] [potential enhancement 1]
- [ ] [potential enhancement 2]

## Related Documentation
- Design: [link to design doc]
- Tests: [link to test strategy]
```

---

**3. DECISION DOCUMENTATION**:

Create `docs-internal/design/[FEATURE]_DECISIONS.md`:

```markdown
# [Feature Name] - Architecture Decisions

## Decision 1: [Name]

**Status**: Accepted  
**Date**: [date]  
**Deciders**: [who made the decision]

### Context
[What's the issue we're trying to solve?]

### Decision
[What did we decide to do?]

### Rationale
[Why did we choose this approach?]
- Reason 1
- Reason 2

### Alternatives Considered

#### Option A: [Name]
**Pros**: [list]  
**Cons**: [list]  
**Why rejected**: [reason]

#### Option B: [Name]
**Pros**: [list]  
**Cons**: [list]  
**Why rejected**: [reason]

### Consequences
**Positive**:
- [benefit 1]
- [benefit 2]

**Negative**:
- [cost/limitation 1]
- [cost/limitation 2]

### Implementation Notes
[Any important details about how this was implemented]

---

[Repeat for each major decision]
```

---

**4. UPDATE NAVIGATION**:

Update `docs-internal/README.md`:
- Add link to new docs in appropriate section
- Update metrics dashboard if applicable
- Mark related TODOs as complete
```

**Real Example from Hermes**:
```markdown
Generate documentation for search abstraction layer.

Code files: pkg/search/*.go, pkg/search/adapters/{algolia,meilisearch}/*.go

Generated:
1. CODE DOCS:
   - pkg/search/doc.go with usage examples
   - Godoc comments on all exported types (Provider, SearchOptions, etc.)
   - pkg/search/examples_test.go with runnable examples

2. USER DOCS:
   - docs-internal/completed/SEARCH_ABSTRACTION_COMPLETE.md (254 lines)
   - Architecture diagram showing Provider → Adapter pattern
   - Examples of creating Algolia vs Meilisearch adapters
   - Migration guide for handlers

3. DECISION DOCS:
   - docs-internal/design/SEARCH_ABSTRACTION_DECISIONS.md
   - Decision 1: Provider pattern (vs repository pattern)
   - Decision 2: Separate index interfaces (vs single search method)
   - Decision 3: Algolia-compatible query structure (for easy migration)

4. NAVIGATION:
   - Updated docs-internal/README.md completed/ section
   - Marked TODO_SEARCH_ABSTRACTION.md as complete
```

---

### 11. Create Session Summary at End of Day

```markdown
Create end-of-day session summary capturing today's work.

**Date**: [today's date]
**Session duration**: [X hours]

**Generate `docs-internal/sessions/SESSION_[DATE].md`**:

```markdown
# Session Summary: [Date]

## Accomplishments

### Code Changes
- **Files modified**: [N] files
- **Lines added**: [+X] 
- **Lines deleted**: [-Y]
- **Net change**: [+Z]

### Features Completed
- ✅ [Feature 1]: [brief description with key outcomes]
- ✅ [Feature 2]: [brief description with key outcomes]
- 🟡 [Feature 3]: [partial completion - what's done, what remains]

### Tests Added
- **Test files**: [N] files
- **Test functions**: [M] functions
- **Coverage change**: [X%] → [Y%] (+[Z]pp)

## Commits Today
[Run: git log --oneline --since="today 12am"]

Grouped by theme:
**Test Infrastructure** (3 commits):
- [hash] - [message]
- [hash] - [message]
- [hash] - [message]

**API Migration** (5 commits):
- [hash] - [message]
...

## Key Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| [Decision 1] | [Why we chose this] | [What changed] |
| [Decision 2] | [Why we chose this] | [What changed] |

## Metrics

| Metric | Start of Day | End of Day | Delta |
|--------|--------------|------------|-------|
| Test coverage | [X%] | [Y%] | +[Z]pp |
| Test count | [M] | [N] | +[P] |
| Build time | [As] | [Bs] | [+/-Δs] |
| API handlers migrated | [X/Total] | [Y/Total] | +[Z] |

## Blockers Encountered

1. **[Blocker description]**
   - How resolved: [solution]
   - Time lost: [X min]
   - Prevention: [what to do differently]

## Next Session: Start Here

Based on current state, next session should:

1. [ ] [Specific task] in [specific file] (~X hours)
   - Goal: [what success looks like]
   - Approach: [brief strategy]
   - Tests: [what to verify]

2. [ ] [Specific task] in [specific file] (~Y hours)
   - Goal: [what success looks like]
   - Approach: [brief strategy]
   - Tests: [what to verify]

3. [ ] [Specific task] (~Z hours)
   - Goal: [what success looks like]

**Total estimated**: [X+Y+Z] hours for next session

## Rework Analysis

Files edited multiple times today:
| File | Edit Count | Reason | Preventable? |
|------|------------|--------|--------------|
| [file1] | [N] | [bug fix / enhancement / refactor] | [yes/no - reason] |

**Rework rate**: [X%] (edits / total commits)
**Target**: <5%

## Session Health

- ✅ All tests passing
- ✅ Build successful
- ✅ Documentation updated
- ✅ Commits have descriptive messages
- ✅ Next session checklist ready

---

**Session Duration**: [X hours]  
**Productivity**: [commits/hour, files/hour, lines/hour]  
**Quality**: [test ratio, doc ratio, rework rate]
```

Also update `docs-internal/SESSION_HANDOFF.md` with current state.
```

**Real Example from Hermes** (Day 3 - October 4):
```markdown
# Session Summary: October 4, 2025

## Accomplishments

### Code Changes
- Files modified: 45 files
- Lines added: +6,000
- Lines deleted: -3,500
- Net change: +2,500

### Features Completed
- ✅ Auth abstraction layer: Complete pkg/auth/ with 3 adapters (Google, Okta, Mock)
- ✅ API handler migration: 23 handlers updated to use auth.Provider
- ✅ API test suite: 2,991 lines of comprehensive tests added
- ✅ Test optimization: Shared container architecture (2-4x speedup)

### Tests Added
- Test files: 10 files
- Test functions: 32 functions
- Coverage: 8.5% → 11.2% (+2.7pp)

## Commits Today
25 commits grouped:

**Auth System** (7 commits):
- 9f59b78 - feat: implement auth adapter system with mock support
- 677c5d6 - test: add integration tests for auth adapter system
...

**API Testing** (12 commits):
- b238f6e - test: add comprehensive API test suite
- 02aa689 - test(api): add comprehensive test suite architecture
...

**Documentation** (6 commits):
- e84f8db - docs: add auth adapter implementation summary
...

## Key Decisions

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Auth abstraction before V1 migration | V1 handlers need mock auth for testing | Unblocked V1 handler tests |
| Shared container pattern | Tests were 40s → 10s locally | 4x speedup, enables TDD |
| V2 migration before V1 | Lower risk, learning opportunity | Smooth V1 migration next session |

## Metrics

| Metric | Start | End | Delta |
|--------|-------|-----|-------|
| Test coverage | 8.5% | 11.2% | +2.7pp |
| Test count | 12 | 44 | +32 |
| API tests passing | 2/10 | 50/59 | +48 |
| Auth handlers migrated | 0/23 | 23/23 | +23 |

## Next Session: Start Here

1. [ ] Migrate V1 API handlers to providers (~4 hours)
   - Files: internal/api/drafts.go, reviews.go, documents.go, approvals.go, me.go, people.go
   - Pattern: Same as V2 (search.Provider, workspace.Provider)
   - Tests: Enable 9 skipped tests

2. [ ] Document provider migration completion (~1 hour)
   - Create MIGRATION_COMPLETE_SUMMARY.md
   - Update README.md with completion status
   - Move docs to completed/ folder

3. [ ] Performance optimization (~30 min)
   - Enable test parallelization in Makefile
   - Document parallel test patterns

Total estimated: 5.5 hours

## Rework Analysis

| File | Edits | Reason | Preventable? |
|------|-------|--------|--------------|
| suite.go | 2 | Added mock auth injection | No - iterative improvement |
| main_test.go | 2 | Optimized container sharing | No - performance tuning |

Rework rate: 4% (2 rework commits / 25 total)
Target: <5% ✅

Session Duration: 8 hours
Commits/hour: 3.1
```

---

## Session Management Prompts

### 12. Start New Work Session

```markdown
Start new work session - load context and set goals.

**STEP 1: Load Previous Session Context**

Read `docs-internal/SESSION_HANDOFF.md` and summarize:

1. **Current State** (one sentence):
   - What am I working on?

2. **Last 3 Commits**:
   ```bash
   git log -3 --oneline
   ```
   - [hash] - [message]
   - [hash] - [message]
   - [hash] - [message]

3. **Active Files**:
   ```bash
   git status
   ```
   - Modified: [list]
   - Untracked: [list]

4. **Decisions from Last Session**:
   [List key decisions from SESSION_HANDOFF.md]

5. **Warnings**:
   [List any known issues from SESSION_HANDOFF.md]

---

**STEP 2: Verify Environment**

Run health checks:

```bash
# 1. Correct branch?
git branch --show-current
# Expected: [branch name]

# 2. Build passes?
make bin
# Expected: Success

# 3. Tests pass?
make test
# Expected: All pass

# 4. Any uncommitted changes?
git diff --stat
# Expected: [describe if any]
```

Report any failures or unexpected state.

---

**STEP 3: Review Next Tasks**

From SESSION_HANDOFF.md "Next Session" checklist:

1. [ ] [Task 1] (~X hours)
2. [ ] [Task 2] (~Y hours)
3. [ ] [Task 3] (~Z hours)

**Are these still the right priorities?**
- Yes → Proceed with Task 1
- No → What changed? Adjust checklist

---

**STEP 4: Set Session Goals**

For this session (estimated [X] hours), I will:

**Primary Goal**: [Complete Task 1]
- Success criteria: [what "done" looks like]
- Tests to verify: [list specific tests]

**Secondary Goals** (if time permits):
- [Task 2 if fast]
- [Task 3 if extra fast]

**Out of Scope** (defer to next session):
- [Tasks that can wait]

---

**Session Start**: [timestamp]  
**Estimated End**: [timestamp]  
**Ready to begin**: ✅
```

**Real Example from Hermes** (Day 4 morning):
```markdown
Start new work session.

STEP 1: Context
- Working on: V1 API handler migration to provider abstractions
- Last 3 commits:
  - 9f59b78 - feat: implement auth adapter system
  - 3f64102 - refactor(api/v2): use workspace provider
  - 9853b6c - refactor(server): add workspace provider DI

STEP 2: Environment ✅
- Branch: jrepp/dev-tidy
- Build: ✅ Success (26s)
- Tests: ✅ 50/59 passing (9 skipped V1 tests)
- Uncommitted: None

STEP 3: Next Tasks
1. [x] Migrate V1 handlers (~4 hours) - ✅ Still priority
2. [ ] Document completion (~1 hour)
3. [ ] Performance optimization (~30 min)

STEP 4: Goals
Primary: Complete V1 handler migration
- Success: 59/59 tests passing (enable skipped tests)
- Files: drafts.go, reviews.go, documents.go, approvals.go, me.go, people.go
- Pattern: Replace direct Algolia/Google calls with providers

Session: 08:00 → ~12:00 (4 hours)
Ready: ✅
```

---

### 13. Update Session Handoff After Significant Work

```markdown
Update SESSION_HANDOFF.md after completing [TASK/MILESTONE].

**What was just completed**: [brief description]

**Update docs-internal/SESSION_HANDOFF.md**:

```markdown
## Current State (Updated: [TIMESTAMP])
- **Last Commit**: [run: git log -1 --oneline]
- **Active Files**: [list files currently being modified]
- **Current Focus**: [what you're working on now]

## Decisions Made [add new section if decision was made]
| Decision | Rationale | Date | Alternatives Rejected |
|----------|-----------|------|----------------------|
| [New decision] | [Why] | [Today] | [Other options] |
| [Existing...] | ... | ... | ... |

## Active Patterns [update if pattern changed]
- **[Pattern category]**: [updated pattern description]

## Next Session: Start Here [update with remaining work]
1. [ ] [Next specific task] (~X hours)
   - [Details about what to do]
   - [How to verify success]
2. [ ] [Another task] (~Y hours)
3. [ ] [Another task] (~Z hours)

## Known Issues / Warnings [add any new warnings]
- [New issue discovered]
- [Existing issues...]
```

**Verification**:
- [ ] Current State reflects latest commit
- [ ] New decisions documented (if any)
- [ ] Next Session has 3-5 specific tasks
- [ ] Each task has time estimate < 2 hours
- [ ] Known issues updated

**Commit handoff update**:
```bash
git add docs-internal/SESSION_HANDOFF.md
git commit -m "docs: update session handoff after [task]"
```
```

**Real Example from Hermes** (after completing auth migration):
```markdown
Update SESSION_HANDOFF.md after completing auth abstraction layer.

Updated sections:

## Current State (Updated: 2025-10-04 15:30)
- Last Commit: 9f59b78 - feat: implement auth adapter system
- Active Files: None (all committed)
- Current Focus: Preparing for V1 API handler migration

## Decisions Made
| Decision | Rationale | Date | Alternatives Rejected |
|----------|-----------|------|----------------------|
| Auth abstraction before V1 migration | V1 tests need mock auth | Oct 4 | Migrate handlers first (can't test without auth) |
| Three adapters (Google, Okta, Mock) | Cover all use cases | Oct 4 | Just Google + Mock (Okta needed for production) |

## Next Session: Start Here
1. [ ] Migrate internal/api/drafts.go to providers (~2 hours)
   - Replace gw.Service with workspace.Provider
   - Replace algolia.Client with search.Provider
   - Verify tests pass: go test ./internal/api/ -run TestDrafts
   
2. [ ] Migrate remaining V1 handlers (~2 hours)
   - reviews.go, documents.go, approvals.go, me.go, people.go
   - Same pattern as drafts.go
   
3. [ ] Enable skipped V1 tests (~30 min)
   - Remove skip directives in tests/api/suite_v1_test.go
   - Verify all 59 tests pass

## Known Issues
- drafts.go is 1442 lines - consider modularizing before complex refactoring
```

---

## Git & Commit Prompts

### 14. Create Descriptive Commit Message

```markdown
Create a descriptive commit message for the changes I'm about to commit.

**Files changed** (run: `git status`):
[list files]

**Changes made** (run: `git diff --stat`):
[show diff stats]

**Context**: [brief explanation of what you did and why]

**Generate commit message following this format**:

```
[type]: [short description in imperative mood]

[Detailed body explaining what changed and why]
- [Bullet point 1: specific change]
- [Bullet point 2: specific change]
- [Bullet point 3: specific change if applicable]

[Optional: related information]
- Coverage: [X%] → [Y%] if tests added
- Files changed: [N] files if large change
- Related: [related issue/doc]
```

**Types**:
- `feat`: New feature
- `refactor`: Code restructuring (no behavior change)
- `test`: Adding/modifying tests
- `docs`: Documentation only
- `fix`: Bug fix
- `perf`: Performance improvement
- `chore`: Build/tooling changes

**Rules**:
- Short description < 72 characters
- Use imperative mood ("add" not "added")
- Be specific about WHAT changed
- Explain WHY in body if not obvious
- Include metrics if applicable (coverage, performance)

**Example**:
```
feat: implement Meilisearch adapter for search provider

Add complete Meilisearch implementation of search.Provider interface
supporting all index operations with proper error handling.

- adapter.go: 528 lines implementing search.Provider
- adapter_test.go: 284 lines of unit tests
- Retry logic for eventual consistency
- Comprehensive error wrapping with context

Coverage: 85% (target: 80%)
Related: docs-internal/design/SEARCH_ABSTRACTION_DESIGN.md
```

Generate commit message for my current changes.
```

**Real Examples from Hermes**:

```
feat: migrate API handlers to use provider interface extensions

- people.go: Use SearchDirectory() for POST endpoint (removed 501)
- drafts.go: Use OR filters for GET endpoint (owners/contributors query)
- drafts_shareable.go: Update to use workspace.Provider instead of gw.Service
- documents.go: Integrate DocumentConsistencyChecker (2 call sites)
- reviews.go: Integrate DocumentConsistencyChecker (1 call site)
- approvals.go: Integrate DocumentConsistencyChecker (2 call sites)
- Remove all 501 errors from subcollection handlers

All V1/V2 API handlers now fully provider-agnostic
```

```
docs: add comprehensive provider migration completion docs

- MIGRATION_STATUS.md: Quick one-page reference for project status
- MIGRATION_COMPLETE_SUMMARY.md: Comprehensive 600+ line project summary
- MIGRATION_CHECKLIST.md: Detailed completion verification checklist
- Document architecture before/after comparison
- List all migrated handlers and statistics (100+ usages eliminated)
- Provide implementation patterns and best practices
- Confirm production-ready status for main application
```

```
test(api): add products endpoint integration tests

suite.go:
- Remove unused Algolia client references
- Update products handler registration to use database

suite_v1_test.go:
- Add comprehensive products endpoint test coverage
- Test GET with data, empty database, method restrictions
- Verify API contract compatibility
- All 5 tests passing

Test coverage: 100% for products endpoint migration
```

---

### 15. Review Changes Before Committing

```markdown
Review my changes before committing to ensure quality.

**Run git diff and analyze**:
```bash
git diff
```

**Check for common issues**:

1. **Debugging code left in**:
   - [ ] No `fmt.Println()` or `log.Printf()` for debugging
   - [ ] No commented-out code blocks
   - [ ] No temporary test changes

2. **Code quality**:
   - [ ] All exported symbols have godoc comments
   - [ ] Error handling is consistent (wrap with context)
   - [ ] No TODO comments without tracking issues
   - [ ] Variables/functions have meaningful names

3. **Tests**:
   - [ ] New code has test coverage
   - [ ] Tests follow existing patterns
   - [ ] No skipped/disabled tests without reason

4. **Files**:
   - [ ] No unintended files (*.swp, .DS_Store, etc.)
   - [ ] All changed files are intentional
   - [ ] No large generated files

5. **Security**:
   - [ ] No hardcoded credentials or secrets
   - [ ] No API keys or tokens
   - [ ] No personal information

**If any issues found**:
```bash
# Unstage problematic files
git reset HEAD [file]

# Or fix the issues
[edit files]
git add [fixed files]
```

**Once clean**:
```bash
# Review diff one more time
git diff --cached

# If good, proceed with commit
git commit -m "[message]"
```

**Quality checklist** before every commit:
- ✅ Build passes: `make bin`
- ✅ Tests pass: `make test` or `go test ./...`
- ✅ No debugging code
- ✅ Meaningful commit message
- ✅ Changes are focused (one logical change)
```

---

### 16. Squash Commits for Clean History

```markdown
Prepare branch for merge by squashing commits into logical units.

**Current commit history**:
```bash
git log --oneline origin/main..HEAD
```

**Analyze commits** and group by feature/theme:

**Theme 1: [Feature Name]** (commits: [hashes])
- [hash] - [message]
- [hash] - [message]
- [hash] - [message]

**Theme 2: [Another Feature]** (commits: [hashes])
- [hash] - [message]
- [hash] - [message]

...

**Squash strategy**:

```bash
# Interactive rebase
git rebase -i origin/main

# In editor, for each theme:
pick [first-commit-hash]
squash [second-commit-hash]  # Merge into previous
squash [third-commit-hash]   # Merge into previous
...
pick [next-theme-first-commit]
squash ...

# Save and close editor

# In commit message editor:
# - Keep first line of first commit
# - Merge bullet points from all commits
# - Add summary of total changes
```

**Target result**: [X] commits from [Y] commits

**Commit message format for squashed commits**:
```
[type]: [high-level description of entire feature]

[Comprehensive description of what the feature does]

**Changes**:
- [Major change 1]
- [Major change 2]
- [Major change 3]

**Statistics**:
- Files changed: [N] (+[X] -[Y])
- Tests added: [M] tests
- Coverage: [A%] → [B%]
- [Other relevant metrics]

**Related**:
- Design: [link to design doc]
- Tests: [link to test docs]
- Closes: #[issue number if applicable]
```

**Verification after squash**:
```bash
# Ensure tests still pass
make test

# Check new history is clean
git log --oneline origin/main..HEAD

# Force push (only if branch is not shared!)
git push --force-with-lease
```

**Guidelines**:
- Group related commits (all test changes together, all refactoring together)
- Keep one commit per major feature
- Preserve detailed history in docs (SESSION notes)
- Descriptive squashed commit messages (what + why + metrics)
```

**Real Example from Hermes** (what should have been done):
```markdown
98 commits squashed to 10 logical units:

1. feat: add environment and documentation setup
   - Squashes: 4 commits (copilot instructions, env templates, gitignore)

2. feat: implement workspace abstraction layer
   - Squashes: 15 commits (interfaces, Google adapter, local adapter, tests)
   - Files: 25 (+3,500 lines)
   - Tests: 12 integration tests
   
3. feat: implement search abstraction layer
   - Squashes: 12 commits (interfaces, Algolia adapter, Meilisearch adapter, tests)
   - Files: 18 (+2,800 lines)
   - Coverage: 85%

4. feat: implement auth abstraction layer
   - Squashes: 8 commits (interfaces, Google/Okta/Mock adapters, tests)
   - Files: 12 (+1,100 lines)
   
5. test: add comprehensive API test suite
   - Squashes: 10 commits (suite infra, fixtures, integration tests)
   - Tests: 32 tests (+2,991 lines)
   
6. refactor(api): migrate V2 handlers to provider abstractions
   - Squashes: 15 commits (11 handlers migrated)
   - Files: 11 (-598 lines)
   
7. refactor(api): migrate V1 handlers to provider abstractions
   - Squashes: 12 commits (6 handlers migrated)
   - Files: 6 (-287 lines)
   
8. feat: add provider interface extensions
   - Squashes: 8 commits (directory search, OR filters, consistency checker)
   
9. docs: comprehensive provider migration documentation
   - Squashes: 10 commits (35 markdown files, 8,500 lines)
   
10. perf: enable test parallelization
    - Squashes: 3 commits (Makefile, parallelization guide)

Clean history: 10 commits vs 98 original
Detailed history: Preserved in docs-internal/sessions/
```

---

## Best Practices & Anti-Patterns

### DO: Prompt Discipline

✅ **Always include context** in prompts:
- What files you're working with
- What patterns to follow (reference docs)
- What the success criteria are

✅ **Be specific about output location**:
- Bad: "Create documentation"
- Good: "Create docs-internal/design/FEATURE_DESIGN.md with..."

✅ **Request verification steps**:
- Always ask for commands to verify the work
- Include them in the output for future reference

✅ **Commit prompts as commit messages**:
- Detailed commit bodies preserve the "why"
- Future developers (and AI) learn from them

### DON'T: Common Mistakes

❌ **Vague prompts without constraints**:
- Bad: "Write tests"
- Good: "Write unit tests for [file] following patterns in TEST_PATTERNS.md, target 80% coverage"

❌ **Generate without verification**:
- Always include "then run these commands to verify"
- Build → Test → Check should be automatic

❌ **Create docs without structure**:
- Always specify: docs-internal/[category]/[filename]
- Never just "create docs for this"

❌ **Commit without review**:
- Always run git diff before committing
- Use the review checklist prompt

---

## Measuring Success

Track these metrics to validate prompt effectiveness:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Session startup time** | <15 min | Time from opening editor to first commit |
| **Rework rate** | <5% | Files edited / total files modified |
| **Test ratio** | 15-20% | Test lines / total lines |
| **Doc ratio** | 30-40% | Markdown files / total files |
| **Coverage growth** | +5pp per session | go tool cover between sessions |
| **Build time** | No regression | make bin timing |

---

## Customizing Templates

These templates are from Hermes (Go + Ember project). **Adapt for your stack**:

### For Python Projects
- Replace `go test` with `pytest`
- Replace `make` with appropriate build tool
- Use `type` hints instead of interfaces
- Adapt godoc to Python docstrings

### For JavaScript/TypeScript
- Replace `go test` with `jest` or `vitest`
- Use `interface` for TypeScript, JSDoc for JavaScript
- Adapt testing patterns for your test framework

### For Other Languages
- Keep the **structure** of prompts (context → requirements → output → verification)
- Replace **commands** and **syntax** specific to your language
- Preserve **principles**: specificity, verification, documentation

---

## Conclusion

These prompt templates enabled **10-15x productivity** on the Hermes project. Key success factors:

1. **Context-rich prompts** (not vague requests)
2. **Verification built-in** (always include test commands)
3. **Documentation as code** (structured, versioned, navigable)
4. **Incremental approach** (small commits, frequent verification)
5. **Pattern following** (extract patterns first, then generate)

**Start small**: Pick 2-3 templates, try them on your next feature, measure results.

---

**Related Documents**:
- `AGENT_USAGE_ANALYSIS.md` - Start/Stop/Continue feedback
- `DEV_VELOCITY_ANALYSIS.md` - Statistical analysis of results
- `DEV_TIMELINE_VISUAL.md` - Day-by-day timeline
- `.github/copilot-instructions.md` - Project-specific agent instructions

**Version**: 1.0  
**Last Updated**: October 6, 2025  
**Source Project**: hashicorp-forge/hermes (jrepp/dev-tidy branch)
