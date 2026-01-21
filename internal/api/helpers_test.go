package api

import (
	"reflect"
	"testing"
	"time"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseResourceIDFromURL(t *testing.T) {
	cases := map[string]struct {
		url     string
		apiPath string

		want      string
		shouldErr bool
	}{
		"good": {
			url:     "/api/v2/drafts/myID",
			apiPath: "drafts",

			want: "myID",
		},
		"extra path after resource ID": {
			url:     "/api/v2/drafts/myID/something",
			apiPath: "drafts",

			shouldErr: true,
		},
		"no resource ID": {
			url:     "/api/v2/drafts",
			apiPath: "drafts",

			shouldErr: true,
		},
	}

	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			if got, err := parseResourceIDFromURL(c.url, c.apiPath); err != nil {
				if !c.shouldErr {
					t.Error(err)
				}
			} else {
				if got != c.want {
					t.Errorf("got %q, want %q", got, c.want)
				}
			}
		})
	}
}

func TestCompareSlices(t *testing.T) {
	cases := map[string]struct {
		firstSlice  []string
		secondSlice []string

		want []string
	}{
		"second slice has an element that first slice doesn't": {
			firstSlice:  []string{"a", "b", "c"},
			secondSlice: []string{"a", "d"},

			want: []string{"d"},
		},
		"empty slices": {
			firstSlice:  []string{},
			secondSlice: []string{},

			want: []string{},
		},
		"identical slices": {
			firstSlice:  []string{"a", "b", "c"},
			secondSlice: []string{"a", "b", "c"},

			want: []string{},
		},
		"first slice has elements and second slice is empty": {
			firstSlice:  []string{"a", "b", "c"},
			secondSlice: []string{},

			want: []string{},
		},
		"first slice is empty and second slice has elements": {
			firstSlice:  []string{},
			secondSlice: []string{"a", "b", "c"},

			want: []string{"a", "b", "c"},
		},
	}

	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			got := compareSlices(c.firstSlice, c.secondSlice)
			if !reflect.DeepEqual(got, c.want) {
				t.Errorf("got %q, want %q", got, c.want)
			}
		})
	}
}

