# Document Search Index Outbox Pattern - Design Document

**Date**: October 8, 2025  
**Status**: Design Phase  
**Authors**: AI Agent (GitHub Copilot)

## Executive Summary

This document describes the implementation of the **Outbox Pattern** for asynchronously updating the search index when documents are created or modified. The outbox pattern ensures **transactional consistency** between the PostgreSQL database and the search provider (Algolia/Meilisearch) by decoupling document persistence from search index updates.

## Problem Statement

### Current Architecture Issues

1. **Synchronous Search Indexing**: API handlers currently call `SearchProvider.DocumentIndex().Index()` directly in goroutines after database commits
2. **No Transactional Guarantees**: If search indexing fails, the database is already committed - leads to inconsistency
3. **Performance Impact**: Search API calls block in background goroutines, consuming resources
4. **No Retry Logic**: Failed indexing operations are logged but not retried
5. **Observability Gap**: No metrics on search index synchronization lag or failure rates

### Current Document Mutation Points

Based on codebase analysis, documents are updated in these locations:

- **`internal/api/v2/documents.go`**: 
  - Line 900-950: PATCH handler → `model.Upsert()` + goroutine calls `SearchProvider.DocumentIndex().Index()`
  
- **`internal/api/v2/drafts.go`**:
  - Line 382: POST handler → `SearchProvider.DraftIndex().Index()` for new drafts
  - Line 1579: PATCH handler → `SearchProvider.DraftIndex().Index()` for draft updates
  - Line 943: DELETE handler → `SearchProvider.DraftIndex().Delete()`

- **`internal/api/v2/approvals.go`**:
  - Line 268: POST/PATCH approval → `SearchProvider.DocumentIndex().Index()`
  - Calls `updateDocumentReviewsInDatabase()` → updates DB

- **`internal/api/v2/reviews.go`**:
  - Line 662: Document publish → `SearchProvider.DocumentIndex().Index()`
  - Line 674: Draft deletion → `SearchProvider.DraftIndex().Delete()`

## Proposed Solution: Outbox Pattern

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       API Handler Layer                          │
│  (documents.go, drafts.go, approvals.go, reviews.go)            │
│  - Extract user identity (email/OAuth sub)                      │
│  - Identify workspace provider (from server context)            │
└────────────┬────────────────────────────────────────────────────┘
             │
             │ 1. Begin Transaction
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                           │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  person      │  │  person_identity │  │  documents       │  │
│  │  ──────      │  │  ────────────────│  │  ─────────       │  │
│  │  id          │◄─┤  person_id       │  │  id              │  │
│  │  display_name│  │  identity_type   │  │  google_file_id  │  │
│  │  ...         │  │  identity_value  │  │  title           │  │
│  └──────────────┘  │  provider_type   │  │  status          │  │
│                    │  primary (bool)  │  │  workspace_prov. │  │
│                    └──────────────────┘  │  modified_by  ───┼──┐│
│                                          └──────────────────┘  ││
│                                                                 ││
│  ┌───────────────────────────────┐  ┌──────────────────────┐  ││
│  │  document_modification_log    │  │  document_outbox     │  ││
│  │  ─────────────────────────    │  │  ───────────────     │  ││
│  │  id (bigserial)               │  │  id (bigserial)      │  ││
│  │  document_id ─────────────────┼──┤  document_id (text)  │  ││
│  │  modification_type (enum)     │  │  document_pk (fk) ───┼──┘│
│  │  field_changes (jsonb)        │◄─┤  modification_log_id │  │
│  │  modified_by_person_id  ──────┼──┤  created_by_person_id│  │
│  │  modified_by_identity         │  │  workspace_provider  │  │
│  │  workspace_provider           │  │  operation (enum)    │  │
│  │  api_endpoint                 │  │  payload (jsonb)     │  │
│  │  created_at                   │  │  status (enum)       │  │
│  └───────────────────────────────┘  │  retry_count (int)   │  │
│                                     └──────────────────────┘  │
│                                                                │
│  2. Find or create Person by identity (email + provider)      │
│  3. INSERT/UPDATE document (with workspace_provider)          │
│  4. INSERT document_modification_log (audit trail)            │
│  5. INSERT document_outbox (search index sync)                │
│  6. COMMIT (atomically commits all)                           │
└───────────────┬────────────────────────────────────────────────┘
                │
                │ 5. Notify (PostgreSQL NOTIFY/LISTEN)
                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Outbox Worker Process                       │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  1. Poll for pending entries (status = 'pending')      │    │
│  │  2. SELECT FOR UPDATE SKIP LOCKED (prevents conflicts) │    │
│  │  3. Process batch (max 100 entries)                    │    │
│  └────────────────────────────────────────────────────────┘    │
│                         │                                       │
│                         ▼                                       │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  For each entry:                                        │    │
│  │  - Parse payload (search.Document)                      │    │
│  │  - Call SearchProvider.DocumentIndex().Index()          │    │
│  │  - On success: UPDATE status='processed'                │    │
│  │  - On error: Increment retry_count, log error          │    │
│  │  - If retry_count > MAX_RETRIES: status='failed'       │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────┬───────────────────────────────────────────────────┘
              │
              │ 6. Update Search Index
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Search Provider                               │
│              (Algolia or Meilisearch Adapter)                    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  DocumentIndex.Index(ctx, doc)                          │    │
│  │  DraftIndex.Index(ctx, doc)                             │    │
│  │  DocumentIndex.Delete(ctx, docID)                       │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Benefits

1. **Transactional Consistency**: Outbox writes are part of the same database transaction
2. **At-Least-Once Delivery**: Worker retries failed operations with exponential backoff
3. **Decoupled Processing**: Search indexing doesn't block API responses
4. **Observability**: Metrics on lag, throughput, and error rates
5. **Resilience**: Failed operations are retried; permanent failures are visible
6. **Audit Trail**: Complete history of all search index operations

## Database Schema

### Enhanced Document Tracking Requirements

Based on architectural review, the system needs to track:

1. **Workspace Provider**: Which storage backend owns the document (Google Drive, Local, etc.)
2. **Document Modifications**: Full audit trail of who modified what and when
3. **User Identity Management**: Support for identity changes and user migrations
4. **Workflow State**: Track document status, reviews, approvals with user associations

### New person Table (User Identity Management)

