package hashicorpdocs

import (
	"fmt"
	"io"
	"reflect"
	"regexp"
	"strings"
	"time"

	"github.com/araddon/dateparse"
	"github.com/forPelevin/gomoji"
	gw "github.com/hashicorp-forge/hermes/pkg/storage/adapters/google"
	"google.golang.org/api/docs/v1"
	"google.golang.org/api/drive/v3"
)

// RFC contains metadata for documents based off of the HashiCorp RFC template.
type RFC struct {
	BaseDoc `mapstructure:",squash"`

	// CurrentVersion is the current version of the product at the time of
	// document authoring.
	CurrentVersion string `json:"currentVersion,omitempty"`

	// PRD is the associated PRD.
	PRD string `json:"prd,omitempty"`

	// Stakeholders is a slice of email address strings for document stakeholders.
	Stakeholders []string `json:"stakeholders,omitempty"`

	// TargetVersion is the target version of the product for the changes being
	// proposed in the document.
	TargetVersion string `json:"targetVersion,omitempty"`
}

func (d RFC) GetCustomEditableFields() map[string]CustomDocTypeField {
	return map[string]CustomDocTypeField{
		"currentVersion": {
			DisplayName: "Current Version",
			Type:        "STRING",
		},
		"prd": {
			DisplayName: "PRD",
			Type:        "STRING",
		},
		"stakeholders": {
			DisplayName: "Stakeholders",
			Type:        "PEOPLE",
		},
		"targetVersion": {
			DisplayName: "Target Version",
			Type:        "STRING",
		},
	}
}

func (d *RFC) SetCustomEditableFields() {
	d.CustomEditableFields = d.GetCustomEditableFields()
}

// MissingFields returns the missing fields of the doc struct.
func (d RFC) MissingFields() []string {
	var missingFields []string

	rfcType := reflect.TypeOf(d)
	for i := 0; i < rfcType.NumField(); i++ {
		f := rfcType.Field(i)
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

// NewRFC parses a Google Drive file based on the HashiCorp RFC template and
// returns the resulting RFC struct.
func NewRFC(f *drive.File, s *gw.Service, allFolders []string) (*RFC, error) {
	r := &RFC{
		BaseDoc: BaseDoc{
			ObjectID:      f.Id,
			Title:         f.Name,
			DocType:       "RFC",
			ThumbnailLink: f.ThumbnailLink,
		},
	}

	// Parse title and doc number.
	r.parseRFCTitle(f.Name)

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

	// Assume the name of the parent folder is the RFC Product.
	parent, err := s.Drive.Files.Get(f.Parents[0]).
		SupportsAllDrives(true).Fields("name").Do()
	if err != nil {
		return nil, fmt.Errorf("error getting parent folder file: %w", err)
	}
	r.Product = parent.Name

	r.parseRFCSummary(doc.Body)

	// Parse RFC header for metadata.
	r.parseRFCHeader(doc)

	// Parse all linked documents.
	// TODO: use allFolders parameter and enable this.
	// r.LinkedDocs = gw.GetLinkURLs(doc.Body)

	// Get owner photos by searching Google Workspace directory for owner strings.
	for i, o := range r.Owners {
		// Add empty string as a default. We will replace this with the actual photo
		// URL if we can find it.
		r.OwnerPhotos = append(r.OwnerPhotos, "")

		people, err := s.SearchPeople(o, "photos")
		if err != nil {
			return nil, fmt.Errorf(
				"error searching directory for person: %w: owner=\"%s\"",
				err, o)
		}

		if len(people) > 0 {
			if len(people[0].Photos) > 0 {
				// Replace empty string default with actual value.
				r.OwnerPhotos[i] = people[0].Photos[0].Url
			}
		}
	}

	// Get doc content.
	resp, err := s.Drive.Files.Export(f.Id, "text/plain").Download()
	if err != nil {
		return nil, fmt.Errorf("error exporting doc: %w: id=\"%s\"", err, f.Id)
	}
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading exported doc: %w: id=\"%s\"", err,
			f.Id)
	}

	// Trim doc content if it is larger than the maximum size.
	if len(b) > MaxDocSize {
		b = b[:MaxDocSize]
	}

	r.Content = string(b)
	return r, nil
}

