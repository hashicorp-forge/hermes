---
id: TODO-010
title: Remove Legacy Algolia Products Requirement
date: 2025-10-09
type: TODO
priority: low
status: open
tags: [algolia, products, legacy, technical-debt]
related:
  - TODO-003
  - RFC-076
---

# Remove Legacy Algolia Products Requirement

## Description

Products are currently indexed in Algolia for legacy reasons, but the V2 API now uses the database directly. The Algolia indexing should be removed once all legacy consumers are migrated.

## Code References

- **File**: `internal/cmd/commands/server/server.go`
- **Lines**: 535, 762

```go
// Line 535:
// TODO: remove this and use the database for all document type lookups.

// Line 762:
// TODO: products are currently needed in Algolia for legacy reasons - remove
//       this when we've fully migrated to using the database.
```

## Background

### Current State
- Products are stored in PostgreSQL database
- Products are also indexed in Algolia
- V2 API uses database (✅ modern approach)
- Some legacy code may still query Algolia

### Why This Exists
Historical reasons - products were originally only in Algolia before database storage was added.

## Migration Path

### Step 1: Identify Legacy Consumers
Search codebase for:
```bash
grep -r "srv.AlgoSearch.*products\|AlgoSearch\.Internal" internal/ pkg/
```

### Step 2: Migrate or Remove Legacy Code
- Migrate to database queries
- Remove if no longer needed

### Step 3: Remove Products from Indexer
- Stop indexing products to Algolia
- Remove products from search index configuration
- Clean up products index initialization code

### Step 4: Verify No Breakage
- Check frontend doesn't rely on Algolia products
- Verify all API endpoints work
- Run integration tests

## Tasks

- [ ] Audit all Algolia products usage
- [ ] Create migration plan for any legacy consumers
- [ ] Remove products from indexer
- [ ] Remove products index initialization
- [ ] Update documentation
- [ ] Run full test suite
- [ ] Remove TODO comments

## Impact

**Complexity**: Low-Medium  
**Risk**: Low (V2 API already database-only)  
**Benefits**:
- Reduced Algolia usage/costs
- Simpler architecture
- One source of truth (database)

## Blockers

- Must verify no frontend code queries Algolia for products
- Must ensure all APIs use database

## References

- `internal/cmd/commands/server/server.go` - Product indexing code
- `internal/api/v2/products.go` - Database-based implementation
- TODO-003 - Search provider migration
