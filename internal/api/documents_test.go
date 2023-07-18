package api

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestParseDocumentIDFromURLPath(t *testing.T) {
	cases := map[string]struct {
		path        string
		collection  string
		wantReqType documentSubcollectionRequestType
		wantDocID   string
		shouldErr   bool
	}{
		"good documents collection URL with related resources": {
			path:        "/api/v1/documents/doc123/related-resources",
			collection:  "documents",
			wantReqType: relatedResourcesDocumentSubcollectionRequestType,
			wantDocID:   "doc123",
		},
		"good drafts collection URL with related resources": {
			path:        "/api/v1/drafts/doc123/related-resources",
			collection:  "drafts",
			wantReqType: relatedResourcesDocumentSubcollectionRequestType,
			wantDocID:   "doc123",
		},
		"good drafts collection URL with shareable": {
			path:        "/api/v1/drafts/doc123/shareable",
			collection:  "drafts",
			wantReqType: shareableDocumentSubcollectionRequestType,
			wantDocID:   "doc123",
		},
		"extra frontslash after related-resources": {
			path:        "/api/v1/documents/doc123/related-resources/",
			collection:  "documents",
			wantReqType: relatedResourcesDocumentSubcollectionRequestType,
			shouldErr:   true,
		},
		"no document resource ID": {
			path:       "/api/v1/documents/",
			collection: "documents",
			shouldErr:  true,
		},
	}

	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			assert := assert.New(t)
			docID, reqType, err := parseDocumentsURLPath(c.path, c.collection)

			if c.shouldErr {
				assert.Error(err)
			} else {
				assert.NoError(err)
				assert.Equal(c.wantDocID, docID)
				assert.Equal(c.wantReqType, reqType)
			}
		})
	}
}
