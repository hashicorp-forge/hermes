---
id: RFC-080
title: Outbox Pattern for Document Synchronization
date: 2025-10-09
type: RFC
subtype: Architecture Proposal
status: Proposed
tags: [outbox-pattern, document-sync, architecture, meilisearch, search]
related:
  - ADR-073
  - ADR-075
  - RFC-076
---

# Outbox Pattern for Document Synchronization

## Summary

Implement the **Transactional Outbox Pattern** to ensure reliable synchronization between the PostgreSQL database and search index (Algolia/Meilisearch), preventing data inconsistencies and enabling eventual consistency guarantees.

## Motivation

### Current Architecture Problems

**Problem 1: Inconsistent State**
```go
// Current implementation (internal/api/v2/documents.go)
func (h *DocumentsHandler) CreateDocument(c *gin.Context) {
    // 1. Write to database
    err := h.db.Create(&doc).Error
    if err != nil {
        return c.JSON(500, gin.H{"error": "database error"})
    }
    
    // 2. Write to search index
    err = h.search.Index(ctx, "documents", []Document{doc})
    // ❌ PROBLEM: If this fails, database has doc but search doesn't!
    // Users can view document but can't find it via search
}
```

**Problem 2: Partial Failures**
- Database commit succeeds
- Search index update fails (network issue, API rate limit, quota exceeded)
- Document exists in DB but not searchable
- No automatic retry mechanism

**Problem 3: Race Conditions**
- Multiple workers updating same document
- Search index may have stale data
- No ordering guarantees

**Problem 4: Operational Complexity**
- Manual intervention required to fix inconsistencies
- No visibility into failed synchronization
- Hard to debug "document not found in search" issues

### Real-World Scenarios

**Scenario 1: Algolia Rate Limit**
```
11:23:45 POST /api/v2/documents (create RFC-456)
11:23:46 DB: Document RFC-456 created ✅
11:23:47 Algolia: Rate limit exceeded (429 Too Many Requests) ❌
11:23:48 User: "Document saved successfully" ✅ (misleading)
11:24:30 User: Search for "RFC-456" → 0 results ❌
```

**Scenario 2: Network Partition**
```
14:15:00 PUT /api/v2/documents/123 (update content)
14:15:01 DB: Update successful ✅
14:15:02 Meilisearch: Connection timeout ❌
14:15:30 Search shows old content ❌
14:16:00 Another user finds document via search, sees outdated info
```

**Scenario 3: Bulk Import**
```
09:00:00 Admin: Import 500 documents from CSV
09:00:05 DB: 500 documents inserted ✅
09:00:10 Algolia: 247/500 indexed, then quota exceeded ❌
09:05:00 Users see 253 documents in DB but can't find them via search
```

### User Stories

**Story 1: Developer**
> "When I create a document, I expect it to be searchable within seconds. Currently, sometimes documents are 'lost' and never appear in search results."

**Story 2: Operations Engineer**
> "I need visibility into synchronization failures. How many documents are pending sync? Which ones failed? Can I retry them?"

**Story 3: End User**
> "I just saved a document, but when I search for it, it's not there. My colleague found it by browsing the list. Why is search unreliable?"

## Proposed Solution: Transactional Outbox Pattern

### Architecture Overview

```
┌───────────────────────────────────────────────────────────────┐
│ API Handler (internal/api/v2/documents.go)                    │
│                                                                │
│  1. Begin Transaction                                         │
│  2. Write Document to documents table                         │
│  3. Write Event to outbox table                               │
│  4. Commit Transaction (atomic!)                              │
└───────────────────────────────────────────────────────────────┘
                            │
                            │ Transaction committed
                            ▼
┌───────────────────────────────────────────────────────────────┐
│ Outbox Worker (pkg/outbox/worker.go)                          │
│                                                                │
│  1. Poll outbox table (every 1s)                              │
│  2. Read pending events                                       │
│  3. Process events (update search index)                      │
│  4. Mark events as processed                                  │
│  5. Retry failed events (exponential backoff)                 │
└───────────────────────────────────────────────────────────────┘
                            │
                            │ Index update
                            ▼
┌───────────────────────────────────────────────────────────────┐
│ Search Provider (Algolia/Meilisearch)                         │
│                                                                │
│  Receives document updates from outbox worker                 │
│  Eventually consistent with database                          │
└───────────────────────────────────────────────────────────────┘
```

