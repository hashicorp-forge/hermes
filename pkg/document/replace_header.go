package document

import (
	"fmt"
	"math"
	"net/url"
	"path"
	"reflect"
	"strings"
	"unicode/utf8"

	"github.com/hashicorp-forge/hermes/internal/helpers"
	gw "github.com/hashicorp-forge/hermes/pkg/storage/adapters/google"
	"google.golang.org/api/docs/v1"
)

// ReplaceHeader replaces the document header, which is assumed to be the first
// table in the document.
//
// The resulting table looks like this:
//
//   |-----------------------------------------------------------------------------|
//   | Title: {{title}}                                                            |
//   |-----------------------------------------------------------------------------|
//   | Summary: {{summary}}                                                        |
//   |-----------------------------------------------------------------------------|
//   |                                                                             |
//   |-----------------------------------------------------------------------------|
//   | Created: {{created}}                 |  Status: {{status}}                  |
//   |-----------------------------------------------------------------------------|
//   |                                                                             |
//   |-----------------------------------------------------------------------------|
//   | Product: {{product}}                 | Owner: {{owner}}                     |
//   |-----------------------------------------------------------------------------|
//   | Contributors: {{contributors}}       | Approvers: {{approvers}}             |
//   |-----------------------------------------------------------------------------|
//   | Custom field: {{custom_field_value}} | Custom field: {{custom_field_value}} |
//   |-----------------------------------------------------------------------------|
//   | ...                                  | ...                                  |
//   |-----------------------------------------------------------------------------|
//   |                                                                             |
//   |-----------------------------------------------------------------------------|
//   | NOTE: This document is managed by Hermes...                                 |
//   |-----------------------------------------------------------------------------|

