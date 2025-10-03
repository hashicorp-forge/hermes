# TODO: Migrate API Handlers to Storage Interfaces

**Status**: Planned  
**Priority**: High  
**Effort**: Large (3-4 weeks)  
**Dependencies**: Storage abstraction layer complete

## Overview

Migrate all API handlers in `internal/api/` from directly using Google Workspace types to the new storage abstraction interfaces. This will enable:
- Local development without Google Cloud credentials
- Easier testing with mock storage providers
- Future support for multiple storage backends
- Cleaner separation of concerns

## Affected Files & Handlers

### Phase 1: Simple Handlers (Week 1)
Low complexity, minimal dependencies on Google Workspace

- [ ] `internal/api/me.go` - User profile endpoints
  - Update `MeHandler()` to accept `storage.StorageProvider`
  - Replace `gw.Service` calls with `storage.PeopleService`
  - Update tests to use mock storage

- [ ] `internal/api/products.go` - Product management
  - Already mostly database-driven
  - Add storage integration for thumbnails/metadata
  - Update tests

### Phase 2: Document Handlers (Week 2-3)
Core document operations, high complexity

- [ ] `internal/api/documents.go` - Document CRUD operations
  - Replace `gw.Service.Docs.*` with `storage.DocumentStorage`
  - Update `DocumentHandler()` signature
  - Migrate document creation flow
  - Migrate document retrieval
  - Migrate document updates
  - Handle template instantiation
  - Update all 15+ test cases

- [ ] `internal/api/drafts.go` - Draft document management
  - Replace Google Drive folder operations
  - Migrate draft→published workflow
  - Update shareable link generation
  - Refactor permissions handling

- [ ] `internal/api/drafts_shareable.go` - Shareable drafts
  - Migrate to storage-agnostic sharing model
  - Update permission management

### Phase 3: Collaboration Handlers (Week 3)
Review and approval workflows

- [ ] `internal/api/reviews.go` - Document reviews
  - Replace Google Docs commenting APIs
  - Migrate to storage-agnostic review system
  - Update notification flow

- [ ] `internal/api/approvals.go` - Approval workflows
  - Update document approval operations
  - Migrate Gmail notification to `storage.NotificationService`

### Phase 4: Supporting Handlers (Week 4)
People search, subscriptions, related resources

- [ ] `internal/api/people.go` - User search
  - Replace `gw.Service.People.*` calls
  - Use `storage.PeopleService.SearchUsers()`
  - Update caching if needed

- [ ] `internal/api/me_subscriptions.go` - User subscriptions
  - Integrate with storage authentication
  - Update notification preferences

- [ ] `internal/api/me_recently_viewed_docs.go` - Recently viewed
  - Use storage-agnostic document retrieval
  - Update tracking mechanism

- [ ] `internal/api/documents_related_resources.go` - Related resources
  - Migrate to storage document linking
  - Update cross-document references

### Phase 5: V2 API Handlers (Week 4)
New API version endpoints

- [ ] `internal/api/v2/documents.go`
- [ ] `internal/api/v2/drafts.go`
- [ ] `internal/api/v2/drafts_shareable.go`
- [ ] `internal/api/v2/reviews.go`
- [ ] `internal/api/v2/helpers.go` - Shared utilities

## Migration Pattern

### Before (Google Workspace direct)
```go
func DocumentHandler(
    cfg *config.Config,
    l hclog.Logger,
    ar *algolia.Client,
    aw *algolia.Client,
    s *gw.Service,
    db *gorm.DB,
) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Direct Google Workspace API calls
        doc, err := s.Docs.GetObject(ctx, docID)
        // ...
    })
}
```

### After (Storage interfaces)
```go
func DocumentHandler(
    cfg *config.Config,
    l hclog.Logger,
    ar *algolia.Client,
    aw *algolia.Client,
    provider storage.StorageProvider,
    db *gorm.DB,
) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Storage abstraction calls
        doc, err := provider.DocumentStorage().GetDocument(ctx, docID)
        // ...
    })
}
```

## Server Initialization Update

Update `internal/cmd/commands/server/server.go`:

```go
// Create storage provider based on config
var provider storage.StorageProvider
switch cfg.Storage.Provider {
case "google":
    gwService, err := google.NewFromConfig(&cfg.GoogleWorkspace)
    if err != nil {
        return err
    }
    provider = google.NewAdapter(gwService)
case "localworkspace":
    provider, err = localworkspace.NewAdapter(&localworkspace.Config{
        BasePath: cfg.Storage.LocalWorkspace.BasePath,
    })
    if err != nil {
        return err
    }
default:
    return fmt.Errorf("unknown storage provider: %s", cfg.Storage.Provider)
}

// Pass provider to handlers instead of gw.Service
docHandler := api.DocumentHandler(cfg, logger, alg, provider, db)
```

## Testing Strategy

### Unit Tests
- [ ] Create mock storage provider for testing
- [ ] Update existing handler tests to use mock
- [ ] Add tests for storage error conditions
- [ ] Verify all edge cases still covered

### Integration Tests
- [ ] Test with both Google and localworkspace providers
- [ ] Verify data compatibility between backends
- [ ] Test migration scenarios
- [ ] Performance benchmarks

### Manual Testing
- [ ] Local development workflow
- [ ] Document CRUD operations
- [ ] Draft publishing flow
- [ ] Review/approval workflows
- [ ] Search functionality
- [ ] Notification delivery

## Configuration Changes

Add to `configs/config.hcl`:

```hcl
storage {
  provider = "localworkspace"  # or "google"
  
  localworkspace {
    base_path = "./storage"
  }
  
  google {
    # Existing googleworkspace config
  }
}
```

## Breaking Changes

### API Compatibility
- [ ] Document any API response changes
- [ ] Update API documentation
- [ ] Version bump if needed
- [ ] Migration guide for clients

### Database Schema
- [ ] Review if any schema changes needed
- [ ] Create migrations if necessary
- [ ] Update seed data

## Success Criteria

- [ ] All handlers use storage interfaces
- [ ] No direct `gw.Service` references in `internal/api/`
- [ ] All existing tests pass
- [ ] New tests for storage abstraction
- [ ] Local development works without Google credentials
- [ ] Performance parity with existing implementation
- [ ] Documentation updated

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking changes to API | High | Careful testing, version bump |
| Performance regression | Medium | Benchmarks, optimization |
| Feature parity issues | High | Comprehensive testing |
| Database compatibility | Medium | Thorough migration testing |
| Google-specific features lost | Medium | Document limitations, fallbacks |

## Notes

- Keep Google Workspace adapter as primary for production initially
- localworkspace adapter for development and testing
- Consider feature flags for gradual rollout
- Monitor error rates and performance metrics
- Plan for backward compatibility period

## Related TODOs

- TODO_UNIT_TESTS.md - Additional unit test coverage
- TODO_API_TEST_SUITE.md - Comprehensive API testing
- TODO_INTEGRATION_TESTS.md - Migration from examples to proper framework
