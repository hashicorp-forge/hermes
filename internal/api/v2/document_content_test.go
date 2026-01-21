package api

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/internal/server"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp-forge/hermes/pkg/workspace"
	"github.com/hashicorp-forge/hermes/pkg/workspace/adapters/mock"
	"github.com/hashicorp/go-hclog"
	"google.golang.org/api/docs/v1"
)

// mockProviderWithCapabilities wraps a mock provider and adds capabilities interface
type mockProviderWithContentEditing struct {
	workspace.Provider
	supportsEditing bool
}

func (m *mockProviderWithContentEditing) SupportsContentEditing() bool {
	return m.supportsEditing
}

func TestDocumentContentHandler_ProviderCapabilities(t *testing.T) {
	tests := []struct {
		name               string
		supportsEditing    bool
		method             string
		expectedStatusCode int
		expectedBody       string
	}{
		{
			name:               "Provider does not support content editing - GET returns 501",
			supportsEditing:    false,
			method:             "GET",
			expectedStatusCode: http.StatusNotImplemented,
			expectedBody:       "Document content editing not supported for this workspace provider",
		},
		{
			name:               "Provider does not support content editing - PUT returns 501",
			supportsEditing:    false,
			method:             "PUT",
			expectedStatusCode: http.StatusNotImplemented,
			expectedBody:       "Document content editing not supported for this workspace provider",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create mock provider with capability
			mockProvider := &mockProviderWithContentEditing{
				Provider:        mock.NewAdapter(),
				supportsEditing: tt.supportsEditing,
			}

			// Create test server
			srv := server.Server{
				WorkspaceProvider: mockProvider,
				Config:            &config.Config{},
				Logger:            hclog.NewNullLogger(),
			}

			// Create test request
			var req *http.Request
			if tt.method == "GET" {
				req = httptest.NewRequest(tt.method, "/api/v2/documents/test-doc-id/content", nil)
			} else {
				body := bytes.NewBufferString(`{"content":"test content"}`)
				req = httptest.NewRequest(tt.method, "/api/v2/documents/test-doc-id/content", body)
			}

			// Add auth context
			ctx := context.WithValue(req.Context(), "user_email", "test@example.com")
			req = req.WithContext(ctx)

			w := httptest.NewRecorder()

			// Call handler
			handler := DocumentContentHandler(srv)
			handler.ServeHTTP(w, req)

			// Check status code
			if w.Code != tt.expectedStatusCode {
				t.Errorf("Expected status code %d, got %d", tt.expectedStatusCode, w.Code)
			}

			// Check body if expected
			if tt.expectedBody != "" {
				body := w.Body.String()
				if !containsString(body, tt.expectedBody) {
					t.Errorf("Expected body to contain %q, got %q", tt.expectedBody, body)
				}
			}
		})
	}
}

func TestParseDocumentContentURLPath(t *testing.T) {
	tests := []struct {
		name        string
		path        string
		expectedID  string
		expectError bool
	}{
		{
			name:        "Valid path",
			path:        "/api/v2/documents/abc123/content",
			expectedID:  "abc123",
			expectError: false,
		},
		{
			name:        "Valid path with dashes",
			path:        "/api/v2/documents/abc-123-def/content",
			expectedID:  "abc-123-def",
			expectError: false,
		},
		{
			name:        "Valid path with underscores",
			path:        "/api/v2/documents/abc_123_def/content",
			expectedID:  "abc_123_def",
			expectError: false,
		},
		{
			name:        "Invalid path - missing content",
			path:        "/api/v2/documents/abc123",
			expectedID:  "",
			expectError: true,
		},
		{
			name:        "Invalid path - wrong endpoint",
			path:        "/api/v2/drafts/abc123/content",
			expectedID:  "",
			expectError: true,
		},
		{
			name:        "Invalid path - extra segments",
			path:        "/api/v2/documents/abc123/content/extra",
			expectedID:  "",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			id, err := parseDocumentContentURLPath(tt.path)

			if tt.expectError && err == nil {
				t.Error("Expected error but got none")
			}

			if !tt.expectError && err != nil {
				t.Errorf("Unexpected error: %v", err)
			}

			if id != tt.expectedID {
				t.Errorf("Expected ID %q, got %q", tt.expectedID, id)
			}
		})
	}
}

func TestIsOwnerOrContributor(t *testing.T) {
	tests := []struct {
		name     string
		email    string
		doc      *models.Document
		expected bool
	}{
		{
			name:  "User is owner",
			email: "owner@example.com",
			doc: &models.Document{
				Owner: &models.User{EmailAddress: "owner@example.com"},
			},
			expected: true,
		},
		{
			name:  "User is contributor",
			email: "contributor@example.com",
			doc: &models.Document{
				Owner: &models.User{EmailAddress: "owner@example.com"},
				Contributors: []*models.User{
					{EmailAddress: "contributor@example.com"},
				},
			},
			expected: true,
		},
		{
			name:  "User is neither owner nor contributor",
			email: "other@example.com",
			doc: &models.Document{
				Owner: &models.User{EmailAddress: "owner@example.com"},
				Contributors: []*models.User{
					{EmailAddress: "contributor@example.com"},
				},
			},
			expected: false,
		},
		{
			name:  "Document has no owner",
			email: "user@example.com",
			doc: &models.Document{
				Owner: nil,
			},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isOwnerOrContributor(tt.email, tt.doc)
			if result != tt.expected {
				t.Errorf("Expected %v, got %v", tt.expected, result)
			}
		})
	}
}

func TestExtractTextFromGoogleDoc(t *testing.T) {
	tests := []struct {
		name     string
		doc      *docs.Document
		expected string
	}{
		{
			name: "Simple document with one paragraph",
			doc: &docs.Document{
				Body: &docs.Body{
					Content: []*docs.StructuralElement{
						{
							Paragraph: &docs.Paragraph{
								Elements: []*docs.ParagraphElement{
									{
										TextRun: &docs.TextRun{
											Content: "Hello, world!",
										},
									},
								},
							},
						},
					},
				},
			},
			expected: "Hello, world!",
		},
		{
			name: "Document with multiple paragraphs",
			doc: &docs.Document{
				Body: &docs.Body{
					Content: []*docs.StructuralElement{
						{
							Paragraph: &docs.Paragraph{
								Elements: []*docs.ParagraphElement{
									{
										TextRun: &docs.TextRun{
											Content: "First paragraph.\n",
										},
									},
								},
							},
						},
						{
							Paragraph: &docs.Paragraph{
								Elements: []*docs.ParagraphElement{
									{
										TextRun: &docs.TextRun{
											Content: "Second paragraph.",
										},
									},
								},
							},
						},
					},
				},
			},
			expected: "First paragraph.\nSecond paragraph.",
		},
		{
			name: "Empty document",
			doc: &docs.Document{
				Body: &docs.Body{
					Content: []*docs.StructuralElement{},
				},
			},
			expected: "",
		},
		{
			name: "Document with nil body",
			doc: &docs.Document{
				Body: nil,
			},
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractTextFromGoogleDoc(tt.doc)
			if result != tt.expected {
				t.Errorf("Expected %q, got %q", tt.expected, result)
			}
		})
	}
}

// containsString is a helper function to check if a string contains a substring
func containsString(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
