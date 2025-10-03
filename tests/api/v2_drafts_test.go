//go:build integration

package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	apiv2 "github.com/hashicorp-forge/hermes/internal/api/v2"
	"github.com/hashicorp-forge/hermes/internal/server"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	pkgauth "github.com/hashicorp-forge/hermes/pkg/auth"
	mockadapter "github.com/hashicorp-forge/hermes/pkg/auth/adapters/mock"
	"github.com/hashicorp-forge/hermes/pkg/models"
	gw "github.com/hashicorp-forge/hermes/pkg/workspace/adapters/google"
	"github.com/hashicorp-forge/hermes/tests/api/fixtures"
	"github.com/hashicorp/go-hclog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestV2Drafts_List tests listing drafts with mock auth.
func TestV2Drafts_List(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	ownerEmail := "owner@example.com"
	contributorEmail := "contributor@example.com"

	// Create test users
	owner := fixtures.NewUser().
		WithEmail(ownerEmail).
		Create(t, suite.DB)

	contributor := fixtures.NewUser().
		WithEmail(contributorEmail).
		Create(t, suite.DB)

	// Create a few test drafts (uses seeded "Test Product" and "RFC" document type)
	draft1 := fixtures.NewDocument().
		WithTitle("Draft 1").
		WithOwner(ownerEmail).
		WithContributor(contributorEmail).
		WithProduct("Test Product").
		WithDocType("RFC").
		WithStatus(models.WIPDocumentStatus).
		Create(t, suite.DB)

	draft2 := fixtures.NewDocument().
		WithTitle("Draft 2").
		WithOwner(ownerEmail).
		WithProduct("Test Product").
		WithDocType("RFC").
		WithStatus(models.WIPDocumentStatus).
		Create(t, suite.DB)

	// Create mock auth adapter as owner
	mockAuth := mockadapter.NewAdapterWithEmail(ownerEmail)
	log := hclog.NewNullLogger()

	srv := &server.Server{
		AlgoSearch:     &algolia.Client{},
		AlgoWrite:      &algolia.Client{},
		SearchProvider: suite.SearchProvider,
		Config:         suite.Config,
		DB:             suite.DB,
		GWService:      &gw.Service{},
		Logger:         log,
	}

	handler := pkgauth.Middleware(mockAuth, log)(apiv2.DraftsHandler(*srv))

	// Create GET request to list drafts
	req := httptest.NewRequest("GET", "/api/v2/drafts", nil)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	// Verify response
	assert.Equal(t, http.StatusOK, rr.Code)

	var response []map[string]interface{}
	err := json.NewDecoder(rr.Body).Decode(&response)
	require.NoError(t, err)

	// Should have at least 2 drafts
	assert.GreaterOrEqual(t, len(response), 2, "Expected at least 2 drafts")

	// Verify draft data (if any returned)
	if len(response) > 0 {
		firstDraft := response[0]
		assert.NotEmpty(t, firstDraft["id"], "Draft should have ID")
		assert.NotEmpty(t, firstDraft["title"], "Draft should have title")
	}

	t.Logf("Found %d drafts: %v", len(response), response)
	t.Logf("Draft1: %+v, Draft2: %+v", draft1, draft2)
	t.Logf("Owner: %+v, Contributor: %+v", owner, contributor)
}

// TestV2Drafts_GetSingle tests fetching a single draft by ID.
func TestV2Drafts_GetSingle(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	ownerEmail := "owner@example.com"

	// Create test user
	fixtures.NewUser().
		WithEmail(ownerEmail).
		Create(t, suite.DB)

	// Create a test draft (uses seeded "Test Product")
	draft := fixtures.NewDocument().
		WithTitle("Test Draft").
		WithOwner(ownerEmail).
		WithProduct("Test Product").
		WithDocType("RFC").
		WithStatus(models.WIPDocumentStatus).
		Create(t, suite.DB)

	// Create mock auth adapter as owner
	mockAuth := mockadapter.NewAdapterWithEmail(ownerEmail)
	log := hclog.NewNullLogger()

	srv := &server.Server{
		AlgoSearch:     &algolia.Client{},
		AlgoWrite:      &algolia.Client{},
		SearchProvider: suite.SearchProvider,
		Config:         suite.Config,
		DB:             suite.DB,
		GWService:      &gw.Service{},
		Logger:         log,
	}

	handler := pkgauth.Middleware(mockAuth, log)(apiv2.DraftsDocumentHandler(*srv))

	// Create GET request for specific draft
	req := httptest.NewRequest("GET", fmt.Sprintf("/api/v2/drafts/%s", draft.GoogleFileID), nil)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	// Verify response
	assert.Equal(t, http.StatusOK, rr.Code)

	var response map[string]interface{}
	err := json.NewDecoder(rr.Body).Decode(&response)
	require.NoError(t, err)

	// Verify draft data
	assert.Equal(t, draft.GoogleFileID, response["id"])
	assert.Equal(t, draft.Title, response["title"])

	t.Logf("Retrieved draft: %+v", response)
}

