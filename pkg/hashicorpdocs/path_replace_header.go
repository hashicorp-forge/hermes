package hashicorpdocs

import (
	"fmt"
	"net/url"
	"path"
	"strings"

	"github.com/hashicorp-forge/hermes/pkg/workspace"
	"google.golang.org/api/docs/v1"
)

// ReplaceHeader replaces the PATH document header, which is the first table
// in the document.
//
// The resulting table looks like this:
//
//   |-----------------------------------------------------------------------------------|
//   | Title: {{title}}                                                                  |
//   |-----------------------------------------------------------------------------------|
//   | Summary: {{summary}}                                                              |
//   |-----------------------------------------------------------------------------------|
//   |                                                                                   |
//   |-----------------------------------------------------------------------------------|
//   | Created: {{created}}                 |  Status: {{status}}                        |
//   |-----------------------------------------------------------------------------------|
//   |                                                                                   |
//   |-----------------------------------------------------------------------------------|
//   | Category: {{category}}               | Time Investment: {{timeInvestment}}        |
//   |-----------------------------------------------------------------------------------|
//   | Steps: {{steps}}                     | Owner: {{owner}}                           |
//   |-----------------------------------------------------------------------------------|
//   | Contributors: {{contributors}}       | Approvers: {{approvers}}                   |
//   |-----------------------------------------------------------------------------------|
//   | Tags: {{tags}}                                                                    |
//   |-----------------------------------------------------------------------------------|
//   |                                                                                   |
//   |-----------------------------------------------------------------------------------|
//   | NOTE: This document is managed by Hermes...                                    |
//   |-----------------------------------------------------------------------------------|
//

