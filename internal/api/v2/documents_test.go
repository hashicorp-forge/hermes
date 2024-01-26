package api

import (
	"testing"

	"github.com/hashicorp-forge/hermes/pkg/document"
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
			path:        "/api/v2/documents/doc123/related-resources",
			collection:  "documents",
			wantReqType: relatedResourcesDocumentSubcollectionRequestType,
			wantDocID:   "doc123",
		},
		"good drafts collection URL with related resources": {
			path:        "/api/v2/drafts/doc123/related-resources",
			collection:  "drafts",
			wantReqType: relatedResourcesDocumentSubcollectionRequestType,
			wantDocID:   "doc123",
		},
		"good drafts collection URL with shareable": {
			path:        "/api/v2/drafts/doc123/shareable",
			collection:  "drafts",
			wantReqType: shareableDocumentSubcollectionRequestType,
			wantDocID:   "doc123",
		},
		"extra frontslash after related-resources": {
			path:        "/api/v2/documents/doc123/related-resources/",
			collection:  "documents",
			wantReqType: relatedResourcesDocumentSubcollectionRequestType,
			shouldErr:   true,
		},
		"no document resource ID": {
			path:       "/api/v2/documents/",
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

func TestAuthorizeDocumentPatchRequest(t *testing.T) {
	cases := map[string]struct {
		userEmail string
		doc       document.Document
		req       DocumentPatchRequest
		shouldErr bool
	}{
		"owner should be authorized": {
			userEmail: "owner@example.com",
			doc: document.Document{
				Owners: []string{"owner@example.com"},
			},
			req:       DocumentPatchRequest{},
			shouldErr: false,
		},
		"not owner should not be authorized": {
			userEmail: "not.owner@example.com",
			doc: document.Document{
				Owners: []string{"owner@example.com"},
			},
			req:       DocumentPatchRequest{},
			shouldErr: true,
		},
		"approver should be authorized with valid patch request": {
			userEmail: "approver2@example.com",
			doc: document.Document{
				Approvers: []string{
					"approver1@example.com",
					"approver2@example.com",
					"approver3@example.com",
				},
				Owners: []string{"owner@example.com"},
			},
			req: DocumentPatchRequest{
				Approvers: &[]string{
					"approver1@example.com",
					"approver3@example.com",
				},
			},
			shouldErr: false,
		},
		"approver should not be authorized when removing another approver": {
			userEmail: "approver2@example.com",
			doc: document.Document{
				Approvers: []string{
					"approver1@example.com",
					"approver2@example.com",
					"approver3@example.com",
				},
				Owners: []string{"owner@example.com"},
			},
			req: DocumentPatchRequest{
				Approvers: &[]string{
					"approver1@example.com",
					"approver2@example.com",
				},
			},
			shouldErr: true,
		},
		"approver should not be authorized an empty patch request": {
			userEmail: "approver@example.com",
			doc: document.Document{
				Approvers: []string{"approver@example.com"},
				Owners:    []string{"owner@example.com"},
			},
			req:       DocumentPatchRequest{},
			shouldErr: true,
		},
		"approver should not be authorized when trying to patch another field too": {
			userEmail: "approver2@example.com",
			doc: document.Document{
				Approvers: []string{
					"approver1@example.com",
					"approver2@example.com",
					"approver3@example.com",
				},
				Owners: []string{"owner@example.com"},
			},
			req: DocumentPatchRequest{
				Approvers: &[]string{
					"approver1@example.com",
					"approver3@example.com",
				},
				Contributors: &[]string{
					"approver2@example.com",
				},
			},
			shouldErr: true,
		},
		"approver should not be authorized by putting other approvers in request": {
			userEmail: "approver2@example.com",
			doc: document.Document{
				Approvers: []string{
					"approver1@example.com",
					"approver2@example.com",
					"approver3@example.com",
				},
				Owners: []string{"owner@example.com"},
			},
			req: DocumentPatchRequest{
				Approvers: &[]string{
					"approver4@example.com",
					"approver5@example.com",
				},
			},
			shouldErr: true,
		},
	}

	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			assert := assert.New(t)
			err := authorizeDocumentPatchRequest(c.userEmail, c.doc, c.req)

			if c.shouldErr {
				assert.Error(err)
			} else {
				assert.NoError(err)
			}
		})
	}
}
