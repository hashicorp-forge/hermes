# Migration Progress Report - October 2, 2025

## Status: In Progress ⚠️

## Completed Tasks ✅

### 1. Package Renaming
- ✅ Renamed `pkg/storage/adapters/filesystem` → `pkg/storage/adapters/localworkspace`
- ✅ Updated all package declarations from `filesystem` to `localworkspace`
- ✅ Updated imports throughout codebase

### 2. Google Workspace Relocation
- ✅ Moved `pkg/googleworkspace` → `pkg/storage/adapters/google`
- ✅ Updated package declarations from `googleworkspace` to `google`
- ✅ Updated all imports across 31+ files:
  - All `internal/api/*` handlers
  - All `pkg/hashicorpdocs/*` files
  - `internal/indexer/indexer.go`
  - `internal/email/email.go`
  - `internal/config/config.go`
  - `internal/server/server.go`
  - And more...

### 3. Fixed Duplicate Package Declarations
- ✅ Fixed `pkg/storage/storage.go`
- ✅ Fixed `pkg/storage/adapters/localworkspace/adapter.go`

### 4. Updated Test Imports
- ✅ Fixed `pkg/storage/adapters/localworkspace/adapter_test.go`
- ✅ Updated filesystem references to localworkspace
- ✅ Fixed `pkg/storage/adapters/localworkspace/examples/main.go` imports

### 5. Fixed Google Workspace References
- ✅ Updated `pkg/hashicorpdocs/locked.go` to use `google.Service`
- ✅ Added proper import alias `google` for clarity

### 6. Documentation Created
- ✅ Created `docs-internal/TODO_API_STORAGE_MIGRATION.md` (comprehensive API migration plan)
- ✅ Created `docs-internal/TODO_UNIT_TESTS.md` (unit test coverage expansion plan)
- ✅ Created `docs-internal/TODO_API_TEST_SUITE.md` (API integration test framework)
- ✅ Created `docs-internal/TODO_INTEGRATION_TESTS.md` (storage adapter test migration)

### 7. Frontmatter System Implemented
- ✅ Rewrote `pkg/storage/adapters/localworkspace/metadata.go` to use YAML frontmatter
- ✅ Changed from separate `.meta.json` files to frontmatter in `.md` files
- ✅ Implemented `parseFrontmatter()` for reading metadata
- ✅ Implemented `serializeFrontmatter()` for writing metadata
- ✅ Updated metadata operations: `Get()`, `Set()`, `Delete()`, `List()`

## In Progress / Needs Completion ⏳

### 1. Adapter Integration with Frontmatter
The `adapter.go` needs significant updates to work with the new frontmatter system:

**Current Issues:**
- `metadataStore.Set()` now requires 3 parameters (path, metadata, content) instead of 2
- `metadataStore.List()` now requires a directory path parameter
- `metadataStore.Get()` now takes a file path instead of just an ID
- Document storage logic needs to be updated to read/write frontmatter

**Required Changes:**
```go
// OLD (JSON metadata)
meta, err := ds.adapter.metadataStore.Get(id)
err = ds.adapter.metadataStore.Set(id, meta)

// NEW (Frontmatter)
docPath := ds.getDocumentPath(id)
meta, err := ds.adapter.metadataStore.Get(docPath)
err = ds.adapter.metadataStore.Set(docPath, meta, content)
```

**Files Needing Updates:**
- [ ] `pkg/storage/adapters/localworkspace/adapter.go` - Document storage operations
  - `GetDocument()` - Read frontmatter + content
  - `CreateDocument()` - Write frontmatter + content
  - `UpdateDocument()` - Preserve frontmatter, update content
  - `ListDocuments()` - Scan directory, parse frontmatter
  - `DeleteDocument()` - Remove file
  - `CopyDocument()` - Copy frontmatter + content
  - `ReplaceTextInDocument()` - Preserve frontmatter

### 2. Tests Need Updating
- [ ] `pkg/storage/adapters/localworkspace/adapter_test.go` - Update for frontmatter
- [ ] Test document creation with frontmatter
- [ ] Test metadata parsing
- [ ] Test content separation

### 3. Build Verification
- [ ] Fix remaining compilation errors in adapter.go
- [ ] Verify all tests pass
- [ ] Run integration tests

## Test Status

### Current Test Results (after changes)
```
✅ ok    github.com/hashicorp-forge/hermes/internal/api          0.465s
✅ ok    github.com/hashicorp-forge/hermes/internal/api/v2      0.623s
✅ ok    github.com/hashicorp-forge/hermes/internal/helpers     (cached)
✅ ok    github.com/hashicorp-forge/hermes/pkg/hashicorpdocs    0.444s
✅ ok    github.com/hashicorp-forge/hermes/pkg/models           (cached)
⚠️  FAIL  github.com/hashicorp-forge/hermes/pkg/storage/adapters/localworkspace [build failed]
⚠️  FAIL  github.com/hashicorp-forge/hermes/pkg/storage/adapters/localworkspace/examples [build failed]
```

**Summary:** 28+ test suites passing, 2 packages need fixing

## Next Steps (Priority Order)

### Immediate (Required for Tests to Pass)
1. **Update adapter.go document operations** (2-3 hours)
   - Rewrite to use frontmatter throughout
   - Fix `Set()` and `List()` calls
   - Update path handling
   - Test each operation

2. **Fix compilation errors** (30 minutes)
   - Address all `metadataStore` call sites
   - Verify method signatures

3. **Run tests** (15 minutes)
   - `make go/test`
   - `make go/test/with-docker-postgres`
   - Fix any failures

