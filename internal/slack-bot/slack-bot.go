package slackbot

import (
	"fmt"
	"os"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/slack-go/slack"
)

type ReviewerRequestedSlackData struct {
	BaseURL            string
	CurrentYear        int
	DocumentOwner      string
	DocumentOwnerEmail string
	DocumentType       string
	DocumentShortName  string
	DocumentTitle      string
	DocumentURL        string
	DocumentProd       string
	DocumentTeam       string
}

type ContributorInvitationSlackData struct {
	BaseURL            string
	CurrentYear        int
	DocumentOwner      string
	DocumentOwnerEmail string
	DocumentType       string
	DocumentShortName  string
	DocumentTitle      string
	DocumentURL        string
	DocumentProd       string
	DocumentTeam       string
}

func SendSlackMessage_Reviewer(d ReviewerRequestedSlackData, Reviewers []string) error {
	// Validate data.
	if err := validation.ValidateStruct(&d,
		validation.Field(&d.BaseURL, validation.Required),
		validation.Field(&d.DocumentOwner, validation.Required),
		validation.Field(&d.DocumentTitle, validation.Required),
		validation.Field(&d.DocumentURL, validation.Required),
		// validation.Field(&d.Product, validation.Required),
	); err != nil {
		return fmt.Errorf("error validating email data: %w", err)
	}

	// Create a Slack API client
	api := slack.New(os.Getenv("SLACK_BOT_ACCESS_TOKEN"))

	// Iterate over the list of user emails and get user IDs
	for _, email := range Reviewers {
		userID, username, err := GetUserIDByEmail(email, api)

		if err != nil {
			return fmt.Errorf("failed to retrieve Slack user ID: %w", err)
		}

		// Generate the block message
		msg, err := GenerateUIRichBlocks_Reviewer(d, username)
		if err != nil {
			return fmt.Errorf("failed to create the message block using slack-go-blockkit: %w", err)
		}

		// Send the direct message to the user
		_, _, err = api.PostMessage(
			userID,
			slack.MsgOptionText("DocVault: Review Request", false),
			slack.MsgOptionBlocks(msg.Msg.Blocks.BlockSet...))
		if err != nil {
			return fmt.Errorf("failed to send Slack direct message: %w", err)
		}

	}

	return nil
}

// SendSlackMessage_Contributor sends the slack messagae to the
// dedicated channel and tags all the contributor
func SendSlackMessage_Contributor(d ContributorInvitationSlackData, Contributors []string) error {
	// Validate data.
	if err := validation.ValidateStruct(&d,
		validation.Field(&d.BaseURL, validation.Required),
		validation.Field(&d.DocumentOwner, validation.Required),
		validation.Field(&d.DocumentTitle, validation.Required),
		validation.Field(&d.DocumentURL, validation.Required),
		// validation.Field(&d.Product, validation.Required),
	); err != nil {
		return fmt.Errorf("error validating email data: %w", err)
	}

	// Create a Slack API client
	api := slack.New(os.Getenv("SLACK_BOT_ACCESS_TOKEN"))

	// Iterate over the list of user emails and get user IDs
	for _, email := range Contributors {
		userID, username, err := GetUserIDByEmail(email, api)

		if err != nil {
			return fmt.Errorf("failed to retrieve Slack user ID: %w", err)
		}

		// Generate the block message
		msg, err := GenerateUIRichBlocks_Contributor(d, username)
		if err != nil {
			return fmt.Errorf("failed to create the message block using slack-go-blockkit: %w", err)
		}
		// Send the direct message to the user
		_, _, err = api.PostMessage(
			userID,
			slack.MsgOptionText("DocVault: Contribution Request", false),
			slack.MsgOptionBlocks(msg.Msg.Blocks.BlockSet...))
		if err != nil {
			return fmt.Errorf("failed to send Slack direct message: %w", err)
		}

	}

	return nil
}
