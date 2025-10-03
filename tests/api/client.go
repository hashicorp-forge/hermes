package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"testing"
)

// Client wraps http.Client with test-friendly methods.
type Client struct {
	BaseURL string
	client  *http.Client
	auth    string
	t       *testing.T
}

// NewClient creates a new test client.
func NewClient(baseURL string, t *testing.T) *Client {
	return &Client{
		BaseURL: baseURL,
		client:  &http.Client{},
		t:       t,
	}
}

// SetAuth sets the authentication email for requests.
// In tests, this is typically the user's email address.
func (c *Client) SetAuth(email string) {
	c.auth = email
}

// Get performs a GET request and returns a Response with assertions.
func (c *Client) Get(path string) *Response {
	return c.request("GET", path, nil)
}

// Post performs a POST request with JSON body.
func (c *Client) Post(path string, body interface{}) *Response {
	return c.request("POST", path, body)
}

// Put performs a PUT request with JSON body.
func (c *Client) Put(path string, body interface{}) *Response {
	return c.request("PUT", path, body)
}

// Patch performs a PATCH request with JSON body.
func (c *Client) Patch(path string, body interface{}) *Response {
	return c.request("PATCH", path, body)
}

// Delete performs a DELETE request.
func (c *Client) Delete(path string) *Response {
	return c.request("DELETE", path, nil)
}

// request is the internal method for making HTTP requests.
func (c *Client) request(method, path string, body interface{}) *Response {
	var reqBody io.Reader

	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			c.t.Fatalf("Failed to marshal request body: %v", err)
		}
		reqBody = bytes.NewReader(jsonBody)
	}

	fullURL := c.BaseURL + path
	req, err := http.NewRequest(method, fullURL, reqBody)
	if err != nil {
		c.t.Fatalf("Failed to create request: %v", err)
	}

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	// Set authentication header (simplified for tests)
	if c.auth != "" {
		req.Header.Set("X-Test-User-Email", c.auth)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		c.t.Fatalf("Request failed: %v", err)
	}

	return &Response{
		Response: resp,
		t:        c.t,
	}
}

// GetWithQuery performs a GET request with query parameters.
func (c *Client) GetWithQuery(path string, params map[string]string) *Response {
	u, err := url.Parse(c.BaseURL + path)
	if err != nil {
		c.t.Fatalf("Failed to parse URL: %v", err)
	}

	q := u.Query()
	for k, v := range params {
		q.Set(k, v)
	}
	u.RawQuery = q.Encode()

	req, err := http.NewRequest("GET", u.String(), nil)
	if err != nil {
		c.t.Fatalf("Failed to create request: %v", err)
	}

	if c.auth != "" {
		req.Header.Set("X-Test-User-Email", c.auth)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		c.t.Fatalf("Request failed: %v", err)
	}

	return &Response{
		Response: resp,
		t:        c.t,
	}
}

// Response wraps http.Response with test assertions.
type Response struct {
	*http.Response
	t *testing.T
}

// AssertStatus asserts the response status code.
// Returns the Response for method chaining.
func (r *Response) AssertStatus(expected int) *Response {
	if r.StatusCode != expected {
		body, _ := io.ReadAll(r.Body)
		r.t.Fatalf("Expected status %d, got %d. Body: %s", expected, r.StatusCode, string(body))
	}
	return r
}

// AssertStatusOK asserts the response is 200 OK.
func (r *Response) AssertStatusOK() *Response {
	return r.AssertStatus(http.StatusOK)
}

// AssertStatusCreated asserts the response is 201 Created.
func (r *Response) AssertStatusCreated() *Response {
	return r.AssertStatus(http.StatusCreated)
}

// AssertStatusNoContent asserts the response is 204 No Content.
func (r *Response) AssertStatusNoContent() *Response {
	return r.AssertStatus(http.StatusNoContent)
}

// AssertStatusBadRequest asserts the response is 400 Bad Request.
func (r *Response) AssertStatusBadRequest() *Response {
	return r.AssertStatus(http.StatusBadRequest)
}

// AssertStatusUnauthorized asserts the response is 401 Unauthorized.
func (r *Response) AssertStatusUnauthorized() *Response {
	return r.AssertStatus(http.StatusUnauthorized)
}

// AssertStatusForbidden asserts the response is 403 Forbidden.
func (r *Response) AssertStatusForbidden() *Response {
	return r.AssertStatus(http.StatusForbidden)
}

// AssertStatusNotFound asserts the response is 404 Not Found.
func (r *Response) AssertStatusNotFound() *Response {
	return r.AssertStatus(http.StatusNotFound)
}

// AssertStatusInternalServerError asserts the response is 500 Internal Server Error.
func (r *Response) AssertStatusInternalServerError() *Response {
	return r.AssertStatus(http.StatusInternalServerError)
}

// DecodeJSON decodes the response body as JSON into the provided value.
// Returns the Response for method chaining.
func (r *Response) DecodeJSON(v interface{}) *Response {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		r.t.Fatalf("Failed to read response body: %v", err)
	}
	r.Body.Close()

	if err := json.Unmarshal(body, v); err != nil {
		r.t.Fatalf("Failed to decode JSON response. Body: %s, Error: %v", string(body), err)
	}
	return r
}

// AssertJSONContains asserts that the JSON response contains a specific key-value pair.
func (r *Response) AssertJSONContains(key string, expectedValue interface{}) *Response {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		r.t.Fatalf("Failed to read response body: %v", err)
	}
	r.Body.Close()

	var data map[string]interface{}
	if err := json.Unmarshal(body, &data); err != nil {
		r.t.Fatalf("Failed to decode JSON response: %v", err)
	}

	actualValue, ok := data[key]
	if !ok {
		r.t.Fatalf("Expected key %q not found in response", key)
	}

	if fmt.Sprint(actualValue) != fmt.Sprint(expectedValue) {
		r.t.Fatalf("Expected %q to be %v, got %v", key, expectedValue, actualValue)
	}

	return r
}

// GetBody returns the response body as a string.
func (r *Response) GetBody() string {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		r.t.Fatalf("Failed to read response body: %v", err)
	}
	r.Body.Close()
	return string(body)
}

// AssertBodyContains asserts that the response body contains a substring.
func (r *Response) AssertBodyContains(substr string) *Response {
	body := r.GetBody()
	if !contains(body, substr) {
		r.t.Fatalf("Expected response body to contain %q, but it didn't. Body: %s", substr, body)
	}
	return r
}

// contains is a simple helper to check if a string contains a substring.
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 ||
		(len(s) > 0 && (s[:len(substr)] == substr || contains(s[1:], substr))))
}
