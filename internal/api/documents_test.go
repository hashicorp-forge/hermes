package api

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestParseDocumentsURLPath(t *testing.T) {
	cases := map[string]struct {
		url                        string
		resourceType               string
		wantDocID                  string
		wantRelatedResourceRequest bool
		shouldErr                  bool
	}{
		"good document resource URL": {
			url:          "/api/v1/documents/doc123",
			resourceType: "documents",
			wantDocID:    "doc123",
		},
		"good document resource URL with related resources": {
			url:                        "/api/v1/documents/doc123/related-resources",
			resourceType:               "documents",
			wantDocID:                  "doc123",
			wantRelatedResourceRequest: true,
		},
		"good draft resource URL": {
			url:          "/api/v1/drafts/doc123",
			resourceType: "drafts",
			wantDocID:    "doc123",
		},
		"good draft resource URL with related resources": {
			url:                        "/api/v1/drafts/doc123/related-resources",
			resourceType:               "drafts",
			wantDocID:                  "doc123",
			wantRelatedResourceRequest: true,
		},
		"extra frontslash after related-resources": {
			url:          "/api/v1/documents/doc123/related-resources/",
			resourceType: "documents",
			shouldErr:    true,
		},
		"no document resource ID": {
			url:          "/api/v1/documents/",
			resourceType: "documents",
			shouldErr:    true,
		},
	}

	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			assert := assert.New(t)
			docID, rrReq, err := parseDocumentsURLPath(c.url, c.resourceType)

			if c.shouldErr {
				assert.Error(err)
			} else {
				assert.NoError(err)
				assert.Equal(c.wantDocID, docID)
				assert.Equal(c.wantRelatedResourceRequest, rrReq)
			}
		})
	}
}
