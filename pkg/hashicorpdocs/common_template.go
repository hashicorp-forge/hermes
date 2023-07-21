package hashicorpdocs

import (
	"fmt"
	"io"
	"reflect"
	"regexp"
	"strings"
	"time"

	"github.com/araddon/dateparse"
	gw "github.com/hashicorp-forge/hermes/pkg/googleworkspace"
	"google.golang.org/api/docs/v1"
	"google.golang.org/api/drive/v3"
)

// COMMONTEMPLATE contains metadata for documents based off of the HashiCorp COMMONTEMPLATE template.
type COMMONTEMPLATE struct {
	BaseDoc `mapstructure:",squash"`

	// RFC is the associated RFC.
	RFC string `json:"rfc,omitempty"`

	// Stakeholders is a slice of email address strings for document stakeholders.
	Stakeholders []string `json:"stakeholders,omitempty"`
}

func (d COMMONTEMPLATE) GetCustomEditableFields() map[string]CustomDocTypeField {
	return map[string]CustomDocTypeField{
		"rfc": {
			DisplayName: "RFC",
			Type:        "STRING",
		},
	}
}

func (d *COMMONTEMPLATE) SetCustomEditableFields() {
	d.CustomEditableFields = d.GetCustomEditableFields()
}

// MissingFields returns the missing fields of the doc struct.
func (d COMMONTEMPLATE) MissingFields() []string {
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

// NewCOMMONTEMPLATE parses a Google Drive file based on the HashiCorp COMMONTEMPLATE template and
// returns the resulting COMMONTEMPLATE struct.
func NewCOMMONTEMPLATE(f *drive.File, s *gw.Service, allFolders []string) (*COMMONTEMPLATE, error) {
	r := &COMMONTEMPLATE{
		BaseDoc: BaseDoc{
			ObjectID:      f.Id,
			Title:         f.Name,
			DocType:       "COMMONTEMPLATE",
			ThumbnailLink: f.ThumbnailLink,
		},
	}

	// Parse title and doc number.
	r.parseCOMMONTEMPLATETitle(f.Name)

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

	// Assume the name of the parent folder is the COMMONTEMPLATE Product.
	parent, err := s.Drive.Files.Get(f.Parents[0]).
		SupportsAllDrives(true).Fields("name").Do()
	if err != nil {
		return nil, fmt.Errorf("error getting parent folder file: %w", err)
	}
	r.Product = parent.Name

	r.parseCOMMONTEMPLATESummary(doc.Body)

	// Parse COMMONTEMPLATE header for metadata.
	r.parseCOMMONTEMPLATEHeader(doc)

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

// parseCOMMONTEMPLATEHeader parses a HashiCorp COMMONTEMPLATE header for metadata.
func (r *COMMONTEMPLATE) parseCOMMONTEMPLATEHeader(d *docs.Document) {
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
						r.parseCOMMONTEMPLATEContributors(p)

					case strings.HasPrefix(label, "Created"):
						r.parseCOMMONTEMPLATECreated(p)

					case strings.HasPrefix(label, "Owner:") ||
						strings.HasPrefix(label, "Owners:"):
						r.parseCOMMONTEMPLATEOwners(p)

					case strings.HasPrefix(label, "RFC"):
						r.parseCOMMONTEMPLATERFC(p)

					case strings.HasPrefix(label, "Status:"):
						r.parseCOMMONTEMPLATEStatus(p)
					}
				}
			}
		})
	}
}

// parseCOMMONTEMPLATEContributors parses the COMMONTEMPLATE Contributors from a Google Docs paragraph.
func (r *COMMONTEMPLATE) parseCOMMONTEMPLATEContributors(p *docs.Paragraph) {
	r.Contributors = parseParagraphWithEmails("Contributor", p)
}