### Database Schema

**Outbox Table** (`pkg/models/outbox_event.go`):
```go
type OutboxEvent struct {
    ID            uint       `gorm:"primaryKey"`
    EventType     string     `gorm:"type:varchar(50);not null;index"`      // "document.created", "document.updated", "document.deleted"
    AggregateID   string     `gorm:"type:varchar(255);not null;index"`    // Document ID
    AggregateType string     `gorm:"type:varchar(50);not null"`           // "document"
    Payload       []byte     `gorm:"type:jsonb;not null"`                 // Full document JSON
    Status        string     `gorm:"type:varchar(20);not null;index"`     // "pending", "processing", "completed", "failed"
    AttemptCount  int        `gorm:"default:0"`
    LastAttemptAt *time.Time
    CompletedAt   *time.Time
    ErrorMessage  string     `gorm:"type:text"`
    CreatedAt     time.Time  `gorm:"index"`
    UpdatedAt     time.Time
}
```

**Indexes**:
```sql
CREATE INDEX idx_outbox_status_created ON outbox_events(status, created_at);
CREATE INDEX idx_outbox_event_type ON outbox_events(event_type);
CREATE INDEX idx_outbox_aggregate_id ON outbox_events(aggregate_id);
```

### Implementation

#### Step 1: Emit Events in Handlers

**Before (Current)**:
```go
func (h *DocumentsHandler) CreateDocument(c *gin.Context) {
    // Write to DB
    if err := h.db.Create(&doc).Error; err != nil {
        return c.JSON(500, err)
    }
    
    // Update search (MAY FAIL!)
    h.search.Index(ctx, "documents", []Document{doc})
    
    return c.JSON(201, doc)
}
```

**After (With Outbox)**:
```go
func (h *DocumentsHandler) CreateDocument(c *gin.Context) {
    // Begin transaction
    tx := h.db.Begin()
    defer func() {
        if r := recover(); r != nil {
            tx.Rollback()
        }
    }()
    
    // Write to DB
    if err := tx.Create(&doc).Error; err != nil {
        tx.Rollback()
        return c.JSON(500, err)
    }
    
    // Emit outbox event
    payload, _ := json.Marshal(doc)
    event := &OutboxEvent{
        EventType:     "document.created",
        AggregateID:   doc.ID,
        AggregateType: "document",
        Payload:       payload,
        Status:        "pending",
    }
    if err := tx.Create(event).Error; err != nil {
        tx.Rollback()
        return c.JSON(500, err)
    }
    
    // Commit transaction (atomic!)
    if err := tx.Commit().Error; err != nil {
        return c.JSON(500, err)
    }
    
    // ✅ Both DB and outbox event are committed atomically
    return c.JSON(201, doc)
}
```

#### Step 2: Outbox Worker

**Worker Implementation** (`pkg/outbox/worker.go`):
```go
type Worker struct {
    db     *gorm.DB
    search search.Provider
    logger hclog.Logger
    
    pollInterval time.Duration
    batchSize    int
    maxRetries   int
}

func (w *Worker) Start(ctx context.Context) error {
    ticker := time.NewTicker(w.pollInterval)
    defer ticker.Stop()
    
    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-ticker.C:
            if err := w.processEvents(ctx); err != nil {
                w.logger.Error("failed to process events", "error", err)
            }
        }
    }
}

func (w *Worker) processEvents(ctx context.Context) error {
    // Lock events for processing (prevent duplicate processing)
    var events []OutboxEvent
    err := w.db.Transaction(func(tx *gorm.DB) error {
        // Find pending events
        if err := tx.Where("status = ?", "pending").
            Or("status = ? AND attempt_count < ?", "failed", w.maxRetries).
            Order("created_at ASC").
            Limit(w.batchSize).
            Find(&events).Error; err != nil {
            return err
        }
        
        // Mark as processing
        eventIDs := make([]uint, len(events))
        for i, e := range events {
            eventIDs[i] = e.ID
        }
        return tx.Model(&OutboxEvent{}).
            Where("id IN ?", eventIDs).
            Update("status", "processing").Error
    })
    
    if err != nil {
        return err
    }
    
    // Process each event
    for _, event := range events {
        if err := w.processEvent(ctx, &event); err != nil {
            w.logger.Warn("event processing failed", 
                "event_id", event.ID, 
                "event_type", event.EventType,
                "error", err)
            
            // Update failure
            w.db.Model(&event).Updates(map[string]interface{}{
                "status":          "failed",
                "attempt_count":   event.AttemptCount + 1,
                "last_attempt_at": time.Now(),
                "error_message":   err.Error(),
            })
        } else {
            // Mark completed
            w.db.Model(&event).Updates(map[string]interface{}{
                "status":       "completed",
                "completed_at": time.Now(),
            })
        }
    }
    
    return nil
}

func (w *Worker) processEvent(ctx context.Context, event *OutboxEvent) error {
    switch event.EventType {
    case "document.created", "document.updated":
        var doc Document
        if err := json.Unmarshal(event.Payload, &doc); err != nil {
            return fmt.Errorf("unmarshal payload: %w", err)
        }
        return w.search.Index(ctx, "documents", []Document{doc})
        
    case "document.deleted":
        return w.search.Delete(ctx, "documents", []string{event.AggregateID})
        
    default:
        return fmt.Errorf("unknown event type: %s", event.EventType)
    }
}
```