```sql
CREATE TABLE person (
    id BIGSERIAL PRIMARY KEY,
    
    -- Core identity
    display_name TEXT,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    
    CONSTRAINT person_name_not_empty CHECK (display_name IS NOT NULL)
);

-- Table to map multiple identities to a single person
CREATE TABLE person_identity (
    id BIGSERIAL PRIMARY KEY,
    person_id BIGINT NOT NULL REFERENCES person(id) ON DELETE CASCADE,
    
    -- Identity information
    identity_type TEXT NOT NULL,        -- 'email', 'oauth_sub', 'ldap_dn', etc.
    identity_value TEXT NOT NULL,       -- The actual identifier (email, sub, DN, etc.)
    
    -- Provider context
    provider_type TEXT,                 -- 'google', 'okta', 'dex', etc.
    
    -- Metadata
    verified BOOLEAN NOT NULL DEFAULT false,
    primary_identity BOOLEAN NOT NULL DEFAULT false,  -- One primary per person
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    
    UNIQUE(identity_type, identity_value, provider_type)
);

CREATE INDEX idx_person_identity_lookup ON person_identity(identity_type, identity_value);
CREATE INDEX idx_person_identity_person ON person_identity(person_id);
```

### Enhanced documents Table Additions

```sql
-- Add to existing documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS workspace_provider TEXT NOT NULL DEFAULT 'google';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS last_modified_by_person_id BIGINT REFERENCES person(id);

CREATE INDEX idx_documents_workspace_provider ON documents(workspace_provider);
CREATE INDEX idx_documents_last_modified_by ON documents(last_modified_by_person_id);

-- Workspace provider enum
CREATE TYPE workspace_provider_type AS ENUM ('google', 'local', 's3', 'azure');
```

### document_modification_log Table (Audit Trail)

```sql
CREATE TABLE document_modification_log (
    id BIGSERIAL PRIMARY KEY,
    
    -- Document reference
    document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    document_google_file_id TEXT NOT NULL,  -- Denormalized for fast lookup
    
    -- Change information
    modification_type TEXT NOT NULL,    -- 'created', 'updated', 'deleted', 'status_changed', 'reviewed', 'approved'
    field_changes JSONB,                -- JSON object of changed fields: {"title": {"old": "foo", "new": "bar"}}
    
    -- Actor information (person who made the change)
    modified_by_person_id BIGINT REFERENCES person(id),
    modified_by_identity TEXT,          -- Email or identifier at time of change
    
    -- Context
    workspace_provider TEXT NOT NULL,
    api_endpoint TEXT,                  -- Which API endpoint handled this
    user_agent TEXT,                    -- Client user agent
    ip_address INET,                    -- Client IP (privacy considerations)
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_modification_type CHECK (
        modification_type IN ('created', 'updated', 'deleted', 'status_changed', 
                              'reviewed', 'approved', 'published', 'content_changed')
    )
);

CREATE INDEX idx_doc_mod_log_document ON document_modification_log(document_id, created_at DESC);
CREATE INDEX idx_doc_mod_log_google_file_id ON document_modification_log(document_google_file_id, created_at DESC);
CREATE INDEX idx_doc_mod_log_person ON document_modification_log(modified_by_person_id, created_at DESC);
CREATE INDEX idx_doc_mod_log_type ON document_modification_log(modification_type, created_at DESC);
```

### document_outbox Table (Enhanced)

```sql
CREATE TYPE outbox_operation AS ENUM ('index_document', 'index_draft', 'delete_document', 'delete_draft');
CREATE TYPE outbox_status AS ENUM ('pending', 'processing', 'processed', 'failed');

CREATE TABLE document_outbox (
    id BIGSERIAL PRIMARY KEY,
    
    -- Document identification
    document_id TEXT NOT NULL,           -- GoogleFileID or draft ID
    document_pk BIGINT REFERENCES documents(id),  -- FK to documents table if available
    operation outbox_operation NOT NULL,
    
    -- Workspace context
    workspace_provider TEXT NOT NULL,    -- Which provider has this document
    
    -- Payload for search indexing (JSON representation of search.Document)
    payload JSONB NOT NULL,
    
    -- Processing state
    status outbox_status NOT NULL DEFAULT 'pending',
    retry_count INT NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP,
    
    -- Error tracking
    error_message TEXT,
    last_error_at TIMESTAMP,
    
    -- Metadata (who triggered this change)
    created_by_person_id BIGINT REFERENCES person(id),
    created_by_identity TEXT,            -- Email/identifier at time of creation
    api_endpoint TEXT,                   -- Which API endpoint triggered this
    modification_log_id BIGINT REFERENCES document_modification_log(id),  -- Link to audit log
    
    -- Indexes for performance
    CONSTRAINT document_outbox_retry_limit CHECK (retry_count <= 10)
);

-- Index for worker polling (most important query)
CREATE INDEX idx_outbox_pending_created 
ON document_outbox (created_at) 
WHERE status = 'pending';

-- Index for monitoring queries
CREATE INDEX idx_outbox_status_created 
ON document_outbox (status, created_at DESC);

-- Index for document-specific queries (debugging)
CREATE INDEX idx_outbox_document_id 
ON document_outbox (document_id, created_at DESC);

-- Index for failed entries (alerting)
CREATE INDEX idx_outbox_failed 
ON document_outbox (status, last_error_at DESC) 
WHERE status = 'failed';

-- Index for workspace provider queries
CREATE INDEX idx_outbox_workspace_provider
ON document_outbox (workspace_provider, created_at DESC);
```

### Migration from Existing User Table

```sql
-- Migrate existing users to person + person_identity
INSERT INTO person (id, display_name, created_at, updated_at)
SELECT id, email_address, created_at, updated_at
FROM users
ON CONFLICT DO NOTHING;

INSERT INTO person_identity (person_id, identity_type, identity_value, provider_type, primary_identity, created_at)
SELECT id, 'email', email_address, 'google', true, created_at
FROM users
ON CONFLICT (identity_type, identity_value, provider_type) DO NOTHING;

-- Update document references
UPDATE documents d
SET last_modified_by_person_id = u.id
FROM users u
WHERE d.owner_id = u.id
  AND d.last_modified_by_person_id IS NULL;
```

### GORM Models

