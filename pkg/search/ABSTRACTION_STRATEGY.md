# Search Backend Abstraction - Implementation Strategy

## Current State

The Hermes codebase has been partially migrated to support multiple search backends through a common abstraction layer. Here's what exists:

### Completed
1. ✅ **Search Provider Interface** (`pkg/search/search.go`)
   - `Provider` interface for basic search operations
   - `ProxyProvider` interface for frontend API proxy capabilities
   - `DocumentIndex` and `DraftIndex` interfaces for index operations

2. ✅ **Algolia Adapter** (`pkg/search/adapters/algolia/`)
   - Full implementation of `Provider` and `ProxyProvider` interfaces
   - Index configuration and management
   - HTTP proxy handler for frontend requests
   - Public accessor methods for legacy compatibility

3. ✅ **Meilisearch Adapter** (`pkg/search/adapters/meilisearch/`)
   - Basic implementation of `Provider` interface

4. ✅ **Legacy Compatibility Layer** (`pkg/algolia/`)
   - Thin wrapper around the new adapter
   - Maintains backward compatibility with existing code
   - No breaking changes required

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Code                         │
│  (internal/api/, internal/server/, internal/indexer/, etc.)│
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Uses: pkg/algolia.Client
                     │       pkg/algolia.Config
                     │
┌────────────────────▼────────────────────────────────────────┐
│           Legacy Compatibility Layer                        │
│              pkg/algolia/                                   │
│  • client.go - Wraps adapter                               │
│  • proxy.go - Delegates to adapter ProxyHandler            │
│  • Config - Re-exports adapter.Config                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Delegates to
                     │
┌────────────────────▼────────────────────────────────────────┐
│           Search Abstraction Layer                          │
│              pkg/search/                                    │
│  • Provider interface                                       │
│  • ProxyProvider interface                                  │
│  • DocumentIndex / DraftIndex interfaces                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Implements
                     │
┌────────────────────▼────────────────────────────────────────┐
│              Backend Adapters                               │
│  pkg/search/adapters/algolia/                              │
│  pkg/search/adapters/meilisearch/                          │
│  • Full search.Provider implementation                      │
│  • Backend-specific configuration                           │
│  • Index management                                         │
└─────────────────────────────────────────────────────────────┘
```

## Why This Approach?

### The Tight Coupling Problem
The codebase has **extensive tight coupling** to Algolia-specific types:
- 60+ files import `pkg/algolia`
- API handlers expect `*algolia.Client` directly
- Direct access to Algolia index objects (`Docs`, `Drafts`, etc.)
- Algolia-specific operations scattered throughout the codebase

### The Solution: Gradual Migration
Instead of a breaking "big bang" refactoring, we use a **compatibility layer**:

1. **pkg/algolia remains** as a thin wrapper
2. **Internal implementation** moved to `pkg/search/adapters/algolia`
3. **No breaking changes** to existing code
4. **Future-ready** - new code can use the adapter directly

## Benefits of Current Design

### ✅ Zero Breaking Changes
- All existing code continues to work
- No mass refactoring required
- Safe, incremental migration path

### ✅ Backend Abstraction
- Common interfaces in `pkg/search`
- Easy to add new backends (Meilisearch, Elasticsearch, etc.)
- Test with mock implementations

### ✅ Clean Separation
- Backend-specific code in `pkg/search/adapters/`
- Search logic separated from business logic
- Configuration management per backend

### ✅ Legacy Compatibility
- `pkg/algolia` provides familiar API
- Direct index access when needed
- Proxy handler abstraction

## Migration Paths

### For New Code
```go
import "github.com/hashicorp-forge/hermes/pkg/search/adapters/algolia"

// Create adapter directly
adapter, err := algolia.NewAdapter(cfg)
if err != nil {
    // handle error
}

// Use through interfaces
docIndex := adapter.DocumentIndex()
err = docIndex.Index(ctx, doc)

// For proxy (frontend API)
proxyHandler := adapter.ProxyHandler(logger)
router.Handle("/1/indexes/", proxyHandler)
```

### For Existing Code (No Changes Required)
```go
import "github.com/hashicorp-forge/hermes/pkg/algolia"

