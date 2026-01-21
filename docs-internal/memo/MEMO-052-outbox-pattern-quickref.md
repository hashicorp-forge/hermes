---
id: MEMO-052
title: Outbox Pattern Quick Reference
date: 2025-10-09
type: Guide
status: Draft
tags: [outbox, database, search-index, audit, identity]
related: []
---

# Document Tracking & Outbox Pattern - Quick Reference

## Core Requirements

### 1. Track Workspace Provider
- Every document knows which storage backend owns it (Google Drive, Local, S3, Azure)
- Added to `documents` table: `workspace_provider` TEXT field
- Tracked in all modification logs and outbox entries

### 2. Person Identity Management
- **Person**: Unique individual (ID, display_name)
- **PersonIdentity**: Multiple identities map to one person (email, OAuth sub, LDAP DN)
- Supports identity migrations (email changes, auth provider switches)
- Admin can link new identities to existing person via SQL

### 3. Document Modification Audit Trail
- `document_modification_log` table tracks every change
- Records: who (person_id), what (field_changes JSONB), when, from which provider
- Links to outbox for complete traceability

### 4. Outbox Pattern for Search Index
- Transactional writes: document + modification_log + outbox in single transaction
- Worker process polls outbox, updates search index asynchronously
- Retry logic with exponential backoff for failed operations

## Key Database Tables

```
person (id, display_name)
  ↓ 1:many
person_identity (person_id, identity_type, identity_value, provider_type, primary)
  ↓ references
documents (id, google_file_id, workspace_provider, last_modified_by_person_id)
  ↓ tracked by
document_modification_log (document_id, modified_by_person_id, modification_type, field_changes)
  ↓ triggers
document_outbox (document_id, workspace_provider, created_by_person_id, payload, status)
```

## API Handler Pattern

Every document write operation follows this flow:

```go
1. userEmail := pkgauth.MustGetUserEmail(r.Context())
2. person, err := auth.ResolvePersonFromContext(ctx, db, IdentityContext{
     Email: userEmail,
     ProviderType: "google" | "okta" | "dex"
   })
3. docCtx := &models.DocumentContext{
     PersonID: person.ID,
     Identity: userEmail,
     WorkspaceProvider: srv.WorkspaceProvider.Type(),
     APIEndpoint: r.URL.Path,
   }
4. err := model.UpsertWithContext(db, docCtx)
   // ^ Atomically writes: document + modification_log + outbox
5. // Remove old: go func() { searchProvider.Index(...) }
```

## Migration Strategy

### Phase 1: Schema & Models (Safe)
- Add new tables: person, person_identity, document_modification_log, document_outbox
- Add fields to documents: workspace_provider, last_modified_by_person_id
- Migrate existing users → person records

### Phase 2: Dark Launch (Dual Write)
- Write to outbox + keep existing synchronous indexing
- Start worker in read-only mode (logs, doesn't process)
- Verify correctness

### Phase 3: Full Rollout
- Enable worker processing
- Remove synchronous search indexing goroutines
- Monitor lag and error rates

### Rollback Plan
- Each phase has clear rollback point
- Can disable worker, revert to synchronous indexing
- Person/identity tables don't affect existing flows until used

## Identity Admin Operations

```sql
-- Link new email to existing person (after migration)
INSERT INTO person_identity (person_id, identity_type, identity_value, provider_type)
VALUES (123, 'email', 'new@email.com', 'google');

-- Merge duplicate person records
UPDATE person_identity SET person_id = 123 WHERE person_id = 456;
UPDATE documents SET last_modified_by_person_id = 123 WHERE last_modified_by_person_id = 456;
-- ... update other references ...
DELETE FROM person WHERE id = 456;

-- Set primary identity
UPDATE person_identity SET primary_identity = (identity_value = 'preferred@email.com')
WHERE person_id = 123 AND identity_type = 'email';
```

## Monitoring & Observability

### Key Metrics
- `hermes_outbox_lag_seconds` - Age of oldest pending entry
- `hermes_outbox_pending_count` - Backlog size
- `hermes_outbox_processed_rate` - Throughput
- `hermes_outbox_error_rate` - Failed operations
- `hermes_modification_log_count` - Audit trail growth

### Health Checks
- Outbox lag < 5 minutes (alert if higher)
- Failed entries < 100 (investigate if exceeded)
- Worker uptime (alert if down)

### Queries

```sql
-- Recent document history
SELECT m.created_at, m.modification_type, m.field_changes, 
       p.display_name, m.modified_by_identity, m.workspace_provider
FROM document_modification_log m
LEFT JOIN person p ON p.id = m.modified_by_person_id
WHERE m.document_google_file_id = 'ABC123'
ORDER BY m.created_at DESC LIMIT 20;

-- Outbox backlog by provider
SELECT workspace_provider, status, COUNT(*), MIN(created_at) as oldest
FROM document_outbox
GROUP BY workspace_provider, status;

-- Person with all identities
SELECT p.display_name, pi.identity_type, pi.identity_value, pi.provider_type, pi.primary_identity
FROM person p
JOIN person_identity pi ON pi.person_id = p.id
WHERE p.id = 123;
```

## Files Changed

### New Models
- `pkg/models/person.go`
- `pkg/models/document_modification_log.go`
- `pkg/models/document_outbox.go`
- `pkg/models/document_context.go`

### New Packages
- `pkg/auth/identity.go` - Identity resolution helpers
- `pkg/outbox/worker.go` - Worker process
- `pkg/outbox/processor.go` - Process outbox entries

### Modified Files
- `pkg/models/document.go` - Add UpsertWithContext()
- `pkg/models/gorm.go` - Add new models to AutoMigrate
- `internal/api/v2/documents.go` - Add person resolution
- `internal/api/v2/drafts.go` - Add person resolution
- `internal/api/v2/approvals.go` - Add person resolution
- `internal/api/v2/reviews.go` - Add person resolution
- `pkg/workspace/workspace.go` - Add Type() method
- `internal/cmd/hermes.go` - Add outbox-worker command

## Benefits

✅ **Transactional Consistency**: No lost search index updates  
✅ **Full Audit Trail**: Complete history of who changed what  
✅ **Identity Flexibility**: Support migrations, email changes  
✅ **Workspace Awareness**: Track storage backend per document  
✅ **Performance**: API responses not blocked by search indexing  
✅ **Reliability**: Automatic retry with exponential backoff  
✅ **Observability**: Metrics on lag, throughput, errors  
✅ **Compliance**: Complete audit trail for security/compliance needs  

## Next Actions

1. ✅ Design document complete
2. ⏳ Review with team
3. ⏳ Implement person/identity models
4. ⏳ Add modification logging to handlers
5. ⏳ Implement outbox writer integration
6. ⏳ Build outbox worker
7. ⏳ Remove synchronous indexing
8. ⏳ Deploy in phases with monitoring