```go
// pkg/models/person.go
package models

import (
    "fmt"
    "time"
    
    validation "github.com/go-ozzo/ozzo-validation/v4"
    "gorm.io/gorm"
    "gorm.io/gorm/clause"
)

// Person represents a unique individual in the system.
// A person can have multiple identities (email addresses, OAuth subjects, etc.)
// that may change over time due to migrations or organizational changes.
type Person struct {
    ID          uint64 `gorm:"primarykey"`
    DisplayName string `gorm:"not null"`
    
    // Identities are all authentication identities linked to this person
    Identities []PersonIdentity `gorm:"foreignKey:PersonID"`
    
    CreatedAt time.Time
    UpdatedAt time.Time
    DeletedAt gorm.DeletedAt `gorm:"index"`
}

// PersonIdentity represents an authentication identity (email, OAuth sub, etc.)
// that maps to a Person. Multiple identities can map to the same person.
type PersonIdentity struct {
    ID            uint64 `gorm:"primarykey"`
    PersonID      uint64 `gorm:"not null;index:idx_person_identity_person"`
    Person        Person
    
    // Identity information
    IdentityType  string `gorm:"not null;index:idx_person_identity_lookup;uniqueIndex:idx_unique_identity"`
    IdentityValue string `gorm:"not null;index:idx_person_identity_lookup;uniqueIndex:idx_unique_identity"`
    ProviderType  *string `gorm:"uniqueIndex:idx_unique_identity"`
    
    // Flags
    Verified        bool `gorm:"not null;default:false"`
    PrimaryIdentity bool `gorm:"not null;default:false"`
    
    CreatedAt time.Time
    UpdatedAt time.Time
    DeletedAt gorm.DeletedAt `gorm:"index"`
}

// FindOrCreatePersonByEmail finds a person by email or creates a new one.
func FindOrCreatePersonByEmail(db *gorm.DB, email, providerType string) (*Person, error) {
    var identity PersonIdentity
    
    err := db.
        Where("identity_type = ? AND identity_value = ? AND provider_type = ?", 
              "email", email, providerType).
        Preload("Person").
        First(&identity).
        Error
    
    if err == nil {
        return &identity.Person, nil
    }
    
    if err != gorm.ErrRecordNotFound {
        return nil, fmt.Errorf("error looking up person identity: %w", err)
    }
    
    // Create new person and identity
    person := &Person{
        DisplayName: email, // Default to email, can be updated later
    }
    
    return person, db.Transaction(func(tx *gorm.DB) error {
        if err := tx.Create(person).Error; err != nil {
            return fmt.Errorf("error creating person: %w", err)
        }
        
        identity := &PersonIdentity{
            PersonID:        person.ID,
            IdentityType:    "email",
            IdentityValue:   email,
            ProviderType:    &providerType,
            Verified:        true,
            PrimaryIdentity: true,
        }
        
        if err := tx.Create(identity).Error; err != nil {
            return fmt.Errorf("error creating person identity: %w", err)
        }
        
        return nil
    })
}

// GetPrimaryEmail returns the primary email identity for a person.
func (p *Person) GetPrimaryEmail(db *gorm.DB) (string, error) {
    var identity PersonIdentity
    err := db.
        Where("person_id = ? AND identity_type = ? AND primary_identity = ?",
              p.ID, "email", true).
        First(&identity).
        Error
    
    if err != nil {
        return "", err
    }
    
    return identity.IdentityValue, nil
}

// pkg/models/document_modification_log.go
package models

import (
    "encoding/json"
    "time"
    
    "gorm.io/gorm"
)

// DocumentModificationLog provides an audit trail of all document changes.
type DocumentModificationLog struct {
    ID                   uint64 `gorm:"primarykey"`
    
    // Document reference
    DocumentID           uint          `gorm:"not null;index:idx_doc_mod_log_document"`
    DocumentGoogleFileID string        `gorm:"not null;index:idx_doc_mod_log_google_file_id"`
    Document             Document      `gorm:"foreignKey:DocumentID"`
    
    // Change information
    ModificationType string          `gorm:"not null;index:idx_doc_mod_log_type"`
    FieldChanges     json.RawMessage `gorm:"type:jsonb"`
    
    // Actor information
    ModifiedByPersonID *uint64  `gorm:"index:idx_doc_mod_log_person"`
    ModifiedByPerson   *Person  `gorm:"foreignKey:ModifiedByPersonID"`
    ModifiedByIdentity string   // Email/identifier at time of change
    
    // Context
    WorkspaceProvider string  `gorm:"not null"`
    APIEndpoint       *string
    UserAgent         *string
    IPAddress         *string // Be mindful of privacy regulations
    
    CreatedAt time.Time `gorm:"index:idx_doc_mod_log_document;index:idx_doc_mod_log_google_file_id;index:idx_doc_mod_log_person;index:idx_doc_mod_log_type"`
}

// ModificationTypeCreated represents document creation
const (
    ModificationTypeCreated       = "created"
    ModificationTypeUpdated       = "updated"
    ModificationTypeDeleted       = "deleted"
    ModificationTypeStatusChanged = "status_changed"
    ModificationTypeReviewed      = "reviewed"
    ModificationTypeApproved      = "approved"
    ModificationTypePublished     = "published"
    ModificationTypeContentChanged = "content_changed"
)

// Create creates a new modification log entry.
func (m *DocumentModificationLog) Create(db *gorm.DB) error {
    return db.Create(m).Error
}

// GetDocumentHistory returns all modifications for a document.
func GetDocumentHistory(db *gorm.DB, documentID uint, limit int) ([]DocumentModificationLog, error) {
    var logs []DocumentModificationLog
    err := db.
        Where("document_id = ?", documentID).
        Order("created_at DESC").
        Limit(limit).
        Preload("ModifiedByPerson").
        Find(&logs).
        Error
    return logs, err
}

// pkg/models/document_outbox.go
package models

import (
    "database/sql/driver"
    "encoding/json"
    "errors"
    "time"
    
    "gorm.io/gorm"
    "gorm.io/gorm/clause"
)

type OutboxOperation string

const (
    OutboxOperationIndexDocument  OutboxOperation = "index_document"
    OutboxOperationIndexDraft     OutboxOperation = "index_draft"
    OutboxOperationDeleteDocument OutboxOperation = "delete_document"
    OutboxOperationDeleteDraft    OutboxOperation = "delete_draft"
)

func (o OutboxOperation) String() string {
    return string(o)
}

func (o *OutboxOperation) Scan(value interface{}) error {
    if value == nil {
        return errors.New("outbox operation cannot be null")
    }
    *o = OutboxOperation(value.(string))
    return nil
}

func (o OutboxOperation) Value() (driver.Value, error) {
    return string(o), nil
}

type OutboxStatus string

const (
    OutboxStatusPending    OutboxStatus = "pending"
    OutboxStatusProcessing OutboxStatus = "processing"
    OutboxStatusProcessed  OutboxStatus = "processed"
    OutboxStatusFailed     OutboxStatus = "failed"
)

func (s OutboxStatus) String() string {
    return string(s)
}

func (s *OutboxStatus) Scan(value interface{}) error {
    if value == nil {
        return errors.New("outbox status cannot be null")
    }
    *s = OutboxStatus(value.(string))
    return nil
}

func (s OutboxStatus) Value() (driver.Value, error) {
    return string(s), nil
}

// DocumentOutbox represents a pending search index operation.
type DocumentOutbox struct {
    ID uint64 `gorm:"primarykey"`
    
    // Document identification
    DocumentID string          `gorm:"not null;index:idx_outbox_document_id"`
    DocumentPK *uint          `gorm:"index"` // FK to documents table if available
    Operation  OutboxOperation `gorm:"type:outbox_operation;not null"`
    
    // Workspace context
    WorkspaceProvider string `gorm:"not null;index:idx_outbox_workspace_provider"`
    
    // Payload (search.Document as JSON)
    Payload json.RawMessage `gorm:"type:jsonb;not null"`
    
    // Processing state
    Status     OutboxStatus `gorm:"type:outbox_status;not null;default:'pending';index:idx_outbox_status_created"`
    RetryCount int          `gorm:"not null;default:0"`
    
    // Timestamps
    CreatedAt    time.Time  `gorm:"not null;index:idx_outbox_pending_created;index:idx_outbox_workspace_provider"`
    ProcessedAt  *time.Time
    LastErrorAt  *time.Time
    
    // Error tracking
    ErrorMessage *string
    
    // Metadata (who triggered this change)
    CreatedByPersonID  *uint64 `gorm:"index"`
    CreatedByPerson    *Person `gorm:"foreignKey:CreatedByPersonID"`
    CreatedByIdentity  *string // Email/identifier at time of creation
    APIEndpoint        *string
    ModificationLogID  *uint64                 `gorm:"index"`
    ModificationLog    *DocumentModificationLog `gorm:"foreignKey:ModificationLogID"`
}

// Create creates a new outbox entry.
func (o *DocumentOutbox) Create(db *gorm.DB) error {
    return db.Create(o).Error
}

// FindPending retrieves pending outbox entries for processing.
// Uses SELECT FOR UPDATE SKIP LOCKED for concurrent worker safety.
func FindPendingOutboxEntries(db *gorm.DB, limit int) ([]DocumentOutbox, error) {
    var entries []DocumentOutbox
    err := db.
        Where("status = ?", OutboxStatusPending).
        Order("created_at ASC").
        Limit(limit).
        Clauses(clause.Locking{Strength: "UPDATE", Options: "SKIP LOCKED"}).
        Find(&entries).
        Error
    return entries, err
}

// MarkProcessing updates the status to processing.
func (o *DocumentOutbox) MarkProcessing(db *gorm.DB) error {
    return db.Model(o).Updates(map[string]interface{}{
        "status": OutboxStatusProcessing,
    }).Error
}

// MarkProcessed updates the status to processed.
func (o *DocumentOutbox) MarkProcessed(db *gorm.DB) error {
    now := time.Now()
    return db.Model(o).Updates(map[string]interface{}{
        "status":       OutboxStatusProcessed,
        "processed_at": &now,
    }).Error
}

// MarkFailed updates the status to failed with error details.
func (o *DocumentOutbox) MarkFailed(db *gorm.DB, errorMsg string) error {
    now := time.Now()
    return db.Model(o).Updates(map[string]interface{}{
        "status":        OutboxStatusFailed,
        "retry_count":   gorm.Expr("retry_count + 1"),
        "error_message": errorMsg,
        "last_error_at": &now,
    }).Error
}

// IncrementRetry increments retry count and resets to pending for retry.
func (o *DocumentOutbox) IncrementRetry(db *gorm.DB, errorMsg string) error {
    now := time.Now()
    return db.Model(o).Updates(map[string]interface{}{
        "status":        OutboxStatusPending,
        "retry_count":   gorm.Expr("retry_count + 1"),
        "error_message": errorMsg,
        "last_error_at": &now,
    }).Error
}

// GetOutboxStats returns statistics about the outbox.
type OutboxStats struct {
    PendingCount    int64
    ProcessingCount int64
    FailedCount     int64
    OldestPending   *time.Time
    AverageLag      *float64 // seconds
}

func GetOutboxStats(db *gorm.DB) (*OutboxStats, error) {
    stats := &OutboxStats{}
    
    // Count by status
    db.Model(&DocumentOutbox{}).Where("status = ?", OutboxStatusPending).Count(&stats.PendingCount)
    db.Model(&DocumentOutbox{}).Where("status = ?", OutboxStatusProcessing).Count(&stats.ProcessingCount)
    db.Model(&DocumentOutbox{}).Where("status = ?", OutboxStatusFailed).Count(&stats.FailedCount)
    
    // Oldest pending entry
    var oldest DocumentOutbox
    if err := db.Where("status = ?", OutboxStatusPending).
        Order("created_at ASC").
        First(&oldest).Error; err == nil {
        stats.OldestPending = &oldest.CreatedAt
        lag := time.Since(oldest.CreatedAt).Seconds()
        stats.AverageLag = &lag
    }
    
    return stats, nil
}
```