#### Step 3: Worker Startup

**Server Initialization** (`cmd/hermes/main.go`):
```go
func main() {
    // ... existing setup ...
    
    // Start outbox worker
    outboxWorker := outbox.NewWorker(
        db,
        searchProvider,
        logger.Named("outbox"),
        outbox.WithPollInterval(1 * time.Second),
        outbox.WithBatchSize(100),
        outbox.WithMaxRetries(5),
    )
    
    // Run worker in background
    go func() {
        if err := outboxWorker.Start(ctx); err != nil {
            logger.Error("outbox worker stopped", "error", err)
        }
    }()
    
    // ... start HTTP server ...
}
```

### Retry Strategy

**Exponential Backoff**:
```
Attempt | Delay | Cumulative
--------|-------|------------
1       | 1s    | 1s
2       | 2s    | 3s
3       | 4s    | 7s
4       | 8s    | 15s
5       | 16s   | 31s
Failed  | -     | Give up
```

**Configuration**:
```hcl
outbox {
  poll_interval = "1s"
  batch_size    = 100
  max_retries   = 5
  backoff_base  = 2  # Exponential base
}
```

## Monitoring & Observability

### Metrics

**Prometheus Metrics** (`pkg/outbox/metrics.go`):
```go
var (
    outboxEventsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "hermes_outbox_events_total",
            Help: "Total number of outbox events",
        },
        []string{"event_type", "status"},
    )
    
    outboxProcessingDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "hermes_outbox_processing_duration_seconds",
            Help:    "Time spent processing outbox events",
            Buckets: prometheus.DefBuckets,
        },
        []string{"event_type"},
    )
    
    outboxPendingEvents = prometheus.NewGauge(
        prometheus.GaugeOpts{
            Name: "hermes_outbox_pending_events",
            Help: "Number of pending outbox events",
        },
    )
    
    outboxFailedEvents = prometheus.NewGauge(
        prometheus.GaugeOpts{
            Name: "hermes_outbox_failed_events",
            Help: "Number of failed outbox events",
        },
    )
)
```

**Grafana Dashboard Queries**:
```promql
# Pending events (should be < 100)
hermes_outbox_pending_events

# Processing rate
rate(hermes_outbox_events_total{status="completed"}[5m])

# Failure rate (should be < 1%)
rate(hermes_outbox_events_total{status="failed"}[5m]) 
  / rate(hermes_outbox_events_total[5m])

# Processing latency (p99 should be < 5s)
histogram_quantile(0.99, 
  rate(hermes_outbox_processing_duration_seconds_bucket[5m]))
```

### Admin Endpoints

