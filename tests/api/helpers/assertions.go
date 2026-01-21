// Package helpers provides common test helpers and assertions.
package helpers

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/stretchr/testify/assert"
)

// AssertDocument compares a document with expected values.
func AssertDocument(t *testing.T, doc *models.Document, opts DocumentAssertions) {
	t.Helper()

	if opts.GoogleFileID != "" {
		assert.Equal(t, opts.GoogleFileID, doc.GoogleFileID, "GoogleFileID mismatch")
	}
	if opts.Title != "" {
		assert.Equal(t, opts.Title, doc.Title, "Title mismatch")
	}
	if opts.Status != 0 {
		assert.Equal(t, opts.Status, doc.Status, "Status mismatch")
	}
	if opts.DocumentType != "" {
		assert.Equal(t, opts.DocumentType, doc.DocumentType.Name, "DocumentType mismatch")
	}
	if opts.Product != "" {
		assert.Equal(t, opts.Product, doc.Product.Name, "Product mismatch")
	}
	if opts.Owner != "" {
		assert.NotNil(t, doc.Owner, "Owner should not be nil")
		assert.Equal(t, opts.Owner, doc.Owner.EmailAddress, "Owner mismatch")
	}
	if opts.ApproverCount > 0 {
		assert.Len(t, doc.Approvers, opts.ApproverCount, "Approver count mismatch")
	}
	if opts.ContributorCount > 0 {
		assert.Len(t, doc.Contributors, opts.ContributorCount, "Contributor count mismatch")
	}
}

// DocumentAssertions contains optional fields for document assertions.
type DocumentAssertions struct {
	GoogleFileID     string
	Title            string
	Status           models.DocumentStatus
	DocumentType     string
	Product          string
	Owner            string
	ApproverCount    int
	ContributorCount int
}

// AssertProject compares a project with expected values.
func AssertProject(t *testing.T, project *models.Project, opts ProjectAssertions) {
	t.Helper()

	if opts.Title != "" {
		assert.Equal(t, opts.Title, project.Title, "Title mismatch")
	}
	if opts.Status != 0 {
		assert.Equal(t, opts.Status, project.Status, "Status mismatch")
	}
	if opts.Creator != "" {
		assert.Equal(t, opts.Creator, project.Creator.EmailAddress, "Creator mismatch")
	}
	if opts.Description != "" {
		assert.NotNil(t, project.Description, "Description should not be nil")
		assert.Equal(t, opts.Description, *project.Description, "Description mismatch")
	}
}

// ProjectAssertions contains optional fields for project assertions.
type ProjectAssertions struct {
	Title       string
	Status      models.ProjectStatus
	Creator     string
	Description string
}

// AssertJSONField checks that a JSON object contains a field with the expected value.
func AssertJSONField(t *testing.T, jsonData []byte, field string, expected interface{}) {
	t.Helper()

	var data map[string]interface{}
	err := json.Unmarshal(jsonData, &data)
	assert.NoError(t, err, "Failed to unmarshal JSON")

	actual, ok := data[field]
	assert.True(t, ok, "Field %s not found in JSON", field)
	assert.Equal(t, expected, actual, "Field %s has unexpected value", field)
}

// AssertJSONArray checks that a JSON array has the expected length.
func AssertJSONArray(t *testing.T, jsonData []byte, expectedLength int) {
	t.Helper()

	var data []interface{}
	err := json.Unmarshal(jsonData, &data)
	assert.NoError(t, err, "Failed to unmarshal JSON array")
	assert.Len(t, data, expectedLength, "Array length mismatch")
}

// AssertTimeAlmostEqual checks that two times are within a tolerance of each other.
func AssertTimeAlmostEqual(t *testing.T, expected, actual time.Time, tolerance time.Duration) {
	t.Helper()

	diff := actual.Sub(expected)
	if diff < 0 {
		diff = -diff
	}
	assert.True(t, diff <= tolerance, "Time difference %v exceeds tolerance %v", diff, tolerance)
}

// AssertContains checks that a slice contains a value.
func AssertContains(t *testing.T, slice []string, value string) {
	t.Helper()

	for _, v := range slice {
		if v == value {
			return
		}
	}
	t.Errorf("Slice does not contain %s", value)
}

// AssertNotContains checks that a slice does not contain a value.
func AssertNotContains(t *testing.T, slice []string, value string) {
	t.Helper()

	for _, v := range slice {
		if v == value {
			t.Errorf("Slice should not contain %s", value)
			return
		}
	}
}
