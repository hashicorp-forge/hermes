package api

import (
	"reflect"
	"testing"
)

func TestParseResourceIDFromURL(t *testing.T) {
	cases := map[string]struct {
		url     string
		apiPath string

		want      string
		shouldErr bool
	}{
		"good": {
			url:     "/api/v1/drafts/myID",
			apiPath: "drafts",

			want: "myID",
		},
		"extra path after resource ID": {
			url:     "/api/v1/drafts/myID/something",
			apiPath: "drafts",

			shouldErr: true,
		},
		"no resource ID": {
			url:     "/api/v1/drafts",
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
