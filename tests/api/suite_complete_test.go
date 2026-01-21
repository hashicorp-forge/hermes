//go:build integration
// +build integration

package api

import (
	"testing"
)

// TestAPIComplete runs all API integration tests (V1 + V2) in a single pass.
// This is the main entry point for full API test coverage.
//
// To run all tests:
//
//	go test -tags=integration -v ./tests/api/ -run TestAPIComplete
//
// To run only V1 tests:
//
//	go test -tags=integration -v ./tests/api/ -run TestV1Suite
//
// To run only V2 tests:
//
//	go test -tags=integration -v ./tests/api/ -run TestV2Suite
//
// To run a specific endpoint:
//
//	go test -tags=integration -v ./tests/api/ -run TestV1Suite/DocumentTypes
//	go test -tags=integration -v ./tests/api/ -run TestV2Suite/Drafts
func TestAPIComplete(t *testing.T) {
	t.Run("V1", TestV1Suite)
	t.Run("V2", TestV2Suite)
}
