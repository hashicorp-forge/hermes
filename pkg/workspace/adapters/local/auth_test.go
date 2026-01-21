package local

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/spf13/afero"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAuthService_ValidateToken(t *testing.T) {
	tests := []struct {
		name       string
		tokensData map[string]*tokenInfo
		token      string
		wantValid  bool
		wantEmail  string
	}{
		{
			name: "valid token",
			tokensData: map[string]*tokenInfo{
				"valid-token-123": {
					Email:     "user@example.com",
					ExpiresAt: time.Now().Add(24 * time.Hour),
				},
			},
			token:     "valid-token-123",
			wantValid: true,
			wantEmail: "user@example.com",
		},
		{
			name: "expired token",
			tokensData: map[string]*tokenInfo{
				"expired-token": {
					Email:     "user@example.com",
					ExpiresAt: time.Now().Add(-1 * time.Hour),
				},
			},
			token:     "expired-token",
			wantValid: false,
		},
		{
			name: "invalid token - not found",
			tokensData: map[string]*tokenInfo{
				"other-token": {
					Email:     "user@example.com",
					ExpiresAt: time.Now().Add(24 * time.Hour),
				},
			},
			token:     "invalid-token",
			wantValid: false,
		},
		{
			name:       "empty tokens database",
			tokensData: map[string]*tokenInfo{},
			token:      "any-token",
			wantValid:  false,
		},
		{
			name: "token at exact expiration time",
			tokensData: map[string]*tokenInfo{
				"edge-token": {
					Email:     "user@example.com",
					ExpiresAt: time.Now(),
				},
			},
			token:     "edge-token",
			wantValid: false, // Expired tokens should not be valid
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			adapter := createTestAdapterForPeople(t)

			// Create tokens file
			tokensPath := adapter.basePath + "/tokens.json"
			tokensJSON, err := json.Marshal(tt.tokensData)
			require.NoError(t, err)
			require.NoError(t, afero.WriteFile(adapter.fs, tokensPath, tokensJSON, 0644))

			authSvc := &authService{
				adapter: adapter,
			}

			// Test ValidateToken
			authInfo, err := authSvc.ValidateToken(context.Background(), tt.token)
			require.NoError(t, err)
			require.NotNil(t, authInfo)

			assert.Equal(t, tt.wantValid, authInfo.Valid)
			if tt.wantValid {
				assert.Equal(t, tt.wantEmail, authInfo.Email)
			}
		})
	}
}

func TestAuthService_ValidateToken_MissingFile(t *testing.T) {
	adapter := createTestAdapterForPeople(t)
	authSvc := &authService{
		adapter: adapter,
	}

	// Tokens file doesn't exist
	authInfo, err := authSvc.ValidateToken(context.Background(), "any-token")
	require.NoError(t, err)
	require.NotNil(t, authInfo)
	assert.False(t, authInfo.Valid)
}

func TestAuthService_ValidateToken_MalformedJSON(t *testing.T) {
	adapter := createTestAdapterForPeople(t)
	tokensPath := adapter.basePath + "/tokens.json"

	// Write malformed JSON
	require.NoError(t, afero.WriteFile(adapter.fs, tokensPath, []byte("not valid json {"), 0644))

	authSvc := &authService{
		adapter: adapter,
	}

	authInfo, err := authSvc.ValidateToken(context.Background(), "any-token")
	assert.Error(t, err)
	assert.Nil(t, authInfo)
}

func TestAuthService_GetUserInfo(t *testing.T) {
	tests := []struct {
		name       string
		tokensData map[string]*tokenInfo
		usersData  map[string]interface{}
		token      string
		wantEmail  string
		wantName   string
		wantErr    bool
	}{
		{
			name: "valid token returns user info",
			tokensData: map[string]*tokenInfo{
				"valid-token": {
					Email:     "user@example.com",
					ExpiresAt: time.Now().Add(24 * time.Hour),
				},
			},
			usersData: map[string]interface{}{
				"user@example.com": map[string]interface{}{
					"email":      "user@example.com",
					"name":       "John Doe",
					"givenName":  "John",
					"familyName": "Doe",
					"photoURL":   "https://example.com/photo.jpg",
				},
			},
			token:     "valid-token",
			wantEmail: "user@example.com",
			wantName:  "John Doe",
		},
		{
			name: "expired token returns error",
			tokensData: map[string]*tokenInfo{
				"expired-token": {
					Email:     "user@example.com",
					ExpiresAt: time.Now().Add(-1 * time.Hour),
				},
			},
			usersData: map[string]interface{}{
				"user@example.com": map[string]interface{}{
					"email": "user@example.com",
					"name":  "John Doe",
				},
			},
			token:   "expired-token",
			wantErr: true,
		},
		{
			name: "invalid token returns error",
			tokensData: map[string]*tokenInfo{
				"other-token": {
					Email:     "user@example.com",
					ExpiresAt: time.Now().Add(24 * time.Hour),
				},
			},
			usersData: map[string]interface{}{
				"user@example.com": map[string]interface{}{
					"email": "user@example.com",
					"name":  "John Doe",
				},
			},
			token:   "invalid-token",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			adapter := createTestAdapterForPeople(t)

			tokensPath := adapter.basePath + "/tokens.json"
			tokensJSON, err := json.Marshal(tt.tokensData)
			require.NoError(t, err)
			require.NoError(t, afero.WriteFile(adapter.fs, tokensPath, tokensJSON, 0644))

			usersPath := adapter.basePath + "/users.json"
			usersJSON, err := json.Marshal(tt.usersData)
			require.NoError(t, err)
			require.NoError(t, afero.WriteFile(adapter.fs, usersPath, usersJSON, 0644))

			authSvc := &authService{
				adapter: adapter,
			}

			userInfo, err := authSvc.GetUserInfo(context.Background(), tt.token)

			if tt.wantErr {
				assert.Error(t, err)
				return
			}

			require.NoError(t, err)
			require.NotNil(t, userInfo)
			assert.Equal(t, tt.wantEmail, userInfo.Email)
			assert.Equal(t, tt.wantName, userInfo.Name)
		})
	}
}

func TestAuthService_GetUserInfo_MissingFile(t *testing.T) {
	adapter := createTestAdapterForPeople(t)
	authSvc := &authService{
		adapter: adapter,
	}

	userInfo, err := authSvc.GetUserInfo(context.Background(), "any-token")
	assert.Error(t, err)
	assert.Nil(t, userInfo)
}

func TestAuthService_GetUserInfo_UserNotFound(t *testing.T) {
	adapter := createTestAdapterForPeople(t)

	tokensData := map[string]*tokenInfo{
		"valid-token": {
			Email:     "user@example.com",
			ExpiresAt: time.Now().Add(24 * time.Hour),
		},
	}
	tokensPath := adapter.basePath + "/tokens.json"
	tokensJSON, err := json.Marshal(tokensData)
	require.NoError(t, err)
	require.NoError(t, afero.WriteFile(adapter.fs, tokensPath, tokensJSON, 0644))

	// Create users.json but without the user
	usersData := map[string]interface{}{
		"other@example.com": map[string]interface{}{
			"email": "other@example.com",
			"name":  "Other User",
		},
	}
	usersPath := adapter.basePath + "/users.json"
	usersJSON, err := json.Marshal(usersData)
	require.NoError(t, err)
	require.NoError(t, afero.WriteFile(adapter.fs, usersPath, usersJSON, 0644))

	authSvc := &authService{
		adapter: adapter,
	}

	userInfo, err := authSvc.GetUserInfo(context.Background(), "valid-token")
	assert.Error(t, err)
	assert.Nil(t, userInfo)
}
