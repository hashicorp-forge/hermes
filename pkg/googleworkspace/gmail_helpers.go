package googleworkspace

import (
	"encoding/base64"
	"fmt"
	"strings"

	"google.golang.org/api/gmail/v1"
)

// SendEmail sends an email.
func (s *Service) SendEmail(to []string, from, subject, body string) (*gmail.Message, error) {
	email := fmt.Sprintf("To: %s\r\nFrom: %s\r\nContent-Type: text/html; charset=UTF-8\r\nSubject: %s\r\n\r\n%s\r\n",
		strings.Join(to, ","), from, subject, body)

	msg := &gmail.Message{
		Raw: base64.URLEncoding.EncodeToString([]byte(email)),
	}

	resp, err := s.Gmail.Users.Messages.Send("me", msg).Do()
	if err != nil {
		return nil, fmt.Errorf("error sending email: %w", err)
	}
	return resp, nil
}

// EmailSenderAdapter wraps a Google Workspace Service to satisfy the
// email.EmailSender interface (which expects SendEmail to return just error).
type EmailSenderAdapter struct {
	Svc *Service
}

// SendEmail sends an email, discarding the Gmail Message return value.
func (a *EmailSenderAdapter) SendEmail(to []string, from, subject, body string) error {
	_, err := a.Svc.SendEmail(to, from, subject, body)
	return err
}

// SendEmailWithBCC sends an email with BCC recipients via Gmail.
func (a *EmailSenderAdapter) SendEmailWithBCC(to []string, bcc []string, from, subject, body string) error {
	emailStr := fmt.Sprintf(
		"To: %s\r\nBcc: %s\r\nFrom: %s\r\nContent-Type: text/html; charset=UTF-8\r\nSubject: [not provided]\r\n\r\n%s\r\n",
		strings.Join(to, ","),
		strings.Join(bcc, ","),
		from,
		body,
	)

	msg := &gmail.Message{
		Raw: base64.URLEncoding.EncodeToString([]byte(emailStr)),
	}

	_, err := a.Svc.Gmail.Users.Messages.Send("me", msg).Do()
	if err != nil {
		return fmt.Errorf("error sending email with BCC: %w", err)
	}
	return nil
}