## Implementation Plan

### Phase 1: Database & Model Setup

**Files to Create:**
- `pkg/models/document_outbox.go` - GORM model
- `pkg/models/document_outbox_test.go` - Unit tests
- `internal/db/migrations/` (if using explicit migrations)

**Files to Modify:**
- `pkg/models/gorm.go` - Add `&DocumentOutbox{}` to `ModelsToAutoMigrate()`
- `internal/db/db.go` - Potentially add custom SQL for enum types (PostgreSQL)

**Tasks:**
1. Create DocumentOutbox GORM model with all fields and methods
2. Add to auto-migration list
3. Write unit tests for model methods
4. Test migration on dev database

### Phase 2: Identity Management & Audit Trail

**Files to Create:**
- `pkg/models/person.go` - Person and PersonIdentity models
- `pkg/models/person_test.go` - Tests
- `pkg/models/document_modification_log.go` - Audit trail model
- `pkg/models/document_modification_log_test.go` - Tests
- `pkg/auth/identity.go` - Helper functions for identity resolution

**Identity Resolution Pattern:**

```go
// pkg/auth/identity.go
package auth

import (
    "context"
    "fmt"
    
    "github.com/hashicorp-forge/hermes/pkg/models"
    "gorm.io/gorm"
)

// IdentityContext contains information about the authenticated user.
type IdentityContext struct {
    Email        string
    OAuthSubject string
    ProviderType string // "google", "okta", "dex"
}

// ResolvePersonFromContext resolves an authenticated user to a Person record.
// Creates Person + Identity if they don't exist.
func ResolvePersonFromContext(ctx context.Context, db *gorm.DB, idCtx IdentityContext) (*models.Person, error) {
    // Try to find by email
    person, err := models.FindOrCreatePersonByEmail(db, idCtx.Email, idCtx.ProviderType)
    if err != nil {
        return nil, fmt.Errorf("error resolving person: %w", err)
    }
    
    // If OAuth subject is available, ensure it's linked
    if idCtx.OAuthSubject != "" {
        if err := EnsureIdentityLinked(db, person.ID, "oauth_sub", idCtx.OAuthSubject, idCtx.ProviderType); err != nil {
            return nil, fmt.Errorf("error linking OAuth identity: %w", err)
        }
    }
    
    return person, nil
}

// EnsureIdentityLinked ensures an identity is linked to a person.
func EnsureIdentityLinked(db *gorm.DB, personID uint64, identityType, identityValue, providerType string) error {
    identity := models.PersonIdentity{
        PersonID:      personID,
        IdentityType:  identityType,
        IdentityValue: identityValue,
        ProviderType:  &providerType,
        Verified:      true,
    }
    
    return db.
        Where("person_id = ? AND identity_type = ? AND identity_value = ?", 
              personID, identityType, identityValue).
        FirstOrCreate(&identity).
        Error
}
```

