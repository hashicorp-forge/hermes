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
