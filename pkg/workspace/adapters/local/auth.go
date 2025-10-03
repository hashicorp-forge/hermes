package localworkspace

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"time"

	"github.com/hashicorp-forge/hermes/pkg/storage"
)

// authService implements storage.AuthService.
type authService struct {
	adapter *Adapter
}

// ValidateToken validates an authentication token.
// For filesystem adapter, this is a simple file-based token store.
// In production, you'd integrate with an actual auth system.
func (as *authService) ValidateToken(ctx context.Context, token string) (*storage.AuthInfo, error) {
	tokensPath := filepath.Join(as.adapter.basePath, "tokens.json")
	data, err := os.ReadFile(tokensPath)
	if err != nil {
		if os.IsNotExist(err) {
			return &storage.AuthInfo{Valid: false}, nil
		}
		return nil, err
	}

	var tokens map[string]*tokenInfo
	if err := json.Unmarshal(data, &tokens); err != nil {
		return nil, err
	}

	info, ok := tokens[token]
	if !ok {
		return &storage.AuthInfo{Valid: false}, nil
	}

	// Check if token is expired
	if time.Now().After(info.ExpiresAt) {
		return &storage.AuthInfo{Valid: false}, nil
	}

	return &storage.AuthInfo{
		Valid:     true,
		Email:     info.Email,
		ExpiresAt: info.ExpiresAt,
	}, nil
}

// GetUserInfo retrieves user information from a token.
func (as *authService) GetUserInfo(ctx context.Context, token string) (*storage.UserInfo, error) {
	authInfo, err := as.ValidateToken(ctx, token)
	if err != nil {
		return nil, err
	}

	if !authInfo.Valid {
		return nil, storage.PermissionDeniedError("get", "user info with invalid token")
	}

	// Load user info from users database
	usersPath := filepath.Join(as.adapter.basePath, "users.json")
	data, err := os.ReadFile(usersPath)
	if err != nil {
		return nil, err
	}

	var users map[string]*storage.User
	if err := json.Unmarshal(data, &users); err != nil {
		return nil, err
	}

	user, ok := users[authInfo.Email]
	if !ok {
		return nil, storage.NotFoundError("user", authInfo.Email)
	}

	return &storage.UserInfo{
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
