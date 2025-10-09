---
id: TODO-004
title: Implement Asynchronous Email Sending
date: 2025-10-09
type: TODO
priority: high
status: open
tags: [email, async, performance, api, documents, reviews]
related:
  - RFC-080
---

# Implement Asynchronous Email Sending

## Description

Multiple API endpoints currently send emails synchronously, which blocks the HTTP response until the email is sent. This creates a poor user experience and potential timeout issues.

## Code References

### Documents API (v1)
- **File**: `internal/api/documents.go`
- **Lines**: 516, 545-547
```go
// TODO: use a template for email content.
// TODO: use an asynchronous method for sending emails because we
//       currently block returning the HTTP response until sent.
// TODO: SendEmail is not part of workspace.Provider interface yet
```

### Documents API (v2)
- **File**: `internal/api/v2/documents.go`
- **Line**: 863
```go
// TODO: use an asynchronous method for sending emails because we
//       currently block returning the HTTP response until sent.
```

### Reviews API (v1)
- **Files**: `internal/api/reviews.go`
- **Lines**: 472, 524
```go
// TODO: use an asynchronous method for sending emails because we
//       currently block returning the HTTP response until sent.
```

### Reviews API (v2)
- **File**: `internal/api/v2/reviews.go`
- **Lines**: 557, 701
```go
// TODO: use an asynchronous method for sending emails because we
//       currently block returning the HTTP response until sent.
```

## Proposed Solution

### Option 1: Outbox Pattern (Recommended)
Use the outbox pattern already proposed in RFC-080:
- Write email events to database outbox table
- Background worker processes outbox events
- Provides reliability and audit trail

### Option 2: Go Channels + Worker Pool
- Create email queue using Go channels
- Worker goroutines consume from queue
- Simpler but less reliable than outbox

### Option 3: External Queue (Redis, RabbitMQ)
- Use external message queue
- Most scalable but adds infrastructure dependency

## Tasks

- [ ] Design email event schema for outbox
- [ ] Create email sender background worker
- [ ] Update SendEmail calls to be async
- [ ] Add email template system (addresses another TODO)
- [ ] Add email status tracking/monitoring
- [ ] Test error handling and retry logic

## Impact

**Files Affected**: 4 files, ~6 locations
**Complexity**: Medium-High
**User Experience**: High impact - removes blocking HTTP calls

## Related Work

This connects to RFC-080 (Outbox Pattern) which proposes the same pattern for document search indexing.

## References

- RFC-080 - Outbox Pattern for Document Synchronization
- `internal/api/documents.go` - Document status change emails
- `internal/api/v2/documents.go` - V2 document emails
- `internal/api/reviews.go` - V1 review notification emails
- `internal/api/v2/reviews.go` - V2 review notification emails
