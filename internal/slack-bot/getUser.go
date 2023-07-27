package slackbot

import (
	"fmt"

	"github.com/slack-go/slack"
)

// GetUserIDByEmail retrieves the Slack user ID based on the email address
func GetUserIDByEmail(email string, api *slack.Client) (string, string, error) {
	user, err := api.GetUserByEmail(email)
	if err != nil {
		return "", "", fmt.Errorf("failed to retrieve Slack user by email: %w", err)
	}
	return user.ID, user.Profile.DisplayName, nil
}