func (doc *Document) ReplaceHeader(
	baseURL string, isDraft bool, s *gw.Service) error {

	// Get doc.
	d, err := s.GetDoc(doc.ObjectID)
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
		_, err = s.Docs.Documents.BatchUpdate(doc.ObjectID, req).Do()
		if err != nil {
			return fmt.Errorf("error deleting existing header: %w", err)
		}
	}

	// Calculate number of rows in the header table.
	// The number of custom field rows is the number of custom fields divided by
	// two and rounded up to the nearest integer.
	customFieldRows := math.Ceil(float64(len(doc.CustomFields)) / float64(2))
	tableRows := 9 + int64(customFieldRows)

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
	_, err = s.Docs.Documents.BatchUpdate(doc.ObjectID, req).Do()
	if err != nil {
		return fmt.Errorf("error inserting header table: %w", err)
	}

	// Get doc again after inserting the header table.
	d, err = s.GetDoc(doc.ObjectID)
	if err != nil {
		return fmt.Errorf("error getting doc after inserting header table: %w", err)
	}

	// Find new table index.
	elems = d.Body.Content
	for _, e := range elems {
		if e.Table != nil {
			startIndex = e.StartIndex
			break
		}
	}

	// Apply formatting to the table.
	req = &docs.BatchUpdateDocumentRequest{
		Requests: []*docs.Request{
			{
				// Remove table borders (by setting width to 0 and setting color to
				// white as a backup), and remove padding (by setting to 0).
				UpdateTableCellStyle: &docs.UpdateTableCellStyleRequest{
					Fields: "borderBottom,borderLeft,borderRight,borderTop,paddingBottom,paddingLeft,paddingRight,paddingTop",
					TableCellStyle: &docs.TableCellStyle{
						BorderBottom: &docs.TableCellBorder{
							Color: &docs.OptionalColor{
								Color: &docs.Color{
									RgbColor: &docs.RgbColor{
										Blue:  1.0,
										Green: 1.0,
										Red:   1.0,
									},
								},
							},
							DashStyle: "SOLID",
							Width: &docs.Dimension{
								Magnitude: 0,
								Unit:      "PT",
							},
						},
						BorderLeft: &docs.TableCellBorder{
							Color: &docs.OptionalColor{
								Color: &docs.Color{
									RgbColor: &docs.RgbColor{
										Blue:  1.0,
										Green: 1.0,
										Red:   1.0,
									},
								},
							},
							DashStyle: "SOLID",
							Width: &docs.Dimension{
								Magnitude: 0,
								Unit:      "PT",
							},
						},
						BorderRight: &docs.TableCellBorder{
							Color: &docs.OptionalColor{
								Color: &docs.Color{
									RgbColor: &docs.RgbColor{
										Blue:  1.0,
										Green: 1.0,
										Red:   1.0,
									},
								},
							},
							DashStyle: "SOLID",
							Width: &docs.Dimension{
								Magnitude: 0,
								Unit:      "PT",
							},
						},
						BorderTop: &docs.TableCellBorder{
							Color: &docs.OptionalColor{
								Color: &docs.Color{
									RgbColor: &docs.RgbColor{
										Blue:  1.0,
										Green: 1.0,
										Red:   1.0,
									},
								},
							},
							DashStyle: "SOLID",
							Width: &docs.Dimension{
								Magnitude: 0,
								Unit:      "PT",
							},
						},
						PaddingBottom: &docs.Dimension{
							Magnitude: 0,
							Unit:      "PT",
						},
						PaddingLeft: &docs.Dimension{
							Magnitude: 0,
							Unit:      "PT",
						},
						PaddingRight: &docs.Dimension{
							Magnitude: 0,
							Unit:      "PT",
						},
						PaddingTop: &docs.Dimension{
							Magnitude: 0,
							Unit:      "PT",
						},
					},
					TableRange: &docs.TableRange{
						ColumnSpan: 2,
						RowSpan:    tableRows,
						TableCellLocation: &docs.TableCellLocation{
							ColumnIndex: 0,
							RowIndex:    0,
							TableStartLocation: &docs.Location{
								Index: startIndex,
							},
						},
					},
				},
			},

			// Update Title row minimum height.
			{
				UpdateTableRowStyle: &docs.UpdateTableRowStyleRequest{
					Fields:     "minRowHeight",
					RowIndices: []int64{0},
					TableRowStyle: &docs.TableRowStyle{
						MinRowHeight: &docs.Dimension{
							Magnitude: 27,
							Unit:      "PT",
						},
					},
					TableStartLocation: &docs.Location{
						Index: startIndex,
					},
				},
			},

			// Update Summary row minimum height.
			{
				UpdateTableRowStyle: &docs.UpdateTableRowStyleRequest{
					Fields:     "minRowHeight",
					RowIndices: []int64{1},
					TableRowStyle: &docs.TableRowStyle{
						MinRowHeight: &docs.Dimension{
							Magnitude: 11,
							Unit:      "PT",
						},
					},
					TableStartLocation: &docs.Location{
						Index: startIndex,
					},
				},
			},

			// Merge cells for the Title row.
			{
				MergeTableCells: &docs.MergeTableCellsRequest{
					TableRange: &docs.TableRange{
						ColumnSpan: 2,
						RowSpan:    1,
						TableCellLocation: &docs.TableCellLocation{
							ColumnIndex: 0,
							RowIndex:    0,
							TableStartLocation: &docs.Location{
								Index: startIndex,
							},
						},
					},
				},
			},

			// Merge cells for the Summary row.
			{
				MergeTableCells: &docs.MergeTableCellsRequest{
					TableRange: &docs.TableRange{
						ColumnSpan: 2,
						RowSpan:    1,
						TableCellLocation: &docs.TableCellLocation{
							ColumnIndex: 0,
							RowIndex:    1,
							TableStartLocation: &docs.Location{
								Index: startIndex,
							},
						},
					},
				},
			},

			// Merge cells for blank row after the Summary row.
			{
				MergeTableCells: &docs.MergeTableCellsRequest{
					TableRange: &docs.TableRange{
						ColumnSpan: 2,
						RowSpan:    1,
						TableCellLocation: &docs.TableCellLocation{
							ColumnIndex: 0,
							RowIndex:    2,
							TableStartLocation: &docs.Location{
								Index: startIndex,
							},
						},
					},
				},
			},

			// Merge cells for blank row after the Created/Status row.
			{
				MergeTableCells: &docs.MergeTableCellsRequest{
					TableRange: &docs.TableRange{
						ColumnSpan: 2,
						RowSpan:    1,
						TableCellLocation: &docs.TableCellLocation{
							ColumnIndex: 0,
							RowIndex:    4,
							TableStartLocation: &docs.Location{
								Index: startIndex,
							},
						},
					},
				},
			},

			// Merge cells for blank row before the "Managed by Hermes" note row.
			{
				MergeTableCells: &docs.MergeTableCellsRequest{
					TableRange: &docs.TableRange{
						ColumnSpan: 2,
						RowSpan:    1,
						TableCellLocation: &docs.TableCellLocation{
							ColumnIndex: 0,
							// RowIndex:    10,
							RowIndex: tableRows - 2,
							TableStartLocation: &docs.Location{
								Index: startIndex,
							},
						},
					},
				},
			},

			// Merge cells for the "Managed by Hermes" note row.
			{
				MergeTableCells: &docs.MergeTableCellsRequest{
					TableRange: &docs.TableRange{
						ColumnSpan: 2,
						RowSpan:    1,
						TableCellLocation: &docs.TableCellLocation{
							ColumnIndex: 0,
							// RowIndex:    11,
							RowIndex: tableRows - 1,
							TableStartLocation: &docs.Location{
								Index: startIndex,
							},
						},
					},
				},
			},
		},
	}
	_, err = s.Docs.Documents.BatchUpdate(doc.ObjectID, req).Do()
	if err != nil {
		return fmt.Errorf("error applying formatting to header table: %w", err)
	}

	// Populate table.
	var (
		pos        int // Use to track position in document.
		reqs       []*docs.Request
		cellReqs   []*docs.Request // Temp var used for createTextCellRequests() results.
		cellLength int             // Temp var used for createTextCellRequests() results.
	)

	// Title cell.
	pos = int(startIndex) + 3
	titleText := fmt.Sprintf("[%s] %s: %s", doc.DocType, doc.DocNumber, doc.Title)
	reqs = append(reqs,
		[]*docs.Request{
			{
				UpdateTextStyle: &docs.UpdateTextStyleRequest{
					Fields: "bold,fontSize,foregroundColor",
					Range: &docs.Range{
						StartIndex: int64(pos),
						EndIndex:   int64(pos + 1),
					},
					TextStyle: &docs.TextStyle{
						Bold: true,
						FontSize: &docs.Dimension{
							Magnitude: 20,
							Unit:      "PT",
						},
						ForegroundColor: &docs.OptionalColor{
							Color: &docs.Color{
								RgbColor: &docs.RgbColor{
									Blue:  0.2627451,
									Green: 0.2627451,
									Red:   0.2627451,
								},
							},
						},
					},
				},
			},
			{
				InsertText: &docs.InsertTextRequest{
					Location: &docs.Location{
						Index: int64(pos),
					},
					Text: titleText,
				},
			},
		}...,
	)
	pos += len(titleText) + 5

	// Summary cell.
	summaryText := fmt.Sprintf("Summary: %s", doc.Summary)
	reqs = append(reqs,
		[]*docs.Request{
			{
				InsertText: &docs.InsertTextRequest{
					Location: &docs.Location{
						Index: int64(pos),
					},
					Text: summaryText,
				},
			},

			// Bold "Summary:".
			{
				UpdateTextStyle: &docs.UpdateTextStyleRequest{
					Fields: "bold",
					Range: &docs.Range{
						StartIndex: int64(pos),
						EndIndex:   int64(pos + 8),
					},
					TextStyle: &docs.TextStyle{
						Bold: true,
					},
				},
			},
		}...,
	)
	pos += len(summaryText) + 5

	// Blank row after summary row.
	reqs = append(reqs,
		[]*docs.Request{
			{
				UpdateTextStyle: &docs.UpdateTextStyleRequest{
					Fields: "fontSize",
					Range: &docs.Range{
						StartIndex: int64(pos),
						EndIndex:   int64(pos + 1),
					},
					TextStyle: &docs.TextStyle{
						FontSize: &docs.Dimension{
							Magnitude: 8,
							Unit:      "PT",
						},
					},
				},
			},
		}...)
	pos += 5

	// Created cell.
	cellReqs, cellLength = createTextCellRequests(
		"Created", doc.Created, int64(pos))
	reqs = append(reqs, cellReqs...)
	pos += cellLength + 2

	// Status cell.
	cellReqs, cellLength = createTextCellRequests(
		"Status", "WIP | In-Review | Approved | Obsolete", int64(pos))
	reqs = append(reqs, cellReqs...)
	var statusStartIndex, statusEndIndex int
	switch strings.ToLower(doc.Status) {
	case "in review":
		fallthrough
	case "in-review":
		statusStartIndex = 14
		statusEndIndex = 23
	case "approved":
		statusStartIndex = 26
		statusEndIndex = 34
	case "obsolete":
		statusStartIndex = 37
		statusEndIndex = 45
	case "wip":
		fallthrough
	default:
		// Default to "WIP" for all unknown statuses.
		statusStartIndex = 8
		statusEndIndex = 11
	}
	reqs = append(reqs,
		// Bold the status.
		&docs.Request{
			UpdateTextStyle: &docs.UpdateTextStyleRequest{
				Fields: "bold",
				Range: &docs.Range{
					StartIndex: int64(pos + statusStartIndex),
					EndIndex:   int64(pos + statusEndIndex),
				},
				TextStyle: &docs.TextStyle{
					Bold: true,
				},
			},
		})
	pos += cellLength + 3

	// Blank row after Created/Status row.
	reqs = append(reqs,
		[]*docs.Request{
			{
				UpdateTextStyle: &docs.UpdateTextStyleRequest{
					Fields: "fontSize",
					Range: &docs.Range{
						StartIndex: int64(pos),
						EndIndex:   int64(pos + 1),
					},
					TextStyle: &docs.TextStyle{
						FontSize: &docs.Dimension{
							Magnitude: 8,
							Unit:      "PT",
						},
					},
				},
			},
		}...)
	pos += 5

	// Product cell.
	cellReqs, cellLength = createTextCellRequests(
		"Product", doc.Product, int64(pos))
	reqs = append(reqs, cellReqs...)
	pos += cellLength + 2

	// Owner cell.
	cellReqs, cellLength = createTextCellRequests(
		"Owner", doc.Owners[0], int64(pos))
	reqs = append(reqs, cellReqs...)
	pos += cellLength + 3

	// Contributors cell.
	cellReqs, cellLength = createTextCellRequests(
		"Contributors", strings.Join(doc.Contributors[:], ", "), int64(pos))
	reqs = append(reqs, cellReqs...)
	pos += cellLength + 2

	// Approvers cell.
	// Build approvers slice with a check next to reviewers who have approved.
	// Approver groups are listed first.
	approvers := doc.ApproverGroups
	for _, approver := range doc.Approvers {
		if helpers.StringSliceContains(doc.ApprovedBy, approver) {
			approvers = append(approvers, "✅ "+approver)
		} else if helpers.StringSliceContains(doc.ChangesRequestedBy, approver) {
			approvers = append(approvers, "❌ "+approver)
		} else {
			approvers = append(approvers, approver)
		}
	}
	cellReqs, cellLength = createTextCellRequests(
		"Approvers", strings.Join(approvers[:], ", "), int64(pos))
	reqs = append(reqs, cellReqs...)
	pos += cellLength + 3

	// Custom fields.
	for i, cf := range doc.CustomFields {
		switch cf.Type {
		case "PEOPLE":
			cfVal := []string{}

			if reflect.TypeOf(cf.Value).Kind() == reflect.Slice {
				switch reflect.TypeOf(cf.Value).Elem().Kind() {
				case reflect.Interface:
					// If the value is an interface slice, convert to a string slice.
					for _, v := range cf.Value.([]any) {
						if vv, ok := v.(string); ok {
							cfVal = append(cfVal, vv)
						} else {
							return fmt.Errorf(
								"wrong type for custom field %q, want []string", cf.Name)
						}
					}
				case reflect.String:
					if v, ok := cf.Value.([]string); ok {
						cfVal = v
					} else {
						return fmt.Errorf(
							"error asserting value for custom field %q as []string", cf.Name)
					}
				default:
					return fmt.Errorf(
						"wrong type for custom field %q, want []string", cf.Name)
				}
			} else {
				return fmt.Errorf(
					"wrong type for custom field %q, want []string", cf.Name)
			}

			// Change string slice to comma-separated value.
			cellReqs, cellLength = createTextCellRequests(
				cf.DisplayName, strings.Join(cfVal[:], ", "), int64(pos))
			reqs = append(reqs, cellReqs...)

		case "STRING":
			if v, ok := cf.Value.(string); ok {
				// TODO: Don't hardcode these custom fields and instead create something
				// like a "HERMES_DOCUMENT" custom field type.
				switch cf.DisplayName {
				case "PRD":
					fallthrough
				case "RFC":
					cellReqs, cellLength = createTextCellRequests(
						cf.DisplayName, cf.DisplayName, int64(pos))
					reqs = append(reqs, cellReqs...)
					reqs = append(reqs,
						[]*docs.Request{
							// Add link to document.
							{
								UpdateTextStyle: &docs.UpdateTextStyleRequest{
									Fields: "link",
									Range: &docs.Range{
										StartIndex: int64(pos + 5),
										EndIndex:   int64(pos + 8),
									},
									TextStyle: &docs.TextStyle{
										Link: &docs.Link{
											Url: v,
										},
									},
								},
							},
						}...)
				default:
					cellReqs, cellLength = createTextCellRequests(
						cf.DisplayName, v, int64(pos))
					reqs = append(reqs, cellReqs...)
				}

			} else {
				return fmt.Errorf(
					"wrong type for custom field %q, want string", cf.Name)
			}

		default:
			return fmt.Errorf("invalid custom field type: %s", cf.Type)
		}

		if i%2 == 0 {
			// If this is a first-column custom field, move the position in the
			// document up by the cell length + 2.
			pos += cellLength + 2

			// Add 3 more if this is the last custom field (to move the position to
			// the next row).
			if i == len(doc.CustomFields)-1 {
				pos += 3
			}
		} else {
			// If this is a second-column custom field, move the position in the
			// document up by the cell length + 3.
			pos += cellLength + 3
		}
	}

	// Blank row.
	reqs = append(reqs,
		[]*docs.Request{
			{
				UpdateTextStyle: &docs.UpdateTextStyleRequest{
					Fields: "fontSize",
					Range: &docs.Range{
						StartIndex: int64(pos),
						EndIndex:   int64(pos + 1),
					},
					TextStyle: &docs.TextStyle{
						FontSize: &docs.Dimension{
							Magnitude: 8,
							Unit:      "PT",
						},
					},
				},
			},
		}...)
	pos += 5

	// "Managed by Hermes..." note cell.
	docURL, err := url.Parse(baseURL)
	if err != nil {
		return fmt.Errorf("error parsing base URL: %w", err)
	}
	docURL.Path = path.Join(docURL.Path, "document", doc.ObjectID)
	docURLString := docURL.String()
	docURLString = strings.TrimRight(docURLString, "/")
	if isDraft {
		docURLString += "?draft=true"
	}
	cellReqs, cellLength = createTextCellRequests(
		"NOTE",
		"This document is managed by Hermes and this header will be periodically overwritten using document metadata.",
		int64(pos))
	reqs = append(reqs, cellReqs...)
	reqs = append(reqs,
		[]*docs.Request{
			// Add link to document in Hermes.
			{
				UpdateTextStyle: &docs.UpdateTextStyleRequest{
					Fields: "link",
					Range: &docs.Range{
						StartIndex: int64(pos + 11),
						EndIndex:   int64(pos + 19),
					},
					TextStyle: &docs.TextStyle{
						Link: &docs.Link{
							Url: docURLString,
						},
					},
				},
			},

			// Add link to Hermes.
			{
				UpdateTextStyle: &docs.UpdateTextStyleRequest{
					Fields: "link",
					Range: &docs.Range{
						StartIndex: int64(pos + 34),
						EndIndex:   int64(pos + 40),
					},
					TextStyle: &docs.TextStyle{
						Link: &docs.Link{
							Url: baseURL,
						},
					},
				},
			},
		}...)
	pos += cellLength + 5

	// Do the batch update.
	_, err = s.Docs.Documents.BatchUpdate(doc.ObjectID,
		&docs.BatchUpdateDocumentRequest{
			Requests: reqs}).
		Do()
	if err != nil {
		return fmt.Errorf("error populating table: %w", err)
	}

	// Rename file with new title.
	err = s.RenameFile(
		doc.ObjectID, fmt.Sprintf("[%s] %s", doc.DocNumber, doc.Title))
	if err != nil {
		return fmt.Errorf("error renaming file with new title: %w", err)
	}

	return nil
}