// parseRFCHeader parses a HashiCorp RFC header for metadata.
func (r *RFC) parseRFCHeader(d *docs.Document) {
	tables := gw.GetTables(d.Body)

	for _, t := range tables {
		gw.VisitAllTableParagraphs(t, func(p *docs.Paragraph) {
			if len(p.Elements) > 0 {
				if p.Elements[0].TextRun != nil {

					// Get label of table cell.
					label := p.Elements[0].TextRun.Content

					switch {
					case strings.HasPrefix(label, "Approver:") ||
						strings.HasPrefix(label, "Approvers:"):
						r.parseRFCApprovers(p)

					case strings.HasPrefix(label, "Contributor:") ||
						strings.HasPrefix(label, "Contributors:"):
						r.parseRFCContributors(p)

					case strings.HasPrefix(label, "Created"):
						r.parseRFCCreated(p)

					case strings.HasPrefix(label, "Current Version"):
						r.parseRFCCurrentVersion(p)

					case strings.HasPrefix(label, "Owner:") ||
						strings.HasPrefix(label, "Owners:"):
						r.parseRFCOwners(p)

					case strings.HasPrefix(label, "PRD"):
						r.parseRFCPRD(p)

					case strings.HasPrefix(label, "Stakeholder:") ||
						strings.HasPrefix(label, "Stakeholders:"):
						r.parseRFCStakeholders(p)

					case strings.HasPrefix(label, "Status:"):
						r.parseRFCStatus(p)
					}
				}
			}
		})
	}
}

// parseRFCApprovers parses RFC Approvers from a Google Doc paragraph.
func (r *RFC) parseRFCApprovers(p *docs.Paragraph) {
	r.Approvers = parseParagraphWithEmails("Approver", p)
}

// parseRFCContributors parses the RFC Contributors from a Google Docs paragraph.
func (r *RFC) parseRFCContributors(p *docs.Paragraph) {
	r.Contributors = parseParagraphWithEmails("Contributor", p)
}

// parseRFCCreated parses the RFC Created date from a Google Docs paragraph.
func (r *RFC) parseRFCCreated(p *docs.Paragraph) error {
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
	r.Created = string(res)

	// Also store created date as Unix time so it can be sorted in Algolia.
	r.CreatedTime = ts.Unix()

	return nil
}

// parseRFCCurrentVersion parses the RFC Current Version from a Google Docs
// paragraph.
func (r *RFC) parseRFCCurrentVersion(p *docs.Paragraph) {
	r.CurrentVersion = parseParagraphWithText("Current Version", p)
}

// parseRFCOwners parses RFC Owners from a Google Docs paragraph.
func (r *RFC) parseRFCOwners(p *docs.Paragraph) {
	r.Owners = parseParagraphWithEmails("Owner", p)
}

// parseRFCPRD parses the RFC PRD from a Google Docs paragraph.
func (r *RFC) parseRFCPRD(p *docs.Paragraph) {
	r.PRD = parseParagraphWithText("PRD", p)

	// Text from the RFC template may be left in the doc.
	if r.PRD == "Link to PRD if applicable" {
		r.PRD = ""
	}
}

// parseRFCStakeholders parses RFC Stakeholders from a Google Docs paragraph.
func (r *RFC) parseRFCStakeholders(p *docs.Paragraph) {
	r.Stakeholders = parseParagraphWithEmails("Stakeholder", p)
}

// parseRFCStatus parses the RFC Status from a Google Docs paragraph.
func (r *RFC) parseRFCStatus(p *docs.Paragraph) {
	label := p.Elements[0].TextRun.Content
	var status string

	// Sometimes "Status: WIP" is collected together as one text element.
	if label == "Status: WIP" && p.Elements[0].TextRun.TextStyle.Bold {
		status = "WIP"
	} else {
		for i, e := range p.Elements {
			if i > 0 && e.TextRun != nil && e.TextRun.TextStyle != nil && e.TextRun.TextStyle.Bold {
				status = e.TextRun.Content
			}
		}
	}

	status = strings.TrimSpace(status)
	r.Status = status
}

// parseRFCSummary parses the RFC Summary from a Google Docs Body.
func (r *RFC) parseRFCSummary(b *docs.Body) {
	elems := b.Content

	for _, e := range elems {
		if e.Paragraph != nil {
			// Summary paragraph in the RFC template will have at least 2 elements.
			if len(e.Paragraph.Elements) > 1 {
				if e.Paragraph.Elements[0].TextRun != nil {
					if e.Paragraph.Elements[0].TextRun.Content == "Summary:" {
						// We found the summary paragraph and the rest of the elements
						// should be the summary value.
						var s string
						for i, ee := range e.Paragraph.Elements {
							if ee.TextRun != nil {
								if i > 0 {
									s += ee.TextRun.Content
								}
							}
						}
						r.Summary = strings.TrimSpace(s)
						return
					}
				}
			}
		}
	}
}

