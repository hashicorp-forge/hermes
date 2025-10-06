# API Handler Modularization Plan - October 5, 2025

## Goal
Break large, monolithic API handlers into smaller, focused, testable modules before completing the provider abstraction migration.

## Current State

### ✅ Completed Refactoring (Provider Abstractions)
- `documents.go` - DocumentHandler (working, tested)
- `approvals.go` - ApprovalHandler (working, compiles)
- `reviews.go` - ReviewHandler (working, compiles)
- `documents_related_resources.go` - Helper handler (working)

### ⚠️ Remaining Large Handlers
- `drafts.go` - **1442 lines**, 2 handlers, complex search operations
- Other large handlers TBD

## Problem Statement

The `drafts.go` file is too large and complex to refactor safely in one step:

1. **Size**: 1442 lines with 2 major handlers
2. **Complexity**: 
   - Search operations with Algolia-specific `opt.*` parameters
   - Template copying with direct Google Drive Service instantiation
   - Multiple helper functions intertwined with main handlers
3. **Risk**: Previous attempts at bulk refactoring caused file corruption

## Modularization Strategy

### Phase 1: Identify Natural Boundaries

Break handlers into focused modules based on:
- **Feature domains** (draft creation, draft listing, draft updating, draft deletion)
- **Operation types** (read, write, search)
- **Complexity** (simple CRUD vs. complex workflows)

### Phase 2: Extract Helper Functions

Create dedicated files for:
- Search operations (`drafts_search.go`)
- Template operations (`drafts_templates.go`)
- Sharing/permissions (`drafts_sharing.go`)
- Workspace operations (`drafts_workspace.go`)

### Phase 3: Refactor by Module

Refactor each extracted module independently:
1. Update to provider abstractions
2. Write focused unit tests
3. Verify compilation
4. Move to next module

### Phase 4: Integration

Reassemble refactored modules into main handler:
- Keep handler as thin orchestration layer
- Delegate to focused modules
- Ensure all tests pass

## Proposed Module Structure for drafts.go

```
internal/api/drafts/
├── handler.go              # Main HTTP handlers (thin orchestration)
├── create.go              # Draft creation logic
├── update.go              # Draft update logic
├── delete.go              # Draft deletion logic
├── list.go                # Draft listing with search
├── templates.go           # Template copying operations
├── sharing.go             # Share/unshare operations
├── workspace.go           # Workspace provider operations
└── search.go              # Search provider operations
```

### Module Responsibilities

#### `handler.go` (150-200 lines)
- HTTP request/response handling
- Route parsing
- Authentication/authorization checks
- Delegate to feature modules
- Error handling and logging

#### `create.go` (150-200 lines)
- `CreateDraft(ctx, req, searchProvider, workspaceProvider) (*Draft, error)`
- Document creation workflow
- Template copying (delegate to templates.go)
- Initial indexing in search
- File creation in workspace

#### `update.go` (150-200 lines)
- `UpdateDraft(ctx, docID, req, searchProvider, workspaceProvider) error`
- Patch operations
- Re-indexing
- Header replacement
- File renaming

#### `delete.go` (50-100 lines)
- `DeleteDraft(ctx, docID, searchProvider, workspaceProvider) error`
- Remove from search index
- Delete from workspace
- Cleanup operations

#### `list.go` (100-150 lines)
- `ListDrafts(ctx, filters, searchProvider) (*SearchResult, error)`
- Convert filters to SearchQuery
- Handle pagination
- Sort options

#### `templates.go` (100-150 lines)
- `CopyFromTemplate(ctx, templateID, targetFolder, workspaceProvider) (*File, error)`
- Template file operations
- Special auth handling for service accounts
- Error recovery

#### `sharing.go` (100-150 lines)
- `ShareDraft(ctx, docID, email, role, workspaceProvider) error`
- `UnshareDraft(ctx, docID, email, workspaceProvider) error`
- Permission management
- Contributor/approver handling

#### `search.go` (100-150 lines)
- `IndexDraft(ctx, doc, searchProvider) error`
- `DeleteFromIndex(ctx, docID, searchProvider) error`
- `SearchDrafts(ctx, query, searchProvider) (*SearchResult, error)`
- Conversion helpers (document -> search.Document)

#### `workspace.go` (100-150 lines)
- `CreateFile(ctx, name, folder, workspaceProvider) (*File, error)`
- `MoveFile(ctx, fileID, targetFolder, workspaceProvider) error`
- `RenameFile(ctx, fileID, newName, workspaceProvider) error`
- Workspace-specific operations

## Benefits of Modularization

### 1. **Testability**
- Each module can be unit tested independently
- Mock interfaces for dependencies
- Focused test cases per feature

### 2. **Maintainability**
- Clear separation of concerns
- Easy to locate feature code
- Reduced cognitive load

### 3. **Safety**
- Smaller refactoring units = lower risk
- Easier to review changes
- Simpler rollback if needed

