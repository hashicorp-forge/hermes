package document

import (
	"strings"
	"testing"
)

func TestExpandTemplate(t *testing.T) {
	tests := []struct {
		name     string
		content  string
		data     TemplateData
		expected string
	}{
		{
			name:    "Simple title replacement",
			content: "# {{title}}\n\nThis is the content",
			data: TemplateData{
				Title: "My RFC Document",
			},
			expected: "# My RFC Document\n\nThis is the content",
		},
		{
			name:    "Multiple variable replacement",
			content: "Title: {{title}}\nOwner: {{owner}}\nCreated: {{created_date}}",
			data: TemplateData{
				Title:       "Test Document",
				Owner:       "test@example.com",
				CreatedDate: "October 10, 2025",
			},
			expected: "Title: Test Document\nOwner: test@example.com\nCreated: October 10, 2025",
		},
		{
			name:    "RFC template",
			content: "# {{title}}\n\n**Owner**: {{owner}}\n**Created**: {{created_date}}\n**Stakeholders**: {{stakeholders}}",
			data: TemplateData{
				Title:        "Implement Feature X",
				Owner:        "alice@example.com",
				CreatedDate:  "October 10, 2025",
				Stakeholders: "bob@example.com, charlie@example.com",
			},
			expected: "# Implement Feature X\n\n**Owner**: alice@example.com\n**Created**: October 10, 2025\n**Stakeholders**: bob@example.com, charlie@example.com",
		},
		{
			name:    "Empty values",
			content: "Title: {{title}}\nOwner: {{owner}}\nSummary: {{summary}}",
			data: TemplateData{
				Title: "Test",
			},
			expected: "Title: Test\nOwner: \nSummary: ",
		},
		{
			name:    "No template variables",
			content: "# Regular Document\n\nNo variables here.",
			data: TemplateData{
				Title: "Test",
			},
			expected: "# Regular Document\n\nNo variables here.",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ExpandTemplate(tt.content, tt.data)
			if result != tt.expected {
				t.Errorf("ExpandTemplate() = %q, want %q", result, tt.expected)
			}
		})
	}
}

func TestNewTemplateDataFromDocument(t *testing.T) {
	tests := []struct {
		name     string
		doc      *Document
		validate func(t *testing.T, data TemplateData)
	}{
		{
			name: "Basic document fields",
			doc: &Document{
				Title:        "Test Document",
				Owners:       []string{"owner@example.com"},
				Created:      "October 10, 2025",
				Contributors: []string{"contributor1@example.com", "contributor2@example.com"},
				Approvers:    []string{"approver1@example.com"},
				Summary:      "This is a test",
				Product:      "Engineering",
			},
			validate: func(t *testing.T, data TemplateData) {
				if data.Title != "Test Document" {
					t.Errorf("Title = %q, want %q", data.Title, "Test Document")
				}
				if data.Owner != "owner@example.com" {
					t.Errorf("Owner = %q, want %q", data.Owner, "owner@example.com")
				}
				if data.CreatedDate != "October 10, 2025" {
					t.Errorf("CreatedDate = %q, want %q", data.CreatedDate, "October 10, 2025")
				}
				if data.Contributors != "contributor1@example.com, contributor2@example.com" {
					t.Errorf("Contributors = %q, want %q", data.Contributors, "contributor1@example.com, contributor2@example.com")
				}
				if data.Approvers != "approver1@example.com" {
					t.Errorf("Approvers = %q, want %q", data.Approvers, "approver1@example.com")
				}
			},
		},
		{
			name: "Document with custom fields",
			doc: &Document{
				Title:  "RFC with Custom Fields",
				Owners: []string{"owner@example.com"},
				CustomFields: []CustomField{
					{
						DisplayName: "Stakeholders",
						Value:       []string{"stakeholder1@example.com", "stakeholder2@example.com"},
					},
					{
						DisplayName: "Current Version",
						Value:       "1.0",
					},
					{
						DisplayName: "Target Version",
						Value:       "2.0",
					},
				},
			},
			validate: func(t *testing.T, data TemplateData) {
				if data.Stakeholders != "stakeholder1@example.com, stakeholder2@example.com" {
					t.Errorf("Stakeholders = %q, want %q", data.Stakeholders, "stakeholder1@example.com, stakeholder2@example.com")
				}
				if data.CurrentVersion != "1.0" {
					t.Errorf("CurrentVersion = %q, want %q", data.CurrentVersion, "1.0")
				}
				if data.TargetVersion != "2.0" {
					t.Errorf("TargetVersion = %q, want %q", data.TargetVersion, "2.0")
				}
			},
		},
		{
			name: "Empty document uses current date",
			doc:  &Document{},
			validate: func(t *testing.T, data TemplateData) {
				// Should use current date
				if data.CreatedDate == "" {
					t.Error("CreatedDate should not be empty when not provided")
				}
				// Verify it's in the expected format (rough check)
				if !strings.Contains(data.CreatedDate, "2025") && !strings.Contains(data.CreatedDate, "2024") {
					t.Errorf("CreatedDate format unexpected: %q", data.CreatedDate)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data := NewTemplateDataFromDocument(tt.doc)
			tt.validate(t, data)
		})
	}
}

func TestRemoveUnusedTemplateVariables(t *testing.T) {
	tests := []struct {
		name     string
		content  string
		expected string
	}{
		{
			name:     "Remove single variable",
			content:  "Title: Test\n{{unused_variable}}",
			expected: "Title: Test\n",
		},
		{
			name:     "Remove multiple variables",
			content:  "{{var1}} some text {{var2}} more text {{var3}}",
			expected: " some text  more text ",
		},
		{
			name:     "No variables to remove",
			content:  "This is plain text without any variables",
			expected: "This is plain text without any variables",
		},
		{
			name:     "Variables with underscores and dashes",
			content:  "{{my_variable}} and {{another-variable}}",
			expected: " and ",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := RemoveUnusedTemplateVariables(tt.content)
			if result != tt.expected {
				t.Errorf("RemoveUnusedTemplateVariables() = %q, want %q", result, tt.expected)
			}
		})
	}
}

func TestIntegration_ExpandAndCleanTemplate(t *testing.T) {
	// Simulate a real RFC template
	template := `# {{title}}

**Status**: Draft  
**Created**: {{created_date}}  
**Owner**: {{owner}}  
**Stakeholders**: {{stakeholders}}  
**Current Version**: {{current_version}}  
**Target Version**: {{target_version}}

## Overview

This is the overview section.

## Background

Some background information.
`

	doc := &Document{
		Title:        "Implement Document Templates",
		Owners:       []string{"dev@example.com"},
		Created:      "October 10, 2025",
		Contributors: []string{"contributor@example.com"},
		CustomFields: []CustomField{
			{
				DisplayName: "Stakeholders",
				Value:       []string{"stakeholder@example.com"},
			},
		},
	}

	// Expand template with document data
	data := NewTemplateDataFromDocument(doc)
	expanded := ExpandTemplate(template, data)

	// Verify key replacements happened
	if !strings.Contains(expanded, "# Implement Document Templates") {
		t.Error("Title was not replaced")
	}
	if !strings.Contains(expanded, "**Owner**: dev@example.com") {
		t.Error("Owner was not replaced")
	}
	if !strings.Contains(expanded, "**Created**: October 10, 2025") {
		t.Error("Created date was not replaced")
	}

	// Clean up unused variables
	cleaned := RemoveUnusedTemplateVariables(expanded)

	// Verify no template variables remain
	if strings.Contains(cleaned, "{{") {
		t.Errorf("Template variables still present after cleanup: %s", cleaned)
	}
}
