package local

import (
	"context"
	"encoding/json"
	"path/filepath"
	"time"

	"github.com/hashicorp-forge/hermes/pkg/workspace"
	"github.com/spf13/afero"
)

// authService implements workspace.AuthService.
type authService struct {
	adapter *Adapter
}

// ValidateToken validates an authentication token.
// For filesystem adapter, this is a simple file-based token store.
// In production, you'd integrate with an actual auth system.
func (as *authService) ValidateToken(ctx context.Context, token string) (*workspace.AuthInfo, error) {
	tokensPath := filepath.Join(as.adapter.basePath, "tokens.json")
	data, err := afero.ReadFile(as.adapter.fs, tokensPath)
	if err != nil {
		// Check if file doesn't exist using filesystem Stat
		if _, statErr := as.adapter.fs.Stat(tokensPath); statErr != nil {
			return &workspace.AuthInfo{Valid: false}, nil
		}
		return nil, err
	}

	var tokens map[string]*tokenInfo
	if err := json.Unmarshal(data, &tokens); err != nil {
		return nil, err
	}

	info, ok := tokens[token]
	if !ok {
		return &workspace.AuthInfo{Valid: false}, nil
	}

	// Check if token is expired
	if time.Now().After(info.ExpiresAt) {
		return &workspace.AuthInfo{Valid: false}, nil
	}

	return &workspace.AuthInfo{
		Valid:     true,
		Email:     info.Email,
		ExpiresAt: info.ExpiresAt,
	}, nil
}

// GetUserInfo retrieves user information from a token.
func (as *authService) GetUserInfo(ctx context.Context, token string) (*workspace.UserInfo, error) {
	authInfo, err := as.ValidateToken(ctx, token)
	if err != nil {
		return nil, err
	}

	if !authInfo.Valid {
		return nil, workspace.PermissionDeniedError("get", "user info with invalid token")
	}

	// Load user info from users database
	usersPath := filepath.Join(as.adapter.basePath, "users.json")
	data, err := afero.ReadFile(as.adapter.fs, usersPath)
	if err != nil {
		return nil, err
	}

	var users map[string]*workspace.User
	if err := json.Unmarshal(data, &users); err != nil {
		return nil, err
	}

	user, ok := users[authInfo.Email]
	if !ok {
		return nil, workspace.NotFoundError("user", authInfo.Email)
	}

	return &workspace.UserInfo{
		ID:            user.Email,
		Email:         user.Email,
		Name:          user.Name,
		GivenName:     user.GivenName,
		FamilyName:    user.FamilyName,
		Picture:       user.PhotoURL,
		VerifiedEmail: true,
	}, nil
}

// tokenInfo stores token information.
type tokenInfo struct {
	Email     string    `json:"email"`
	ExpiresAt time.Time `json:"expiresAt"`
}