// createTextCellRequests creates a slice of Google Docs requests for header
// table cells consisting of `cellName: cellVal`.
func createTextCellRequests(
	cellName, cellVal string,
	startIndex int64) (reqs []*docs.Request, cellLength int) {

	if cellVal == "" {
		cellVal = "N/A"
	}
	cellText := fmt.Sprintf("%s: %s", cellName, cellVal)
	cellLength = utf8.RuneCountInString(cellText)

	reqs = []*docs.Request{
		{
			UpdateTextStyle: &docs.UpdateTextStyleRequest{
				Fields: "fontSize",
				Range: &docs.Range{
					StartIndex: startIndex,
					EndIndex:   startIndex + 1,
				},
				TextStyle: &docs.TextStyle{
					FontSize: &docs.Dimension{
						Magnitude: 8,
						Unit:      "PT",
					},
				},
			},
		},
		{
			InsertText: &docs.InsertTextRequest{
				Location: &docs.Location{
					Index: startIndex,
				},
				Text: cellText,
			},
		},
		{
			UpdateTextStyle: &docs.UpdateTextStyleRequest{
				Fields: "bold",
				Range: &docs.Range{
					StartIndex: startIndex,
					EndIndex:   startIndex + int64(len(cellName)),
				},
				TextStyle: &docs.TextStyle{
					Bold: true,
				},
			},
		},
	}

	return
}