**Modification Logging Pattern:**

```go
// Helper to create modification log entries
func LogDocumentModification(
    tx *gorm.DB,
    doc *models.Document,
    modificationType string,
    personID uint64,
    identity string,
    workspaceProvider string,
    apiEndpoint string,
    fieldChanges map[string]interface{},
) (*models.DocumentModificationLog, error) {
    
    var changesJSON []byte
    var err error
    if fieldChanges != nil {
        changesJSON, err = json.Marshal(fieldChanges)
        if err != nil {
            return nil, fmt.Errorf("error marshaling field changes: %w", err)
        }
    }
    
    log := &models.DocumentModificationLog{
        DocumentID:           doc.ID,
        DocumentGoogleFileID: doc.GoogleFileID,
        ModificationType:     modificationType,
        FieldChanges:         changesJSON,
        ModifiedByPersonID:   &personID,
        ModifiedByIdentity:   identity,
        WorkspaceProvider:    workspaceProvider,
        APIEndpoint:          &apiEndpoint,
    }
    
    if err := log.Create(tx); err != nil {
        return nil, fmt.Errorf("error creating modification log: %w", err)
    }
    
    return log, nil
}
```

### Phase 3: Outbox Writer Integration

**Files to Modify:**
- `pkg/models/document.go` - Modify `Create()` and `Upsert()` to write to outbox
- `internal/server/server.go` - Add workspace provider type to Server struct
- Helper functions for outbox writing (can be in document_outbox.go)

**Enhanced Implementation Pattern:**

```go
// pkg/models/document_context.go
package models

// DocumentContext contains metadata needed for audit trail and outbox.
type DocumentContext struct {
    PersonID          uint64
    Identity          string
    WorkspaceProvider string
    APIEndpoint       string
}

// In document.go Upsert method
func (d *Document) UpsertWithContext(db *gorm.DB, ctx *DocumentContext) error {
    // ... existing validation ...
    
    return db.Transaction(func(tx *gorm.DB) error {
        // Track old state for field change detection
        var oldDoc Document
        if d.ID != 0 {
            tx.First(&oldDoc, d.ID)
        }
        
        // 1. Original document upsert logic
        if err := tx.Model(&d)./* ... existing logic ... */.Error; err != nil {
            return err
        }
        
        // 2. Update workspace provider and modified_by
        d.WorkspaceProvider = ctx.WorkspaceProvider
        d.LastModifiedByPersonID = &ctx.PersonID
        
        if err := tx.Save(d).Error; err != nil {
            return err
        }
        
        // 3. Calculate field changes
        fieldChanges := d.calculateFieldChanges(&oldDoc)
        
        // 4. Create modification log
        modLog, err := LogDocumentModification(
            tx,
            d,
            determineModificationType(oldDoc.ID == 0, fieldChanges),
            ctx.PersonID,
            ctx.Identity,
            ctx.WorkspaceProvider,
            ctx.APIEndpoint,
            fieldChanges,
        )
        if err != nil {
            return fmt.Errorf("error logging modification: %w", err)
        }
        
        // 5. Write to outbox
        if err := d.writeToOutbox(tx, OutboxOperationIndexDocument, ctx, modLog.ID); err != nil {
            return fmt.Errorf("error writing to outbox: %w", err)
        }
        
        // ... rest of existing logic ...
        
        return nil
    })
}

// Helper method
func (d *Document) writeToOutbox(
    tx *gorm.DB,
    op OutboxOperation,
    ctx *DocumentContext,
    modLogID uint64,
) error {
    // Convert document to search.Document
    searchDoc, err := d.ToSearchDocument()
    if err != nil {
        return fmt.Errorf("error converting to search document: %w", err)
    }
    
    // Marshal to JSON
    payload, err := json.Marshal(searchDoc)
    if err != nil {
        return fmt.Errorf("error marshaling search document: %w", err)
    }
    
    // Create outbox entry with full context
    docPK := uint(d.ID)
    outbox := &DocumentOutbox{
        DocumentID:         d.GoogleFileID,
        DocumentPK:         &docPK,
        Operation:          op,
        WorkspaceProvider:  ctx.WorkspaceProvider,
        Payload:            payload,
        Status:             OutboxStatusPending,
        CreatedByPersonID:  &ctx.PersonID,
        CreatedByIdentity:  &ctx.Identity,
        APIEndpoint:        &ctx.APIEndpoint,
        ModificationLogID:  &modLogID,
    }
    
    return outbox.Create(tx)
}

// calculateFieldChanges compares old and new document state.
func (d *Document) calculateFieldChanges(old *Document) map[string]interface{} {
    changes := make(map[string]interface{})
    
    if old.ID == 0 {
        return changes // New document, no changes to track
    }
    
    if d.Title != old.Title {
        changes["title"] = map[string]interface{}{
            "old": old.Title,
            "new": d.Title,
        }
    }
    
    if d.Status != old.Status {
        changes["status"] = map[string]interface{}{
            "old": old.Status.String(),
            "new": d.Status.String(),
        }
    }
    
    // Add more field comparisons as needed
    
    return changes
}

func determineModificationType(isNew bool, changes map[string]interface{}) string {
    if isNew {
        return models.ModificationTypeCreated
    }
    
    if _, hasStatus := changes["status"]; hasStatus {
        return models.ModificationTypeStatusChanged
    }
    
    return models.ModificationTypeUpdated
}
```

**Files to Modify:**
- `pkg/models/document.go`
- `internal/api/v2/documents.go` - Add helper to create outbox entries from API context
- `internal/api/v2/drafts.go` - Similar integration
- `internal/api/v2/approvals.go` - Similar integration
- `internal/api/v2/reviews.go` - Similar integration

### Phase 3: Outbox Worker Process

**Files to Create:**
- `internal/cmd/outbox_worker.go` - CLI command for running worker
- `pkg/outbox/worker.go` - Core worker logic
- `pkg/outbox/processor.go` - Process individual outbox entries
- `pkg/outbox/metrics.go` - Prometheus metrics