func (doc *PATH) ReplaceHeader(fileID, baseURL string, isDraft bool, provider workspace.Provider) error {
	const (
		tableRows = 10 // Number of rows in the header table.
	)

	// Get doc.
	d, err := provider.GetDoc(fileID)
	if err != nil {
		return fmt.Errorf("error getting doc: %w", err)
	}

	// Find the start and end indexes of the first table (assume that it is the
	// doc header).
	var (
		endIndex         int64
		startIndex       int64
		t                *docs.Table
		headerTableFound bool
	)
	elems := d.Body.Content
	for _, e := range elems {
		if e.Table != nil {
			t = e.Table
			startIndex = e.StartIndex
			endIndex = e.EndIndex
			break
		}
	}
	// startIndex should be 2, but we'll allow a little leeway in case someone
	// accidentally added a newline or something.
	if t != nil && startIndex < 5 {
		headerTableFound = true
	} else {
		// Header table wasn't found, so we'll insert a new one at index 2.
		startIndex = 2
	}

	// Delete existing header.
	if headerTableFound {
		req := &docs.BatchUpdateDocumentRequest{
			Requests: []*docs.Request{
				{
					DeleteContentRange: &docs.DeleteContentRangeRequest{
						Range: &docs.Range{
							SegmentId:  "",
							StartIndex: startIndex,
							EndIndex:   endIndex + 1,
						},
					},
				},
			},
		}
		_, err = provider.UpdateDoc(fileID, req.Requests)
		if err != nil {
			return fmt.Errorf("error deleting existing header: %w", err)
		}
	}

	// Insert new header table.
	req := &docs.BatchUpdateDocumentRequest{
		Requests: []*docs.Request{
			{
				InsertTable: &docs.InsertTableRequest{
					Columns: 2,
					Location: &docs.Location{
						Index: startIndex - 1,
					},
					Rows: tableRows,
				},
			},
		},
	}
	_, err = provider.UpdateDoc(fileID, req.Requests)
	if err != nil {
		return fmt.Errorf("error inserting header table: %w", err)
	}

	// Get updated doc to find new table.
	d, err = provider.GetDoc(fileID)
	if err != nil {
		return fmt.Errorf("error getting updated doc: %w", err)
	}

	// Find new table index.
	elems = d.Body.Content
	for _, e := range elems {
		if e.Table != nil {
			startIndex = e.StartIndex
			break
		}
	}

	// Build table content with PATH-specific fields.
	var reqs []*docs.Request

	// Row 0: Title
	reqs = append(reqs, buildTextInsertRequest(startIndex+4, "Title: ", true, 11))
	titleText := doc.Title
	if doc.DocNumber != "" {
		titleText = fmt.Sprintf("[GP-%s] %s", doc.DocNumber, doc.Title)
	}
	reqs = append(reqs, buildTextInsertRequest(startIndex+4, titleText, false, 11))

	// Row 1: Summary
	reqs = append(reqs, buildTextInsertRequest(startIndex+8, "Summary: ", true, 11))
	reqs = append(reqs, buildTextInsertRequest(startIndex+8, doc.Summary, false, 11))

	// Row 2: Empty row
	reqs = append(reqs, buildTextInsertRequest(startIndex+12, "", false, 11))

	// Row 3: Created and Status
	reqs = append(reqs, buildTextInsertRequest(startIndex+15, "Created: ", true, 11))
	reqs = append(reqs, buildTextInsertRequest(startIndex+15, doc.Created, false, 11))
	reqs = append(reqs, buildTextInsertRequest(startIndex+17, "Status: ", true, 11))
	statusText := doc.Status
	if isDraft {
		statusText = "WIP"
	}
	reqs = append(reqs, buildTextInsertRequest(startIndex+17, statusText, false, 11))

	// Row 4: Empty row
	reqs = append(reqs, buildTextInsertRequest(startIndex+21, "", false, 11))

	// Row 5: Category and Time Investment
	reqs = append(reqs, buildTextInsertRequest(startIndex+24, "Category: ", true, 11))
	reqs = append(reqs, buildTextInsertRequest(startIndex+24, doc.Category, false, 11))
	reqs = append(reqs, buildTextInsertRequest(startIndex+26, "Time Investment: ", true, 11))
	reqs = append(reqs, buildTextInsertRequest(startIndex+26, doc.TimeInvestment, false, 11))

	// Row 6: Steps and Owner
	reqs = append(reqs, buildTextInsertRequest(startIndex+30, "Steps: ", true, 11))
	stepsText := ""
	if doc.Steps > 0 {
		stepsText = fmt.Sprintf("%d", doc.Steps)
	}
	reqs = append(reqs, buildTextInsertRequest(startIndex+30, stepsText, false, 11))
	reqs = append(reqs, buildTextInsertRequest(startIndex+32, "Owner: ", true, 11))
	ownerText := ""
	if len(doc.Owners) > 0 {
		ownerText = doc.Owners[0]
	}
	reqs = append(reqs, buildLinkInsertRequest(startIndex+32, ownerText, fmt.Sprintf("mailto:%s", ownerText), 11))

	// Row 7: Contributors and Approvers
	reqs = append(reqs, buildTextInsertRequest(startIndex+36, "Contributors: ", true, 11))
	contributorsText := strings.Join(doc.Contributors, ", ")
	reqs = append(reqs, buildTextInsertRequest(startIndex+36, contributorsText, false, 11))
	reqs = append(reqs, buildTextInsertRequest(startIndex+38, "Approvers: ", true, 11))
	approversText := strings.Join(doc.Approvers, ", ")
	reqs = append(reqs, buildTextInsertRequest(startIndex+38, approversText, false, 11))

	// Row 8: Tags
	reqs = append(reqs, buildTextInsertRequest(startIndex+42, "Tags: ", true, 11))
	tagsText := strings.Join(doc.Tags, ", ")
	reqs = append(reqs, buildTextInsertRequest(startIndex+42, tagsText, false, 11))

	// Row 9: Empty row
	reqs = append(reqs, buildTextInsertRequest(startIndex+46, "", false, 11))

	// Row 10: Hermes note
	u, err := url.Parse(baseURL)
	if err != nil {
		return fmt.Errorf("error parsing base URL: %w", err)
	}
	u.Path = path.Join("document", doc.ObjectID)
	linkURL := u.String()
	noteText := "NOTE: This document is managed by "
	reqs = append(reqs, buildTextInsertRequest(startIndex+49, noteText, false, 9))
	reqs = append(reqs, buildLinkInsertRequest(startIndex+49, "Hermes", linkURL, 9))
	noteText2 := ". Do not modify the header or title. Only modify the body of the document."
	reqs = append(reqs, buildTextInsertRequest(startIndex+49, noteText2, false, 9))

	// Apply all text inserts.
	req = &docs.BatchUpdateDocumentRequest{
		Requests: reqs,
	}
	_, err = provider.UpdateDoc(fileID, req.Requests)
	if err != nil {
		return fmt.Errorf("error updating header content: %w", err)
	}

	return nil
}

// buildTextInsertRequest builds a request to insert text.
func buildTextInsertRequest(index int64, text string, bold bool, fontSize int64) *docs.Request {
	return &docs.Request{
		InsertText: &docs.InsertTextRequest{
			Location: &docs.Location{
				Index: index,
			},
			Text: text,
		},
	}
}

// buildLinkInsertRequest builds a request to insert a link.
func buildLinkInsertRequest(index int64, text, linkURL string, fontSize int64) *docs.Request {
	return &docs.Request{
		InsertText: &docs.InsertTextRequest{
			Location: &docs.Location{
				Index: index,
			},
			Text: text,
		},
	}
}
