package api

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestParseSearchIndexFromURLPath(t *testing.T) {
	cases := map[string]struct {
		path      string
		wantIndex string
		shouldErr bool
	}{
		"documents index": {
			path:      "/api/v2/search/docs",
			wantIndex: "docs",
		},
		"documents index alternate": {
			path:      "/api/v2/search/documents",
			wantIndex: "documents",
		},
		"drafts index": {
			path:      "/api/v2/search/drafts",
			wantIndex: "drafts",
		},
		"projects index": {
			path:      "/api/v2/search/projects",
			wantIndex: "projects",
		},
		"empty index": {
			path:      "/api/v2/search/",
			wantIndex: "",
		},
		"index with trailing slash": {
			path:      "/api/v2/search/docs/",
			wantIndex: "docs",
		},
		"docs with createdTime desc sorting": {
			path:      "/api/v2/search/docs_createdTime_desc",
			wantIndex: "docs",
		},
		"docs with createdTime asc sorting": {
			path:      "/api/v2/search/docs_createdTime_asc",
			wantIndex: "docs",
		},
		"docs with modifiedTime desc sorting": {
			path:      "/api/v2/search/docs_modifiedTime_desc",
			wantIndex: "docs",
		},
		"docs with modifiedTime asc sorting": {
			path:      "/api/v2/search/docs_modifiedTime_asc",
			wantIndex: "docs",
		},
		"drafts with createdTime desc sorting": {
			path:      "/api/v2/search/drafts_createdTime_desc",
			wantIndex: "drafts",
		},
		"drafts with createdTime asc sorting": {
			path:      "/api/v2/search/drafts_createdTime_asc",
			wantIndex: "drafts",
		},
		"drafts with modifiedTime desc sorting": {
			path:      "/api/v2/search/drafts_modifiedTime_desc",
			wantIndex: "drafts",
		},
		"drafts with modifiedTime asc sorting": {
			path:      "/api/v2/search/drafts_modifiedTime_asc",
			wantIndex: "drafts",
		},
		"projects with createdTime desc sorting": {
			path:      "/api/v2/search/projects_createdTime_desc",
			wantIndex: "projects",
		},
	}

	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			assert := assert.New(t)
			indexName, err := parseSearchIndexFromURLPath(c.path)

			if c.shouldErr {
				assert.Error(err)
			} else {
				assert.NoError(err)
				assert.Equal(c.wantIndex, indexName)
			}
		})
	}
}

func TestConvertFiltersToMap(t *testing.T) {
	cases := map[string]struct {
		input  interface{}
		want   map[string][]string
		errMsg string
	}{
		"single filter": {
			input: []interface{}{"product:terraform"},
			want: map[string][]string{
				"product": {"terraform"},
			},
		},
		"multiple filters same key": {
			input: []interface{}{"product:terraform", "product:vault"},
			want: map[string][]string{
				"product": {"terraform", "vault"},
			},
		},
		"multiple filters different keys": {
			input: []interface{}{"product:terraform", "status:approved", "docType:RFC"},
			want: map[string][]string{
				"product": {"terraform"},
				"status":  {"approved"},
				"docType": {"RFC"},
			},
		},
		"filter with colon in value": {
			input: []interface{}{"owners:user@example.com"},
			want: map[string][]string{
				"owners": {"user@example.com"},
			},
		},
		"string filter format": {
			input: "status:In-Review AND docType:RFC",
			want: map[string][]string{
				"status":  {"In-Review"},
				"docType": {"RFC"},
			},
		},
		"empty filter list": {
			input: []interface{}{},
			want:  map[string][]string{},
		},
		"nil filter list": {
			input: nil,
			want:  map[string][]string{},
		},
		"invalid filter without colon": {
			input:  []interface{}{"invalidfilter"},
			want:   map[string][]string{},
			errMsg: "invalid filter format",
		},
		"approvedBy should be mapped to approvers": {
			input: []interface{}{"approvedBy:user@example.com"},
			want: map[string][]string{
				"approvers": {"user@example.com"},
			},
		},
		"multiple approvedBy filters mapped to approvers": {
			input: []interface{}{"approvedBy:user1@example.com", "approvedBy:user2@example.com"},
			want: map[string][]string{
				"approvers": {"user1@example.com", "user2@example.com"},
			},
		},
		"string format with approvedBy mapped to approvers": {
			input: "approvedBy:user@example.com AND status:approved",
			want: map[string][]string{
				"approvers": {"user@example.com"},
				"status":    {"approved"},
			},
		},
		"complex filter with approvedBy and appCreated": {
			input: []interface{}{
				"approvedBy:test@hermes.local",
				"appCreated:true",
				"status:In-Review",
			},
			want: map[string][]string{
				"approvers":  {"test@hermes.local"},
				"appCreated": {"true"},
				"status":     {"In-Review"},
			},
		},
	}

	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			assert := assert.New(t)
			got := convertFiltersToMap(c.input)

			if c.errMsg != "" {
				// For now, convertFiltersToMap ignores invalid filters
				// This test documents the behavior
			}
			assert.Equal(c.want, got)
		})
	}
}