**Worker Architecture:**

```go
// pkg/outbox/worker.go
package outbox

import (
    "context"
    "time"
    
    "github.com/hashicorp/go-hclog"
    "github.com/hashicorp-forge/hermes/pkg/models"
    "github.com/hashicorp-forge/hermes/pkg/search"
    "gorm.io/gorm"
)

const (
    DefaultBatchSize     = 100
    DefaultPollInterval  = 1 * time.Second
    DefaultMaxRetries    = 5
    DefaultRetryBackoff  = 30 * time.Second
)

type WorkerConfig struct {
    BatchSize     int
    PollInterval  time.Duration
    MaxRetries    int
    RetryBackoff  time.Duration
}

type Worker struct {
    db             *gorm.DB
    searchProvider search.Provider
    logger         hclog.Logger
    config         WorkerConfig
    metrics        *Metrics
}

func NewWorker(
    db *gorm.DB,
    searchProvider search.Provider,
    logger hclog.Logger,
    config WorkerConfig,
) *Worker {
    return &Worker{
        db:             db,
        searchProvider: searchProvider,
        logger:         logger,
        config:         config,
        metrics:        NewMetrics(),
    }
}

func (w *Worker) Start(ctx context.Context) error {
    w.logger.Info("starting outbox worker",
        "batch_size", w.config.BatchSize,
        "poll_interval", w.config.PollInterval,
    )
    
    ticker := time.NewTicker(w.config.PollInterval)
    defer ticker.Stop()
    
    for {
        select {
        case <-ctx.Done():
            w.logger.Info("outbox worker shutting down")
            return ctx.Err()
        case <-ticker.C:
            if err := w.processBatch(ctx); err != nil {
                w.logger.Error("error processing batch", "error", err)
                w.metrics.ErrorCount.Inc()
            }
        }
    }
}

func (w *Worker) processBatch(ctx context.Context) error {
    // 1. Fetch pending entries
    entries, err := models.FindPendingOutboxEntries(w.db, w.config.BatchSize)
    if err != nil {
        return fmt.Errorf("error fetching pending entries: %w", err)
    }
    
    if len(entries) == 0 {
        return nil // Nothing to process
    }
    
    w.logger.Debug("processing outbox batch", "count", len(entries))
    w.metrics.BatchSize.Observe(float64(len(entries)))
    
    // 2. Process each entry
    for _, entry := range entries {
        if err := w.processEntry(ctx, &entry); err != nil {
            w.logger.Error("error processing entry",
                "entry_id", entry.ID,
                "document_id", entry.DocumentID,
                "error", err,
            )
            // Continue processing other entries
        }
    }
    
    return nil
}

func (w *Worker) processEntry(ctx context.Context, entry *models.DocumentOutbox) error {
    startTime := time.Now()
    defer func() {
        w.metrics.ProcessingDuration.Observe(time.Since(startTime).Seconds())
    }()
    
    // 1. Mark as processing
    if err := entry.MarkProcessing(w.db); err != nil {
        return fmt.Errorf("error marking entry as processing: %w", err)
    }
    
    // 2. Process based on operation type
    processor := NewProcessor(w.searchProvider, w.logger)
    err := processor.Process(ctx, entry)
    
    // 3. Update status based on result
    if err != nil {
        // Check if we should retry
        if entry.RetryCount < w.config.MaxRetries {
            // Retry with backoff
            if err := entry.IncrementRetry(w.db, err.Error()); err != nil {
                w.logger.Error("error incrementing retry", "entry_id", entry.ID, "error", err)
            }
            w.metrics.RetryCount.Inc()
            return fmt.Errorf("processing failed, will retry: %w", err)
        } else {
            // Max retries exceeded, mark as failed
            if err := entry.MarkFailed(w.db, err.Error()); err != nil {
                w.logger.Error("error marking entry as failed", "entry_id", entry.ID, "error", err)
            }
            w.metrics.FailedCount.Inc()
            return fmt.Errorf("processing failed permanently: %w", err)
        }
    }
    
    // 4. Success - mark as processed
    if err := entry.MarkProcessed(w.db); err != nil {
        return fmt.Errorf("error marking entry as processed: %w", err)
    }
    
    w.metrics.ProcessedCount.Inc()
    w.logger.Debug("successfully processed entry",
        "entry_id", entry.ID,
        "document_id", entry.DocumentID,
        "operation", entry.Operation,
    )
    
    return nil
}
```

```go
// pkg/outbox/processor.go
package outbox

import (
    "context"
    "encoding/json"
    "fmt"
    
    "github.com/hashicorp/go-hclog"
    "github.com/hashicorp-forge/hermes/pkg/models"
    "github.com/hashicorp-forge/hermes/pkg/search"
)

type Processor struct {
    searchProvider search.Provider
    logger         hclog.Logger
}

func NewProcessor(searchProvider search.Provider, logger hclog.Logger) *Processor {
    return &Processor{
        searchProvider: searchProvider,
        logger:         logger,
    }
}

func (p *Processor) Process(ctx context.Context, entry *models.DocumentOutbox) error {
    switch entry.Operation {
    case models.OutboxOperationIndexDocument:
        return p.indexDocument(ctx, entry)
    case models.OutboxOperationIndexDraft:
        return p.indexDraft(ctx, entry)
    case models.OutboxOperationDeleteDocument:
        return p.deleteDocument(ctx, entry)
    case models.OutboxOperationDeleteDraft:
        return p.deleteDraft(ctx, entry)
    default:
        return fmt.Errorf("unknown operation: %s", entry.Operation)
    }
}

func (p *Processor) indexDocument(ctx context.Context, entry *models.DocumentOutbox) error {
    // Parse payload
    var doc search.Document
    if err := json.Unmarshal(entry.Payload, &doc); err != nil {
        return fmt.Errorf("error unmarshaling payload: %w", err)
    }
    
    // Index in search provider
    if err := p.searchProvider.DocumentIndex().Index(ctx, &doc); err != nil {
        return fmt.Errorf("error indexing document: %w", err)
    }
    
    p.logger.Debug("indexed document", "doc_id", entry.DocumentID)
    return nil
}

func (p *Processor) indexDraft(ctx context.Context, entry *models.DocumentOutbox) error {
    var doc search.Document
    if err := json.Unmarshal(entry.Payload, &doc); err != nil {
        return fmt.Errorf("error unmarshaling payload: %w", err)
    }
    
    if err := p.searchProvider.DraftIndex().Index(ctx, &doc); err != nil {
        return fmt.Errorf("error indexing draft: %w", err)
    }
    
    p.logger.Debug("indexed draft", "doc_id", entry.DocumentID)
    return nil
}

func (p *Processor) deleteDocument(ctx context.Context, entry *models.DocumentOutbox) error {
    if err := p.searchProvider.DocumentIndex().Delete(ctx, entry.DocumentID); err != nil {
        return fmt.Errorf("error deleting document: %w", err)
    }
    
    p.logger.Debug("deleted document from index", "doc_id", entry.DocumentID)
    return nil
}

func (p *Processor) deleteDraft(ctx context.Context, entry *models.DocumentOutbox) error {
    if err := p.searchProvider.DraftIndex().Delete(ctx, entry.DocumentID); err != nil {
        return fmt.Errorf("error deleting draft: %w", err)
    }
    
    p.logger.Debug("deleted draft from index", "doc_id", entry.DocumentID)
    return nil
}
```

