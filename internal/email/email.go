package email

import (
	"bytes"
	"embed"
	"fmt"
	"text/template"
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	gw "github.com/hashicorp-forge/hermes/pkg/googleworkspace"
)

//go:embed templates/*
var tmplFS embed.FS

type ReviewRequestedEmailData struct {
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

type SubscriberDocumentPublishedEmailData struct {
	BaseURL           string
	CurrentYear       int
	DocumentOwner     string
	DocumentShortName string
	DocumentTitle     string
	DocumentType      string
	DocumentURL       string
	Product           string
	Team              string
}

type ContributorRequestedEmailData struct {
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

	if err := tmpl.Execute(&body, d); err != nil {
		return fmt.Errorf("error executing template: %w", err)
	}

	_, err = s.SendEmail(
		to,
		from,
		fmt.Sprintf("%s | Document Review Request from %s [%s]", d.DocumentTitle, d.DocumentOwner, d.DocumentOwnerEmail),
		body.String(),
	)
	return err
}

func SendContributorRequestedEmail(
	d ContributorRequestedEmailData,
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
	); err != nil {
		return fmt.Errorf("error validating email data: %w", err)
	}

	var body bytes.Buffer
	tmpl, err := template.ParseFS(tmplFS, "templates/contributor.html")
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
		fmt.Sprintf("%s | Document Contribution Request from %s [%s]", d.DocumentTitle, d.DocumentOwner, d.DocumentOwnerEmail),
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
