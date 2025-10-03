package hashicorpdocs

import (
	"fmt"
	"io"
	"reflect"
	"regexp"
	"strings"
	"time"

	"github.com/araddon/dateparse"
	gw "github.com/hashicorp-forge/hermes/pkg/storage/adapters/google"
	"google.golang.org/api/docs/v1"
	"google.golang.org/api/drive/v3"
)

// FRD contains metadata for documents based off of the HashiCorp FRD template.
type FRD struct {
	BaseDoc `mapstructure:",squash"`

	// PRD is the associated PRD.
	PRD string `json:"prd,omitempty"`

	// PRFAQ is the associated PRFAQ.
	PRFAQ string `json:"prfaq,omitempty"`
}

func (d FRD) GetCustomEditableFields() map[string]CustomDocTypeField {
	return map[string]CustomDocTypeField{
		"prd": {
			DisplayName: "PRD",
			Type:        "STRING",
		},
		"prfaq": {
			DisplayName: "PRDFAQ",
			Type:        "STRING",
		},
	}
}

func (d *FRD) SetCustomEditableFields() {
	d.CustomEditableFields = d.GetCustomEditableFields()
}

// MissingFields returns the missing fields of the doc struct.
func (d FRD) MissingFields() []string {
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

// NewFRD parses a Google Drive file based on the HashiCorp FRD template and
// returns the resulting FRD struct.
func NewFRD(f *drive.File, s *gw.Service, allFolders []string) (*FRD, error) {
	r := &FRD{
		BaseDoc: BaseDoc{
			ObjectID:      f.Id,
			Title:         f.Name,
			DocType:       "FRD",
			ThumbnailLink: f.ThumbnailLink,
		},
	}

	// Parse title and doc number.
	r.parseFRDTitle(f.Name)

	// Convert modified time to Unix time so it can be sorted in Algolia.
	mt, err := time.Parse(time.RFC3339, f.ModifiedTime)
	if err != nil {
		return nil, fmt.Errorf("error parsing modified time: %w: id=\"%s\"",
			err, f.Id)
	}
	r.ModifiedTime = mt.Unix()

	doc, err := s.Docs.Documents.Get(f.Id).Do()
	if err != nil {
		return nil, fmt.Errorf("error getting doc: %w: id=\"%s\"", err, f.Id)
	}

	// Assume the name of the parent folder is the FRD Product.
	parent, err := s.Drive.Files.Get(f.Parents[0]).
		SupportsAllDrives(true).Fields("name").Do()
	if err != nil {
		return nil, fmt.Errorf("error getting parent folder file: %w", err)
	}
	r.Product = parent.Name

	r.parseFRDSummary(doc.Body)

	// Parse FRD header for metadata.
	r.parseFRDHeader(doc)

	// Parse all linked documents.
	// TODO: use allFolders parameter and enable this.
	// r.LinkedDocs = gw.GetLinkURLs(doc.Body)

	// Get owner photos by searching Google Workspace directory for owner strings.
	for i, o := range r.Owners {
		// Add empty string as a default. We will replace this with the actual photo
		// URL if we can find it.
		r.OwnerPhotos = append(r.OwnerPhotos, "")

		resp, err := s.People.SearchDirectoryPeople().Query(o).
			ReadMask("photos").
			Sources("DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE").
			Do()
		if err != nil {
			return nil, fmt.Errorf(
				"error searching directory for person: %w: owner=\"%s\"",
				err, o)
		}

		if len(resp.People) > 0 {
			if len(resp.People[0].Photos) > 0 {
				// Replace empty string default with actual value.
				r.OwnerPhotos[i] = resp.People[0].Photos[0].Url
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

// parseFRDHeader parses a HashiCorp FRD header for metadata.
func (r *FRD) parseFRDHeader(d *docs.Document) {
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
						r.parseFRDContributors(p)

					case strings.HasPrefix(label, "Created"):
						r.parseFRDCreated(p)

					case strings.HasPrefix(label, "Owner:") ||
						strings.HasPrefix(label, "Owners:"):
						r.parseFRDOwners(p)

					case strings.HasPrefix(label, "PRD"):
						r.parseFRDPRD(p)

					case strings.HasPrefix(label, "PRFAQ"):
						r.parseFRDPRFAQ(p)

					case strings.HasPrefix(label, "Status:"):
						r.parseFRDStatus(p)
					}
				}
			}
		})
	}
}

