package api

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestParseDocumentsURLPath(t *testing.T) {
	cases := map[string]struct {
		url                        string
		wantDocID                  string
		wantRelatedResourceRequest bool
		shouldErr                  bool
	}{
		"good document resource URL": {
			url:       "/api/v1/documents/doc123",
			wantDocID: "doc123",
		},
		"good document resource URL with related resources": {
			url:                        "/api/v1/documents/doc123/related-resources",
			wantDocID:                  "doc123",
			wantRelatedResourceRequest: true,
		},
		"extra frontslash after related-resources": {
			url:       "/api/v1/documents/doc123/related-resources/",
			shouldErr: true,
		},
		"no document resource ID": {
			url:       "/api/v1/documents/",
			shouldErr: true,
		},
	}

	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			assert := assert.New(t)
			docID, rrReq, err := parseDocumentsURLPath(c.url)

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