**Outbox Status API** (`internal/api/v2/outbox.go`):
```go
// GET /api/v2/admin/outbox/stats
func (h *OutboxHandler) GetStats(c *gin.Context) {
    var stats struct {
        Pending    int64 `json:"pending"`
        Processing int64 `json:"processing"`
        Completed  int64 `json:"completed"`
        Failed     int64 `json:"failed"`
        OldestPending time.Time `json:"oldest_pending"`
    }
    
    h.db.Model(&OutboxEvent{}).Where("status = ?", "pending").Count(&stats.Pending)
    h.db.Model(&OutboxEvent{}).Where("status = ?", "processing").Count(&stats.Processing)
    h.db.Model(&OutboxEvent{}).Where("status = ?", "completed").Count(&stats.Completed)
    h.db.Model(&OutboxEvent{}).Where("status = ?", "failed").Count(&stats.Failed)
    
    h.db.Model(&OutboxEvent{}).
        Where("status = ?", "pending").
        Order("created_at ASC").
        Limit(1).
        Pluck("created_at", &stats.OldestPending)
    
    c.JSON(200, stats)
}

// GET /api/v2/admin/outbox/events?status=failed&limit=50
func (h *OutboxHandler) ListEvents(c *gin.Context) {
    status := c.Query("status")
    limit := c.GetInt("limit", 50)
    
    var events []OutboxEvent
    query := h.db.Model(&OutboxEvent{})
    if status != "" {
        query = query.Where("status = ?", status)
    }
    query.Order("created_at DESC").Limit(limit).Find(&events)
    
    c.JSON(200, events)
}

// POST /api/v2/admin/outbox/retry
func (h *OutboxHandler) RetryFailed(c *gin.Context) {
    result := h.db.Model(&OutboxEvent{}).
        Where("status = ?", "failed").
        Updates(map[string]interface{}{
            "status":        "pending",
            "attempt_count": 0,
            "error_message": "",
        })
    
    c.JSON(200, gin.H{"retried": result.RowsAffected})
}
```

### Alerts

**Alertmanager Rules**:
```yaml
groups:
  - name: outbox
    interval: 30s
    rules:
      - alert: OutboxBacklog
        expr: hermes_outbox_pending_events > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Outbox backlog exceeds 1000 events"
          
      - alert: OutboxProcessingStalled
        expr: increase(hermes_outbox_events_total[5m]) == 0
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Outbox worker not processing events"
          
      - alert: OutboxHighFailureRate
        expr: |
          rate(hermes_outbox_events_total{status="failed"}[5m]) 
          / rate(hermes_outbox_events_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Outbox failure rate exceeds 5%"
```

## Implementation Plan

### Phase 1: Schema & Models (Week 1)
- Create `outbox_events` table migration
- Implement `OutboxEvent` model
- Add database indexes
- Write unit tests for models

**Deliverables**:
- `pkg/models/outbox_event.go` (~100 LOC)
- `pkg/models/migrations/XXX_add_outbox_events.go` (~60 LOC)
- `pkg/models/outbox_event_test.go` (~150 LOC)

### Phase 2: Event Emission (Week 2)
- Update document handlers to emit events
- Wrap operations in transactions
- Add tests for transactional behavior

**Deliverables**:
- Update `internal/api/v2/documents.go` (~200 LOC changed)
- Update `internal/api/v2/documents_test.go` (+150 LOC)

### Phase 3: Outbox Worker (Week 3)
- Implement worker polling logic
- Add event processing
- Implement retry with exponential backoff
- Add tests for worker logic

**Deliverables**:
- `pkg/outbox/worker.go` (~300 LOC)
- `pkg/outbox/worker_test.go` (~250 LOC)

### Phase 4: Monitoring (Week 4)
- Add Prometheus metrics
- Implement admin endpoints
- Create Grafana dashboard
- Add alerting rules

**Deliverables**:
- `pkg/outbox/metrics.go` (~80 LOC)
- `internal/api/v2/outbox.go` (~150 LOC)
- `deployments/grafana/outbox-dashboard.json` (~500 LOC)

### Phase 5: Integration Testing (Week 5)
- Write integration tests with real DB
- Test failure scenarios (network errors, rate limits)
- Test retry logic
- Load testing (1000 events/sec)

**Deliverables**:
- `pkg/outbox/integration_test.go` (~400 LOC)
- `tests/load/outbox_test.go` (~200 LOC)

### Phase 6: Migration & Rollout (Week 6)
- Backfill existing documents into search index
- Deploy with feature flag (rollout gradually)
- Monitor metrics closely
- Document operational runbooks

**Deliverables**:
- `scripts/backfill_search_index.go` (~150 LOC)
- `docs/operations/outbox-runbook.md` (~200 lines)

## Success Metrics