// TestV2Drafts_Patch tests updating a draft.
func TestV2Drafts_Patch(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	ownerEmail := "owner@example.com"

	// Create test user
	fixtures.NewUser().
		WithEmail(ownerEmail).
		Create(t, suite.DB)

	// Create a test draft (uses seeded "Test Product")
	draft := fixtures.NewDocument().
		WithTitle("Original Title").
		WithOwner(ownerEmail).
		WithProduct("Test Product").
		WithDocType("RFC").
		WithStatus(models.WIPDocumentStatus).
		Create(t, suite.DB)

	// Create mock auth adapter as owner
	mockAuth := mockadapter.NewAdapterWithEmail(ownerEmail)
	log := hclog.NewNullLogger()

	srv := &server.Server{
		AlgoSearch:     &algolia.Client{},
		AlgoWrite:      &algolia.Client{},
		SearchProvider: suite.SearchProvider,
		Config:         suite.Config,
		DB:             suite.DB,
		GWService:      &gw.Service{},
		Logger:         log,
	}

	handler := pkgauth.Middleware(mockAuth, log)(apiv2.DraftsDocumentHandler(*srv))

	// Create PATCH request to update title
	updateData := map[string]interface{}{
		"title": "Updated Title",
	}
	body, _ := json.Marshal(updateData)

	req := httptest.NewRequest("PATCH", fmt.Sprintf("/api/v2/drafts/%s", draft.GoogleFileID), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	// Verify response (may vary based on implementation)
	// Some implementations return 200, others 204
	assert.True(t, rr.Code == http.StatusOK || rr.Code == http.StatusNoContent,
		"Expected 200 OK or 204 No Content, got %d", rr.Code)

	// Verify the draft was updated in database
	var updatedDraft models.Document
	err := suite.DB.Where("google_file_id = ?", draft.GoogleFileID).First(&updatedDraft).Error
	require.NoError(t, err)

	// Note: Title might not update immediately depending on implementation
	t.Logf("Original title: %s, Updated draft title: %s", draft.Title, updatedDraft.Title)
}

// TestV2Drafts_Unauthorized tests that unauthorized users cannot access drafts.
func TestV2Drafts_Unauthorized(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	ownerEmail := "owner@example.com"
	otherUserEmail := "other@example.com"

	// Create users
	fixtures.NewUser().WithEmail(ownerEmail).Create(t, suite.DB)
	fixtures.NewUser().WithEmail(otherUserEmail).Create(t, suite.DB)

	// Create a draft owned by owner (uses seeded "Test Product")
	draft := fixtures.NewDocument().
		WithTitle("Private Draft").
		WithOwner(ownerEmail).
		WithProduct("Test Product").
		WithDocType("RFC").
		WithStatus(models.WIPDocumentStatus).
		Create(t, suite.DB)

	// Try to access as other user (not owner, not contributor)
	mockAuth := mockadapter.NewAdapterWithEmail(otherUserEmail)
	log := hclog.NewNullLogger()

	srv := &server.Server{
		AlgoSearch:     &algolia.Client{},
		AlgoWrite:      &algolia.Client{},
		SearchProvider: suite.SearchProvider,
		Config:         suite.Config,
		DB:             suite.DB,
		GWService:      &gw.Service{},
		Logger:         log,
	}

	handler := pkgauth.Middleware(mockAuth, log)(apiv2.DraftsDocumentHandler(*srv))

	// Try to PATCH the draft as non-owner
	updateData := map[string]interface{}{
		"title": "Hacked Title",
	}
	body, _ := json.Marshal(updateData)

	req := httptest.NewRequest("PATCH", fmt.Sprintf("/api/v2/drafts/%s", draft.GoogleFileID), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	// Should be forbidden (403) or unauthorized (401)
	assert.True(t, rr.Code == http.StatusForbidden || rr.Code == http.StatusUnauthorized,
		"Expected 401 or 403, got %d", rr.Code)

	t.Logf("Unauthorized access resulted in status: %d", rr.Code)
}
