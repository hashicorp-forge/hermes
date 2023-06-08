package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/hashicorp/go-hclog"
)

// contains returns true if a string is present in a slice of strings.
func contains(values []string, s string) bool {
	for _, v := range values {
		if s == v {
			return true
		}
	}
	return false
}

// compareSlices compares the first slice with the second
// and returns the elements that exist in the second slice
// that don't exist in the first
func compareSlices(a, b []string) []string {
	// Create a map with the length of slice "a"
	tempA := make(map[string]bool, len(a))
	for _, j := range a {
		tempA[j] = true
	}

	diffElems := []string{}
	for _, k := range b {
		// If elements in slice "b" are
		// not present in slice "a" then
		// append to diffElems slice
		if !tempA[k] {
			diffElems = append(diffElems, k)
		}
	}

	return diffElems
}

// decodeRequest decodes the JSON contents of a HTTP request body to a request
// struct. An error is returned if the request contains fields that do not exist
// in the request struct.
func decodeRequest(r *http.Request, reqStruct interface{}) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	for {
		if err := dec.Decode(&reqStruct); err == io.EOF {
			break
		} else if err != nil {
			return err
		}
	}

	return nil
}

// parseResourceIDFromURL parses a URL path with the format
// "/api/v1/{apiPath}/{resourceID}" and returns the resource ID.
func parseResourceIDFromURL(url, apiPath string) (string, error) {
	// Remove API path from URL.
	url = strings.TrimPrefix(url, fmt.Sprintf("/api/v1/%s", apiPath))

	// Remove empty entries and validate path.
	urlPath := strings.Split(url, "/")
	var resultPath []string
	for _, v := range urlPath {
		// Only append non-empty values, this removes any empty strings in the
		// slice.
		if v != "" {
			resultPath = append(resultPath, v)
		}
	}
	resultPathLen := len(resultPath)
	// Only allow 1 value to be set in the resultPath slice. For example, if the
	// urlPath is set to "/{document_id}" then the resultPath slice would be
	// ["{document_id}"].
	if resultPathLen > 1 {
		return "", fmt.Errorf("invalid URL path")
	}
	// If there are no entries in the resultPath slice, then there was no resource
	// ID set in the URL path. Return an empty string.
	if resultPathLen == 0 {
		return "", fmt.Errorf("no document ID set in url path")
	}

	// Return resource ID.
	return resultPath[0], nil
}

// respondError responds to an HTTP request and logs an error.
func respondError(
	w http.ResponseWriter, r *http.Request, l hclog.Logger,
	httpCode int, userErrMsg, logErrMsg string, err error,
	extraArgs ...interface{},
) {
	l.Error(logErrMsg,
		append([]interface{}{
			"error", err,
			"method", r.Method,
			"path", r.URL.Path,
		}, extraArgs...)...,
	)
	http.Error(w, userErrMsg, httpCode)
}
