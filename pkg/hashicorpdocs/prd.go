package hashicorpdocs

import (
	"fmt"
	"io"
	"reflect"
	"regexp"
	"strings"
	"time"

	"github.com/araddon/dateparse"
	gw "github.com/hashicorp-forge/hermes/pkg/workspace/adapters/google"
	"google.golang.org/api/docs/v1"
	"google.golang.org/api/drive/v3"
)

// PRD contains metadata for documents based off of the HashiCorp PRD template.
type PRD struct {
	BaseDoc `mapstructure:",squash"`

	// RFC is the associated RFC.
	RFC string `json:"rfc,omitempty"`

	// Stakeholders is a slice of email address strings for document stakeholders.
	Stakeholders []string `json:"stakeholders,omitempty"`
}

func (d PRD) GetCustomEditableFields() map[string]CustomDocTypeField {
	return map[string]CustomDocTypeField{
		"rfc": {
			DisplayName: "RFC",
			Type:        "STRING",
		},
	}
}

func (d *PRD) SetCustomEditableFields() {
	d.CustomEditableFields = d.GetCustomEditableFields()
}

// MissingFields returns the missing fields of the doc struct.
func (d PRD) MissingFields() []string {
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

// NewPRD parses a Google Drive file based on the HashiCorp PRD template and
// returns the resulting PRD struct.
func NewPRD(f *drive.File, s *gw.Service, allFolders []string) (*PRD, error) {
	r := &PRD{
		BaseDoc: BaseDoc{
			ObjectID:      f.Id,
			Title:         f.Name,
			DocType:       "PRD",
			ThumbnailLink: f.ThumbnailLink,
		},
	}

	// Parse title and doc number.
	r.parsePRDTitle(f.Name)

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

	// Assume the name of the parent folder is the PRD Product.
	parent, err := s.Drive.Files.Get(f.Parents[0]).
		SupportsAllDrives(true).Fields("name").Do()
	if err != nil {
		return nil, fmt.Errorf("error getting parent folder file: %w", err)
	}
	r.Product = parent.Name

	r.parsePRDSummary(doc.Body)

	// Parse PRD header for metadata.
	r.parsePRDHeader(doc)

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

// parsePRDHeader parses a HashiCorp PRD header for metadata.
func (r *PRD) parsePRDHeader(d *docs.Document) {
	tables := gw.GetTables(d.Body)

	for _, t := range tables {
		gw.VisitAllTableParagraphs(t, func(p *docs.Paragraph) {
			if len(p.Elements) > 0 {
				if p.Elements[0].TextRun != nil {

					// Get label of table cell.
					label := p.Elements[0].TextRun.Content

					switch {
					case strings.HasPrefix(label, "Contributor:") ||
						strings.HasPrefix(label, "Contributors:"):
						r.parsePRDContributors(p)

					case strings.HasPrefix(label, "Created"):
						r.parsePRDCreated(p)

					case strings.HasPrefix(label, "Owner:") ||
						strings.HasPrefix(label, "Owners:"):
						r.parsePRDOwners(p)

					case strings.HasPrefix(label, "RFC"):
						r.parsePRDRFC(p)

					case strings.HasPrefix(label, "Status:"):
						r.parsePRDStatus(p)
					}
				}
			}
		})
	}
}

// parsePRDContributors parses the PRD Contributors from a Google Docs paragraph.
func (r *PRD) parsePRDContributors(p *docs.Paragraph) {
	r.Contributors = parseParagraphWithEmails("Contributor", p)
}

// parsePRDCreated parses the PRD Created date from a Google Docs paragraph.
func (r *PRD) parsePRDCreated(p *docs.Paragraph) error {
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

// parsePRDOwners parses PRD Owners from a Google Docs paragraph.
func (r *PRD) parsePRDOwners(p *docs.Paragraph) {
	r.Owners = parseParagraphWithEmails("Owner", p)
}

// parsePRDRFC parses the PRD RFC from a Google Docs paragraph.
func (r *PRD) parsePRDRFC(p *docs.Paragraph) {
	r.RFC = parseParagraphWithText("RFC", p)

	// Text from the PRD template may be left in the doc.
	if r.RFC == "Link to RFC when created" {
		r.RFC = ""
	}
}

// parsePRDStatus parses the PRD Status from a Google Docs paragraph.
func (r *PRD) parsePRDStatus(p *docs.Paragraph) {
	label := p.Elements[0].TextRun.Content
	var status string

	// Sometimes "Status: WIP" is collected together as one text element.
	if label == "Status: WIP" && p.Elements[0].TextRun.TextStyle.Bold {
		status = "WIP"
	} else {
		for i, e := range p.Elements {
			if i > 0 && e.TextRun.TextStyle.Bold {
				status = e.TextRun.Content
			}
		}
	}

	status = strings.TrimSpace(status)
	r.Status = status
}

// parsePRDSummary parses the PRD Summary from a Google Docs Body.
func (r *PRD) parsePRDSummary(b *docs.Body) {
	elems := b.Content

	for _, e := range elems {
		if e.Paragraph != nil {
			// Summary paragraph in the PRD template will have at least 2 elements.
			if len(e.Paragraph.Elements) > 1 {
				if e.Paragraph.Elements[0].TextRun != nil {
					if e.Paragraph.Elements[0].TextRun.Content == "Summary:" {
						// We found the summary paragraph and the rest of the elements
						// should be the summary value.
						var s string
						for i, ee := range e.Paragraph.Elements {
							if i > 0 {
								s += ee.TextRun.Content
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

// parsePRDTitle parses PRD title and document number from a string (which
// should be the name of the Google Drive file).
func (r *PRD) parsePRDTitle(s string) {
	// Handle `[PRD] CSL-123: Some PRD Title` case.
	// Also handles different types of "[PRD]" identifiers like "[Meta PRD]",
	// "[Mini-PRD]", etc.
	re := regexp.MustCompile(`\[.*PRD\] (?P<DocID>[A-Z]+-[0-9xX#?]+): (?P<Title>.+)`)
	matches := re.FindStringSubmatch(s)
	if len(matches) > 1 {
		r.DocNumber = matches[1]
		r.Title = strings.TrimSpace(matches[2])
		return
	}

	// Handle `[PRD] Some PRD Title` case.
	// Also handles different types of "[PRD]" identifiers like "[Meta PRD]",
	// "[Mini-PRD]", etc.
	re = regexp.MustCompile(`\[.*PRD\] (?P<Title>.+)`)
	matches = re.FindStringSubmatch(s)
	if len(matches) > 1 {
		r.Title = strings.TrimSpace(matches[1])
		return
	}

	// Handle `[PRD]Some PRD Title` case.
	// Also handles different types of "[PRD]" identifiers like "[Meta PRD]",
	// "[Mini-PRD]", etc.
	re = regexp.MustCompile(`\[.*PRD\](?P<Title>.+)`)
	matches = re.FindStringSubmatch(s)
	if len(matches) > 1 {
		r.Title = strings.TrimSpace(matches[1])
		return
	}

	// Handle `PRD - Some PRD Title` case.
	// Also handles different types of "[PRD]" identifiers like "[Meta PRD]",
	// "[Mini-PRD]", etc.
	re = regexp.MustCompile(`.*PRD - (?P<Title>.+)`)
	matches = re.FindStringSubmatch(s)
	if len(matches) > 1 {
		r.Title = strings.TrimSpace(matches[1])
		return
	}

	// Couldn't parse title and doc ID, so setting PRD title to the whole
	// string.
	r.Title = s
}