### 4. **Parallelization**
- Multiple modules can be refactored concurrently
- Independent compilation checks
- Isolated test runs

### 5. **Documentation**
- Each module serves as self-documenting feature boundary
- Clear API contracts between modules
- Easier onboarding for new developers

## Migration Steps

### Step 1: Create Package Structure (15 min)
```bash
mkdir -p internal/api/drafts
```

### Step 2: Extract Helper Functions (30-45 min)
- Identify all non-handler functions in drafts.go
- Group by responsibility (search, workspace, templates, sharing)
- Create module files
- Move functions (no refactoring yet)
- Update imports in drafts.go
- Verify compilation

### Step 3: Refactor Modules Individually (3-4 hours)
For each module:
1. Update to provider abstractions (~30 min)
2. Write unit tests (~30 min)
3. Verify compilation and tests (~15 min)
4. Move to next module

**Order (by complexity, easiest first):**
1. `delete.go` - Simplest operations
2. `workspace.go` - Direct provider calls
3. `search.go` - Needs conversion helpers
4. `sharing.go` - Straightforward workspace ops
5. `update.go` - Moderate complexity
6. `templates.go` - Complex auth handling
7. `create.go` - Most complex workflow
8. `list.go` - Search query conversion
9. `handler.go` - Final integration

### Step 4: Update Main Handlers (1-2 hours)
- Refactor DraftsHandler to use modules
- Refactor DraftsDocumentHandler to use modules
- Keep handlers thin (orchestration only)
- Comprehensive error handling

### Step 5: Integration Testing (1-2 hours)
- Update test suite
- Enable all V1 draft tests
- Run full integration suite
- Fix any issues

### Step 6: Documentation & Cleanup (30 min)
- Update architectural docs
- Add module-level documentation
- Remove unused code
- Final linting pass

## Estimated Timeline

| Phase | Duration | Notes |
|-------|----------|-------|
| Package structure | 15 min | Simple directory creation |
| Extract helpers | 45 min | Pure code movement, no logic changes |
| Refactor delete.go | 45 min | Simplest module |
| Refactor workspace.go | 45 min | Direct provider mapping |
| Refactor search.go | 1 hour | Conversion logic needed |
| Refactor sharing.go | 45 min | Straightforward |
| Refactor update.go | 1 hour | Moderate complexity |
| Refactor templates.go | 1.5 hours | Complex auth handling |
| Refactor create.go | 1.5 hours | Most complex workflow |
| Refactor list.go | 1.5 hours | Search query conversion |
| Update main handlers | 2 hours | Integration and orchestration |
| Integration testing | 2 hours | Test suite updates and fixes |
| Documentation | 30 min | Final polish |
| **Total** | **~13-15 hours** | Spread over multiple sessions |

## Success Criteria

### Must Have
- ✅ All modules compile independently
- ✅ Main handlers integrate modules successfully
- ✅ Binary builds with `make bin`
- ✅ All existing tests pass
- ✅ No backward compatibility breaks

### Should Have
- ✅ Each module has unit tests
- ✅ Test coverage > 70% for new modules
- ✅ Documentation for each module
- ✅ Clear API contracts between modules

### Nice to Have
- ✅ Benchmark tests for search operations
- ✅ Integration tests per module
- ✅ Performance improvements from cleaner code

## Risks and Mitigations

### Risk 1: Breaking Existing Functionality
**Mitigation**: 
- Extract first, refactor second (two-phase approach)
- Run tests after each module extraction
- Keep backup branches

### Risk 2: Complex Dependencies Between Modules
**Mitigation**:
- Design clear module boundaries upfront
- Use interfaces for inter-module communication
- Minimize coupling

### Risk 3: Search Query Conversion Complexity
**Mitigation**:
- Tackle search.go and list.go last
- Study existing SearchQuery usage in v2 API
- Consider helper library for Algolia->SearchQuery conversion

### Risk 4: Template Copying Service Account Auth
**Mitigation**:
- Isolate in templates.go
- May need workspace.Provider extension
- Document workarounds clearly

## Next Steps

1. **Review this plan** with team/stakeholders
2. **Create GitHub issue** with checklist from this plan
3. **Start with Step 1**: Create package structure
4. **Proceed incrementally**: One module at a time, with testing
5. **Document learnings**: Update this plan as we discover patterns

## References

- Current state: `internal/api/drafts.go` (1442 lines)
- Refactoring patterns: `docs-internal/V1_HANDLER_REFACTORING_PATTERNS.md`
- Previous session: `docs-internal/V1_REFACTORING_SESSION_SUMMARY_2025_01_05.md`
- Provider interfaces: `pkg/search/search.go`, `pkg/workspace/workspace.go`

---

**Status**: 📋 Planning Phase  
**Last Updated**: October 5, 2025  
**Next Review**: After Step 2 (Extract Helper Functions)