func TestCompareAlgoliaAndDatabaseDocument(t *testing.T) {
	cases := map[string]struct {
		algoDoc      map[string]any
		dbDoc        models.Document
		dbDocReviews models.DocumentReviews

		shouldErr   bool
		errContains string
		// Use multiErrContains if there are multiple errors expected.
		multiErrContains []string
	}{
		"good": {
			algoDoc: map[string]any{
				"objectID":   "GoogleFileID1",
				"title":      "Title1",
				"docType":    "RFC",
				"docNumber":  "ABC-123",
				"appCreated": true,
				"approvedBy": []any{
					"approver1@hashicorp.com",
					"approver2@hashicorp.com",
				},
				"approvers": []any{
					"approver1@hashicorp.com",
					"approver2@hashicorp.com",
				},
				"changesRequestedBy": []any{
					"changerequester1@hashicorp.com",
					"changerequester2@hashicorp.com",
				},
				"contributors": []any{
					"contributor1@hashicorp.com",
					"contributor2@hashicorp.com",
				},
				"createdTime": float64(time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC).Unix()),
				"currentVersion": "1.2.3",
				"fileRevisions": map[string]any{
					"1": "FileRevision1",
					"2": "FileRevision2",
				},
				"modifiedTime": float64(time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC).Unix()),
				"owners": []any{
					"owner1@hashicorp.com",
					"owner2@hashicorp.com",
				},
				"product": "Product1",
				"stakeholders": []any{
					"stakeholder1@hashicorp.com",
					"stakeholder2@hashicorp.com",
				},
				"summary": "Summary1",
				"status":  "In-Review",
			},
			dbDoc: models.Document{
				GoogleFileID: "GoogleFileID1",
				Title:        "Title1",
				DocumentType: models.DocumentType{
					Name: "RFC",
				},
				DocumentNumber: 123,
				Product: models.Product{
					Name:         "Product1",
					Abbreviation: "ABC",
				},
				Imported: false,
				Approvers: []*models.User{
					{
						EmailAddress: "approver1@hashicorp.com",
					},
					{
						EmailAddress: "approver2@hashicorp.com",
					},
				},
				Contributors: []*models.User{
					{
						EmailAddress: "contributor1@hashicorp.com",
					},
					{
						EmailAddress: "contributor2@hashicorp.com",
					},
				},
				CustomFields: []*models.DocumentCustomField{
					{
						DocumentTypeCustomField: models.DocumentTypeCustomField{
							Name: "Current Version",
							DocumentType: models.DocumentType{
								Name: "RFC",
							},
						},
						Value: "1.2.3",
					},
					{
						DocumentTypeCustomField: models.DocumentTypeCustomField{
							Name: "Stakeholders",
							DocumentType: models.DocumentType{
								Name: "RFC",
							},
						},
						Value: `["stakeholder1@hashicorp.com","stakeholder2@hashicorp.com"]`,
					},
				},
				DocumentCreatedAt: time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC),
				DocumentModifiedAt: time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC),
				FileRevisions: []models.DocumentFileRevision{
					{
						GoogleDriveFileRevisionID: "1",
						Name:                      "FileRevision1",
					},
					{
						GoogleDriveFileRevisionID: "2",
						Name:                      "FileRevision2",
					},
				},
				Owner: &models.User{
					EmailAddress: "owner1@hashicorp.com",
				},
				Summary: &[]string{"Summary1"}[0],
				Status:  models.InReviewDocumentStatus,
			},
			dbDocReviews: models.DocumentReviews{
				{
					Status: models.ApprovedDocumentReviewStatus,
					User: models.User{
						EmailAddress: "approver1@hashicorp.com",
					},
				},
				{
					Status: models.ApprovedDocumentReviewStatus,
					User: models.User{
						EmailAddress: "approver2@hashicorp.com",
					},
				},
				{
					Status: models.ChangesRequestedDocumentReviewStatus,
					User: models.User{
						EmailAddress: "changerequester1@hashicorp.com",
					},
				},
				{
					Status: models.ChangesRequestedDocumentReviewStatus,
					User: models.User{
						EmailAddress: "changerequester2@hashicorp.com",
					},
				},
			},
			shouldErr: false,
		},

		"good draft doc number (test 'ABC-???')": {
			algoDoc: map[string]any{
				"appCreated": true,
				"docNumber":  "ABC-???",
				"docType":    "RFC",
				"createdTime": float64(time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC).Unix()),
				"modifiedTime": float64(time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC).Unix()),
				"owners":  []any{"owner1@hashicorp.com"},
				"product": "Product1",
			},
			dbDoc: models.Document{
				DocumentNumber: 0,
				DocumentType: models.DocumentType{
					Name: "RFC",
				},
				Product: models.Product{
					Name:         "Product1",
					Abbreviation: "ABC",
				},
				DocumentCreatedAt: time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC),
				DocumentModifiedAt: time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC),
				Owner: &models.User{
					EmailAddress: "owner1@hashicorp.com",
				},
			},
		},

		"good legacy doc number without three digit padding": {
			algoDoc: map[string]any{
				"appCreated": true,
				"docNumber":  "ABC-23",
				"docType":    "RFC",
				"createdTime": float64(time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC).Unix()),
				"modifiedTime": float64(time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC).Unix()),
				"owners":  []any{"owner1@hashicorp.com"},
				"product": "Product1",
			},
			dbDoc: models.Document{
				DocumentNumber: 23,
				DocumentType: models.DocumentType{
					Name: "RFC",
				},
				Product: models.Product{
					Name:         "Product1",
					Abbreviation: "ABC",
				},
				DocumentCreatedAt: time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC),
				DocumentModifiedAt: time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC),
				Owner: &models.User{
					EmailAddress: "owner1@hashicorp.com",
				},
			},
		},

		"good with different order of slice and map fields": {
			algoDoc: map[string]any{
				"appCreated": true,
				"approvedBy": []any{
					"approver2@hashicorp.com",
					"approver1@hashicorp.com",
				},
				"approvers": []any{
					"approver2@hashicorp.com",
					"approver1@hashicorp.com",
				},
				"changesRequestedBy": []any{
					"changerequester2@hashicorp.com",
					"changerequester1@hashicorp.com",
				},
				"contributors": []any{
					"contributor2@hashicorp.com",
					"contributor1@hashicorp.com",
				},
				"createdTime": float64(time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC).Unix()),
				"docNumber": "ABC-123",
				"docType":   "RFC",
				"fileRevisions": map[string]any{
					"2": "FileRevision2",
					"1": "FileRevision1",
				},
				"modifiedTime": float64(time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC).Unix()),
				"owners":  []any{"owner1@hashicorp.com"},
				"product": "Product1",
				"stakeholders": []any{
					"stakeholder2@hashicorp.com",
					"stakeholder1@hashicorp.com",
				},
			},
			dbDoc: models.Document{
				DocumentNumber: 123,
				DocumentType: models.DocumentType{
					Name: "RFC",
				},
				Product: models.Product{
					Name:         "Product1",
					Abbreviation: "ABC",
				},
				Approvers: []*models.User{
					{
						EmailAddress: "approver1@hashicorp.com",
					},
					{
						EmailAddress: "approver2@hashicorp.com",
					},
				},
				Contributors: []*models.User{
					{
						EmailAddress: "contributor1@hashicorp.com",
					},
					{
						EmailAddress: "contributor2@hashicorp.com",
					},
				},
				CustomFields: []*models.DocumentCustomField{
					{
						DocumentTypeCustomField: models.DocumentTypeCustomField{
							Name: "Stakeholders",
							DocumentType: models.DocumentType{
								Name: "RFC",
							},
						},
						Value: `["stakeholder1@hashicorp.com","stakeholder2@hashicorp.com"]`,
					},
				},
				DocumentCreatedAt: time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC),
				DocumentModifiedAt: time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC),
				FileRevisions: []models.DocumentFileRevision{
					{
						GoogleDriveFileRevisionID: "1",
						Name:                      "FileRevision1",
					},
					{
						GoogleDriveFileRevisionID: "2",
						Name:                      "FileRevision2",
					},
				},
				Owner: &models.User{
					EmailAddress: "owner1@hashicorp.com",
				},
			},
			dbDocReviews: models.DocumentReviews{
				{
					Status: models.ApprovedDocumentReviewStatus,
					User: models.User{
						EmailAddress: "approver1@hashicorp.com",
					},
				},
				{
					Status: models.ApprovedDocumentReviewStatus,
					User: models.User{
						EmailAddress: "approver2@hashicorp.com",
					},
				},
				{
					Status: models.ChangesRequestedDocumentReviewStatus,
					User: models.User{
						EmailAddress: "changerequester1@hashicorp.com",
					},
				},
				{
					Status: models.ChangesRequestedDocumentReviewStatus,
					User: models.User{
						EmailAddress: "changerequester2@hashicorp.com",
					},
				},
			},
		},

		"bad objectID": {
			algoDoc: map[string]any{
				"objectID":   "GoogleFileID1",
				"appCreated": true,
				"docNumber":  "ABC-123",
				"createdTime": float64(time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC).Unix()),
				"modifiedTime": float64(time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC).Unix()),
				"owners":  []any{"owner1@hashicorp.com"},
				"product": "Product1",
			},
			dbDoc: models.Document{
				GoogleFileID:   "BadGoogleFileID",
				DocumentNumber: 123,
				Product: models.Product{
					Name:         "Product1",
					Abbreviation: "ABC",
				},
				DocumentCreatedAt: time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC),
				DocumentModifiedAt: time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC),
				Owner: &models.User{
					EmailAddress: "owner1@hashicorp.com",
				},
			},
			shouldErr:   true,
			errContains: "objectID not equal",
		},

		"bad title": {
			algoDoc: map[string]any{
				"title":      "Title1",
				"appCreated": true,
				"docNumber":  "ABC-123",
				"createdTime": float64(time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC).Unix()),
				"modifiedTime": float64(time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC).Unix()),
				"owners":  []any{"owner1@hashicorp.com"},
				"product": "Product1",
			},
			dbDoc: models.Document{
				Title:          "BadTitle",
				DocumentNumber: 123,
				Product: models.Product{
					Name:         "Product1",
					Abbreviation: "ABC",
				},
				DocumentCreatedAt: time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC),
				DocumentModifiedAt: time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC),
				Owner: &models.User{
					EmailAddress: "owner1@hashicorp.com",
				},
			},
			shouldErr:   true,
			errContains: "title not equal",
		},

		"bad docType": {
			algoDoc: map[string]any{
				"docType":    "DocType1",
				"appCreated": true,
				"docNumber":  "ABC-123",
				"createdTime": float64(time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC).Unix()),
				"modifiedTime": float64(time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC).Unix()),
				"owners":  []any{"owner1@hashicorp.com"},
				"product": "Product1",
			},
			dbDoc: models.Document{
				DocumentType: models.DocumentType{
					Name: "BadDocType",
				},
				DocumentNumber: 123,
				Product: models.Product{
					Name:         "Product1",
					Abbreviation: "ABC",
				},
				DocumentCreatedAt: time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC),
				DocumentModifiedAt: time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC),
				Owner: &models.User{
					EmailAddress: "owner1@hashicorp.com",
				},
			},
			shouldErr:   true,
			errContains: "docType not equal",
		},

		"bad doc number": {
			algoDoc: map[string]any{
				"appCreated": true,
				"docNumber":  "ABC-123",
				"docType":    "RFC",
				"createdTime": float64(time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC).Unix()),
				"modifiedTime": float64(time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC).Unix()),
				"owners":  []any{"owner1@hashicorp.com"},
				"product": "Product1",
			},
			dbDoc: models.Document{
				DocumentNumber: 321,
				DocumentType: models.DocumentType{
					Name: "RFC",
				},
				Product: models.Product{
					Name:         "Product1",
					Abbreviation: "ABC",
				},
				DocumentCreatedAt: time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC),
				DocumentModifiedAt: time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC),
				Owner: &models.User{
					EmailAddress: "owner1@hashicorp.com",
				},
			},
			shouldErr:   true,
			errContains: "docNumber not equal",
		},

		"bad appCreated": {
			algoDoc: map[string]any{
				"appCreated": false,
				"docNumber":  "ABC-123",
				"createdTime": float64(time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC).Unix()),
				"modifiedTime": float64(time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC).Unix()),
				"owners":  []any{"owner1@hashicorp.com"},
				"product": "Product1",
			},
			dbDoc: models.Document{
				DocumentNumber: 123,
				Product: models.Product{
					Name:         "Product1",
					Abbreviation: "ABC",
				},
				DocumentCreatedAt: time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC),
				DocumentModifiedAt: time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC),
				Owner: &models.User{
					EmailAddress: "owner1@hashicorp.com",
				},
			},
			shouldErr:   true,
			errContains: "appCreated not equal",
		},

		"bad approvedBy": {
			algoDoc: map[string]any{
				"approvedBy": []any{
					"approver1@hashicorp.com",
					"approver2@hashicorp.com",
				},
				"appCreated": true,
				"docNumber":  "ABC-123",
				"createdTime": float64(time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC).Unix()),
				"modifiedTime": float64(time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC).Unix()),
				"owners":  []any{"owner1@hashicorp.com"},
				"product": "Product1",
			},
			dbDoc: models.Document{
				GoogleFileID:   "BadGoogleFileID",
				DocumentNumber: 123,
				Product: models.Product{
					Name:         "Product1",
					Abbreviation: "ABC",
				},
				DocumentCreatedAt: time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC),
				DocumentModifiedAt: time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC),
				Owner: &models.User{
					EmailAddress: "owner1@hashicorp.com",
				},
			},
			dbDocReviews: models.DocumentReviews{
				{
					Status: models.ApprovedDocumentReviewStatus,
					User: models.User{
						EmailAddress: "badapprover1@hashicorp.com",
					},
				},
				{
					Status: models.ApprovedDocumentReviewStatus,
					User: models.User{
						EmailAddress: "badapprover2@hashicorp.com",
					},
				},
			},
			shouldErr:   true,
			errContains: "approvedBy not equal",
		},

		"bad approvers": {
			algoDoc: map[string]any{
				"appCreated": true,
				"approvers": []any{
					"approver1@hashicorp.com",
					"approver2@hashicorp.com",
				},
				"docNumber": "ABC-123",
				"createdTime": float64(time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC).Unix()),
				"modifiedTime": float64(time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC).Unix()),
				"owners":  []any{"owner1@hashicorp.com"},
				"product": "Product1",
			},
			dbDoc: models.Document{
				Title:          "BadTitle",
				DocumentNumber: 123,
				Product: models.Product{
					Name:         "Product1",
					Abbreviation: "ABC",
				},
				DocumentCreatedAt: time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC),
				DocumentModifiedAt: time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC),
				Owner: &models.User{
					EmailAddress: "owner1@hashicorp.com",
				},
				Approvers: []*models.User{
					{
						EmailAddress: "badapprover1@hashicorp.com",
					},
					{
						EmailAddress: "badapprover2@hashicorp.com",
					},
				},
			},
			shouldErr:   true,
			errContains: "approvers not equal",
		},

		"approvers exist only in Algolia object": {
			algoDoc: map[string]any{
				"appCreated": true,
				"approvers": []any{
					"approver1@hashicorp.com",
					"approver2@hashicorp.com",
				},
				"docNumber": "ABC-123",
				"createdTime": float64(time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC).Unix()),
				"modifiedTime": float64(time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC).Unix()),
				"owners":  []any{"owner1@hashicorp.com"},
				"product": "Product1",
			},
			dbDoc: models.Document{
				Title:          "BadTitle",
				DocumentNumber: 123,
				Product: models.Product{
					Name:         "Product1",
					Abbreviation: "ABC",
				},
				DocumentCreatedAt: time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC),
				DocumentModifiedAt: time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC),
				Owner: &models.User{
					EmailAddress: "owner1@hashicorp.com",
				},
			},
			shouldErr:   true,
			errContains: "approvers not equal",
		},

		"approvers exist only in database record": {
			algoDoc: map[string]any{
				"appCreated": true,
				"docNumber":  "ABC-123",
				"createdTime": float64(time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC).Unix()),
				"modifiedTime": float64(time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC).Unix()),
				"owners":  []any{"owner1@hashicorp.com"},
				"product": "Product1",
			},
			dbDoc: models.Document{
				Title:          "BadTitle",
				DocumentNumber: 123,
				Product: models.Product{
					Name:         "Product1",
					Abbreviation: "ABC",
				},
				DocumentCreatedAt: time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC),
				DocumentModifiedAt: time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC),
				Owner: &models.User{
					EmailAddress: "owner1@hashicorp.com",
				},
				Approvers: []*models.User{
					{
						EmailAddress: "badapprover1@hashicorp.com",
					},
					{
						EmailAddress: "badapprover2@hashicorp.com",
					},
				},
			},
			shouldErr:   true,
			errContains: "approvers not equal",
		},

		"bad changesRequestedBy": {
			algoDoc: map[string]any{
				"appCreated": true,
				"changesRequestedBy": []any{
					"changerequester1@hashicorp.com",
					"changerequester2@hashicorp.com",
				},
				"docNumber": "ABC-123",
				"createdTime": float64(time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC).Unix()),
				"modifiedTime": float64(time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC).Unix()),
				"owners":  []any{"owner1@hashicorp.com"},
				"product": "Product1",
			},
			dbDoc: models.Document{
				GoogleFileID:   "BadGoogleFileID",
				DocumentNumber: 123,
				Product: models.Product{
					Name:         "Product1",
					Abbreviation: "ABC",
				},
				DocumentCreatedAt: time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC),
				DocumentModifiedAt: time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC),
				Owner: &models.User{
					EmailAddress: "owner1@hashicorp.com",
				},
			},
			dbDocReviews: models.DocumentReviews{
				{
					Status: models.ChangesRequestedDocumentReviewStatus,
					User: models.User{
						EmailAddress: "badchangerequester1@hashicorp.com",
					},
				},
				{
					Status: models.ChangesRequestedDocumentReviewStatus,
					User: models.User{
						EmailAddress: "badchangerequester2@hashicorp.com",
					},
				},
			},
			shouldErr:   true,
			errContains: "changesRequestedBy not equal",
		},

		"bad contributors": {
			algoDoc: map[string]any{
				"appCreated": true,
				"contributors": []any{
					"contributor1@hashicorp.com",
					"contributor2@hashicorp.com",
				},
				"docNumber": "ABC-123",
				"createdTime": float64(time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC).Unix()),
				"modifiedTime": float64(time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC).Unix()),
				"owners":  []any{"owner1@hashicorp.com"},
				"product": "Product1",
			},
			dbDoc: models.Document{
				Title:          "BadTitle",
				DocumentNumber: 123,
				Product: models.Product{
					Name:         "Product1",
					Abbreviation: "ABC",
				},
				DocumentCreatedAt: time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC),
				DocumentModifiedAt: time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC),
				Owner: &models.User{
					EmailAddress: "owner1@hashicorp.com",
				},
				Contributors: []*models.User{
					{
						EmailAddress: "badcontributor1@hashicorp.com",
					},
					{
						EmailAddress: "badcontributor2@hashicorp.com",
					},
				},
			},
			shouldErr:   true,
			errContains: "contributors not equal",
		},

		"bad createdTime": {
			algoDoc: map[string]any{
				"appCreated": true,
				"docNumber":  "ABC-123",
				"createdTime": float64(time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC).Unix()),
				"modifiedTime": float64(time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC).Unix()),
				"owners":  []any{"owner1@hashicorp.com"},
				"product": "Product1",
			},
			dbDoc: models.Document{
				DocumentNumber: 123,
				Product: models.Product{
					Name:         "Product1",
					Abbreviation: "ABC",
				},
				DocumentCreatedAt: time.Date(
					2013, time.April, 5, 1, 0, 0, 0, time.UTC),
				DocumentModifiedAt: time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC),
				Owner: &models.User{
					EmailAddress: "owner1@hashicorp.com",
				},
			},
			shouldErr:   true,
			errContains: "createdTime not equal",
		},

		"bad string custom field currentVersion": {
			algoDoc: map[string]any{
				"appCreated": true,
				"docNumber":  "ABC-123",
				"createdTime": float64(time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC).Unix()),
				"currentVersion": "1",
				"docType":        "RFC",
				"modifiedTime": float64(time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC).Unix()),
				"owners":  []any{"owner1@hashicorp.com"},
				"product": "Product1",
			},
			dbDoc: models.Document{
				DocumentType: models.DocumentType{
					Name: "RFC",
				},
				DocumentNumber: 123,
				Product: models.Product{
					Name:         "Product1",
					Abbreviation: "ABC",
				},
				CustomFields: []*models.DocumentCustomField{
					{
						DocumentTypeCustomField: models.DocumentTypeCustomField{
							Name: "Current Version",
							DocumentType: models.DocumentType{
								Name: "RFC",
							},
						},
						Value: "2",
					},
				},
				DocumentCreatedAt: time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC),
				DocumentModifiedAt: time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC),
				Owner: &models.User{
					EmailAddress: "owner1@hashicorp.com",
				},
			},
			shouldErr:   true,
			errContains: "custom field currentVersion not equal",
		},

		"bad mismatched string custom fields currentVersion and prd": {
			algoDoc: map[string]any{
				"appCreated": true,
				"docNumber":  "ABC-123",
				"createdTime": float64(time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC).Unix()),
				"currentVersion": "1",
				"docType":        "RFC",
				"modifiedTime": float64(time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC).Unix()),
				"owners":  []any{"owner1@hashicorp.com"},
				"product": "Product1",
				"prd":     "PRD1",
			},
			dbDoc: models.Document{
				DocumentType: models.DocumentType{
					Name: "RFC",
				},
				DocumentNumber: 123,
				Product: models.Product{
					Name:         "Product1",
					Abbreviation: "ABC",
				},
				CustomFields: []*models.DocumentCustomField{
					{
						DocumentTypeCustomField: models.DocumentTypeCustomField{
							Name: "Current Version",
							DocumentType: models.DocumentType{
								Name: "RFC",
							},
						},
						Value: "PRD1",
					},
				},
				DocumentCreatedAt: time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC),
				DocumentModifiedAt: time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC),
				Owner: &models.User{
					EmailAddress: "owner1@hashicorp.com",
				},
			},
			shouldErr: true,
			multiErrContains: []string{
				"custom field currentVersion not equal",
				"custom field prd not equal",
			},
		},

		"bad people custom field stakeholders": {
			algoDoc: map[string]any{
				"appCreated": true,
				"docNumber":  "ABC-123",
				"createdTime": float64(time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC).Unix()),
				"docType": "RFC",
				"modifiedTime": float64(time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC).Unix()),
				"owners":  []any{"owner1@hashicorp.com"},
				"product": "Product1",
				"stakeholders": []any{
					"stakeholder1@hashicorp.com",
					"stakeholder2@hashicorp.com",
				},
			},
			dbDoc: models.Document{
				DocumentType: models.DocumentType{
					Name: "RFC",
				},
				DocumentNumber: 123,
				Product: models.Product{
					Name:         "Product1",
					Abbreviation: "ABC",
				},
				CustomFields: []*models.DocumentCustomField{
					{
						DocumentTypeCustomField: models.DocumentTypeCustomField{
							Name: "Stakeholders",
							DocumentType: models.DocumentType{
								Name: "RFC",
							},
						},
						Value: `["stakeholder1@hashicorp.com","badstakeholder2@hashicorp.com"]`,
					},
				},
				DocumentCreatedAt: time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC),
				DocumentModifiedAt: time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC),
				Owner: &models.User{
					EmailAddress: "owner1@hashicorp.com",
				},
			},
			shouldErr:   true,
			errContains: "custom field stakeholders not equal",
		},

		"bad people custom field stakeholders only exists in Algolia": {
			algoDoc: map[string]any{
				"appCreated": true,
				"docNumber":  "ABC-123",
				"createdTime": float64(time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC).Unix()),
				"docType": "RFC",
				"modifiedTime": float64(time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC).Unix()),
				"owners":  []any{"owner1@hashicorp.com"},
				"product": "Product1",
				"stakeholders": []any{
					"stakeholder1@hashicorp.com",
				},
			},
			dbDoc: models.Document{
				DocumentType: models.DocumentType{
					Name: "RFC",
				},
				DocumentNumber: 123,
				Product: models.Product{
					Name:         "Product1",
					Abbreviation: "ABC",
				},
				DocumentCreatedAt: time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC),
				DocumentModifiedAt: time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC),
				Owner: &models.User{
					EmailAddress: "owner1@hashicorp.com",
				},
			},
			shouldErr:   true,
			errContains: "custom field stakeholders not equal",
		},

		"bad people custom field stakeholders only exists in database": {
			algoDoc: map[string]any{
				"appCreated": true,
				"docNumber":  "ABC-123",
				"createdTime": float64(time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC).Unix()),
				"docType": "RFC",
				"modifiedTime": float64(time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC).Unix()),
				"owners":  []any{"owner1@hashicorp.com"},
				"product": "Product1",
			},
			dbDoc: models.Document{
				DocumentType: models.DocumentType{
					Name: "RFC",
				},
				DocumentNumber: 123,
				Product: models.Product{
					Name:         "Product1",
					Abbreviation: "ABC",
				},
				CustomFields: []*models.DocumentCustomField{
					{
						DocumentTypeCustomField: models.DocumentTypeCustomField{
							Name: "Stakeholders",
							DocumentType: models.DocumentType{
								Name: "RFC",
							},
						},
						Value: `["stakeholder1@hashicorp.com","badstakeholder2@hashicorp.com"]`,
					},
				},
				DocumentCreatedAt: time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC),
				DocumentModifiedAt: time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC),
				Owner: &models.User{
					EmailAddress: "owner1@hashicorp.com",
				},
			},
			shouldErr:   true,
			errContains: "custom field stakeholders not equal",
		},

		"bad modifiedTime": {
			algoDoc: map[string]any{
				"appCreated": true,
				"docNumber":  "ABC-123",
				"createdTime": float64(time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC).Unix()),
				"modifiedTime": float64(time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC).Unix()),
				"owners":  []any{"owner1@hashicorp.com"},
				"product": "Product1",
			},
			dbDoc: models.Document{
				DocumentNumber: 123,
				Product: models.Product{
					Name:         "Product1",
					Abbreviation: "ABC",
				},
				DocumentCreatedAt: time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC),
				DocumentModifiedAt: time.Date(
					2013, time.April, 5, 23, 0, 0, 0, time.UTC),
				Owner: &models.User{
					EmailAddress: "owner1@hashicorp.com",
				},
			},
			shouldErr:   true,
			errContains: "modifiedTime not equal",
		},

		"bad owners": {
			algoDoc: map[string]any{
				"appCreated": true,
				"docNumber":  "ABC-123",
				"createdTime": float64(time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC).Unix()),
				"modifiedTime": float64(time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC).Unix()),
				"owners":  []any{"owner1@hashicorp.com"},
				"product": "Product1",
			},
			dbDoc: models.Document{
				DocumentNumber: 123,
				Product: models.Product{
					Name:         "Product1",
					Abbreviation: "ABC",
				},
				DocumentCreatedAt: time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC),
				DocumentModifiedAt: time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC),
				Owner: &models.User{
					EmailAddress: "badowner1@hashicorp.com",
				},
			},
			shouldErr:   true,
			errContains: "owners not equal",
		},

		"bad product": {
			algoDoc: map[string]any{
				"appCreated": true,
				"docNumber":  "ABC-123",
				"createdTime": float64(time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC).Unix()),
				"modifiedTime": float64(time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC).Unix()),
				"owners":  []any{"owner1@hashicorp.com"},
				"product": "Product1",
			},
			dbDoc: models.Document{
				DocumentNumber: 123,
				Product: models.Product{
					Name:         "BadProduct1",
					Abbreviation: "ABC",
				},
				DocumentCreatedAt: time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC),
				DocumentModifiedAt: time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC),
				Owner: &models.User{
					EmailAddress: "owner1@hashicorp.com",
				},
			},
			shouldErr:   true,
			errContains: "product not equal",
		},

		"bad status": {
			algoDoc: map[string]any{
				"appCreated": true,
				"docNumber":  "ABC-123",
				"createdTime": float64(time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC).Unix()),
				"modifiedTime": float64(time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC).Unix()),
				"owners":  []any{"owner1@hashicorp.com"},
				"product": "Product1",
				"status":  "Approved",
			},
			dbDoc: models.Document{
				DocumentNumber: 123,
				Product: models.Product{
					Name:         "Product1",
					Abbreviation: "ABC",
				},
				DocumentCreatedAt: time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC),
				DocumentModifiedAt: time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC),
				Owner: &models.User{
					EmailAddress: "owner1@hashicorp.com",
				},
				Status: models.InReviewDocumentStatus,
			},
			shouldErr:   true,
			errContains: "status not equal",
		},

		"bad summary": {
			algoDoc: map[string]any{
				"appCreated": true,
				"docNumber":  "ABC-123",
				"createdTime": float64(time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC).Unix()),
				"modifiedTime": float64(time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC).Unix()),
				"owners":  []any{"owner1@hashicorp.com"},
				"product": "Product1",
				"summary": "Summary1",
			},
			dbDoc: models.Document{
				DocumentNumber: 123,
				Product: models.Product{
					Name:         "Product1",
					Abbreviation: "ABC",
				},
				DocumentCreatedAt: time.Date(
					2023, time.April, 5, 1, 0, 0, 0, time.UTC),
				DocumentModifiedAt: time.Date(
					2023, time.April, 5, 23, 0, 0, 0, time.UTC),
				Owner: &models.User{
					EmailAddress: "owner1@hashicorp.com",
				},
				Summary: &[]string{"BadSummary1"}[0],
			},
			shouldErr:   true,
			errContains: "summary not equal",
		},
	}

	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)

			// Define minimum document types configuration for tests.
			docTypes := []*config.DocumentType{
				{
					Name: "RFC",
					CustomFields: []*config.DocumentTypeCustomField{
						{
							Name: "Current Version",
							Type: "string",
						},
						{
							Name: "PRD",
							Type: "string",
						},
						{
							Name: "Stakeholders",
							Type: "people",
						},
					},
				},
			}

			err := compareAlgoliaAndDatabaseDocument(
				c.algoDoc, c.dbDoc, c.dbDocReviews, docTypes,
			)
			if c.shouldErr {
				if len(c.multiErrContains) > 0 {
					for _, m := range c.multiErrContains {
						assert.ErrorContains(err, m)
					}
				} else if c.errContains != "" {
					assert.ErrorContains(err, c.errContains)
				} else {
					require.Error(err)
				}
			} else {
				require.NoError(err)
			}
		})
	}
}
