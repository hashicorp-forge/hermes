package email

import (
	"bytes"
	"embed"
	"fmt"
	"strings"
	"text/template"
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	gw "github.com/hashicorp-forge/hermes/pkg/googleworkspace"
)

//go:embed templates/*
var tmplFS embed.FS

type User struct {
	EmailAddress string
	Name         string
}

type DocumentApprovedEmailData struct {
	BaseURL                  string
	CurrentYear              int
	DocumentApprover         User
	DocumentOwner            string
	DocumentNonApproverCount int
	DocumentShortName        string
	DocumentTitle            string
	DocumentStatus           string
	DocumentStatusClass      string
	DocumentType             string
	DocumentURL              string
	Product                  string
}

type ReviewRequestedEmailData struct {
	BaseURL             string
	CurrentYear         int
	DocumentOwner       string
	DocumentShortName   string
	DocumentTitle       string
	DocumentType        string
	DocumentStatus      string
	DocumentStatusClass string
	DocumentURL         string
	Product             string
}

type SubscriberDocumentPublishedEmailData struct {
	BaseURL           string
	CurrentYear       int
	DocumentOwner     string
	DocumentShortName string
	DocumentTitle     string
	DocumentType      string
	DocumentURL       string
	Product           string
}

func SendDocumentApprovedEmail(
	data DocumentApprovedEmailData,
	to []string,
	from string,
	svc *gw.Service,
) error {
	// Validate data.
	if err := validation.ValidateStruct(&data,
		validation.Field(&data.BaseURL, validation.Required),
		validation.Field(&data.DocumentApprover, validation.Required),
		validation.Field(&data.DocumentShortName, validation.Required),
		validation.Field(&data.DocumentTitle, validation.Required),
		validation.Field(&data.DocumentURL, validation.Required),
		validation.Field(&data.Product, validation.Required),
		validation.Field(&data.DocumentType, validation.Required),
		validation.Field(&data.DocumentStatus, validation.Required),
	); err != nil {
		return fmt.Errorf("error validating email data: %w", err)
	}
	if err := validation.ValidateStruct(&data.DocumentApprover,
		validation.Field(&data.DocumentApprover.EmailAddress, validation.Required),
	); err != nil {
		return fmt.Errorf("error validating email data user: %w", err)
	}

	// Apply template.
	var body bytes.Buffer
	tmpl, err := template.ParseFS(tmplFS, "templates/document-approved.html")
	if err != nil {
		return fmt.Errorf("error parsing template: %w", err)
	}

	// Set current year.
	data.CurrentYear = time.Now().Year()

	// Set status class.
	data.DocumentStatusClass = dasherizeStatus(data.DocumentStatus)

	if err := tmpl.Execute(&body, data); err != nil {
		return fmt.Errorf("error executing template: %w", err)
	}

	// Build email subject (name is preferred over email address).
	approver := data.DocumentApprover.EmailAddress
	if data.DocumentApprover.Name != "" {
		approver = data.DocumentApprover.Name
	}
	subject := fmt.Sprintf("%s approved by %s",
		data.DocumentShortName,
		approver,
	)

	// Send email.
	_, err = svc.SendEmail(
		to,
		from,
		subject,
		body.String(),
	)
	return err
}

func SendReviewRequestedEmail(
	d ReviewRequestedEmailData,
	to []string,
	from string,
	s *gw.Service,
) error {
	// Validate data.
	if err := validation.ValidateStruct(&d,
		validation.Field(&d.BaseURL, validation.Required),
		validation.Field(&d.DocumentOwner, validation.Required),
		validation.Field(&d.DocumentTitle, validation.Required),
		validation.Field(&d.DocumentURL, validation.Required),
		validation.Field(&d.Product, validation.Required),
		validation.Field(&d.DocumentStatus, validation.Required),
		validation.Field(&d.DocumentType, validation.Required),
	); err != nil {
		return fmt.Errorf("error validating email data: %w", err)
	}

	var body bytes.Buffer
	tmpl, err := template.ParseFS(tmplFS, "templates/review-requested.html")
	if err != nil {
		return fmt.Errorf("error parsing template: %w", err)
	}

	// Set current year.
	d.CurrentYear = time.Now().Year()

	// Set status class.
	d.DocumentStatusClass = dasherizeStatus(d.DocumentStatus)

	if err := tmpl.Execute(&body, d); err != nil {
		return fmt.Errorf("error executing template: %w", err)
	}

	_, err = s.SendEmail(
		to,
		from,
		fmt.Sprintf("Document review requested for %s", d.DocumentShortName),
		body.String(),
	)
	return err
}

func SendSubscriberDocumentPublishedEmail(
	d SubscriberDocumentPublishedEmailData,
	to []string,
	from string,
	s *gw.Service,
) error {
	// Validate data.
	if err := validation.ValidateStruct(&d,
		validation.Field(&d.BaseURL, validation.Required),
		validation.Field(&d.DocumentOwner, validation.Required),
		validation.Field(&d.DocumentTitle, validation.Required),
		validation.Field(&d.DocumentURL, validation.Required),
		validation.Field(&d.Product, validation.Required),
	); err != nil {
		return fmt.Errorf("error validating email data: %w", err)
	}

	var body bytes.Buffer
	tmpl, err := template.ParseFS(
		tmplFS, "templates/subscriber-document-published.html")
	if err != nil {
		return fmt.Errorf("error parsing template: %w", err)
	}

	// Set current year.
	d.CurrentYear = time.Now().Year()

	if err := tmpl.Execute(&body, d); err != nil {
		return fmt.Errorf("error executing template: %w", err)
	}

	_, err = s.SendEmail(
		to,
		from,
		fmt.Sprintf("New %s: [%s] %s",
			d.DocumentType,
			d.DocumentShortName,
			d.DocumentTitle,
		),
		body.String(),
	)
	return err
}

func dasherizeStatus(status string) string {
	return strings.ReplaceAll(strings.ToLower(status), " ", "-")
}
