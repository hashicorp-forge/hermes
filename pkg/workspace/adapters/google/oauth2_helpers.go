package google

import (
	"google.golang.org/api/oauth2/v2"
)

// ValidateAccessToken validates a Google access token and returns the token
// info.
func (s *Service) ValidateAccessToken(
	accessToken string) (*oauth2.Tokeninfo, error) {

	resp, err := s.OAuth2.Tokeninfo().
		AccessToken(accessToken).
		Fields("*").
		Do()
	if err != nil {
		return nil, err
	}
	return resp, nil
}
