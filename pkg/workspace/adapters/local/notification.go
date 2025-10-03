package local

import (
	"context"
	"fmt"
	"log"
	"net/smtp"
)

// notificationService implements workspace.NotificationService.
type notificationService struct {
	adapter *Adapter
}

// SendEmail sends a plain text email.
// This is a simple SMTP implementation. In production, you might want to use
// a more robust email service or configuration.
func (ns *notificationService) SendEmail(ctx context.Context, to []string, from, subject, body string) error {
	// For filesystem adapter, we'll just log emails to a file
	// In a real implementation, you'd configure SMTP settings
	return ns.logEmail(to, from, subject, body, false)
}

// SendHTMLEmail sends an HTML email.
func (ns *notificationService) SendHTMLEmail(ctx context.Context, to []string, from, subject, htmlBody string) error {
	return ns.logEmail(to, from, subject, htmlBody, true)
}

// logEmail logs email details to console and optionally to a file.
// In production, this would send via SMTP or email service API.
func (ns *notificationService) logEmail(to []string, from, subject, body string, isHTML bool) error {
	format := "text"
	if isHTML {
		format = "html"
	}

	log.Printf("Email (%s): From=%s To=%v Subject=%s\n", format, from, to, subject)
	log.Printf("Body: %s\n", body)

	// In a real implementation, you would:
	// 1. Load SMTP configuration from adapter config
	// 2. Connect to SMTP server
	// 3. Send the email
	// Example:
	// err := smtp.SendMail("smtp.example.com:587", auth, from, to, message)

	return nil
}

// SMTPConfig contains SMTP configuration for sending emails.
type SMTPConfig struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
}

// SendViaSMTP sends an email via SMTP (example implementation).
func SendViaSMTP(cfg *SMTPConfig, to []string, subject, body string, isHTML bool) error {
	auth := smtp.PlainAuth("", cfg.Username, cfg.Password, cfg.Host)

	contentType := "text/plain"
	if isHTML {
		contentType = "text/html"
	}

	msg := []byte(fmt.Sprintf("From: %s\r\n"+
		"To: %s\r\n"+
		"Subject: %s\r\n"+
		"Content-Type: %s; charset=UTF-8\r\n"+
		"\r\n"+
		"%s\r\n",
		cfg.From,
		to[0], // Simplified: just first recipient
		subject,
		contentType,
		body))

	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	return smtp.SendMail(addr, auth, cfg.From, to, msg)
}
