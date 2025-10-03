package hashicorpdocs

import (
	"fmt"

	"github.com/hashicorp-forge/hermes/pkg/models"
	google "github.com/hashicorp-forge/hermes/pkg/storage/adapters/google"
	"github.com/hashicorp/go-hclog"
	"google.golang.org/api/docs/v1"
	"gorm.io/gorm"
)

// IsLocked checks if a document contains one or more suggestions in the header,
// locks/unlocks the document accordingly, and returns the lock status.
func IsLocked(
	fileID string,
	db *gorm.DB,
	goog *google.Service,
	log hclog.Logger,
) (bool, error) {

	// Get document from database.
	doc := models.Document{
		GoogleFileID: fileID,
	}
	if err := doc.Get(db); err != nil {
		return false, fmt.Errorf("error getting document from database: %w", err)
	}

	// Find out if the document header contains a suggestion. Deleting text which
	// contains a suggestion currently causes a Google internal API error so we
	// need to lock the document.
	gDoc, err := goog.GetDoc(fileID)
	if err != nil {
		return false, fmt.Errorf("error getting Google Doc: %w", err)
	}

	hasSuggestion := containsSuggestionInHeader(gDoc)
	if hasSuggestion {
		// Lock document if it's not already locked.
		if !doc.Locked {
			doc.Locked = true
			if err := doc.Upsert(db); err != nil {
				return false, fmt.Errorf(
					"error upserting document in database to lock it: %w", err)
			}
			log.Info("locked document",
				"google_file_id", fileID,
			)
		} else {
			log.Warn("locked document still contains suggestions in header",
				"google_file_id", fileID,
			)
		}
	} else {
		// Unlock document if it was locked and doesn't contain a suggestion in the
		// header anymore.
		if doc.Locked {
			doc.Locked = false
			if err := db.Model(&doc).
				// We need to update using select because false is a zero value.
				Select("locked").
				Updates(models.Document{Locked: false}).
				Error; err != nil {
				return false, fmt.Errorf(
					"error updating document in database to unlock it: %w", err)
			}
			log.Info("unlocked document",
				"google_file_id", fileID,
			)
		}
	}

	return doc.Locked, nil
}

// containsSuggestionInHeader returns true if a Google Doc contains one or more
// suggestions in the document header.
func containsSuggestionInHeader(doc *docs.Document) bool {
	// Find the first table in the document (hopefully it's the doc header).
	var (
		startIndex int64
		t          *docs.Table
	)
	elems := doc.Body.Content
	for _, e := range elems {
		if e.Table != nil {
			t = e.Table
			startIndex = e.StartIndex

			break
		}
	}
	// startIndex should be 2, but we'll allow a little leeway in case someone
	// accidentally added a newline or something.
	if t == nil || startIndex >= 5 {
		// We didn't find a header table.
		return false
	}

	// Navigate through all table contents to look for suggestions.
	for _, row := range t.TableRows {
		// Check table rows for suggestions.
		if len(row.SuggestedDeletionIds) > 0 ||
			len(row.SuggestedInsertionIds) > 0 ||
			len(row.SuggestedTableRowStyleChanges) > 0 {
			// We found a suggestion.
			return true
		}
		for _, cell := range row.TableCells {
			// Check table cells for suggestions.
			if len(cell.SuggestedDeletionIds) > 0 ||
				len(cell.SuggestedInsertionIds) > 0 ||
				len(cell.SuggestedTableCellStyleChanges) > 0 {
				return true
			}
			for _, content := range cell.Content {
				// Check table cell content for suggestions.
				if para := content.Paragraph; para != nil {
					if len(para.SuggestedBulletChanges) > 0 ||
						len(para.SuggestedParagraphStyleChanges) > 0 ||
						len(para.SuggestedPositionedObjectIds) > 0 {
						return true
					}
					for _, elem := range para.Elements {
						// Check table cell paragraphs for suggestions.
						if auto := elem.AutoText; auto != nil {
							if len(auto.SuggestedDeletionIds) > 0 ||
								len(auto.SuggestedInsertionIds) > 0 ||
								len(auto.SuggestedTextStyleChanges) > 0 {
								return true
							}
						}
						if txt := elem.TextRun; txt != nil {
							if len(txt.SuggestedDeletionIds) > 0 ||
								len(txt.SuggestedInsertionIds) > 0 ||
								len(txt.SuggestedTextStyleChanges) > 0 {
								return true
							}
						}
					}
				}
			}
		}
	}

	return false
}
