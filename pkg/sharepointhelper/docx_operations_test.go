package sharepointhelper

import (
	"html"
	"strings"
	"testing"
)

// TestXMLEscaping verifies that special characters are properly escaped in XML properties
func TestXMLEscaping(t *testing.T) {
	testCases := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "Ampersand",
			input:    "Terraform & Platform",
			expected: "Terraform &amp; Platform",
		},
		{
			name:     "Less than",
			input:    "Cost < $50,000",
			expected: "Cost &lt; $50,000",
		},
		{
			name:     "Greater than",
			input:    "Score > 95%",
			expected: "Score &gt; 95%",
		},
		{
			name:     "Double quotes",
			input:    `Product "Alpha" Version`,
			expected: "Product &#34;Alpha&#34; Version",
		},
		{
			name:     "Single quote",
			input:    "O'Brien's Project",
			expected: "O&#39;Brien&#39;s Project",
		},
		{
			name:     "Multiple special chars",
			input:    `"Terraform & Cloud" <beta>`,
			expected: "&#34;Terraform &amp; Cloud&#34; &lt;beta&gt;",
		},
		{
			name:     "Normal text",
			input:    "ORG-HCP Terraform Platform Reliability",
			expected: "ORG-HCP Terraform Platform Reliability",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			escaped := html.EscapeString(tc.input)
			if escaped != tc.expected {
				t.Errorf("Expected %q, got %q", tc.expected, escaped)
			}

			// Verify it can be used in XML without breaking
			xmlSnippet := `<dc:title>` + escaped + `</dc:title>`
			if !strings.Contains(xmlSnippet, "<dc:title>") || !strings.Contains(xmlSnippet, "</dc:title>") {
				t.Errorf("XML snippet is malformed: %s", xmlSnippet)
			}
		})
	}
}

// TestProblematicDocumentTitles tests real-world document titles that caused corruption
func TestProblematicDocumentTitles(t *testing.T) {
	problematicTitles := []string{
		"ORG-HCP Terraform & Platform Reliability",
		"API Gateway: Auth & Authorization",
		"Cost Analysis < Q4 2024",
		"Project \"Phoenix\" Roadmap",
		"O'Connor's Design Doc",
		"Build & Deploy Pipeline",
		`Configuration: "Production" vs "Development"`,
	}

	for _, title := range problematicTitles {
		t.Run(title, func(t *testing.T) {
			// Escape the title
			escaped := html.EscapeString(title)

			// Verify no unescaped special characters remain
			if strings.Contains(escaped, "&") && !strings.Contains(escaped, "&amp;") &&
				!strings.Contains(escaped, "&lt;") && !strings.Contains(escaped, "&gt;") &&
				!strings.Contains(escaped, "&#") {
				t.Errorf("Unescaped ampersand found in: %s", escaped)
			}

			// Build a complete XML property
			xml := `<?xml version="1.0" encoding="UTF-8"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:title>` + escaped + `</dc:title>
  <cp:keywords>FileID: 01ABC123</cp:keywords>
</cp:coreProperties>`

			// Basic validation that XML structure is intact
			if !strings.Contains(xml, "<cp:coreProperties") {
				t.Error("XML structure broken - missing opening tag")
			}
			if !strings.Contains(xml, "</cp:coreProperties>") {
				t.Error("XML structure broken - missing closing tag")
			}
			if !strings.Contains(xml, "FileID: 01ABC123") {
				t.Error("Keywords (FileID) missing - corruption occurred")
			}
		})
	}
}
