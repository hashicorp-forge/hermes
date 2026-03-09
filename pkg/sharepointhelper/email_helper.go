package sharepointhelper

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

func (s *Service) SendEmail(to []string, from, subject, body string) error {
	return s.SendEmailWithBCC(to, nil, from, subject, body)
}

func (s *Service) SendEmailWithBCC(to []string, bcc []string, from, subject, body string) error {
	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/users/%s/sendMail", from)

	// Construct the email payload
	message := map[string]interface{}{
		"subject": subject,
		"body": map[string]string{
			"contentType": "HTML",
			"content":     body,
		},
		"toRecipients": func() []map[string]map[string]string {
			recipients := []map[string]map[string]string{}
			for _, addr := range to {
				recipients = append(recipients, map[string]map[string]string{
					"emailAddress": {"address": addr},
				})
			}
			return recipients
		}(),
	}

	// Add BCC recipients if provided
	if len(bcc) > 0 {
		message["bccRecipients"] = func() []map[string]map[string]string {
			recipients := []map[string]map[string]string{}
			for _, addr := range bcc {
				recipients = append(recipients, map[string]map[string]string{
					"emailAddress": {"address": addr},
				})
			}
			return recipients
		}()
	}

	payload := map[string]interface{}{
		"message":         message,
		"saveToSentItems": "true",
	}

	b, _ := json.Marshal(payload)
	resp, err := s.InvokeAPI("POST", url, bytes.NewBuffer(b))
	if err != nil {
		return fmt.Errorf("error calling Graph API to send email: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusAccepted && resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to send email, status: %s", resp.Status)
	}
	return nil
}
