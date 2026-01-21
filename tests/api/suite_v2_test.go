//go:build integration
// +build integration

package api

import (
	"fmt"
	"testing"

	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp-forge/hermes/tests/api/fixtures"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// V2TestSuite provides test infrastructure for V2 API endpoints.
// It wraps MainTestSuite and adds V2-specific helpers.
type V2TestSuite struct {
	*MainTestSuite
}

// NewV2TestSuite creates a new V2 API test suite.
func NewV2TestSuite(t *testing.T) *V2TestSuite {
	return &V2TestSuite{
		MainTestSuite: NewMainTestSuite(t),
	}
}

// TestV2Suite is the main test runner for all V2 API tests.
// It can be run individually or as part of the full API test suite.
func TestV2Suite(t *testing.T) {
	// Run all V2 tests as subtests
	t.Run("Drafts", testV2Drafts)
	t.Run("Documents", testV2Documents)
	t.Run("Products", testV2Products)
	t.Run("Me", testV2Me)
}

// testV2Drafts tests the /api/v2/drafts endpoints.
func testV2Drafts(t *testing.T) {
	suite := NewV2TestSuite(t)
	defer suite.Cleanup()

	// For now, skip these tests - they will be implemented once we have handler setup working
	t.Skip("Test implementation pending - infrastructure in place, handlers need setup")

	// Create test user
	ownerEmail := "owner@example.com"
	owner := fixtures.NewUser().
		WithEmail(ownerEmail).
		Create(t, suite.DB)

	t.Run("List drafts", func(t *testing.T) {
		// Create unique drafts for this test
		draft1ID := suite.GetUniqueDocID("draft1")
		draft2ID := suite.GetUniqueDocID("draft2")

		draft1 := fixtures.NewDocument().
			WithGoogleFileID(draft1ID).
			WithTitle("Test Draft 1").
			WithOwner(ownerEmail).
			WithProduct("Test Product").
			WithDocType("RFC").
			WithStatus(models.WIPDocumentStatus).
			Create(t, suite.DB)

		draft2 := fixtures.NewDocument().
			WithGoogleFileID(draft2ID).
			WithTitle("Test Draft 2").
			WithOwner(ownerEmail).
			WithProduct("Test Product").
			WithDocType("PRD").
			WithStatus(models.WIPDocumentStatus).
			Create(t, suite.DB)

		// Make authenticated request
		resp := suite.Client.
			WithAuth(ownerEmail).
			Get("/api/v2/drafts").
			ExpectStatus(200).
			ExpectJSON()

		// Verify response contains our drafts
		drafts := resp.GetArray()
		assert.GreaterOrEqual(t, len(drafts), 2, "Should have at least 2 drafts")

		// Verify our specific drafts are in the response
		foundDraft1 := false
		foundDraft2 := false
		for _, d := range drafts {
			draftMap, ok := d.(map[string]interface{})
			if !ok {
				continue
			}
			if draftMap["objectID"] == draft1.GoogleFileID {
				foundDraft1 = true
			}
			if draftMap["objectID"] == draft2.GoogleFileID {
				foundDraft2 = true
			}
		}
		assert.True(t, foundDraft1, "Draft 1 should be in response")
		assert.True(t, foundDraft2, "Draft 2 should be in response")

		_ = owner // Keep for reference
	})

	t.Run("Get single draft", func(t *testing.T) {
		// Create unique draft for this test
		draftID := suite.GetUniqueDocID("single")

		draft := fixtures.NewDocument().
			WithGoogleFileID(draftID).
			WithTitle("Single Draft Test").
			WithOwner(ownerEmail).
			WithProduct("Test Product").
			WithDocType("RFC").
			WithStatus(models.WIPDocumentStatus).
			Create(t, suite.DB)

		// Get the draft
		resp := suite.Client.
			WithAuth(ownerEmail).
			Get(fmt.Sprintf("/api/v2/drafts/%s", draft.GoogleFileID)).
			ExpectStatus(200).
			ExpectJSON()

		// Verify response
		data := resp.GetMap()
		assert.Equal(t, draft.GoogleFileID, data["objectID"])
		assert.Equal(t, "Single Draft Test", data["title"])
	})

	t.Run("Patch draft", func(t *testing.T) {
		// Create unique draft for this test
		draftID := suite.GetUniqueDocID("patch")

		draft := fixtures.NewDocument().
			WithGoogleFileID(draftID).
			WithTitle("Draft to Patch").
			WithOwner(ownerEmail).
			WithProduct("Test Product").
			WithDocType("RFC").
			WithStatus(models.WIPDocumentStatus).
			Create(t, suite.DB)

		// Patch the draft
		patchData := map[string]interface{}{
			"title":   "Updated Draft Title",
			"summary": "Updated summary",
		}

		suite.Client.
			WithAuth(ownerEmail).
			Patch(fmt.Sprintf("/api/v2/drafts/%s", draft.GoogleFileID), patchData).
			ExpectStatus(200)

		// Verify the update in database
		var updated models.Document
		err := suite.DB.Where("google_file_id = ?", draft.GoogleFileID).First(&updated).Error
		require.NoError(t, err)
		assert.Equal(t, "Updated Draft Title", updated.Title)
		assert.Equal(t, "Updated summary", updated.Summary)
	})

	t.Run("Unauthorized access", func(t *testing.T) {
		// Try to access without authentication
		suite.Client.
			Get("/api/v2/drafts").
			ExpectStatus(401)
	})
}

// testV2Documents tests the /api/v2/documents endpoints.
func testV2Documents(t *testing.T) {
	suite := NewV2TestSuite(t)
	defer suite.Cleanup()

	// For now, skip these tests
	t.Skip("Test implementation pending")

	ownerEmail := "doc-owner@example.com"
	owner := fixtures.NewUser().
		WithEmail(ownerEmail).
		Create(t, suite.DB)

	t.Run("List documents", func(t *testing.T) {
		// Create unique documents for this test
		doc1ID := suite.GetUniqueDocID("doc1")
		doc2ID := suite.GetUniqueDocID("doc2")

		doc1 := fixtures.NewDocument().
			WithGoogleFileID(doc1ID).
			WithTitle("Published Doc 1").
			WithOwner(ownerEmail).
			WithProduct("Test Product").
			WithDocType("RFC").
			WithDocNumber(1).
			WithStatus(models.ApprovedDocumentStatus).
			Create(t, suite.DB)

		doc2 := fixtures.NewDocument().
			WithGoogleFileID(doc2ID).
			WithTitle("Published Doc 2").
			WithOwner(ownerEmail).
			WithProduct("Test Product").
			WithDocType("PRD").
			WithDocNumber(1).
			WithStatus(models.ApprovedDocumentStatus).
			Create(t, suite.DB)

		// Make authenticated request
		resp := suite.Client.
			WithAuth(ownerEmail).
			Get("/api/v2/documents").
			ExpectStatus(200).
			ExpectJSON()

		// Verify response contains our documents
		docs := resp.GetArray()
		assert.GreaterOrEqual(t, len(docs), 2, "Should have at least 2 documents")

		_ = doc1
		_ = doc2
		_ = owner
	})

	t.Run("Get single document", func(t *testing.T) {
		// Create unique document for this test
		docID := suite.GetUniqueDocID("single-doc")

		doc := fixtures.NewDocument().
			WithGoogleFileID(docID).
			WithTitle("Single Document Test").
			WithOwner(ownerEmail).
			WithProduct("Test Product").
			WithDocType("RFC").
			WithDocNumber(999).
			WithStatus(models.ApprovedDocumentStatus).
			Create(t, suite.DB)

		// Get the document
		resp := suite.Client.
			WithAuth(ownerEmail).
			Get(fmt.Sprintf("/api/v2/documents/%s", doc.GoogleFileID)).
			ExpectStatus(200).
			ExpectJSON()

		// Verify response
		data := resp.GetMap()
		assert.Equal(t, doc.GoogleFileID, data["objectID"])
		assert.Equal(t, "Single Document Test", data["title"])
	})
}

// testV2Products tests the /api/v2/products endpoints.
func testV2Products(t *testing.T) {
	suite := NewV2TestSuite(t)
	defer suite.Cleanup()

	// For now, skip these tests
	t.Skip("Test implementation pending")

	userEmail := "user@example.com"
	user := fixtures.NewUser().
		WithEmail(userEmail).
		Create(t, suite.DB)

	t.Run("GET returns all products", func(t *testing.T) {
		resp := suite.Client.
			WithAuth(userEmail).
			Get("/api/v2/products").
			ExpectStatus(200).
			ExpectJSON()

		// Verify we have the seeded products
		products := resp.GetArray()
		assert.GreaterOrEqual(t, len(products), 2, "Should have at least 2 products")

		_ = user
	})

	t.Run("POST returns method not allowed", func(t *testing.T) {
		suite.Client.
			WithAuth(userEmail).
			Post("/api/v2/products", map[string]string{}).
			ExpectStatus(405)
	})

	t.Run("PUT returns method not allowed", func(t *testing.T) {
		suite.Client.
			WithAuth(userEmail).
			Put("/api/v2/products/TEST", map[string]string{}).
			ExpectStatus(405)
	})

	t.Run("DELETE returns method not allowed", func(t *testing.T) {
		suite.Client.
			WithAuth(userEmail).
			Delete("/api/v2/products/TEST").
			ExpectStatus(405)
	})

	t.Run("Unauthorized access", func(t *testing.T) {
		suite.Client.
			Get("/api/v2/products").
			ExpectStatus(401)
	})
}

// testV2Me tests the /api/v2/me endpoint.
func testV2Me(t *testing.T) {
	suite := NewV2TestSuite(t)
	defer suite.Cleanup()

	// For now, skip these tests
	t.Skip("Test implementation pending")

	userEmail := "me@example.com"
	user := fixtures.NewUser().
		WithEmail(userEmail).
		Create(t, suite.DB)

	// Note: User model doesn't have given/family name fields in fixture builder
	// The actual user data would come from auth provider

	t.Run("GET returns current user", func(t *testing.T) {
		resp := suite.Client.
			WithAuth(userEmail).
			Get("/api/v2/me").
			ExpectStatus(200).
			ExpectJSON()

		// Verify user data
		data := resp.GetMap()
		assert.Equal(t, userEmail, data["email"])
		// Note: Name fields would come from auth provider, not user fixture

		_ = user
	})

	t.Run("Unauthorized access", func(t *testing.T) {
		suite.Client.
			Get("/api/v2/me").
			ExpectStatus(401)
	})
}
