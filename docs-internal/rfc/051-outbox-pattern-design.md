# RFC-051: Document Search Index Outbox Pattern

**Status**: Design Phase  
**Date**: October 8, 2025  
**Type**: RFC (Architecture Design)  
**Related**: RFC-047 (Local Workspace), RFC-026 (Document Editor)

## Context

Current architecture has transactional consistency issues:
1. API handlers call `SearchProvider.DocumentIndex().Index()` synchronously in goroutines after database commits
2. Search indexing failures result in database/search inconsistency (DB already committed)
3. No retry logic for failed indexing operations
4. No metrics on search synchronization lag or failure rates

## Proposed Solution: Outbox Pattern

### Architecture

**Transactional Write** (API handlers):
1. Find/create Person by identity (email + OAuth provider)
2. INSERT/UPDATE document (with `workspace_provider`, `last_modified_by_person_id`)
3. INSERT `document_modification_log` (audit trail)
4. INSERT `document_outbox` (search sync task)
5. COMMIT (atomic - all or nothing)

**Async Processing** (Outbox Worker):
1. Poll for pending entries (`status = 'pending'`)
2. SELECT FOR UPDATE SKIP LOCKED (prevents conflicts)
3. Process batch (max 100 entries)
4. Call `SearchProvider.DocumentIndex().Index()`
5. On success: UPDATE `status='processed'`
6. On error: Increment `retry_count`, exponential backoff
7. If `retry_count > MAX_RETRIES`: `status='failed'` (alert)

### Database Schema

**New Tables**:

```sql
-- Person (user identity across providers)
CREATE TABLE person (
    id BIGSERIAL PRIMARY KEY,
    display_name TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Person Identity (supports email changes, multi-provider)
CREATE TABLE person_identity (
    id BIGSERIAL PRIMARY KEY,
    person_id BIGINT NOT NULL REFERENCES person(id),
    identity_type TEXT NOT NULL,      -- 'email', 'oauth_sub', 'ldap_dn'
    identity_value TEXT NOT NULL,     -- actual identifier
    provider_type TEXT,               -- 'google', 'okta', 'dex'
    verified BOOLEAN NOT NULL DEFAULT false,
    primary_identity BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(identity_type, identity_value, provider_type)
);

-- Document Modification Log (audit trail)
CREATE TABLE document_modification_log (
    id BIGSERIAL PRIMARY KEY,
    document_id TEXT NOT NULL,
    modification_type TEXT NOT NULL,  -- 'created', 'updated', 'deleted', 'published'
    field_changes JSONB,              -- {"title": {"old": "...", "new": "..."}}
    modified_by_person_id BIGINT REFERENCES person(id),
    modified_by_identity TEXT,        -- email used at time of modification
    workspace_provider TEXT,          -- 'google', 'local', 's3', 'azure'
    api_endpoint TEXT,                -- '/api/v2/documents/:id'
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Document Outbox (search sync queue)
CREATE TABLE document_outbox (
    id BIGSERIAL PRIMARY KEY,
    document_id TEXT NOT NULL,
    document_pk INTEGER,              -- FK to documents(id)
    modification_log_id BIGINT REFERENCES document_modification_log(id),
    created_by_person_id BIGINT REFERENCES person(id),
    workspace_provider TEXT,
    operation TEXT NOT NULL,          -- 'index', 'delete'
    payload JSONB NOT NULL,           -- search.Document serialized
    status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'processed', 'failed'
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP
);

CREATE INDEX idx_outbox_pending ON document_outbox(status, created_at) 
    WHERE status = 'pending';
```

**Documents Table Additions**:
```sql
ALTER TABLE documents 
    ADD COLUMN workspace_provider TEXT NOT NULL DEFAULT 'google',
    ADD COLUMN last_modified_by_person_id BIGINT REFERENCES person(id);
```

### GORM Models

**Person** (`pkg/models/person.go`):
```go
type Person struct {
    ID          uint      `gorm:"primaryKey"`
    DisplayName string    `gorm:"not null"`
    Identities  []PersonIdentity `gorm:"foreignKey:PersonID"`
    CreatedAt   time.Time
    UpdatedAt   time.Time
}

type PersonIdentity struct {
    ID              uint   `gorm:"primaryKey"`
    PersonID        uint   `gorm:"not null"`
    IdentityType    string `gorm:"not null"` // email, oauth_sub, ldap_dn
    IdentityValue   string `gorm:"not null"`
    ProviderType    string // google, okta, dex
    Verified        bool   `gorm:"not null;default:false"`
    PrimaryIdentity bool   `gorm:"not null;default:false"`
    CreatedAt       time.Time
}
```