// parseCOMMONTEMPLATECreated parses the COMMONTEMPLATE Created date from a Google Docs paragraph.
func (r *COMMONTEMPLATE) parseCOMMONTEMPLATECreated(p *docs.Paragraph) error {
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

// parseCOMMONTEMPLATEOwners parses COMMONTEMPLATE Owners from a Google Docs paragraph.
func (r *COMMONTEMPLATE) parseCOMMONTEMPLATEOwners(p *docs.Paragraph) {
	r.Owners = parseParagraphWithEmails("Owner", p)
}

// parseCOMMONTEMPLATERFC parses the COMMONTEMPLATE RFC from a Google Docs paragraph.
func (r *COMMONTEMPLATE) parseCOMMONTEMPLATERFC(p *docs.Paragraph) {
	r.RFC = parseParagraphWithText("RFC", p)

	// Text from the COMMONTEMPLATE template may be left in the doc.
	if r.RFC == "Link to RFC when created" {
		r.RFC = ""
	}
}

// parseCOMMONTEMPLATEStatus parses the COMMONTEMPLATE Status from a Google Docs paragraph.
func (r *COMMONTEMPLATE) parseCOMMONTEMPLATEStatus(p *docs.Paragraph) {
	label := p.Elements[0].TextRun.Content
	var status string

	// Sometimes "Status: Draft" is collected together as one text element.
	if label == "Status: Draft" && p.Elements[0].TextRun.TextStyle.Bold {
		status = "Draft"
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

// parseCOMMONTEMPLATESummary parses the COMMONTEMPLATE Summary from a Google Docs Body.
func (r *COMMONTEMPLATE) parseCOMMONTEMPLATESummary(b *docs.Body) {
	elems := b.Content

	for _, e := range elems {
		if e.Paragraph != nil {
			// Summary paragraph in the COMMONTEMPLATE template will have at least 2 elements.
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

// parseCOMMONTEMPLATETitle parses COMMONTEMPLATE title and document number from a string (which
// should be the name of the Google Drive file).
func (r *COMMONTEMPLATE) parseCOMMONTEMPLATETitle(s string) {
	// Handle `[COMMONTEMPLATE] CSL-123: Some COMMONTEMPLATE Title` case.
	// Also handles different types of "[COMMONTEMPLATE]" identifiers like "[Meta COMMONTEMPLATE]",
	// "[Mini-COMMONTEMPLATE]", etc.
	re := regexp.MustCompile(`\[.*COMMONTEMPLATE\] (?P<DocID>[A-Z]+-[0-9xX#?]+): (?P<Title>.+)`)
	matches := re.FindStringSubmatch(s)
	if len(matches) > 1 {
		r.DocNumber = matches[1]
		r.Title = strings.TrimSpace(matches[2])
		return
	}

	// Handle `[COMMONTEMPLATE] Some COMMONTEMPLATE Title` case.
	// Also handles different types of "[COMMONTEMPLATE]" identifiers like "[Meta COMMONTEMPLATE]",
	// "[Mini-COMMONTEMPLATE]", etc.
	re = regexp.MustCompile(`\[.*COMMONTEMPLATE\] (?P<Title>.+)`)
	matches = re.FindStringSubmatch(s)
	if len(matches) > 1 {
		r.Title = strings.TrimSpace(matches[1])
		return
	}

	// Handle `[COMMONTEMPLATE]Some COMMONTEMPLATE Title` case.
	// Also handles different types of "[COMMONTEMPLATE]" identifiers like "[Meta COMMONTEMPLATE]",
	// "[Mini-COMMONTEMPLATE]", etc.
	re = regexp.MustCompile(`\[.*COMMONTEMPLATE\](?P<Title>.+)`)
	matches = re.FindStringSubmatch(s)
	if len(matches) > 1 {
		r.Title = strings.TrimSpace(matches[1])
		return
	}

	// Handle `COMMONTEMPLATE - Some COMMONTEMPLATE Title` case.
	// Also handles different types of "[COMMONTEMPLATE]" identifiers like "[Meta COMMONTEMPLATE]",
	// "[Mini-COMMONTEMPLATE]", etc.
	re = regexp.MustCompile(`.*COMMONTEMPLATE - (?P<Title>.+)`)
	matches = re.FindStringSubmatch(s)
	if len(matches) > 1 {
		r.Title = strings.TrimSpace(matches[1])
		return
	}

	// Couldn't parse title and doc ID, so setting COMMONTEMPLATE title to the whole
	// string.
	r.Title = s
}
