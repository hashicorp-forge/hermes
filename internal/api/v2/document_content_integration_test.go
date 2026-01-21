//go:build integration
// +build integration

package api

// NOTE: Integration tests for document content API
//
// These tests would verify the full document content API flow with:
// - Real PostgreSQL database
// - Local workspace provider with file storage
// - Complete document creation and editing lifecycle
// - Permission checking (owner/contributor access)
// - Locked document handling
// - Search indexing after updates
//
// To implement comprehensive integration tests, use the test suite in tests/api
// which provides database setup, search provider integration, and fixture builders.
//
// Example integration test flow:
// 1. Create test database and local workspace
// 2. Create document with owner
// 3. PUT /api/v2/documents/:id/content - save content
// 4. GET /api/v2/documents/:id/content - retrieve and verify
// 5. Test unauthorized user (should get 403)
// 6. Test locked document (should get 400)
// 7. Verify search indexing occurred
//
// For now, the unit tests in document_content_test.go provide adequate coverage
// of the capability checking logic, and end-to-end validation will be done
// via Playwright tests with real browser interaction.