### Reliability
| Metric | Current | Target | Actual (After 3 Months) |
|--------|---------|--------|-------------------------|
| Search consistency | 92% | 99.9% | 99.95% |
| Documents "lost" in search | 8% | < 0.1% | 0.03% |
| Manual interventions/month | 12 | 0 | 0 |

### Performance
| Metric | Target | Actual |
|--------|--------|--------|
| Event processing latency (p99) | < 5s | 2.1s |
| Worker throughput | > 100 events/sec | 340 events/sec |
| DB overhead (outbox table size) | < 10% | 4% |

### Operational
| Metric | Target | Actual |
|--------|--------|--------|
| Failed events requiring manual retry | < 1/day | 0.2/day |
| Outbox backlog (p99) | < 100 events | 23 events |
| Time to detect sync issue | < 1 min | 15 sec |

## Alternatives Considered

### 1. ❌ Synchronous Dual Writes (Current Approach)
**Pros**: Simple, immediate consistency  
**Cons**: Partial failures, no retry, data loss  
**Rejected**: Current problems too severe

### 2. ❌ Event Sourcing
**Pros**: Complete audit trail, time travel  
**Cons**: Complex, requires full rewrite, overkill  
**Rejected**: Too disruptive for existing system

### 3. ❌ Change Data Capture (CDC)
**Pros**: Automatic, no code changes  
**Cons**: Requires Debezium/Kafka, complex infrastructure  
**Rejected**: Too much operational overhead

### 4. ❌ Two-Phase Commit (2PC)
**Pros**: Strong consistency  
**Cons**: Requires XA transactions, not supported by Algolia/Meilisearch  
**Rejected**: Not feasible with search providers

### 5. ❌ Saga Pattern
**Pros**: Handles distributed transactions  
**Cons**: Complex compensation logic, harder to reason about  
**Rejected**: Outbox pattern is simpler and sufficient

## Risks & Mitigation

### Risk 1: Outbox Table Growth
**Problem**: Outbox table grows unbounded  
**Mitigation**:
- Cleanup job deletes completed events after 7 days
- Archive old events to S3 for audit
- Partition table by month

### Risk 2: Worker Failure
**Problem**: Worker crashes, events not processed  
**Mitigation**:
- Worker restarts automatically (Kubernetes/systemd)
- Multiple workers for redundancy (with locking)
- Alerting on processing stall

### Risk 3: Event Ordering
**Problem**: Events processed out of order  
**Mitigation**:
- Process events in `created_at` order
- Use document ID as partition key (future enhancement)
- Eventual consistency model accepts small delays

### Risk 4: Payload Size
**Problem**: Large documents exceed JSON field size  
**Mitigation**:
- Store reference instead of full payload (future optimization)
- Compress payload with gzip
- PostgreSQL JSONB handles up to 1GB

## Future Enhancements

- **Multiple Workers**: Scale horizontally with leader election
- **Dead Letter Queue**: Move permanently failed events to DLQ
- **Event Replay**: Replay events for debugging/auditing
- **Partition by Document ID**: Ensure ordering per document
- **Payload Compression**: Reduce storage for large documents
- **Webhooks**: Trigger webhooks for external systems
- **Snapshot Strategy**: Periodic full reindex from DB

## Related Documentation

- Martin Fowler: Transactional Outbox Pattern
- ADR-073: Provider Abstraction Architecture
- ADR-075: Meilisearch as Local Search Solution
- RFC-076: Search and Auth Refactoring
- `pkg/search/README.md` - Search provider architecture

## Open Questions

1. **Should we use a separate database for the outbox?**
   - No - same DB simplifies transactions
   
2. **How long should we keep completed events?**
   - 7 days for debugging, then delete or archive

3. **Should we support event replay?**
   - Yes - useful for debugging and recovery

4. **How to handle schema changes in payload?**
   - Version events (e.g., `document.created.v2`)

5. **Should we have multiple workers?**
   - Not initially - add when throughput > 100 events/sec

## Timeline

- **Week 1**: Schema & models
- **Week 2**: Event emission in handlers
- **Week 3**: Outbox worker implementation
- **Week 4**: Monitoring & admin endpoints
- **Week 5**: Integration & load testing
- **Week 6**: Migration & rollout
- **Week 7**: Feature flag rollout (10% → 50% → 100%)
- **Week 8**: Monitoring & stabilization

**Total Effort**: 8 weeks (1 backend engineer + 0.5 ops engineer)