### Phase 4: API Handler Modifications

**Remove Synchronous Indexing:**

```go
// Before (internal/api/v2/documents.go around line 920-950)
go func() {
    // Convert document to search object.
    docObj, err := mapToSearchDocument(docObjMap)
    if err != nil {
        srv.Logger.Error("error converting document to search document", "error", err)
        return
    }
    
    // Save in search index.
    if err := srv.SearchProvider.DocumentIndex().Index(ctx, docObj); err != nil {
        srv.Logger.Error("error saving patched document in search index", "error", err)
        return
    }
}()

// After - REMOVE THE ENTIRE GOROUTINE
// Indexing now happens via outbox pattern in model.Upsert()
```

This should be done in:
- `internal/api/v2/documents.go` (PATCH handler)
- `internal/api/v2/drafts.go` (POST, PATCH handlers)
- `internal/api/v2/approvals.go` (approval handlers)
- `internal/api/v2/reviews.go` (publish handler)

### Phase 5: CLI Command

**Create worker command:**

```go
// internal/cmd/outbox_worker.go
package cmd

import (
    "context"
    "os"
    "os/signal"
    "syscall"
    
    "github.com/hashicorp-forge/hermes/pkg/outbox"
    "github.com/spf13/cobra"
)

var outboxWorkerCmd = &cobra.Command{
    Use:   "outbox-worker",
    Short: "Run the document outbox worker for search index synchronization",
    Long: `The outbox worker processes pending search index operations from the
document_outbox table and synchronizes them with the search provider (Algolia/Meilisearch).
This ensures eventual consistency between the database and search index.`,
    RunE: runOutboxWorker,
}

func init() {
    rootCmd.AddCommand(outboxWorkerCmd)
    
    outboxWorkerCmd.Flags().IntP("batch-size", "b", 100, "Number of entries to process per batch")
    outboxWorkerCmd.Flags().DurationP("poll-interval", "p", 1*time.Second, "Polling interval")
    outboxWorkerCmd.Flags().IntP("max-retries", "r", 5, "Maximum retry attempts")
}

func runOutboxWorker(cmd *cobra.Command, args []string) error {
    // Initialize config, database, search provider (similar to server command)
    cfg, err := loadConfig()
    if err != nil {
        return err
    }
    
    db, err := initDatabase(cfg)
    if err != nil {
        return err
    }
    
    searchProvider, err := initSearchProvider(cfg)
    if err != nil {
        return err
    }
    
    logger := initLogger()
    
    // Worker config from flags
    batchSize, _ := cmd.Flags().GetInt("batch-size")
    pollInterval, _ := cmd.Flags().GetDuration("poll-interval")
    maxRetries, _ := cmd.Flags().GetInt("max-retries")
    
    workerConfig := outbox.WorkerConfig{
        BatchSize:    batchSize,
        PollInterval: pollInterval,
        MaxRetries:   maxRetries,
    }
    
    // Create worker
    worker := outbox.NewWorker(db, searchProvider, logger, workerConfig)
    
    // Context with cancellation
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()
    
    // Handle shutdown signals
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
    
    // Start worker in goroutine
    errChan := make(chan error, 1)
    go func() {
        errChan <- worker.Start(ctx)
    }()
    
    // Wait for shutdown signal or error
    select {
    case <-sigChan:
        logger.Info("received shutdown signal")
        cancel()
        return <-errChan
    case err := <-errChan:
        return err
    }
}
```

### Phase 6: Observability

**Metrics to Track:**
- `hermes_outbox_pending_count` - Number of pending entries
- `hermes_outbox_processing_duration_seconds` - Processing time per entry
- `hermes_outbox_processed_total` - Total processed entries
- `hermes_outbox_failed_total` - Total failed entries
- `hermes_outbox_retry_total` - Total retry attempts
- `hermes_outbox_lag_seconds` - Age of oldest pending entry

**Health Check Endpoint:**

```go
// internal/api/v2/health.go (or add to existing health check)
func (h *HealthHandler) checkOutbox() error {
    stats, err := models.GetOutboxStats(h.db)
    if err != nil {
        return err
    }
    
    // Alert if lag exceeds threshold
    if stats.AverageLag != nil && *stats.AverageLag > 300 { // 5 minutes
        return fmt.Errorf("outbox lag too high: %.0f seconds", *stats.AverageLag)
    }
    
    // Alert if too many failed entries
    if stats.FailedCount > 100 {
        return fmt.Errorf("too many failed outbox entries: %d", stats.FailedCount)
    }
    
    return nil
}
```

## Migration Strategy

### Deployment Steps

1. **Phase 1: Deploy Database Schema**
   - Add DocumentOutbox model to codebase
   - Deploy with auto-migration enabled
   - Verify table creation in PostgreSQL

2. **Phase 2: Deploy Writer Integration (Dark Mode)**
   - Deploy code that writes to outbox
   - Keep existing synchronous search indexing (both run in parallel)
   - Monitor outbox table population
   - **Rollback Point**: If outbox writes fail, disable feature flag

3. **Phase 3: Start Worker (Read-Only Mode)**
   - Deploy and start outbox worker
   - Worker processes entries but logs instead of indexing
   - Verify worker successfully reads and parses entries
   - **Rollback Point**: Stop worker if errors occur

4. **Phase 4: Enable Worker Processing**
   - Worker actively processes outbox and updates search index
   - Synchronous indexing still active (redundant updates)
   - Monitor for consistency between both paths
   - **Rollback Point**: Stop worker if search index corruption detected

5. **Phase 5: Remove Synchronous Indexing**
   - Deploy code that removes goroutines in API handlers
   - All indexing now via outbox only
   - Monitor API response times (should improve)
   - **Rollback Point**: Redeploy previous version with synchronous indexing

### Rollback Plan

