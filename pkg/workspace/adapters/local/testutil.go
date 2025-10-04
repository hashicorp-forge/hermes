// Package local provides a local workspace storage adapter.
package local

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/spf13/afero"
)

// TestAdapter creates an adapter with in-memory filesystem for testing.
// This helper provides a fully configured adapter that uses memory instead of disk,
// making tests fast and isolated.
func TestAdapter(t *testing.T, basePath string) *Adapter {
	t.Helper()

	fs := afero.NewMemMapFs()
	cfg := &Config{
		BasePath:   basePath,
		FileSystem: fs,
	}
	if err := cfg.Validate(); err != nil {
		t.Fatalf("config validation failed: %v", err)
	}

	adapter, err := NewAdapter(cfg)
	if err != nil {
		t.Fatalf("failed to create adapter: %v", err)
	}
	return adapter
}

// TestAdapterWithFS creates an adapter with a specific filesystem for testing.
// Use this when you need control over the filesystem instance.
func TestAdapterWithFS(t *testing.T, basePath string, fs FileSystem) *Adapter {
	t.Helper()

	cfg := &Config{
		BasePath:   basePath,
		FileSystem: fs,
	}
	if err := cfg.Validate(); err != nil {
		t.Fatalf("config validation failed: %v", err)
	}

	adapter, err := NewAdapter(cfg)
	if err != nil {
		t.Fatalf("failed to create adapter: %v", err)
	}
	return adapter
}

// TestUser represents a user for testing.
type TestUser struct {
	Email      string `json:"emailAddress"`
	Name       string `json:"name"`
	GivenName  string `json:"givenName"`
	FamilyName string `json:"familyName"`
	PhotoURL   string `json:"photoUrl,omitempty"`
}

// CreateTestUser adds a test user to the adapter's user store.
// This helper writes directly to the users.json file in the adapter's filesystem.
func CreateTestUser(t *testing.T, adapter *Adapter, email, name string) {
	t.Helper()

	users := []TestUser{
		{
			Email:      email,
			Name:       name,
			GivenName:  name,
			FamilyName: "Test",
			PhotoURL:   "https://example.com/photo.jpg",
		},
	}

	data, err := json.MarshalIndent(users, "", "  ")
	if err != nil {
		t.Fatalf("failed to marshal test users: %v", err)
	}

	// Get the users path from config
	usersPath := adapter.basePath + "/users.json"
	if err := afero.WriteFile(adapter.fs, usersPath, data, 0644); err != nil {
		t.Fatalf("failed to write test users: %v", err)
	}
}

// TestToken represents an authentication token for testing.
type TestToken struct {
	Token   string    `json:"token"`
	Email   string    `json:"email"`
	Expires time.Time `json:"expires"`
}

// CreateTestToken adds a test token to the adapter's token store.
// This helper writes directly to the tokens.json file in the adapter's filesystem.
func CreateTestToken(t *testing.T, adapter *Adapter, token, email string) {
	t.Helper()

	// Create token that expires in 1 hour
	tokens := []TestToken{
		{
			Token:   token,
			Email:   email,
			Expires: time.Now().Add(1 * time.Hour),
		},
	}

	data, err := json.MarshalIndent(tokens, "", "  ")
	if err != nil {
		t.Fatalf("failed to marshal test tokens: %v", err)
	}

	// Get the tokens path from config
	tokensPath := adapter.basePath + "/tokens.json"
	if err := afero.WriteFile(adapter.fs, tokensPath, data, 0644); err != nil {
		t.Fatalf("failed to write test tokens: %v", err)
	}
}