// Works exactly as before
client, err := algolia.New(cfg)
if err != nil {
    // handle error
}

// Direct index access still works
_, err = client.Docs.SaveObject(doc)
```

## Recommendations

### Short Term (Current Approach) ✅
1. Keep `pkg/algolia` as compatibility wrapper
2. All new search backend code goes in `pkg/search/adapters/`
3. Continue using existing patterns in the codebase
4. No mass refactoring required

### Medium Term (Gradual Migration)
1. New features use adapter interfaces directly
2. Gradually update API handlers to accept `search.Provider` interface
3. Create helper functions to wrap adapters
4. Update one module at a time

### Long Term (Full Abstraction)
1. Deprecate `pkg/algolia` package
2. All code uses `pkg/search` interfaces
3. Configuration selects backend (Algolia, Meilisearch, etc.)
4. Complete backend independence

## Current Files

### Core Search Abstraction
- `pkg/search/search.go` - Provider interfaces
- `pkg/search/errors.go` - Common error types
- `pkg/search/factory.go` - Factory documentation
- `pkg/search/doc.go` - Package documentation

### Algolia Implementation
- `pkg/search/adapters/algolia/adapter.go` - Main implementation
- `pkg/search/adapters/algolia/adapter_test.go` - Unit tests
- `pkg/search/adapters/algolia/doc.go` - Package documentation
- `pkg/search/adapters/algolia/README.md` - Usage guide
- `pkg/search/adapters/algolia/MIGRATION.md` - Migration notes

### Legacy Compatibility
- `pkg/algolia/client.go` - Wrapper around adapter
- `pkg/algolia/proxy.go` - Proxy handler delegation
- `pkg/algolia/doc.go` - Package documentation

## What NOT to Do

### ❌ Don't Mass Refactor
Changing 60+ files to use new interfaces would be:
- High risk of bugs
- Difficult to review
- Long PR cycle
- Potential for breaking changes

### ❌ Don't Remove pkg/algolia Yet
It provides:
- Backward compatibility
- Stable API for existing code
- Migration buffer
- Safety net

### ❌ Don't Force Interface Usage Everywhere
Let adoption happen naturally:
- New code uses adapters
- Critical paths stay stable
- Update on touch
- Prove value first

## Success Criteria

This migration is successful if:
1. ✅ Code builds without errors
2. ✅ All tests pass
3. ✅ No breaking changes to existing code
4. ✅ New backends can be added easily
5. ✅ Clear migration path for future work
6. ✅ Documentation explains the approach

All criteria are currently met! 🎉

## Next Steps

1. **Document the pattern** - Create examples of using adapters directly
2. **Add integration tests** - Test with real backends when possible
3. **Monitor adoption** - See which teams use new interfaces
4. **Gather feedback** - Learn what works and what doesn't
5. **Iterate** - Improve interfaces based on real usage

## Questions & Answers

**Q: Why not just use the adapter everywhere?**
A: Too many files would need changes. The compatibility layer lets us migrate gradually.

**Q: Is this over-engineered?**
A: No - we're planning for multiple backends. The abstraction pays off when adding Meilisearch support.

**Q: When should I use the adapter vs. pkg/algolia?**
A: Use pkg/algolia for existing code. Use adapters for new features that might support multiple backends.

**Q: How do I add a new search backend?**
A: Create a new adapter in `pkg/search/adapters/` that implements `search.Provider`. See Meilisearch adapter as example.

**Q: What about the proxy handler?**
A: It's abstracted in `search.ProxyProvider` interface. Backends that support frontend API access implement it.

## Summary

We've successfully created a search backend abstraction layer while maintaining 100% backward compatibility. The code is:
- ✅ **Compiling and passing tests**
- ✅ **Backward compatible** with existing code
- ✅ **Future-proof** for multiple backends
- ✅ **Well-documented** for future developers
- ✅ **Incrementally adoptable** without breaking changes

This is the right approach for a large codebase with extensive dependencies on a specific search backend.
