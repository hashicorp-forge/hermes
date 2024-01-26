package helpers

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestRemoveStringSliceDuplicates(t *testing.T) {
	type testCase struct {
		input []string
		want  []string
	}

	testCases := []testCase{
		{
			input: []string{"hello", "world", "hello", "gopher"},
			want:  []string{"hello", "world", "gopher"},
		},
		{
			input: []string{"hello"},
			want:  []string{"hello"},
		},
		{
			input: nil,
			want:  []string{},
		},
	}

	for _, tc := range testCases {
		got := RemoveStringSliceDuplicates(tc.input)
		assert.Equal(t, tc.want, got)
	}
}

func TestStringSliceContains(t *testing.T) {
	type testCase struct {
		values []string
		s      string
		want   bool
	}

	testCases := []testCase{
		{
			values: []string{"hello", "world", "gopher"},
			s:      "world",
			want:   true,
		},
		{
			values: []string{"hello", "world", "gopher"},
			s:      "foo",
			want:   false,
		},
	}

	for _, tc := range testCases {
		got := StringSliceContains(tc.values, tc.s)
		assert.Equal(t, tc.want, got)
	}
}
