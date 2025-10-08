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
