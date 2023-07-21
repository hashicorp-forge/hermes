package slackbot

import (
	"fmt"

	"github.com/slack-go/slack"
)

func GenerateUIRichBlocks_Reviewer(data ReviewerRequestedSlackData) (*slack.Message, error) {
	// header
	headerText := slack.NewTextBlockObject("mrkdwn", fmt.Sprintf("*[%s]* *|* *Document Review Request* from *%s[%s]*", data.DocumentTitle, data.DocumentOwner, data.DocumentOwnerEmail), false, false)

	headerSection := slack.NewSectionBlock(headerText, nil, nil)

	// Invitation Text Section
	invitationText := slack.NewTextBlockObject("mrkdwn", "*Hi Razor,* \nYou have been invited to review a new document in DocVault.", false, false)
	invitationSection := slack.NewSectionBlock(invitationText, nil, nil)

	// // Document Owner Section
	// documentOwnerText := slack.NewTextBlockObject("mrkdwn", fmt.Sprintf("*Created by:*\n %s | %s ", data.DocumentOwnerEmail, data.DocumentOwner), false, false)
	// documentOwnerSection := slack.NewSectionBlock(documentOwnerText, nil, nil)

	// Divider Section
	dividerSection1 := slack.NewDividerBlock()

	// Document Details Section
	documentDetailsText := slack.NewTextBlockObject("mrkdwn", "*Access the Document:*", false, false)
	documentDetailsSection := slack.NewSectionBlock(documentDetailsText, nil, nil)

	// Document Details Link Button
	documentDetailsButton := slack.NewButtonBlockElement("", "", nil)
	documentDetailsLinkText := slack.NewTextBlockObject("plain_text", fmt.Sprintf("[%s] %s", data.DocumentType, data.DocumentTitle), false, false)
	documentDetailsButton.Text = documentDetailsLinkText
	documentDetailsButton.URL = data.DocumentURL
	documentDetailsButton.Style = slack.StylePrimary

	documentDetailsSection.Accessory = slack.NewAccessory(documentDetailsButton)

	// // Feedback Request Section
	// feedbackRequestText := slack.NewTextBlockObject("plain_text", "Please click on the link above to access the document and provide your valuable feedback. Your insights and suggestions are highly appreciated.", false, false)
	// feedbackRequestSection := slack.NewSectionBlock(feedbackRequestText, nil, nil)

	// // Thank You Section
	// thankYouText := slack.NewTextBlockObject("plain_text", "Thank you for your time and contribution.", false, false)
	// thankYouSection := slack.NewSectionBlock(thankYouText, nil, nil)

	// Web App Link Section
	webAppLinkButton := slack.NewButtonBlockElement("", "", nil)
	webAppLinkText := slack.NewTextBlockObject("plain_text", "Access the DocVault Web Application", false, false)
	webAppLinkButton.Text = webAppLinkText
	webAppLinkButton.URL = data.BaseURL
	webAppLinkButtonSection := slack.NewSectionBlock(slack.NewTextBlockObject("plain_text", " ", false, false), nil, nil)
	webAppLinkButtonSection.Accessory = slack.NewAccessory(webAppLinkButton)
	webAppLinkButton.Style = slack.StylePrimary

	// Signature Section
	signatureText := slack.NewTextBlockObject("mrkdwn", "*Best Regards,*\n*DocVault Team*", false, false)
	signatureSection := slack.NewSectionBlock(signatureText, nil, nil)

	// Divider Section
	dividerSection2 := slack.NewDividerBlock()

	// Build Message with blocks created above
	msg := slack.NewBlockMessage(
		headerSection,
		dividerSection1,
		invitationSection,
		documentDetailsSection,
		// documentOwnerSection,
		// feedbackRequestSection,
		// thankYouSection,
		webAppLinkButtonSection,
		signatureSection,
		dividerSection2,
	)

	return &msg, nil
}

func GenerateUIRichBlocks_Contributor(data ContributorInvitationSlackData) (*slack.Message, error) {
	// header
	headerText := slack.NewTextBlockObject("mrkdwn", fmt.Sprintf("*[%s]* *|* *Document Contribution Invitation* from *%s[%s]*", data.DocumentTitle, data.DocumentOwner, data.DocumentOwnerEmail), false, false)

	headerSection := slack.NewSectionBlock(headerText, nil, nil)

	// Invitation Text Section
	invitationText := slack.NewTextBlockObject("mrkdwn", "*Hi Razor,* \nYou have been invited to contribute to a document in DocVault, the Document Management System at Razorpay.\n", false, false)
	invitationSection := slack.NewSectionBlock(invitationText, nil, nil)

	// // Document Owner Section
	// documentOwnerText := slack.NewTextBlockObject("mrkdwn", fmt.Sprintf("*Created by:*\n %s | %s ", data.DocumentOwnerEmail, data.DocumentOwner), false, false)
	// documentOwnerSection := slack.NewSectionBlock(documentOwnerText, nil, nil)

	// Divider Section
	dividerSection1 := slack.NewDividerBlock()

	// Document Details Section
	documentDetailsText := slack.NewTextBlockObject("mrkdwn", "*Access the Document:*", false, false)
	documentDetailsSection := slack.NewSectionBlock(documentDetailsText, nil, nil)

	// Document Details Link Button
	documentDetailsButton := slack.NewButtonBlockElement("", "", nil)
	documentDetailsLinkText := slack.NewTextBlockObject("plain_text", fmt.Sprintf("[%s] %s", data.DocumentType, data.DocumentTitle), false, false)
	documentDetailsButton.Text = documentDetailsLinkText
	documentDetailsButton.URL = data.DocumentURL
	documentDetailsButton.Style = slack.StylePrimary

	documentDetailsSection.Accessory = slack.NewAccessory(documentDetailsButton)

	// // Feedback Request Section
	// feedbackRequestText := slack.NewTextBlockObject("plain_text", "Please click on the link above to access the document and provide your valuable feedback. Your insights and suggestions are highly appreciated.", false, false)
	// feedbackRequestSection := slack.NewSectionBlock(feedbackRequestText, nil, nil)

	// // Thank You Section
	// thankYouText := slack.NewTextBlockObject("plain_text", "Thank you for your time and contribution.", false, false)
	// thankYouSection := slack.NewSectionBlock(thankYouText, nil, nil)

	// Web App Link Section
	webAppLinkButton := slack.NewButtonBlockElement("", "", nil)
	webAppLinkText := slack.NewTextBlockObject("plain_text", "Access the DocVault Web Application", false, false)
	webAppLinkButton.Text = webAppLinkText
	webAppLinkButton.URL = data.BaseURL
	webAppLinkButtonSection := slack.NewSectionBlock(slack.NewTextBlockObject("plain_text", " ", false, false), nil, nil)
	webAppLinkButtonSection.Accessory = slack.NewAccessory(webAppLinkButton)
	webAppLinkButton.Style = slack.StylePrimary

	// Signature Section
	signatureText := slack.NewTextBlockObject("mrkdwn", "*Best Regards,*\n*DocVault Team*", false, false)
	signatureSection := slack.NewSectionBlock(signatureText, nil, nil)

	// Divider Section
	dividerSection2 := slack.NewDividerBlock()

	// Build Message with blocks created above
	msg := slack.NewBlockMessage(
		headerSection,
		dividerSection1,
		invitationSection,
		documentDetailsSection,
		// documentOwnerSection,
		// feedbackRequestSection,
		// thankYouSection,
		webAppLinkButtonSection,
		signatureSection,
		dividerSection2,
	)

	return &msg, nil
}