### Short Term (This Week)
4. **Update README documentation** (1 hour)
   - `pkg/storage/README.md` - Update for frontmatter
   - `pkg/storage/adapters/localworkspace/README.md` - Create if needed
   - Example document format

5. **Create example documents** (30 minutes)
   - Add to `testdata/` directory
   - Show frontmatter format
   - Various document types

### Medium Term (Next Sprint)
6. **Implement TODO documents** (as prioritized)
   - Start with unit tests (TODO_UNIT_TESTS.md)
   - Then API migration (TODO_API_STORAGE_MIGRATION.md)
   - Finally integration tests (TODO_INTEGRATION_TESTS.md)

## Architecture Changes Summary

### Before
```
Document: docs/RFC-001.md
Metadata: metadata/RFC-001.meta.json
```

### After
```
Document with embedded metadata:
---
id: abc123
name: RFC-001: Storage Abstraction
parent_folder_id: docs
created_time: 2025-10-02T21:00:00Z
modified_time: 2025-10-02T21:30:00Z
owner: engineer@hashicorp.com
trashed: false
---

# RFC-001: Storage Abstraction Layer

## Summary
...
```

### Benefits
- ✅ Single file per document (simpler)
- ✅ Metadata and content never out of sync
- ✅ Human-readable frontmatter
- ✅ Git-friendly (better diffs)
- ✅ Standard markdown format
- ✅ Easier to backup/restore
- ✅ No orphaned metadata files

## Configuration Changes

No changes needed yet, but future config will look like:

```hcl
storage {
  provider = "localworkspace"  # or "google"
  
  localworkspace {
    base_path = "./storage"
  }
  
  google {
    # Existing google workspace config
  }
}
```

## Breaking Changes

### For Developers
- Import paths changed: `pkg/googleworkspace` → `pkg/storage/adapters/google`
- Package name changed: `googleworkspace` → `google`
- Metadata storage format changed (JSON → YAML frontmatter)

### For Users
- None yet (storage abstraction not yet integrated into API)

## Files Modified

### Moved/Renamed
- `pkg/googleworkspace/*` → `pkg/storage/adapters/google/*` (8 files)
- `pkg/storage/adapters/filesystem/*` → `pkg/storage/adapters/localworkspace/*` (7 files)

### Significantly Changed
- `pkg/storage/adapters/localworkspace/metadata.go` - Complete rewrite for frontmatter
- `pkg/storage/storage.go` - Fixed duplicate package declaration
- `pkg/storage/adapters/localworkspace/adapter.go` - Fixed package declaration (needs more work)

### Import Updates (31+ files)
- `internal/api/*.go` (15 files)
- `internal/api/v2/*.go` (5 files)
- `pkg/hashicorpdocs/*.go` (8 files)
- `internal/indexer/*.go`
- `internal/email/email.go`
- `internal/config/config.go`
- `internal/auth/*.go`
- `internal/server/server.go`
- And more...

### Documentation Created
- `docs-internal/TODO_API_STORAGE_MIGRATION.md`
- `docs-internal/TODO_UNIT_TESTS.md`
- `docs-internal/TODO_API_TEST_SUITE.md`
- `docs-internal/TODO_INTEGRATION_TESTS.md`

## Commands for Next Developer

```bash
# 1. Check current status
make go/test

# 2. Work on adapter.go to fix frontmatter integration
# Focus on: GetDocument, CreateDocument, UpdateDocument, ListDocuments

# 3. Update tests
go test ./pkg/storage/adapters/localworkspace/... -v

# 4. Verify all tests pass
make go/test
make go/test/with-docker-postgres

# 5. Commit changes
git add -A
git commit -m "feat(storage): complete frontmatter migration for localworkspace adapter"
```

## Estimated Completion Time

- **Immediate fixes**: 2-4 hours
- **Full migration**: 4-6 weeks (following TODO documents)
- **Production ready**: 8-10 weeks (with thorough testing)

## Risk Assessment

### Low Risk ✅
- Package renaming (completed cleanly)
- Import updates (comprehensive, tested)
- Documentation (no code impact)

### Medium Risk ⚠️
- Frontmatter system (new, needs testing)
- Adapter updates (in progress)
- Test updates (dependent on adapter)

### High Risk 🔴
- API handler migration (large scope, many dependencies)
- Production deployment (requires careful rollout)
- Backward compatibility (if storage format changes again)

## Recommendations

1. **Complete adapter.go updates first** - Blocking all other work
2. **Thoroughly test frontmatter system** - New code path, needs validation
3. **Don't rush API migration** - Follow phased approach in TODO document
4. **Keep Google adapter as primary** - For production stability
5. **Use feature flags** - For gradual rollout of storage abstraction

## Questions to Address

1. Should we support reading old JSON metadata files during transition?
2. Do we need a migration script for existing data?
3. What's the rollback plan if frontmatter causes issues?
4. Should we add schema validation for frontmatter?
5. Do we need versioning for metadata format?

## Contact / Handoff

This migration was started on October 2, 2025. The work is approximately 75% complete:
- ✅ Package structure reorganization
- ✅ Import path updates
- ✅ Frontmatter system implementation
- ⏳ Adapter integration (in progress)
- ❌ Testing and validation (blocked on adapter)
- ❌ API handler migration (future work per TODO docs)

Next developer should:
1. Review this document
2. Read the 4 TODO documents in `docs-internal/`
3. Fix `adapter.go` frontmatter integration
4. Run and fix tests
5. Update documentation
6. Proceed with API migration when ready
