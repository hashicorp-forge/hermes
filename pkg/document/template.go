package document

import (
	"regexp"
	"strings"
	"time"
)

// TemplateData contains the data used for template variable expansion.
type TemplateData struct {
	Title          string
	Owner          string
	CreatedDate    string
	Stakeholders   string
	CurrentVersion string
	TargetVersion  string
	Summary        string
	Product        string
	Contributors   string
	Approvers      string
}

// ExpandTemplate replaces template variables in the given content with actual values.
// Template variables are in the format {{variable_name}}.
//
// Supported variables:
// - {{title}}
// - {{owner}}
// - {{created_date}}
// - {{stakeholders}}
// - {{current_version}}
// - {{target_version}}
// - {{summary}}
// - {{product}}
// - {{contributors}}
// - {{approvers}}
func ExpandTemplate(content string, data TemplateData) string {
	// Create a map of template variables to their values
	replacements := map[string]string{
		"{{title}}":           data.Title,
		"{{owner}}":           data.Owner,
		"{{created_date}}":    data.CreatedDate,
		"{{stakeholders}}":    data.Stakeholders,
		"{{current_version}}": data.CurrentVersion,
		"{{target_version}}":  data.TargetVersion,
		"{{summary}}":         data.Summary,
		"{{product}}":         data.Product,
		"{{contributors}}":    data.Contributors,
		"{{approvers}}":       data.Approvers,
	}

	result := content
	for placeholder, value := range replacements {
		result = strings.ReplaceAll(result, placeholder, value)
	}

	return result
}

// NewTemplateDataFromDocument creates TemplateData from a Document.
func NewTemplateDataFromDocument(doc *Document) TemplateData {
	// Use current date if not provided
	createdDate := doc.Created
	if createdDate == "" {
		createdDate = time.Now().Format("January 2, 2006")
	}

	// Extract owner (first owner if multiple)
	owner := ""
	if len(doc.Owners) > 0 {
		owner = doc.Owners[0]
	}

	// Join contributors
	contributors := strings.Join(doc.Contributors, ", ")

	// Join approvers
	approvers := ""
	if len(doc.Approvers) > 0 {
		approvers = strings.Join(doc.Approvers, ", ")
	}

	// For custom fields, extract stakeholders and version info if present
	stakeholders := ""
	currentVersion := ""
	targetVersion := ""
	for _, field := range doc.CustomFields {
		fieldNameLower := strings.ToLower(field.DisplayName)
		switch fieldNameLower {
		case "stakeholders":
			if values, ok := field.Value.([]string); ok {
				stakeholders = strings.Join(values, ", ")
			} else if val, ok := field.Value.(string); ok {
				stakeholders = val
			}
		case "current version", "currentversion":
			if val, ok := field.Value.(string); ok {
				currentVersion = val
			}
		case "target version", "targetversion":
			if val, ok := field.Value.(string); ok {
				targetVersion = val
			}
		}
	}

	return TemplateData{
		Title:          doc.Title,
		Owner:          owner,
		CreatedDate:    createdDate,
		Stakeholders:   stakeholders,
		CurrentVersion: currentVersion,
		TargetVersion:  targetVersion,
		Summary:        doc.Summary,
		Product:        doc.Product,
		Contributors:   contributors,
		Approvers:      approvers,
	}
}

// RemoveUnusedTemplateVariables removes any remaining template variables
// that weren't replaced (e.g., {{some_var}}) from the content.
// This is useful to clean up templates that have optional variables.
func RemoveUnusedTemplateVariables(content string) string {
	// Match {{anything}} pattern
	re := regexp.MustCompile(`\{\{[^}]+\}\}`)
	return re.ReplaceAllString(content, "")
}
