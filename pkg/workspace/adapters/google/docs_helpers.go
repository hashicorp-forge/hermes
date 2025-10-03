package google

import (
	"fmt"

	"github.com/cenkalti/backoff/v4"
	"google.golang.org/api/docs/v1"
)

// GetDoc gets a Google Doc.
func (s *Service) GetDoc(id string) (*docs.Document, error) {
	var (
		d   *docs.Document
		err error
	)

	op := func() error {
		d, err = s.Docs.Documents.Get(id).Do()
		if err != nil {
			return fmt.Errorf("error getting document: %w", err)
		}

		return nil
	}

	boErr := backoff.RetryNotify(op, defaultBackoff(), backoffNotify)
	if boErr != nil {
		return nil, boErr
	}

	return d, nil
}

// GetLinkURLs returns all link URLs in a Google Doc Body.
func GetLinkURLs(b *docs.Body) []string {
	var urls []string
	structelems := b.Content

	for _, elem := range structelems {
		if para := elem.Paragraph; para != nil {
			if elems := para.Elements; elems != nil {
				for _, e := range elems {
					if tr := e.TextRun; tr != nil {
						if ts := tr.TextStyle; ts != nil {
							if link := ts.Link; link != nil {
								urls = append(urls, link.Url)
							}
						}
					}
				}
			}
		}
	}

	return urls
}

// GetTables returns all tables in a Google Doc Body.
func GetTables(b *docs.Body) []*docs.Table {
	var tables []*docs.Table
	elems := b.Content

	for _, e := range elems {
		if e.Table != nil {
			tables = append(tables, e.Table)
		}
	}

	return tables
}

// ReplaceText replaces text in a Google Doc. Provide a map of replacement tags
// (denoted as "{{tag}}" in the doc) to replacement text as the second
// parameter.
func (s *Service) ReplaceText(id string, r map[string]string) error {
	// Initialize request.
	req := &docs.BatchUpdateDocumentRequest{
		Requests: []*docs.Request{},
	}

	// Build text replacement requests.
	for k, v := range r {
		req.Requests = append(req.Requests, &docs.Request{
			ReplaceAllText: &docs.ReplaceAllTextRequest{
				ContainsText: &docs.SubstringMatchCriteria{
					MatchCase: true,
					Text:      fmt.Sprintf("{{%s}}", k),
				},
				ReplaceText: v,
			}})
	}

	_, err := s.Docs.Documents.BatchUpdate(id, req).
		Do()
	if err != nil {
		return fmt.Errorf("error executing document batch update: %w", err)
	}
	return nil
}

// VisitAllTableParagraphs visits all paragraphs in a Google Doc table, calling
// fn for each.
func VisitAllTableParagraphs(t *docs.Table, fn func(p *docs.Paragraph)) {
	for _, row := range t.TableRows {
		for _, cell := range row.TableCells {
			for _, content := range cell.Content {
				if para := content.Paragraph; para != nil {
					fn(para)
				}
			}
		}
	}
}