Each phase has clear rollback points:
- Phase 1-2: Simply disable outbox writes, existing system continues
- Phase 3-4: Stop worker, existing system continues
- Phase 5: Redeploy code with synchronous indexing goroutines

## Testing Strategy

### Unit Tests
- **DocumentOutbox model**: All CRUD operations, state transitions
- **Processor**: Each operation type (index document, index draft, delete)
- **Worker**: Batch processing, retry logic, error handling

### Integration Tests
- **Transaction Safety**: Verify outbox writes are rolled back on document error
- **End-to-End**: Create document → verify outbox entry → process → verify search index
- **Failure Scenarios**: Network errors, timeout handling, retry logic

### Load Tests
- **High Volume**: 1000 documents/minute, verify outbox keeps up
- **Worker Scaling**: Multiple workers processing same outbox (SKIP LOCKED)
- **Error Recovery**: Kill worker mid-processing, verify entries reset to pending

## Operational Considerations

### Monitoring Alerts

1. **High Lag Alert**: `hermes_outbox_lag_seconds > 300` (5 minutes)
2. **High Failure Rate**: `rate(hermes_outbox_failed_total[5m]) > 10`
3. **Worker Down**: `up{job="hermes-outbox-worker"} == 0`
4. **Queue Buildup**: `hermes_outbox_pending_count > 1000`

### Runbook: Outbox Queue Backup

**Symptom**: Pending count growing, lag increasing

**Diagnosis**:
```sql
-- Check oldest pending entries
SELECT id, document_id, operation, retry_count, created_at, error_message
FROM document_outbox
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT 20;

-- Check failed entries
SELECT id, document_id, operation, retry_count, error_message, last_error_at
FROM document_outbox
WHERE status = 'failed'
ORDER BY last_error_at DESC
LIMIT 20;
```

**Resolution**:
1. Check worker logs for errors
2. Verify search provider is healthy
3. If transient: Restart worker
4. If persistent: Scale up workers (multiple instances)
5. If corruption: Manual investigation of failed entries

### Maintenance

**Cleanup Old Entries**:
```sql
-- Delete processed entries older than 30 days
DELETE FROM document_outbox
WHERE status = 'processed' AND processed_at < NOW() - INTERVAL '30 days';

-- Archive failed entries for investigation
INSERT INTO document_outbox_archive SELECT * FROM document_outbox WHERE status = 'failed';
DELETE FROM document_outbox WHERE status = 'failed' AND last_error_at < NOW() - INTERVAL '7 days';
```

Consider adding a cleanup job (cron or separate worker) to prune old entries.

## Future Enhancements

1. **Batch Processing**: Group multiple documents into batch operations for search provider
2. **Priority Queue**: High-priority documents (published) processed before drafts
3. **Dead Letter Queue**: Separate table for permanently failed entries
4. **Notifications**: Webhook/Slack alerts for critical failures
5. **Metrics Dashboard**: Grafana dashboard for outbox health
6. **Compression**: Compress payload JSONB for large documents
7. **Partitioning**: Partition outbox table by date for performance

## Security Considerations

1. **Access Control**: Outbox worker needs read/write on document_outbox only
2. **Payload Validation**: Validate JSON payload before processing
3. **SQL Injection**: Use parameterized queries (GORM handles this)
4. **Resource Limits**: Cap worker batch size to prevent memory exhaustion

## Enhanced Requirements Summary

### Document Tracking with Workspace Provider

Every document operation must track:

1. **Workspace Provider**: Which storage backend (Google Drive, Local filesystem, S3, Azure) owns the document
2. **Person Identity**: Who performed the action (with support for identity migrations)
3. **Modification History**: Full audit trail of changes with field-level diffs
4. **Workflow Context**: Review status, approvals, ownership changes

### User Identity Management

The system supports:

- **Multiple Identities per Person**: Email, OAuth subjects, LDAP DNs can all map to one person
- **Identity Migrations**: When a user's email or authentication changes, admin can link new identity to existing person
- **Cross-Provider Support**: Same person can authenticate via Google, Okta, Dex with different identifiers
- **Audit Trail**: All document changes track the person ID and the identity used at time of change

### API Handler Common Pattern

All document modification endpoints (POST, PATCH, DELETE) follow this pattern:

```go
1. Extract authenticated user identity from request context (email, OAuth sub)
2. Resolve identity to Person record (find or create via FindOrCreatePersonByEmail)
3. Build DocumentContext with: PersonID, Identity, WorkspaceProvider.Type(), APIEndpoint
4. Call document.UpsertWithContext(db, docCtx) which atomically:
   a. Updates document with workspace_provider and last_modified_by_person_id
   b. Creates document_modification_log entry with field changes
   c. Creates document_outbox entry for search index sync
   d. All in single transaction
5. Remove synchronous search indexing goroutines (now handled by outbox worker)
```

### Administrator Operations

For identity management, administrators can:

```sql
-- Link a new identity to an existing person (e.g., after email change)
INSERT INTO person_identity (person_id, identity_type, identity_value, provider_type, primary_identity)
VALUES (123, 'email', 'new.email@company.com', 'google', false);

-- Merge two person records (when duplicates discovered)
BEGIN;
UPDATE person_identity SET person_id = 123 WHERE person_id = 456;
UPDATE documents SET last_modified_by_person_id = 123 WHERE last_modified_by_person_id = 456;
UPDATE document_modification_log SET modified_by_person_id = 123 WHERE modified_by_person_id = 456;
UPDATE document_outbox SET created_by_person_id = 123 WHERE created_by_person_id = 456;
DELETE FROM person WHERE id = 456;
COMMIT;

-- Set primary identity for a person
UPDATE person_identity SET primary_identity = false WHERE person_id = 123;
UPDATE person_identity SET primary_identity = true 
WHERE person_id = 123 AND identity_value = 'preferred@email.com';
```

## Conclusion

The enhanced outbox pattern provides a comprehensive solution for document management with:

- **Transactional Consistency**: Outbox writes are part of the same database transaction
- **Full Audit Trail**: Complete history of who changed what, when, and via which provider
- **Identity Flexibility**: Support for user migrations, email changes, and multi-provider authentication
- **Workspace Awareness**: Track which storage backend owns each document
- **Reliable Search Sync**: At-least-once delivery to search index with retry logic
- **Observability**: Metrics and logs for all document modifications and search operations

This design follows industry best practices (Uber, Stripe, GitHub) while adding enterprise-grade audit and identity management capabilities specifically needed for Hermes' multi-tenant, multi-provider architecture.

---

**Next Steps**: 
1. Review this design with the team and stakeholders
2. Gather feedback on identity management requirements
3. Validate audit trail completeness with compliance team
4. Proceed with implementation following the phased approach
5. Plan data migration strategy for existing users → person records