**DocumentModificationLog** (`pkg/models/document_modification_log.go`):
```go
type DocumentModificationLog struct {
    ID                  uint       `gorm:"primaryKey"`
    DocumentID          string     `gorm:"not null"`
    ModificationType    string     `gorm:"not null"`
    FieldChanges        datatypes.JSON
    ModifiedByPersonID  *uint
    ModifiedByIdentity  string
    WorkspaceProvider   string
    APIEndpoint         string
    CreatedAt           time.Time
}
```

**DocumentOutbox** (`pkg/models/document_outbox.go`):
```go
type DocumentOutbox struct {
    ID                  uint       `gorm:"primaryKey"`
    DocumentID          string     `gorm:"not null"`
    DocumentPK          *uint
    ModificationLogID   *uint
    CreatedByPersonID   *uint
    WorkspaceProvider   string
    Operation           string     `gorm:"not null"` // index, delete
    Payload             datatypes.JSON `gorm:"not null"`
    Status              string     `gorm:"not null;default:pending"`
    RetryCount          int        `gorm:"not null;default:0"`
    LastError           string
    CreatedAt           time.Time
    ProcessedAt         *time.Time
}

func (DocumentOutbox) FindPendingOutboxEntries(db *gorm.DB, limit int) ([]DocumentOutbox, error)
func (o *DocumentOutbox) MarkProcessed(db *gorm.DB) error
func (o *DocumentOutbox) IncrementRetry(db *gorm.DB, err error) error
```

### API Handler Pattern

```go
// DocumentContext passed to UpsertWithContext
type DocumentContext struct {
    Person            *Person
    IdentityValue     string        // email at time of request
    WorkspaceProvider string        // "google", "local", "s3"
    APIEndpoint       string        // "/api/v2/documents/:id"
}

// In API handler (e.g., internal/api/v2/documents.go)
func (h *DocumentHandler) PatchDocument(c *gin.Context) {
    // 1. Resolve person from auth context
    person, err := auth.ResolvePersonFromContext(c, h.DB)
    
    // 2. Build DocumentContext
    ctx := DocumentContext{
        Person:            person,
        IdentityValue:     person.GetPrimaryIdentity().IdentityValue,
        WorkspaceProvider: h.WorkspaceProvider.Type(), // "google" or "local"
        APIEndpoint:       c.Request.URL.Path,
    }
    
    // 3. Upsert with context (single transaction)
    err = doc.UpsertWithContext(h.DB, ctx)
    // Commits: document + modification_log + outbox
}
```

### Outbox Worker

**Process** (`pkg/outbox/worker.go`):
```go
type Worker struct {
    db             *gorm.DB
    searchProvider search.Provider
    batchSize      int
    pollInterval   time.Duration
}

func (w *Worker) Start(ctx context.Context) error {
    ticker := time.NewTicker(w.pollInterval)
    for {
        select {
        case <-ticker.C:
            w.processBatch(ctx)
        case <-ctx.Done():
            return ctx.Err()
        }
    }
}

func (w *Worker) processBatch(ctx context.Context) error {
    entries, _ := DocumentOutbox{}.FindPendingOutboxEntries(w.db, w.batchSize)
    for _, entry := range entries {
        w.processEntry(ctx, &entry)
    }
}
```

### Benefits

1. **Transactional Consistency**: Outbox writes atomic with document updates
2. **At-Least-Once Delivery**: Worker retries with exponential backoff
3. **Decoupled Processing**: Search indexing async, doesn't block API responses
4. **Full Audit Trail**: `document_modification_log` tracks all changes with person/identity
5. **Identity Management**: `person`/`person_identity` supports email changes, multi-provider auth
6. **Workspace Tracking**: Documents tagged with storage provider (`google`, `local`, `s3`, `azure`)
7. **Observability**: Metrics on lag, throughput, retry counts, failure rates

## Migration Strategy

**Phase 1**: Add `person` and `person_identity` tables, migrate from `users`  
**Phase 2**: Add `workspace_provider` to `documents`, backfill existing records  
**Phase 3**: Add `document_modification_log` table, start logging modifications  
**Phase 4**: Add `document_outbox` table, modify API handlers to use `UpsertWithContext`  
**Phase 5**: Deploy outbox worker, remove synchronous search indexing goroutines  

## Implementation Status

❌ Person/Identity models  
❌ DocumentModificationLog model  
❌ DocumentOutbox model  
❌ Document model enhancements  
❌ Identity resolution helpers  
❌ UpsertWithContext implementation  
❌ API handler integration  
❌ Workspace provider Type() method  
❌ Outbox worker process  

## References

- Source: `OUTBOX_PATTERN_DESIGN.md`, `OUTBOX_PATTERN_QUICK_REF.md`
- Related: `LOCAL_WORKSPACE_PROVIDER_COMPLETE.md`, `DOCUMENT_EDITOR_IMPLEMENTATION.md`
