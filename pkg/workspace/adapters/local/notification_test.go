package local

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNotificationService_SendEmail(t *testing.T) {
	tests := []struct {
		name    string
		to      []string
		from    string
		subject string
		body    string
		wantErr bool
	}{
		{
			name:    "send email to single recipient",
			to:      []string{"user@example.com"},
			from:    "sender@example.com",
			subject: "Test Subject",
			body:    "Test body",
			wantErr: false,
		},
		{
			name:    "send email to multiple recipients",
			to:      []string{"user1@example.com", "user2@example.com"},
			from:    "sender@example.com",
			subject: "Test Subject",
			body:    "Test body",
			wantErr: false,
		},
		{
			name:    "send email with empty body",
			to:      []string{"user@example.com"},
			from:    "sender@example.com",
			subject: "Test Subject",
			body:    "",
			wantErr: false,
		},
		{
			name:    "send email with empty subject",
			to:      []string{"user@example.com"},
			from:    "sender@example.com",
			subject: "",
			body:    "Test body",
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			adapter := createTestAdapterForPeople(t)
			notifSvc := &notificationService{
				adapter: adapter,
			}

			err := notifSvc.SendEmail(context.Background(), tt.to, tt.from, tt.subject, tt.body)

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestNotificationService_SendHTMLEmail(t *testing.T) {
	tests := []struct {
		name    string
		to      []string
		from    string
		subject string
		body    string
		wantErr bool
	}{
		{
			name:    "send HTML email",
			to:      []string{"user@example.com"},
			from:    "sender@example.com",
			subject: "Test Subject",
			body:    "<html><body><h1>Test</h1></body></html>",
			wantErr: false,
		},
		{
			name:    "send HTML email to multiple recipients",
			to:      []string{"user1@example.com", "user2@example.com"},
			from:    "sender@example.com",
			subject: "Test Subject",
			body:    "<p>Test paragraph</p>",
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			adapter := createTestAdapterForPeople(t)
			notifSvc := &notificationService{
				adapter: adapter,
			}

			err := notifSvc.SendHTMLEmail(context.Background(), tt.to, tt.from, tt.subject, tt.body)

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestNotificationService_EmptyRecipients(t *testing.T) {
	adapter := createTestAdapterForPeople(t)
	notifSvc := &notificationService{
		adapter: adapter,
	}

	// Sending to empty recipients list should not error (just logs)
	err := notifSvc.SendEmail(context.Background(), []string{}, "from@example.com", "Test", "Body")
	assert.NoError(t, err)
}

func TestNotificationService_NilContext(t *testing.T) {
	adapter := createTestAdapterForPeople(t)
	notifSvc := &notificationService{
		adapter: adapter,
	}

	// Should handle nil context gracefully
	err := notifSvc.SendEmail(nil, []string{"test@example.com"}, "from@example.com", "Test", "Body")
	assert.NoError(t, err)
}
