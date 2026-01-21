---
id: TODO-005
title: Fix Data Consistency Between Search Index and Database
date: 2025-10-09
type: TODO
priority: critical
status: open
tags: [data-consistency, search, database, fixme, bug]
related:
  - RFC-080
  - TODO-003
---

# Fix Data Consistency Between Search Index and Database

## Description

Multiple FIXME comments indicate data consistency issues between the search index (Algolia/Meilisearch) and PostgreSQL database. This can lead to:
- Stale search results showing outdated document data
- Missing documents in search that exist in database
- Search showing documents that were deleted from database

## Code References

### Drafts API (v1)
- **File**: `internal/api/drafts.go`
- **Lines**: 335, 661, 1096, 1151

```go
// FIXME: Data consistency check between search index and database.

// Line 1096:
// FIXME: The doc.ToAlgoliaObject() call was removed since we're not using 
// Algolia anymore. Need to implement proper search provider indexing.
```

## Root Cause

The code performs direct writes to both database and search index without:
1. Transaction guarantees across both systems
2. Retry logic for failed index updates
3. Reconciliation process for detecting drift
4. Audit trail of index operations

## Proposed Solution

Implement **Outbox Pattern** (RFC-080):

### Phase 1: Write to Outbox
1. Wrap database writes in transaction
2. Write index operation to outbox table in same transaction
3. Commit both atomically

### Phase 2: Background Processor
1. Worker reads from outbox table
2. Applies operations to search index
3. Marks outbox entry as processed
4. Retries on failure with exponential backoff

### Phase 3: Reconciliation
1. Periodic job compares database vs search index
2. Detects and logs inconsistencies
3. Queues repair operations to outbox

## Example Implementation

```go
// Instead of direct index update:
err := srv.SearchProvider.Index(document)

// Use outbox:
tx := db.Begin()
tx.Create(&document)
tx.Create(&OutboxEvent{
    Type: "document.index",
    Payload: document,
    Status: "pending",
})
tx.Commit()
```

## Tasks

- [ ] Design outbox table schema
- [ ] Implement outbox write in all document/draft operations
- [ ] Create background worker for processing outbox
- [ ] Add retry logic with exponential backoff
- [ ] Implement reconciliation job
- [ ] Add monitoring/alerting for drift detection
- [ ] Remove FIXME comments once implemented

## Impact

**Files Affected**: 1 file (`internal/api/drafts.go`), 4 FIXME locations  
**Complexity**: High  
**Risk**: Critical - data inconsistency affects search reliability

## Testing Strategy

1. **Unit Tests**: Mock outbox writes and worker processing
2. **Integration Tests**: Simulate DB success + index failure
3. **Chaos Tests**: Kill processes mid-operation, verify recovery
4. **Monitoring**: Track outbox queue depth and processing lag

## Related Work

- **RFC-080**: Outbox Pattern for Document Synchronization (detailed design)
- **TODO-003**: Migrate handlers to SearchProvider (prerequisite)

## References

- `internal/api/drafts.go` - Lines 335, 661, 1096, 1151
- RFC-080 - Complete outbox pattern specification
