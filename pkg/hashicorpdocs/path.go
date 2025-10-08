package hashicorpdocs

import (
	"fmt"
	"reflect"
	"regexp"
	"strings"
	"time"

	"github.com/araddon/dateparse"
	gw "github.com/hashicorp-forge/hermes/pkg/workspace/adapters/google"
	"google.golang.org/api/docs/v1"
	"google.golang.org/api/drive/v3"
)

// PATH contains metadata for documents based off of the HashiCorp Golden Path template.
type PATH struct {
	BaseDoc `mapstructure:",squash"`

	// Category is the golden path category (e.g., "Engineering", "Product Management", "TPM").
	Category string `json:"category,omitempty"`

	// TimeInvestment is the estimated time to complete the golden path.
	TimeInvestment string `json:"timeInvestment,omitempty"`

	// Prerequisites is a list of prerequisites for the golden path.
	Prerequisites []string `json:"prerequisites,omitempty"`

	// Steps is the number of steps in the golden path.
	Steps int `json:"steps,omitempty"`

	// RelatedPaths is a list of related golden paths.
	RelatedPaths []string `json:"relatedPaths,omitempty"`
}

func (d PATH) GetCustomEditableFields() map[string]CustomDocTypeField {
	return map[string]CustomDocTypeField{
		"category": {
			DisplayName: "Category",
			Type:        "STRING",
		},
		"timeInvestment": {
			DisplayName: "Time Investment",
			Type:        "STRING",
		},
		"steps": {
			DisplayName: "Number of Steps",
			Type:        "NUMBER",
		},
	}
}

func (d *PATH) SetCustomEditableFields() {
	d.CustomEditableFields = d.GetCustomEditableFields()
}

// MissingFields returns the missing fields of the doc struct.
func (d PATH) MissingFields() []string {
	var missingFields []string

	pathType := reflect.TypeOf(d)
	for i := 0; i < pathType.NumField(); i++ {
		f := pathType.Field(i)
		val := reflect.ValueOf(d).FieldByName(f.Name)
		if val.IsZero() {
			missingFields = append(missingFields, f.Name)
		} else if f.Type.Kind() == reflect.Slice && val.Len() == 0 {
			// Parsing docs may generate an empty slice instead of nil zero value.
			missingFields = append(missingFields, f.Name)
		}
	}

	return missingFields
}

// NewPATH parses a Google Drive file based on the HashiCorp Golden Path template and
// returns the resulting PATH struct.
func NewPATH(f *drive.File, s *gw.Service, allFolders []string) (*PATH, error) {
	r := &PATH{
		BaseDoc: BaseDoc{
			ObjectID:      f.Id,
			Title:         f.Name,
			DocType:       "PATH",
			ThumbnailLink: f.ThumbnailLink,
		},
	}

	// Parse title and doc number.
	r.parsePATHTitle(f.Name)

	// Convert modified time to Unix time so it can be sorted in Algolia.
	mt, err := time.Parse(time.RFC3339, f.ModifiedTime)
	if err != nil {
		return nil, fmt.Errorf("error parsing modified time: %w: id=\"%s\"",
			err, f.Id)
	}
	r.ModifiedTime = mt.Unix()

	doc, err := s.GetDoc(f.Id)
	if err != nil {
		return nil, fmt.Errorf("error getting doc: %w: id=\"%s\"", err, f.Id)
	}

	// Assume the name of the parent folder is the PATH Category.
	parent, err := s.Drive.Files.Get(f.Parents[0]).
		SupportsAllDrives(true).Fields("name").Do()
	if err != nil {
		return nil, fmt.Errorf("error getting parent folder file: %w", err)
	}
	r.Category = parent.Name

	r.parsePATHSummary(doc.Body)

	// Parse PATH header for metadata.
	r.parsePATHHeader(doc)

	r.SetCustomEditableFields()

	return r, nil
}

// parsePATHTitle parses the title of a PATH for metadata.
func (d *PATH) parsePATHTitle(title string) {
	// Try to match [GP-XXX] or [PATH-XXX] format.
	re := regexp.MustCompile(`(?i)\[(GP|PATH)-?(\d+)\]`)
	match := re.FindStringSubmatch(title)
	if match != nil {
		d.DocNumber = match[2]
	}

	// Remove [GP-XXX] or [PATH-XXX] prefix from title if present.
	re = regexp.MustCompile(`(?i)\[(GP|PATH)-?\d+\]\s*`)
	d.Title = strings.TrimSpace(re.ReplaceAllString(title, ""))
}

// parsePATHSummary parses the summary of a PATH.
func (d *PATH) parsePATHSummary(body *docs.Body) {
	// Find the Overview section.
	summary := ""
	inOverview := false

	for _, se := range body.Content {
		if se.Paragraph != nil {
			for _, e := range se.Paragraph.Elements {
				if e.TextRun != nil {
					text := e.TextRun.Content

					// Check if we're entering the Overview section.
					if strings.Contains(strings.ToLower(text), "## overview") {
						inOverview = true
						continue
					}

					// Stop if we hit another section heading.
					if inOverview && strings.HasPrefix(text, "##") {
						break
					}

					// Collect overview text.
					if inOverview {
						summary += text
					}
				}
			}
		}

		if inOverview && len(summary) > 0 && strings.HasPrefix(summary, "##") {
			break
		}
	}

	// Clean up and limit summary length.
	summary = strings.TrimSpace(summary)
	if len(summary) > 500 {
		summary = summary[:497] + "..."
	}

	d.Summary = summary
}