// parseFRDContributors parses the FRD Contributors from a Google Docs paragraph.
func (r *FRD) parseFRDContributors(p *docs.Paragraph) {
	r.Contributors = parseParagraphWithEmails("Contributor", p)
}

// parseFRDCreated parses the FRD Created date from a Google Docs paragraph.
func (r *FRD) parseFRDCreated(p *docs.Paragraph) error {
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

// parseFRDOwners parses FRD Owners from a Google Docs paragraph.
func (r *FRD) parseFRDOwners(p *docs.Paragraph) {
	r.Owners = parseParagraphWithEmails("Owner", p)
}

// parseFRDRFC parses the FRD PRD from a Google Docs paragraph.
func (r *FRD) parseFRDPRD(p *docs.Paragraph) {
	r.PRD = parseParagraphWithText("PRD", p)

	// Text from the FRD template may be left in the doc.
	if r.PRFAQ == "Link to PRD when created" {
		r.PRD = ""
	}
}

// parseFRDRFC parses the FRD PRFAQ from a Google Docs paragraph.
func (r *FRD) parseFRDPRFAQ(p *docs.Paragraph) {
	r.PRFAQ = parseParagraphWithText("PRFAQ", p)

	// Text from the FRD template may be left in the doc.
	if r.PRFAQ == "Link to PRFAQ when created" {
		r.PRFAQ = ""
	}
}

// parseFRDStatus parses the FRD Status from a Google Docs paragraph.
func (r *FRD) parseFRDStatus(p *docs.Paragraph) {
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

// parseFRDSummary parses the FRD Summary from a Google Docs Body.
func (r *FRD) parseFRDSummary(b *docs.Body) {
	elems := b.Content

	for _, e := range elems {
		if e.Paragraph != nil {
			// Summary paragraph in the FRD template will have at least 2 elements.
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

// parseFRDTitle parses FRD title and document number from a string (which
// should be the name of the Google Drive file).
func (r *FRD) parseFRDTitle(s string) {
	// Handle `[FRD] CSL-123: Some FRD Title` case.
	// Also handles different types of "[FRD]" identifiers like "[Meta FRD]",
	// "[Mini-FRD]", etc.
	re := regexp.MustCompile(`\[.*FRD\] (?P<DocID>[A-Z]+-[0-9xX#?]+): (?P<Title>.+)`)
	matches := re.FindStringSubmatch(s)
	if len(matches) > 1 {
		r.DocNumber = matches[1]
		r.Title = strings.TrimSpace(matches[2])
		return
	}

	// Handle `[FRD] Some FRD Title` case.
	// Also handles different types of "[FRD]" identifiers like "[Meta FRD]",
	// "[Mini-FRD]", etc.
	re = regexp.MustCompile(`\[.*FRD\] (?P<Title>.+)`)
	matches = re.FindStringSubmatch(s)
	if len(matches) > 1 {
		r.Title = strings.TrimSpace(matches[1])
		return
	}

	// Handle `[FRD]Some FRD Title` case.
	// Also handles different types of "[FRD]" identifiers like "[Meta FRD]",
	// "[Mini-FRD]", etc.
	re = regexp.MustCompile(`\[.*FRD\](?P<Title>.+)`)
	matches = re.FindStringSubmatch(s)
	if len(matches) > 1 {
		r.Title = strings.TrimSpace(matches[1])
		return
	}

	// Handle `FRD - Some FRD Title` case.
	// Also handles different types of "[FRD]" identifiers like "[Meta FRD]",
	// "[Mini-FRD]", etc.
	re = regexp.MustCompile(`.*FRD - (?P<Title>.+)`)
	matches = re.FindStringSubmatch(s)
	if len(matches) > 1 {
		r.Title = strings.TrimSpace(matches[1])
		return
	}

	// Couldn't parse title and doc ID, so setting FRD title to the whole
	// string.
	r.Title = s
}