// parseRFCTitle parses RFC title and document number from a string (which
// should be the name of the Google Drive file).
func (r *RFC) parseRFCTitle(s string) {
	// Handle `[RFC-123]: Some RFC Title` case.
	re := regexp.MustCompile(`\[(?P<DocID>[A-Z]+-[0-9xX#?]+)\] (?P<Title>.+)`)
	matches := re.FindStringSubmatch(s)
	if len(matches) > 1 {
		r.DocNumber = matches[1]
		r.Title = strings.TrimSpace(matches[2])
		return
	}

	// Handle `RFC-123: Some RFC Title` case.
	re = regexp.MustCompile(`(?P<DocID>[A-Z]+-[0-9xX#?]+): (?P<Title>.+)`)
	matches = re.FindStringSubmatch(s)
	if len(matches) > 1 {
		r.DocNumber = matches[1]
		r.Title = strings.TrimSpace(matches[2])
		return
	}

	// Handle `RFC-123 - Some RFC Title` case.
	re = regexp.MustCompile(`(?P<DocID>[A-Z]+-[0-9xX#?]+) - (?P<Title>.+)`)
	matches = re.FindStringSubmatch(s)
	if len(matches) > 1 {
		r.DocNumber = matches[1]
		r.Title = strings.TrimSpace(matches[2])
		return
	}

	// Handle `RFC-123 Some RFC Title` case.
	re = regexp.MustCompile(`(?P<DocID>[A-Z]+-[0-9xX#?]+) (?P<Title>.+)`)
	matches = re.FindStringSubmatch(s)
	if len(matches) > 1 {
		r.DocNumber = matches[1]
		r.Title = strings.TrimSpace(matches[2])
		return
	}

	// Couldn't parse title and doc ID, so setting RFC title to the whole
	// string.
	r.Title = s
}

// parseEmails parses email addresses from a string.
func parseEmails(s string) []string {
	// We need an @ to continue.
	if !strings.Contains(s, "@") {
		return []string{}
	}

	// Sanitize string.
	s = gomoji.RemoveEmojis(s)
	s = strings.TrimSpace(s)
	s = strings.ReplaceAll(s, " ", "")

	// Handle "{a, b, c}@hashicorp.com" case.
	if t, _ := regexp.MatchString("^{.+}@.+$", s); t {
		split := strings.SplitN(s, "@", 2)

		// Get all email prefixes (before the @).
		prefixes := strings.Split(strings.Trim(split[0], "{}"), ",")

		// Get the email domain (after the @).
		domain := split[1]

		// Build results.
		var res []string
		for _, u := range prefixes {
			res = append(res, u+"@"+domain)
		}

		return res
	}

	// Remove any trailing commas before splitting.
	s = strings.TrimRight(s, ",")

	return removeEmptyStrings(strings.Split(s, ","))
}

// parseParagraphWithEmails parses a Google Doc paragraph containing email
// addresses.
func parseParagraphWithEmails(label string, p *docs.Paragraph) []string {
	// Build string containing label and email addresses.
	s := buildLabelAndValueString(label, p)

	// Parse email addresses.
	return parseEmails(s)
}

// parseParagraphWithText parses a Google Doc paragraph containing a text value.
func parseParagraphWithText(label string, p *docs.Paragraph) string {
	// Build string containing label and text value.
	s := buildLabelAndValueString(label, p)

	// If string is "N/A", return an empty string.
	if strings.ToLower(s) == "n/a" {
		return ""
	}

	return s
}

// buildLabelAndValueString builds a string containing a label and value from
// a Google Doc paragraph containing text in the form of `Label: Value`.
func buildLabelAndValueString(label string, p *docs.Paragraph) string {
	var s string
	if p.Elements != nil {
		for _, e := range p.Elements {
			if e.TextRun != nil {
				s += e.TextRun.Content
			} else if e.Person != nil && e.Person.PersonProperties != nil {
				s += e.Person.PersonProperties.Email
			}
		}
	}

	// Trim label.
	s = strings.TrimPrefix(s, fmt.Sprintf("%s: ", label))
	s = strings.TrimPrefix(s, fmt.Sprintf("%ss: ", label)) // Plural
	s = strings.TrimPrefix(s, fmt.Sprintf("%s:", label))   // No space
	s = strings.TrimPrefix(s, fmt.Sprintf("%ss:", label))  // Plural, no space

	s = strings.TrimSpace(s)

	return s
}

// removeEmptyStrings removes any empty string elements from a slice of strings.
func removeEmptyStrings(in []string) []string {
	var out []string
	for _, s := range in {
		if s != "" {
			out = append(out, s)
		}
	}
	return out
}