// parsePATHHeader parses a HashiCorp PATH header for metadata.
func (d *PATH) parsePATHHeader(doc *docs.Document) {
	tables := gw.GetTables(doc.Body)

	for _, t := range tables {
		gw.VisitAllTableParagraphs(t, func(p *docs.Paragraph) {
			if len(p.Elements) > 0 {
				if p.Elements[0].TextRun != nil {
					// Get label of table cell.
					label := p.Elements[0].TextRun.Content

					switch {
					case strings.HasPrefix(label, "Category:"):
						d.parsePATHCategory(p)

					case strings.HasPrefix(label, "Time:") ||
						strings.HasPrefix(label, "Total Time:") ||
						strings.HasPrefix(label, "Duration:"):
						d.parsePATHTimeInvestment(p)

					case strings.HasPrefix(label, "Created"):
						d.parsePATHCreated(p)

					case strings.HasPrefix(label, "Owner:") ||
						strings.HasPrefix(label, "Owners:") ||
						strings.HasPrefix(label, "Author:"):
						d.parsePATHOwners(p)

					case strings.HasPrefix(label, "Status:"):
						d.parsePATHStatus(p)

					case strings.HasPrefix(label, "Steps:"):
						d.parsePATHSteps(p)

					case strings.HasPrefix(label, "Contributor:") ||
						strings.HasPrefix(label, "Contributors:"):
						d.parsePATHContributors(p)
					}
				}
			}
		})
	}
}

// parsePATHCategory parses the PATH Category from a Google Docs paragraph.
func (d *PATH) parsePATHCategory(p *docs.Paragraph) {
	d.Category = parseParagraphWithText("Category", p)
}

// parsePATHTimeInvestment parses the PATH Time Investment from a Google Docs paragraph.
func (d *PATH) parsePATHTimeInvestment(p *docs.Paragraph) {
	d.TimeInvestment = parseParagraphWithText("Time", p)
	if d.TimeInvestment == "" {
		d.TimeInvestment = parseParagraphWithText("Total Time", p)
	}
	if d.TimeInvestment == "" {
		d.TimeInvestment = parseParagraphWithText("Duration", p)
	}
}

// parsePATHCreated parses the PATH Created date from a Google Docs paragraph.
func (d *PATH) parsePATHCreated(p *docs.Paragraph) error {
	// Build string containing Created date.
	var s string
	for i, e := range p.Elements {
		if i > 0 {
			s += e.TextRun.Content
		}
	}
	s = strings.TrimSpace(s)

	// Parse Created date string.
	ts, err := dateparse.ParseAny(s)
	if err != nil {
		return fmt.Errorf("error parsing Created date: %w: date=\"%s\"", err, s)
	}

	res, err := ts.UTC().MarshalText()
	if err != nil {
		return fmt.Errorf("error marshaling time: %w", err)
	}
	d.Created = string(res)

	// Also store created date as Unix time so it can be sorted in Algolia.
	d.CreatedTime = ts.Unix()

	return nil
}

// parsePATHOwners parses PATH Owners from a Google Docs paragraph.
func (d *PATH) parsePATHOwners(p *docs.Paragraph) {
	d.Owners = parseParagraphWithEmails("Owner", p)
	if len(d.Owners) == 0 {
		d.Owners = parseParagraphWithEmails("Author", p)
	}
}

// parsePATHStatus parses the PATH Status from a Google Docs paragraph.
func (d *PATH) parsePATHStatus(p *docs.Paragraph) {
	label := p.Elements[0].TextRun.Content
	var status string

	// Sometimes "Status: Draft" is collected together as one text element.
	if strings.HasPrefix(label, "Status:") && p.Elements[0].TextRun.TextStyle.Bold {
		parts := strings.SplitN(label, ":", 2)
		if len(parts) == 2 {
			status = strings.TrimSpace(parts[1])
		}
	} else {
		for i, e := range p.Elements {
			if i > 0 && e.TextRun.TextStyle.Bold {
				status = e.TextRun.Content
			}
		}
	}

	status = strings.TrimSpace(status)
	d.Status = status
}

// parsePATHSteps parses the PATH Steps from a Google Docs paragraph.
func (d *PATH) parsePATHSteps(p *docs.Paragraph) {
	stepsText := parseParagraphWithText("Steps", p)
	// Try to extract number from text like "4 steps" or "4".
	re := regexp.MustCompile(`\d+`)
	match := re.FindString(stepsText)
	if match != "" {
		fmt.Sscanf(match, "%d", &d.Steps)
	}
}

// parsePATHContributors parses the PATH Contributors from a Google Docs paragraph.
func (d *PATH) parsePATHContributors(p *docs.Paragraph) {
	d.Contributors = parseParagraphWithEmails("Contributor", p)
}
