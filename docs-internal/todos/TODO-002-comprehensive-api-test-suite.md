---
id: TODO-002
title: Build Comprehensive API Test Suite
date: 2025-10-09
type: TODO
priority: high
status: in-progress
progress: 29%
tags: [testing, api, integration-tests, coverage, v1-api, v2-api]
related:
  - ADR-070
  - RFC-079
---

# Build Comprehensive API Test Suite

## Overview

Build a comprehensive, well-organized test suite for the Hermes API that covers:
- All HTTP endpoints (v1 and v2)
- Authentication and authorization scenarios
- Database state management
- Integration with local storage adapter
- Integration with Meilisearch adapter
- Error handling and edge cases
- Performance characteristics

**Priority**: Local end-to-end integration testing of the entire API to exercise code paths.

## Progress (Last Updated: Oct 3, 2025)

### ✅ Completed (29% overall)

**v1 API Endpoints (2/8 complete - 25%)**:
- ✅ DocumentTypesHandler - 5 tests, all passing
- ✅ AnalyticsHandler - 7 tests, all passing

**Test Infrastructure**:
- ✅ Created `api_v1_test.go` with integration test patterns
- ✅ Testcontainers setup working (PostgreSQL + Meilisearch)
- ✅ HTTP handler testing with httptest
- ✅ JSON request/response validation

**Documentation**:
- ✅ Created API_TEST_PROGRESS.md with detailed session notes
- ✅ Documented test patterns and best practices
- ✅ Identified roadmap for remaining endpoints

### 🚧 Blockers

**Mock Infrastructure Needed**:
- Search provider abstraction (for ProductsHandler)
- Google Workspace mock
- Authentication mock
- Email service mock

## Roadmap

### Phase 1: Simple v1 Endpoints
1. ⏭️ ProductsHandler - Needs Algolia/search mock
2. ⏭️ MeHandler - Needs auth mock

### Phase 2: v2 API Endpoints
3. ⏭️ v2/DocumentTypesHandler
4. ⏭️ v2/AnalyticsHandler
5. ⏭️ v2/ProductsHandler

### Phase 3: Complex Endpoints (After Mocking)
6. ⏭️ DocumentHandler (GET/PATCH/DELETE)
7. ⏭️ DraftsHandler (POST/GET/PATCH)
8. ⏭️ ReviewsHandler
9. ⏭️ ApprovalsHandler

### Phase 4: Authorization Tests
- Add authorization tests for all endpoints
- Test permission boundaries
- Test role-based access control

### Phase 5: Integration Scenarios
- Multi-step workflows (create → approve → publish)
- Error recovery scenarios
- Performance testing under load

## Current Gaps

- No v2 API tests (infrastructure ready, waiting for Phase 2)
- Missing authorization tests (needs auth mock)
- No performance tests (planned for Phase 5)
- Incomplete error handling coverage (improving incrementally)
- Missing integration scenarios (planned for Phase 5)
- Need search provider mock for Algolia-dependent endpoints

## Success Criteria

- [ ] 100% of v1 endpoints have integration tests
- [ ] 100% of v2 endpoints have integration tests
- [ ] All tests run without external dependencies
- [ ] Test coverage > 80% for API handlers
- [ ] Performance baseline established
- [ ] CI/CD integration complete

## Notes

**Testing Strategy**: If integration testing requires external services, stop and discuss how to mock or stand up a local alternative.

**Validation**: Use code coverage testing workflow to validate progress.

## References

- `tests/api/` - Integration test suite
- `internal/api/` - v1 API handlers
- `internal/api/v2/` - v2 API handlers
- ADR-070 - Testing Docker Compose Environment
