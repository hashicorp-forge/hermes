# Drafts Migration Quick Reference
**One-page summary of the migration path from monolithic drafts.go to modular package**

---

## Current → Target

```
internal/api/drafts.go (1442 lines)
    ↓
internal/api/drafts/ (9 focused modules)
```

---

## Quick Start

```bash
# Step 1: Create structure
mkdir -p internal/api/drafts
cd internal/api/drafts

# Step 2: Create initial files
touch types.go handler.go delete.go get.go share.go
touch create.go update.go list.go templates.go

# Step 3: Follow the guide
# See: docs-internal/DRAFTS_MIGRATION_GUIDE.md
```

---

## Module Breakdown

| Module | Lines | Complexity | Dependencies | Est. Time |
|--------|-------|------------|--------------|-----------|
| **types.go** | 50 | 🟢 Low | None | 15 min |
| **delete.go** | 50 | 🟢 Low | search, workspace | 20 min |
| **get.go** | 80 | 🟢 Low | search | 20 min |
| **share.go** | 100 | 🟡 Medium | workspace | 30 min |
| **update.go** | 150 | 🟡 Medium | search, workspace, document | 1 hour |
| **create.go** | 200 | 🔴 High | search, workspace, document, templates | 1.5 hours |
| **list.go** | 150 | 🔴 High | search (SearchQuery conversion) | 1.5 hours |
| **templates.go** | 100 | 🔴 High | workspace (special auth) | 1.5 hours |
| **handler.go** | 200 | 🟡 Medium | All modules | 30 min |

**Total: ~8-9 hours**

---

## Module Dependency Graph

```
handler.go
    ├─→ types.go (types)
    ├─→ get.go (GetDraft)
    ├─→ delete.go (DeleteDraft)
    ├─→ create.go (CreateDraft)
    │      └─→ templates.go (CopyFromTemplate)
    ├─→ update.go (UpdateDraft)
    ├─→ list.go (ListDrafts)
    └─→ share.go (ShareDraft, UnshareDraft)
```

---

## Recommended Order (Easiest → Hardest)

1. ✅ **types.go** - Pure data structures
2. ✅ **delete.go** - Simplest logic
3. ✅ **get.go** - Straightforward retrieval
4. ✅ **share.go** - Direct workspace ops
5. ⚠️ **update.go** - Moderate complexity
6. 🔴 **templates.go** - Complex auth handling
7. 🔴 **create.go** - Most complex workflow
8. 🔴 **list.go** - Search query conversion
9. 🎯 **handler.go** - Final integration

---

## Key Commands

### Build & Test
```bash
# Compile
make bin

# Test single module
go test -v ./internal/api/drafts/ -run TestDeleteDraft

# Test all
go test ./internal/api/drafts/

# Integration tests
go test -tags=integration ./tests/api/
```

### Git Workflow
```bash
# After each module
git add internal/api/drafts/<module>.go
git commit -m "refactor(api): extract <operation> to drafts/<module>.go"

# Rollback if needed
git revert HEAD
```

---

## Code Template

### New Module Skeleton
```go
package drafts

import (
    "context"
    "github.com/hashicorp-forge/hermes/pkg/search"
    "github.com/hashicorp-forge/hermes/pkg/workspace"
    "github.com/hashicorp/go-hclog"
)

// <Operation> performs <description>.
func <Operation>(
    ctx context.Context,
    <params>,
    searchProvider search.Provider,
    workspaceProvider workspace.Provider,
    l hclog.Logger,
) error {
    // Implementation
    return nil
}
```

### Test Skeleton
```go
package drafts

import (
    "context"
    "testing"
)

func Test<Operation>_Success(t *testing.T) {
    ctx := context.Background()
    // Setup mocks
    // Call function
    // Assert results
}

func Test<Operation>_Error(t *testing.T) {
    // Test error cases
}
```

---

## Migration Checklist

- [ ] Step 1: Package structure created
- [ ] Step 2: Types extracted
- [ ] Step 3: Sharing extracted
- [ ] Step 4: Delete extracted
- [ ] Step 5: Get extracted
- [ ] Step 6: Handler skeleton created
- [ ] Step 7: Tests added for extracted modules
- [ ] Step 8: Remaining operations extracted
- [ ] Step 9: Server registration updated
- [ ] Step 10: Old code deprecated
- [ ] Step 11: Old file removed
- [ ] ✅ All tests passing
- [ ] ✅ Application works

---

## Common Pitfalls

### ❌ Don't:
- Make large bulk changes
- Skip tests
- Change logic while extracting
- Forget to update imports

### ✅ Do:
- One module at a time
- Test after each step
- Commit frequently
- Keep old code working during transition

---

## When to Stop & Get Help

🛑 **STOP if**:
- Tests fail after extraction
- Build breaks
- Not sure about module boundaries
- Complex dependencies between modules

✅ **Continue if**:
- Each step compiles
- Tests pass
- Changes are small and focused
- Clear what next step is

---

## Success Indicators

After each module:
- ✅ `make bin` succeeds
- ✅ Module tests pass
- ✅ Old code still works (via delegation)
- ✅ Can revert cleanly if needed

Final success:
- ✅ All 9 modules extracted
- ✅ Handler integrates all modules
- ✅ Server uses new handler
- ✅ Old file removed
- ✅ Test coverage >70%

---

## Quick Links

- **Full Guide**: `docs-internal/DRAFTS_MIGRATION_GUIDE.md`
- **Overall Plan**: `docs-internal/MODULARIZATION_PLAN_2025_01_05.md`
- **Patterns**: `docs-internal/V1_HANDLER_REFACTORING_PATTERNS.md`
- **Current State**: `docs-internal/SESSION_CHECKPOINT_2025_01_05.md`

---

## Time Estimates by Day

**Day 1 (3 hours)**
- Setup + types + delete + get + share
- Checkpoint: 5 modules done, tests passing

**Day 2 (3 hours)**
- Update + templates (start)
- Checkpoint: 7 modules done

**Day 3 (2-3 hours)**
- Templates (finish) + create + list + handler + integration
- Checkpoint: Migration complete

---

## Remember

**"Extract first, refactor second"**

Don't try to refactor while extracting. Just move the code.
Provider refactoring happens in Phase 3 after extraction is complete.

**One commit per module**

Each module should be committed independently so you can
revert individual steps if needed.

**Test everything**

Every module should have tests. Handler integration should
have integration tests.

---

**Status**: 📋 Ready to Execute  
**Last Updated**: October 5, 2025  
**Next**: Begin Step 1 in DRAFTS_MIGRATION_GUIDE.md
