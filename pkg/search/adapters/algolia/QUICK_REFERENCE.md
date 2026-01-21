# Adapter Pattern Migration - Quick Reference

## Status: ✅ COMPLETE

The Hermes codebase has been fully migrated from the legacy `pkg/algolia` compatibility layer to using the `pkg/search/adapters/algolia` adapter pattern directly.

## What Changed

### Import Pattern
```go
// Before (REMOVED):
import "github.com/hashicorp-forge/hermes/pkg/algolia"

// Now:
import algoliaadapter "github.com/hashicorp-forge/hermes/pkg/search/adapters/algolia"
```

### Initialization
```go
// Before:
algoSearch, err := algolia.NewSearchClient(cfg.Algolia)
algoWrite, err := algolia.New(cfg.Algolia)

// Now:
algoSearch, err := algoliaadapter.NewSearchAdapter(cfg.Algolia)
algoWrite, err := algoliaadapter.NewAdapter(cfg.Algolia)
```

### Field Access
```go
// Before:
algo.Docs.SaveObject(doc)
algo.Drafts.Search(query)
algo.Internal.GetObject(id, &obj)

// Now (methods, not fields):
algo.Docs().SaveObject(doc)
algo.Drafts().Search(query)
algo.Internal().GetObject(id, &obj)
```

### Proxy Handler
```go
// Before:
handler := algolia.AlgoliaProxyHandler(algoSearch, cfg.Algolia, logger)

// Now:
handler := algoSearch.ProxyHandler(logger)
```

## Files Changed: 26

- ✅ `internal/config/config.go`
- ✅ `internal/server/server.go`
- ✅ `internal/cmd/commands/server/server.go`
- ✅ All `internal/api/*.go` (7 files)
- ✅ All `internal/api/v2/*.go` (8 files)
- ✅ `pkg/links/*.go` (2 files)
- ✅ `web/web.go`
- ✅ `internal/indexer/*.go` (2 files)
- ✅ `internal/cmd/commands/indexer/indexer.go`
- ✅ `internal/cmd/commands/operator/migrate_algolia_to_postgresql.go`
- ✅ `tests/api/suite.go`
- ✅ `internal/pkg/featureflags/flags.go`

## Removed

- ❌ `pkg/algolia/` (entire package deleted)

## Verification

```bash
✅ Build: make bin        # Successful
✅ Tests: make go/test    # All passing
✅ References: 0 in *.go  # Clean
```

## Documentation

For complete details, see:
- `docs-internal/ADAPTER_MIGRATION_COMPLETE.md` - Full migration summary
- `pkg/search/adapters/algolia/MIGRATION.md` - Adapter-specific details
- `pkg/search/ABSTRACTION_STRATEGY.md` - Architecture overview

## Using Adapters (For New Code)

```go
import algoliaadapter "github.com/hashicorp-forge/hermes/pkg/search/adapters/algolia"

// Read-only search operations:
adapter, err := algoliaadapter.NewSearchAdapter(cfg.Algolia)
if err != nil {
    return err
}

// Full access (read + write):
adapter, err := algoliaadapter.NewAdapter(cfg.Algolia)
if err != nil {
    return err
}

// Use the adapter:
results, err := adapter.Docs().Search("query")
_, err = adapter.Docs().SaveObject(doc)
proxyHandler := adapter.ProxyHandler(logger)
```

## Key Takeaways

1. **No more pkg/algolia** - Package completely removed
2. **Direct adapter usage** - No compatibility layer
3. **Methods not fields** - All index accessors are now methods: `.Docs()` not `.Docs`
4. **Zero breaking changes** - All tests pass, functionality preserved
5. **Future-ready** - Easy to add new search backends using same pattern

---
*Migration completed: October 2025*
