# TODO: Build Comprehensive API Test Suite

## Overview

Build a comprehensive, well-organized test suite for the Hermes API that covers:
- All HTTP endpoints (v1 and v2)
- Authentication and authorization scenarios
- Database state management
- Integration with local storage adapter
- Integration with meili search adapter
- Error handling and edge cases
- Performance characteristics

PRIORITIZE local end-to-end integration testing of the entire API to exercise code paths

If integration testing requires external services stop and we will discuss how to mock or stand up a local alternative

Use code coverage testing workflow to validate progress

## Progress (Oct 3, 2025)

### ✅ Completed
- **v1 API Endpoints (2/8 complete)**
  - ✅ DocumentTypesHandler - 5 tests, all passing
  - ✅ AnalyticsHandler - 7 tests, all passing
  
- **Test Infrastructure**
  - ✅ Created `api_v1_test.go` with integration test patterns
  - ✅ Testcontainers setup working (PostgreSQL + Meilisearch)
  - ✅ HTTP handler testing with httptest
  - ✅ JSON request/response validation

- **Documentation**
  - ✅ Created API_TEST_PROGRESS.md with detailed session notes
  - ✅ Documented test patterns and best practices
  - ✅ Identified roadmap for remaining endpoints

### 🚧 In Progress
- **Mock Infrastructure Needed**
  - Search provider abstraction (for ProductsHandler)
  - Google Workspace mock
  - Authentication mock
  - Email service mock

### ⏭️ Next Steps (Priority Order)

#### Phase 1: Simple v1 Endpoints
1. ⏭️ ProductsHandler - Needs Algolia/search mock
2. ⏭️ MeHandler - Needs auth mock

#### Phase 2: v2 API Endpoints  
3. ⏭️ v2/DocumentTypesHandler
4. ⏭️ v2/AnalyticsHandler
5. ⏭️ v2/ProductsHandler

#### Phase 3: Complex Endpoints (After Mocking)
6. ⏭️ DocumentHandler (GET/PATCH/DELETE)
7. ⏭️ DraftsHandler (POST/GET/PATCH)
8. ⏭️ ReviewsHandler
9. ⏭️ ApprovalsHandler

### Gaps (Updated)
- No v2 API tests (planned, infrastructure ready)
- Missing authorization tests (needs auth mock)
- No performance tests (planned for Phase 5)
- Incomplete error handling coverage (improving incrementally)
- Missing integration scenarios (planned for Phase 5)
- Need search provider mock for Algolia-dependent endpoints

