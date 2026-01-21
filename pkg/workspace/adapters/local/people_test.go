package local

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/hashicorp-forge/hermes/pkg/workspace"
	"github.com/spf13/afero"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// createTestAdapterForPeople creates an adapter with in-memory filesystem for testing.
func createTestAdapterForPeople(t *testing.T) *Adapter {
	fs := afero.NewMemMapFs()
	cfg := &Config{
		BasePath:   "/workspace",
		FileSystem: fs,
	}
	require.NoError(t, cfg.Validate())

	adapter, err := NewAdapter(cfg)
	require.NoError(t, err)
	return adapter
}

func TestPeopleService_GetUser(t *testing.T) {
	tests := []struct {
		name      string
		usersData map[string]*workspace.User
		email     string
		wantName  string
		wantPhoto string
		wantErr   bool
	}{
		{
			name: "existing user",
			usersData: map[string]*workspace.User{
				"user@example.com": {
					Name:     "John Doe",
					Email:    "user@example.com",
					PhotoURL: "https://example.com/photo.jpg",
				},
			},
			email:     "user@example.com",
			wantName:  "John Doe",
			wantPhoto: "https://example.com/photo.jpg",
		},
		{
			name: "user not found",
			usersData: map[string]*workspace.User{
				"other@example.com": {
					Name:  "Other User",
					Email: "other@example.com",
				},
			},
			email:   "notfound@example.com",
			wantErr: true,
		},
		{
			name:      "empty user database",
			usersData: map[string]*workspace.User{},
			email:     "any@example.com",
			wantErr:   true,
		},
		{
			name: "user without photo",
			usersData: map[string]*workspace.User{
				"nophoto@example.com": {
					Name:  "No Photo User",
					Email: "nophoto@example.com",
				},
			},
			email:     "nophoto@example.com",
			wantName:  "No Photo User",
			wantPhoto: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			adapter := createTestAdapterForPeople(t)

			usersJSON, err := json.Marshal(tt.usersData)
			require.NoError(t, err)
			usersPath := adapter.basePath + "/users.json"
			require.NoError(t, afero.WriteFile(adapter.fs, usersPath, usersJSON, 0644))

			peopleSvc := &peopleService{
				adapter: adapter,
			}

			user, err := peopleSvc.GetUser(context.Background(), tt.email)

			if tt.wantErr {
				assert.Error(t, err)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantName, user.Name)
			assert.Equal(t, tt.wantPhoto, user.PhotoURL)
		})
	}
}

func TestPeopleService_GetUser_MissingFile(t *testing.T) {
	adapter := createTestAdapterForPeople(t)
	peopleSvc := &peopleService{
		adapter: adapter,
	}

	user, err := peopleSvc.GetUser(context.Background(), "any@example.com")
	assert.Error(t, err)
	assert.Nil(t, user)
}

func TestPeopleService_GetUser_MalformedJSON(t *testing.T) {
	adapter := createTestAdapterForPeople(t)
	usersPath := adapter.basePath + "/users.json"
	require.NoError(t, afero.WriteFile(adapter.fs, usersPath, []byte("invalid json {["), 0644))

	peopleSvc := &peopleService{
		adapter: adapter,
	}

	user, err := peopleSvc.GetUser(context.Background(), "any@example.com")
	assert.Error(t, err)
	assert.Nil(t, user)
}

func TestPeopleService_SearchUsers(t *testing.T) {
	usersData := map[string]*workspace.User{
		"alice@example.com": {
			Name:     "Alice Smith",
			Email:    "alice@example.com",
			PhotoURL: "https://example.com/alice.jpg",
		},
		"bob@example.com": {
			Name:     "Bob Johnson",
			Email:    "bob@example.com",
			PhotoURL: "https://example.com/bob.jpg",
		},
		"charlie@test.com": {
			Name:     "Charlie Brown",
			Email:    "charlie@test.com",
			PhotoURL: "https://test.com/charlie.jpg",
		},
	}

	tests := []struct {
		name        string
		query       string
		wantEmails  []string
		wantMinSize int
	}{
		{
			name:       "search by name - exact match",
			query:      "Alice",
			wantEmails: []string{"alice@example.com"},
		},
		{
			name:       "search by name - partial match",
			query:      "john",
			wantEmails: []string{"bob@example.com"},
		},
		{
			name:       "search by email - exact match",
			query:      "charlie@test.com",
			wantEmails: []string{"charlie@test.com"},
		},
		{
			name:       "search by email - partial match",
			query:      "example.com",
			wantEmails: []string{"alice@example.com", "bob@example.com"},
		},
		{
			name:       "case insensitive search",
			query:      "ALICE",
			wantEmails: []string{"alice@example.com"},
		},
		{
			name:        "no matches",
			query:       "nonexistent",
			wantEmails:  []string{},
			wantMinSize: 0,
		},
		{
			name:        "empty query returns all users",
			query:       "",
			wantMinSize: 3,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			adapter := createTestAdapterForPeople(t)

			usersJSON, err := json.Marshal(usersData)
			require.NoError(t, err)
			usersPath := adapter.basePath + "/users.json"
			require.NoError(t, afero.WriteFile(adapter.fs, usersPath, usersJSON, 0644))

			peopleSvc := &peopleService{
				adapter: adapter,
			}

			// SearchUsers takes fields parameter, pass nil for all fields
			users, err := peopleSvc.SearchUsers(context.Background(), tt.query, nil)
			require.NoError(t, err)

			if tt.wantMinSize > 0 {
				assert.GreaterOrEqual(t, len(users), tt.wantMinSize)
			} else if len(tt.wantEmails) > 0 {
				assert.Equal(t, len(tt.wantEmails), len(users))
				emails := make([]string, len(users))
				for i, u := range users {
					emails[i] = u.Email
				}
				assert.ElementsMatch(t, tt.wantEmails, emails)
			} else {
				assert.Empty(t, users)
			}
		})
	}
}

func TestPeopleService_SearchUsers_MissingFile(t *testing.T) {
	adapter := createTestAdapterForPeople(t)
	peopleSvc := &peopleService{
		adapter: adapter,
	}

	users, err := peopleSvc.SearchUsers(context.Background(), "any", nil)
	assert.NoError(t, err) // Missing file returns empty list
	assert.Empty(t, users)
}

func TestPeopleService_GetUserPhoto(t *testing.T) {
	usersData := map[string]*workspace.User{
		"withphoto@example.com": {
			Name:     "With Photo",
			Email:    "withphoto@example.com",
			PhotoURL: "https://example.com/photo.jpg",
		},
		"nophoto@example.com": {
			Name:  "No Photo",
			Email: "nophoto@example.com",
		},
	}

	tests := []struct {
		name      string
		email     string
		wantPhoto string
		wantErr   bool
	}{
		{
			name:      "user with photo",
			email:     "withphoto@example.com",
			wantPhoto: "https://example.com/photo.jpg",
		},
		{
			name:      "user without photo",
			email:     "nophoto@example.com",
			wantPhoto: "",
		},
		{
			name:    "user not found",
			email:   "notfound@example.com",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			adapter := createTestAdapterForPeople(t)

			usersJSON, err := json.Marshal(usersData)
			require.NoError(t, err)
			usersPath := adapter.basePath + "/users.json"
			require.NoError(t, afero.WriteFile(adapter.fs, usersPath, usersJSON, 0644))

			peopleSvc := &peopleService{
				adapter: adapter,
			}

			photo, err := peopleSvc.GetUserPhoto(context.Background(), tt.email)

			if tt.wantErr {
				assert.Error(t, err)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantPhoto, photo)
		})
	}
}
