package local

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"

	"github.com/hashicorp-forge/hermes/pkg/workspace"
)

// peopleService implements workspace.PeopleService.
type peopleService struct {
	adapter *Adapter
}

// GetUser retrieves user information by email.
func (ps *peopleService) GetUser(ctx context.Context, email string) (*workspace.User, error) {
	// Load from local user database (simple JSON file implementation)
	usersPath := filepath.Join(ps.adapter.basePath, "users.json")
	data, err := os.ReadFile(usersPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, workspace.NotFoundError("user", email)
		}
		return nil, err
	}

	var users map[string]*workspace.User
	if err := json.Unmarshal(data, &users); err != nil {
		return nil, err
	}

	user, ok := users[email]
	if !ok {
		return nil, workspace.NotFoundError("user", email)
	}

	return user, nil
}

// SearchUsers searches for users matching a query.
func (ps *peopleService) SearchUsers(ctx context.Context, query string, fields []string) ([]*workspace.User, error) {
	// Simple implementation: load all users and filter by email/name
	usersPath := filepath.Join(ps.adapter.basePath, "users.json")
	data, err := os.ReadFile(usersPath)
	if err != nil {
		if os.IsNotExist(err) {
			return []*workspace.User{}, nil
		}
		return nil, err
	}

	var users map[string]*workspace.User
	if err := json.Unmarshal(data, &users); err != nil {
		return nil, err
	}

	var results []*workspace.User
	for _, user := range users {
		// Simple substring matching on email and name
		if containsIgnoreCase(user.Email, query) || containsIgnoreCase(user.Name, query) {
			results = append(results, user)
		}
	}

	return results, nil
}

// GetUserPhoto retrieves a user's photo URL.
func (ps *peopleService) GetUserPhoto(ctx context.Context, email string) (string, error) {
	user, err := ps.GetUser(ctx, email)
	if err != nil {
		return "", err
	}
	return user.PhotoURL, nil
}

// Helper function for case-insensitive substring search.
func containsIgnoreCase(s, substr string) bool {
	s = toLower(s)
	substr = toLower(substr)
	return contains(s, substr)
}

func toLower(s string) string {
	// Simple ASCII lowercase conversion
	result := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 'A' && c <= 'Z' {
			c = c + 32
		}
		result[i] = c
	}
	return string(result)
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && indexOf(s, substr) >= 0
}

func indexOf(s, substr string) int {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}
