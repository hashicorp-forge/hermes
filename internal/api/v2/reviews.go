package api

import (
	"fmt"
	"net/http"
	"net/url"
	"path"
	"strings"
	"time"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/internal/email"
	"github.com/hashicorp-forge/hermes/internal/helpers"
	"github.com/hashicorp-forge/hermes/internal/server"
	"github.com/hashicorp-forge/hermes/internal/structs"
	"github.com/hashicorp-forge/hermes/pkg/document"
	gw "github.com/hashicorp-forge/hermes/pkg/googleworkspace"
	hcd "github.com/hashicorp-forge/hermes/pkg/hashicorpdocs"
	"github.com/hashicorp-forge/hermes/pkg/links"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp-forge/hermes/pkg/sharepointhelper"
	"github.com/hashicorp/go-multierror"
	"google.golang.org/api/drive/v3"
	"gorm.io/gorm"
)

var (
	getProductWithSubscribers = func(db *gorm.DB, productName string) (*models.Product, error) {
		p := &models.Product{Name: productName}
		if err := p.Get(db); err != nil {
			return nil, err
		}
		return p, nil
	}
)

func ReviewsHandler(srv server.Server) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "POST":
			handleCreateReview(&srv, w, r)

			// Validate request.
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
	})
}

// handleCreateReview handles the POST request for creating a document review
func handleCreateReview(srv *server.Server, w http.ResponseWriter, r *http.Request) {
	// revertFuncs is a slice of functions to execute in the event of an error
	// that requires reverting previous logic.
	var revertFuncs []func() error

	// Validate request.
	docID, err := parseResourceIDFromURL(r.URL.Path, "reviews")
	if err != nil {
		srv.Logger.Error("error parsing document ID from reviews path",
			"error", err,
			"method", r.Method,
			"path", r.URL.Path,
		)
		http.Error(w, "Document ID not found", http.StatusNotFound)
		return
	}

	// Check if document is locked (Google-only).
	if !srv.IsSharePoint() {
		locked, err := hcd.IsLocked(docID, srv.DB, srv.GWService, srv.Logger)
		if err != nil {
			srv.Logger.Error("error checking document locked status",
				"error", err,
				"path", r.URL.Path,
				"method", r.Method,
				"doc_id", docID,
			)
			http.Error(w, "Error getting document status", http.StatusNotFound)
			return
		}
		// Don't continue if document is locked.
		if locked {
			http.Error(w, "Document is locked", http.StatusLocked)
			return
		}
	}

	// Begin database transaction.
	tx := srv.DB.Begin()
	revertFuncs = append(revertFuncs, func() error {
		// Rollback database transaction.
		if err = tx.Rollback().Error; err != nil {
			return fmt.Errorf("error rolling back database transaction: %w", err)
		}

		return nil
	})

	// Validate and prepare the review request
	doc, httpErr := validateAndPrepareReview(srv, r, tx, docID)
	if httpErr != nil {
		http.Error(w, httpErr.Message, httpErr.StatusCode)
		if err := revertReviewsPost(revertFuncs); err != nil {
			srv.Logger.Error("error reverting review creation",
				"error", err,
				"doc_id", docID,
				"method", r.Method,
				"path", r.URL.Path)
		}
		return
	}

	// Process the document for review
	creationTime, modifiedTime, nextDocNum, httpErr := processDocumentForReview(srv, r, tx, doc, docID, &revertFuncs)
	if httpErr != nil {
		http.Error(w, httpErr.Message, httpErr.StatusCode)
		if err := revertReviewsPost(revertFuncs); err != nil {
			srv.Logger.Error("error reverting review creation",
				"error", err,
				"doc_id", docID,
				"method", r.Method,
				"path", r.URL.Path)
		}
		return
	}

	// Complete the review creation process
	if httpErr := completeReviewCreation(srv, r, tx, doc, docID, creationTime, modifiedTime, nextDocNum, &revertFuncs); httpErr != nil {
		http.Error(w, httpErr.Message, httpErr.StatusCode)
		if err := revertReviewsPost(revertFuncs); err != nil {
			srv.Logger.Error("error reverting review creation",
				"error", err,
				"doc_id", docID,
				"method", r.Method,
				"path", r.URL.Path)
		}
		return
	}

	// Get document URL.
	docURL, err := getDocumentURL(srv.Config.BaseURL, docID)
	if err != nil {
		srv.Logger.Error("error getting document URL",
			"error", err,
			"doc_id", docID,
			"method", r.Method,
			"path", r.URL.Path,
			"docURL", docURL,
		)
		http.Error(w, "Error creating review",
			http.StatusInternalServerError)
		if err := revertReviewsPost(revertFuncs); err != nil {
			srv.Logger.Error("error reverting review creation",
				"error", err,
				"doc_id", docID,
				"method", r.Method,
				"path", r.URL.Path)
		}
		return
	}

	if srv.Config.Email != nil && srv.Config.Email.Enabled {
		approverEmailAddresses := []string{}
		approverEmailAddresses = append(approverEmailAddresses, doc.Approvers...)
		approverEmailAddresses = append(approverEmailAddresses, doc.ApproverGroups...)

		if len(approverEmailAddresses) > 0 {
			go helpers.SendEmailWithRetry(
				srv,
				func() error {
					return email.SendReviewRequestedEmail(
						email.ReviewRequestedEmailData{
							BaseURL:           srv.Config.BaseURL,
							DocumentOwner:     doc.Owners[0],
							DocumentShortName: doc.DocNumber,
							DocumentType:      doc.DocType,
							DocumentTitle:     doc.Title,
							DocumentStatus:    doc.Status,
							DocumentURL:       docURL,
							Product:           doc.Product,
						},
						approverEmailAddresses,
						srv.Config.Email.FromAddress,
						srv.GetEmailSender(),
					)
				},
				docID,
				"review_requested",
				r,
			)

			srv.Logger.Info("review requested email queued",
				"doc_id", docID,
				"approver_count", len(approverEmailAddresses),
				"method", r.Method,
				"path", r.URL.Path,
			)
		}
	}
	// Commit the database transaction.
	if err := tx.Commit().Error; err != nil {
		srv.Logger.Error("error committing database transaction",
			"error", err,
			"doc_id", docID,
			"method", r.Method,
			"path", r.URL.Path,
		)
		http.Error(w, "Error creating review",
			http.StatusInternalServerError)

		if err := revertReviewsPost(revertFuncs); err != nil {
			srv.Logger.Error("error reverting review creation",
				"error", err,
				"doc_id", docID,
				"method", r.Method,
				"path", r.URL.Path)
		}
		return
	}

	// Write response.
	w.WriteHeader(http.StatusOK)

	// Log success.
	srv.Logger.Info("review created",
		"doc_id", docID,
		"method", r.Method,
		"path", r.URL.Path,
	)

	userEmail := r.Context().Value("userEmail").(string)
	srv.Logger.Info("ACCESS",
		"user_email", userEmail,
		"doc_id", docID,
		"operation", "document_published",
		"updated_attributes", "[status, approvedBy, docNumber]",
		"mode", "published",
	)

	// Request post-processing.
	go handleReviewPostProcessing(srv, doc, docID, r)
}

// validateAndPrepareReview validates the request and prepares the document for review
func validateAndPrepareReview(srv *server.Server, r *http.Request, tx *gorm.DB, docID string) (*document.Document, *structs.HTTPError) {
	// Get document from database.
	model := srv.NewDocumentByFileID(docID)
	if err := model.Get(tx); err != nil {
		srv.Logger.Error("error getting document from database",
			"error", err,
			"path", r.URL.Path,
			"method", r.Method,
			"doc_id", docID,
		)
		httpErr := structs.NewHTTPError(http.StatusInternalServerError, "Error accessing document", err)
		return nil, &httpErr
	}

	// Get reviews for the document.
	var reviews models.DocumentReviews
	if err := reviews.Find(tx, models.DocumentReview{
		Document: srv.NewDocumentByFileID(docID),
	}); err != nil {
		srv.Logger.Error("error getting reviews for document",
			"error", err,
			"method", r.Method,
			"path", r.URL.Path,
			"doc_id", docID,
		)
		httpErr := structs.NewHTTPError(http.StatusInternalServerError, "Error accessing document reviews", err)
		return nil, &httpErr
	}

	// Get group reviews for the document.
	var groupReviews models.DocumentGroupReviews
	if err := groupReviews.Find(srv.DB, models.DocumentGroupReview{
		Document: srv.NewDocumentByFileID(docID),
	}); err != nil {
		srv.Logger.Error("error getting group reviews for document",
			"error", err,
			"method", r.Method,
			"path", r.URL.Path,
			"doc_id", docID,
		)
		httpErr := structs.NewHTTPError(http.StatusInternalServerError, "Error accessing document group reviews", err)
		return nil, &httpErr
	}

	// Convert database model to a document.
	doc, err := document.NewFromDatabaseModel(
		model, reviews, groupReviews)
	if err != nil {
		srv.Logger.Error("error converting database model to document type",
			"error", err,
			"method", r.Method,
			"path", r.URL.Path,
			"doc_id", docID,
		)
		httpErr := structs.NewHTTPError(http.StatusInternalServerError, "Error accessing document", err)
		return nil, &httpErr
	}

	// Validate document status.
	if doc.Status != "WIP" {
		srv.Logger.Warn("document is not in WIP status",
			"doc_id", docID,
			"method", r.Method,
			"path", r.URL.Path,
		)
		httpErr := structs.NewHTTPError(http.StatusUnprocessableEntity, "Cannot create review for a document that is not in WIP status", nil)
		return nil, &httpErr
	}

	return doc, nil
}

// processDocumentForReview handles the core document processing for review creation
func processDocumentForReview(srv *server.Server, r *http.Request, tx *gorm.DB, doc *document.Document, docID string, revertFuncs *[]func() error) (time.Time, time.Time, int, *structs.HTTPError) {
	// Get latest product number.
	latestNum, err := models.GetLatestProductNumber(
		tx, doc.DocType, doc.Product)
	if err != nil {
		srv.Logger.Error("error getting product document number",
			"error", err,
			"doc_id", docID,
			"method", r.Method,
			"path", r.URL.Path,
		)
		httpErr := structs.NewHTTPError(http.StatusInternalServerError, "Error creating review", err)
		return time.Time{}, time.Time{}, 0, &httpErr
	}

	// Get product from database so we can get the product abbreviation.
	product := models.Product{
		Name: doc.Product,
	}
	if err := product.Get(tx); err != nil {
		srv.Logger.Error("error getting product",
			"error", err,
			"doc_id", docID,
			"method", r.Method,
			"path", r.URL.Path,
		)
		httpErr := structs.NewHTTPError(http.StatusInternalServerError, "Error creating review", err)
		return time.Time{}, time.Time{}, 0, &httpErr
	}

	// Reset the document creation time to the current time of publish.
	now := time.Now()
	doc.Created = now.Format("Jan 2, 2006")
	doc.CreatedTime = now.Unix()

	// Set the document number.
	nextDocNum := latestNum + 1
	doc.DocNumber = fmt.Sprintf("%s-%03d",
		product.Abbreviation,
		nextDocNum)
	doc.Status = "In-Review"

	// Replace the doc header (Google-only; SharePoint headers
	// are managed by the Hermes Add-In for Word).
	if !srv.IsSharePoint() {
		err = doc.ReplaceHeader(srv.Config.BaseURL, false, srv.GWService)
		*revertFuncs = append(*revertFuncs, func() error {
			// Change back document number to "ABC-???" and status to "WIP".
			doc.DocNumber = fmt.Sprintf("%s-???", product.Abbreviation)
			doc.Status = "WIP"

			if err = doc.ReplaceHeader(
				srv.Config.BaseURL, false, srv.GWService,
			); err != nil {
				return fmt.Errorf("error replacing doc header: %w", err)
			}

			return nil
		})
		if err != nil {
			srv.Logger.Error("error replacing doc header",
				"error", err, "doc_id", docID)
			httpErr := structs.NewHTTPError(
				http.StatusInternalServerError, "Error creating review", err)
			if err := revertReviewsPost(*revertFuncs); err != nil {
				srv.Logger.Error("error reverting review creation",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path)
			}
			return time.Time{}, time.Time{}, 0, &httpErr
		}
		srv.Logger.Info("doc header replaced",
			"doc_id", docID,
			"method", r.Method,
			"path", r.URL.Path,
		)
	}

	// Grant read access to configured groups asynchronously
	go func() {
		if srv.SharePoint != nil {
			grantedGroups, err := srv.SharePoint.GrantGroupsReadAccess(docID, "reader", publishReaderGroups, publishGroupDisplayNames)
			if err != nil {
				srv.Logger.Error("error granting reader access to publish groups",
					"error", err,
					"doc_id", docID,
				)
				return
			}
			if len(grantedGroups) > 0 {
				srv.Logger.Info("granted group access on document publish",
					"doc_id", docID,
					"groups", grantedGroups,
				)
			}
		} else {
			var grantedGroups []string
			for _, group := range publishReaderGroups {
				if err := srv.GWService.ShareFile(docID, group, "reader"); err != nil {
					srv.Logger.Error("error granting reader access to publish group",
						"error", err,
						"doc_id", docID,
						"group", group,
					)
					return
				}
				grantedGroups = append(grantedGroups, group)
			}
			if len(grantedGroups) > 0 {
				srv.Logger.Info("granted group access on document publish",
					"doc_id", docID,
					"groups", grantedGroups,
				)
			}
		}
	}()

	// Get file and parse modified time.
	var modifiedTime time.Time
	if srv.SharePoint != nil {
		file, err := srv.SharePoint.GetFile(docID)
		if err != nil {
			srv.Logger.Error("error getting document file",
				"error", err,
				"path", r.URL.Path,
				"method", r.Method,
				"doc_id", docID,
			)
			httpErr := structs.NewHTTPError(http.StatusInternalServerError, "Error creating review", err)
			return time.Time{}, time.Time{}, 0, &httpErr
		}
		modifiedTime, err = time.Parse(time.RFC3339Nano, file.LastModifiedTime)
		if err != nil {
			srv.Logger.Error("error parsing modified time",
				"error", err,
				"path", r.URL.Path,
				"method", r.Method,
				"doc_id", docID,
			)
			httpErr := structs.NewHTTPError(http.StatusInternalServerError, "Error creating review", err)
			return time.Time{}, time.Time{}, 0, &httpErr
		}
	} else {
		file, err := srv.GWService.GetFile(docID)
		if err != nil {
			srv.Logger.Error("error getting document file",
				"error", err,
				"path", r.URL.Path,
				"method", r.Method,
				"doc_id", docID,
			)
			httpErr := structs.NewHTTPError(http.StatusInternalServerError, "Error creating review", err)
			return time.Time{}, time.Time{}, 0, &httpErr
		}
		modifiedTime, err = time.Parse(time.RFC3339, file.ModifiedTime)
		if err != nil {
			srv.Logger.Error("error parsing modified time",
				"error", err,
				"path", r.URL.Path,
				"method", r.Method,
				"doc_id", docID,
			)
			httpErr := structs.NewHTTPError(http.StatusInternalServerError, "Error creating review", err)
			return time.Time{}, time.Time{}, 0, &httpErr
		}
	}
	doc.ModifiedTime = modifiedTime.Unix()

	// Get latest file revision.
	var latestRevisionID string
	if srv.SharePoint != nil {
		latestVersion, err := srv.SharePoint.GetLatestVersion(docID)
		if err != nil {
			srv.Logger.Error("error getting latest revision",
				"error", err,
				"method", r.Method,
				"path", r.URL.Path,
				"doc_id", docID)
			httpErr := structs.NewHTTPError(http.StatusInternalServerError, "Error creating review", err)
			return time.Time{}, time.Time{}, 0, &httpErr
		}
		latestRevisionID = latestVersion.ID
	} else {
		latestRev, err := srv.GWService.GetLatestRevision(docID)
		if err != nil {
			srv.Logger.Error("error getting latest revision",
				"error", err,
				"method", r.Method,
				"path", r.URL.Path,
				"doc_id", docID)
			httpErr := structs.NewHTTPError(http.StatusInternalServerError, "Error creating review", err)
			return time.Time{}, time.Time{}, 0, &httpErr
		}
		latestRevisionID = latestRev.Id

		// Keep revision forever for Google Drive.
		if _, err := srv.GWService.KeepRevisionForever(docID, latestRev.Id); err != nil {
			srv.Logger.Error("error keeping revision forever",
				"error", err,
				"method", r.Method,
				"path", r.URL.Path,
				"doc_id", docID)
			// Non-fatal: continue even if keep-forever fails.
		}
	}

	// Record file revision in the Algolia document object.
	revisionName := "Requested review"
	doc.SetFileRevision(latestRevisionID, revisionName)

	// Create file revision in the database.
	fr := models.DocumentFileRevision{
		Document:       srv.NewDocumentByFileID(docID),
		FileRevisionID: latestRevisionID,
		Name:           revisionName,
	}
	if err := fr.Create(tx); err != nil {
		srv.Logger.Error("error creating document file revision",
			"error", err,
			"method", r.Method,
			"path", r.URL.Path,
			"doc_id", docID,
			"rev_id", latestRevisionID)
		httpErr := structs.NewHTTPError(http.StatusInternalServerError, "Error creating review", err)
		return time.Time{}, time.Time{}, 0, &httpErr
	}

	return now, modifiedTime, nextDocNum, nil
}

// completeReviewCreation handles the final database updates and reviewer setup
func completeReviewCreation(srv *server.Server, r *http.Request, tx *gorm.DB, doc *document.Document, docID string, creationTime time.Time, modifiedTime time.Time, nextDocNum int, revertFuncs *[]func() error) *structs.HTTPError {
	// Verify the document file exists.
	if srv.SharePoint != nil {
		_, err := srv.SharePoint.GetFileDetails(docID)
		if err != nil {
			srv.Logger.Error("error getting file details",
				"error", err,
				"doc_id", docID,
				"method", r.Method,
				"path", r.URL.Path)
			httpErr := structs.NewHTTPError(http.StatusInternalServerError, "Error creating review", err)
			return &httpErr
		}
	} else {
		_, err := srv.GWService.GetFile(docID)
		if err != nil {
			srv.Logger.Error("error getting file details",
				"error", err,
				"doc_id", docID,
				"method", r.Method,
				"path", r.URL.Path)
			httpErr := structs.NewHTTPError(http.StatusInternalServerError, "Error creating review", err)
			return &httpErr
		}
	}

	// Move document to published docs location in Google Drive (Google-only).
	if !srv.IsSharePoint() {
		_, err := srv.GWService.MoveFile(
			docID, srv.Config.GoogleWorkspace.DocsFolder)
		*revertFuncs = append(*revertFuncs, func() error {
			// Move document back to drafts folder in Google Drive.
			if _, err := srv.GWService.MoveFile(
				doc.ObjectID, srv.Config.GoogleWorkspace.DraftsFolder); err != nil {

				return fmt.Errorf("error moving doc back to drafts folder: %w", err)

			}

			return nil
		})
		if err != nil {
			srv.Logger.Error("error moving file to docs folder",
				"error", err,
				"doc_id", docID,
				"method", r.Method,
				"path", r.URL.Path)
			httpErr := structs.NewHTTPError(http.StatusInternalServerError, "Error creating review", err)

			if err := revertReviewsPost(*revertFuncs); err != nil {
				srv.Logger.Error("error reverting review creation",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path)
			}
			return &httpErr
		}
		srv.Logger.Info("doc moved to published document folder",
			"doc_id", docID,
			"method", r.Method,
			"path", r.URL.Path,
		)
	}

	// Create shortcut in hierarchical folder structure.
	if srv.SharePoint != nil {
		// TODO: Implement SharePoint shortcut creation.
		// SharePoint shortcut creation is disabled pending review of
		// implementation and permission behavior.
		// shortcutFileId, err := createSharePointShortcut(srv.Config, doc, fileDetails.WebURL, srv.SharePoint)
	} else {
		_, err := createGoogleShortcut(srv.Config, *doc, srv.GWService)
		if err != nil {
			srv.Logger.Error("error creating shortcut",
				"error", err,
				"doc_id", docID,
				"method", r.Method,
				"path", r.URL.Path)
			httpErr := structs.NewHTTPError(http.StatusInternalServerError, "Error creating review", err)

			if err := revertReviewsPost(*revertFuncs); err != nil {
				srv.Logger.Error("error reverting review creation",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path)
			}
			return &httpErr
		}
		srv.Logger.Info("doc shortcut created",
			"doc_id", docID,
			"method", r.Method,
			"path", r.URL.Path,
		)
	}

	// Create go-link.
	// TODO: use database for this instead of Algolia.
	err := links.SaveDocumentRedirectDetails(
		srv.AlgoWrite, docID, doc.DocType, doc.DocNumber)
	*revertFuncs = append(*revertFuncs, func() error {
		if err := links.DeleteDocumentRedirectDetails(
			srv.AlgoWrite, doc.ObjectID, doc.DocType, doc.DocNumber,
		); err != nil {
			return fmt.Errorf("error deleting go-link: %w", err)
		}
		return nil
	})
	if err != nil {
		srv.Logger.Error("error creating go-link",
			"error", err,
			"doc_id", docID,
			"method", r.Method,
			"path", r.URL.Path)
		httpErr := structs.NewHTTPError(http.StatusInternalServerError, "Error creating review with go link", err)
		return &httpErr
	}
	srv.Logger.Info("doc redirect details saved",
		"doc_id", docID,
		"method", r.Method,
		"path", r.URL.Path,
		"DocNumber", doc.DocNumber,
		"DocType", doc.DocType,
		"DocNumber", doc.DocNumber,
		"ObjectID", doc.ObjectID,
	)

	// Update document in the database.
	d := srv.NewDocumentByFileID(docID)
	if err := d.Get(tx); err != nil {
		srv.Logger.Error("error getting document in database",
			"error", err,
			"doc_id", docID,
			"method", r.Method,
			"path", r.URL.Path)
		httpErr := structs.NewHTTPError(http.StatusInternalServerError, "Error creating review", err)
		return &httpErr
	}

	d.DocumentCreatedAt = creationTime // Reset to document published time.
	d.Status = models.InReviewDocumentStatus
	d.DocumentNumber = nextDocNum
	d.DocumentModifiedAt = modifiedTime
	if err := d.Upsert(tx); err != nil {
		srv.Logger.Error("error upserting document in database",
			"error", err,
			"doc_id", docID,
			"method", r.Method,
			"path", r.URL.Path)
		httpErr := structs.NewHTTPError(http.StatusInternalServerError, "Error creating review", err)
		return &httpErr
	}

	// Share with individual approvers.
	for _, approver := range doc.Approvers {
		if srv.SharePoint != nil {
			if err := srv.SharePoint.ShareFile(docID, approver, "writer"); err != nil {
				srv.Logger.Error("error sharing file with user approver",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path,
					"approver", approver)
				httpErr := structs.NewHTTPError(http.StatusInternalServerError, "Error creating review", err)
				return &httpErr
			}
		} else {
			if err := srv.GWService.ShareFile(docID, approver, "writer"); err != nil {
				srv.Logger.Error("error sharing file with user approver",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path,
					"approver", approver)
				httpErr := structs.NewHTTPError(http.StatusInternalServerError, "Error creating review", err)
				return &httpErr
			}
		}
	}

	// Share with group approvers (attempt direct group share, fallback to expansion).
	for _, groupEmail := range doc.ApproverGroups {
		if srv.SharePoint != nil {
			if err := srv.SharePoint.ShareFileWithGroupOrMembers(docID, groupEmail, "writer"); err != nil {
				srv.Logger.Error("error sharing file with group approver",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path,
					"group", groupEmail)
				httpErr := structs.NewHTTPError(http.StatusInternalServerError, "Error creating review", err)
				return &httpErr
			}
		} else {
			if err := srv.GWService.ShareFile(docID, groupEmail, "writer"); err != nil {
				srv.Logger.Error("error sharing file with group approver",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path,
					"group", groupEmail)
				httpErr := structs.NewHTTPError(http.StatusInternalServerError, "Error creating review", err)
				return &httpErr
			}
		}
	}

	return nil
}

// createGoogleShortcut creates a Google Drive shortcut in the hierarchical
// folder structure ("Shortcuts Folder/RFC/MyProduct/") under docsFolder.
func createGoogleShortcut(
	cfg *config.Config,
	doc document.Document,
	s *gw.Service,
) (shortcut *drive.File, retErr error) {
	// Get folder for doc type.
	docTypeFolder, err := s.GetSubfolder(
		cfg.GoogleWorkspace.ShortcutsFolder, doc.DocType)
	if err != nil {
		return nil, fmt.Errorf("error getting doc type subfolder: %w", err)
	}

	// Doc type folder wasn't found, so create it.
	if docTypeFolder == nil {
		docTypeFolder, err = s.CreateFolder(
			doc.DocType, cfg.GoogleWorkspace.ShortcutsFolder)
		if err != nil {
			return nil, fmt.Errorf("error creating doc type subfolder: %w", err)
		}
	}

	// Get folder for doc type + product.
	productFolder, err := s.GetSubfolder(docTypeFolder.Id, doc.Product)
	if err != nil {
		return nil, fmt.Errorf("error getting product subfolder: %w", err)
	}

	// Product folder wasn't found, so create it.
	if productFolder == nil {
		productFolder, err = s.CreateFolder(
			doc.Product, docTypeFolder.Id)
		if err != nil {
			return nil, fmt.Errorf("error creating product subfolder: %w", err)
		}
	}

	// Create shortcut.
	if shortcut, err = s.CreateShortcut(
		doc.ObjectID,
		productFolder.Id); err != nil {

		return nil, fmt.Errorf("error creating shortcut: %w", err)
	}

	return
}

// createSharePointShortcut creates a shortcut (.url file) in the hierarchical folder structure
// ("Shortcuts Folder/RFC/MyProduct/") under docsFolder in SharePoint.
func createSharePointShortcut(
	cfg *config.Config,
	doc *document.Document, targetWebURL string,
	s *sharepointhelper.Service,
) (shortcutID string, retErr error) {
	// Get or create folder for doc type under ShortcutsFolder
	shortcutFolderID, err := s.ResolveFolderPath(cfg.SharePoint.ShortcutsFolder)
	if err != nil {
		return "", fmt.Errorf("error resolving shortcut folder path '%s': %w", cfg.SharePoint.ShortcutsFolder, err)
	}
	docTypeFolder, err := s.GetSubfolder(shortcutFolderID, doc.DocType)
	if err != nil {
		return "", fmt.Errorf("error getting doc type subfolder: %w", err)
	}
	if docTypeFolder == nil {
		docTypeFolderID, err := s.CreateFolder(doc.DocType, shortcutFolderID)
		if err != nil {
			return "", fmt.Errorf("error creating doc type subfolder: %w", err)
		}
		docTypeFolder = &sharepointhelper.DriveItem{ID: docTypeFolderID, Name: doc.DocType}
	}

	// Get or create folder for doc type + product
	productFolder, err := s.GetSubfolder(docTypeFolder.ID, doc.Product)
	if err != nil {
		return "", fmt.Errorf("error getting product subfolder: %w", err)
	}
	if productFolder == nil {
		productFolderID, err := s.CreateFolder(doc.Product, docTypeFolder.ID)
		if err != nil {
			return "", fmt.Errorf("error creating product subfolder: %w", err)
		}
		productFolder = &sharepointhelper.DriveItem{ID: productFolderID, Name: doc.Product}
	}

	// TODO : Check if people can access the link. What type of permissions are available and how does it work with existing sharing settings of the documents?
	// Create the .url shortcut file in the product folder
	shortcutFileID, err := s.CreateShortcut(targetWebURL, doc.Title, productFolder.ID)
	if err != nil {
		return "", fmt.Errorf("error creating shortcut: %w", err)
	}

	return shortcutFileID, nil
}

// getDocumentURL returns a Hermes document URL.
func getDocumentURL(baseURL, docID string) (string, error) {
	docURL, err := url.Parse(baseURL)
	if err != nil {
		return "", fmt.Errorf("error parsing base URL: %w", err)
	}

	docURL.Path = path.Join(docURL.Path, "document", docID)
	docURLString := docURL.String()
	docURLString = strings.TrimRight(docURLString, "/")

	return docURLString, nil
}

func notifyProductSubscribers(
	srv *server.Server,
	doc *document.Document,
	docID, docURL string,
	r *http.Request,
) {
	if srv == nil || srv.Config == nil {
		return
	}

	emailCfg := srv.Config.Email
	if emailCfg == nil || !emailCfg.Enabled {
		return
	}

	from := strings.TrimSpace(emailCfg.FromAddress)
	if from == "" {
		srv.Logger.Warn("email notification skipped; from address not configured",
			"doc_id", docID,
			"method", r.Method,
			"path", r.URL.Path,
		)
		return
	}

	if len(doc.Owners) == 0 || strings.TrimSpace(doc.Owners[0]) == "" {
		srv.Logger.Warn("email notification skipped; document has no owner",
			"doc_id", docID,
			"method", r.Method,
			"path", r.URL.Path,
		)
		return
	}

	owner := strings.TrimSpace(doc.Owners[0])
	if owner == "" {
		srv.Logger.Warn("email notification skipped; document owner is blank",
			"doc_id", docID,
			"method", r.Method,
			"path", r.URL.Path,
		)
		return
	}

	productName := strings.TrimSpace(doc.Product)
	if productName == "" {
		srv.Logger.Warn("email notification skipped; document product missing",
			"doc_id", docID,
			"method", r.Method,
			"path", r.URL.Path,
		)
		return
	}

	p, err := getProductWithSubscribers(srv.DB, productName)
	if err != nil {
		srv.Logger.Error("error getting product from database",
			"error", err,
			"doc_id", docID,
			"method", r.Method,
			"path", r.URL.Path,
			"product", productName,
		)
		return
	}

	recipientsSet := map[string]struct{}{}
	recipients := []string{}
	for _, subscriber := range p.UserSubscribers {
		addr := strings.TrimSpace(subscriber.EmailAddress)
		if addr == "" {
			continue
		}
		if _, exists := recipientsSet[addr]; exists {
			continue
		}
		recipientsSet[addr] = struct{}{}
		recipients = append(recipients, addr)
	}

	if len(recipients) == 0 {
		srv.Logger.Info("no product subscribers to notify",
			"doc_id", docID,
			"method", r.Method,
			"path", r.URL.Path,
			"product", productName,
		)
		return
	}

	// Get BCC batch size from config, default to 500 (Outlook limit)
	bccBatchSize := 500
	if srv.Config.Email.BCCBatchSize > 0 {
		bccBatchSize = srv.Config.Email.BCCBatchSize
	}

	// Split recipients into batches
	batches := [][]string{}
	for i := 0; i < len(recipients); i += bccBatchSize {
		end := i + bccBatchSize
		if end > len(recipients) {
			end = len(recipients)
		}
		batches = append(batches, recipients[i:end])
	}

	srv.Logger.Info("sending subscriber notifications",
		"doc_id", docID,
		"method", r.Method,
		"path", r.URL.Path,
		"product", productName,
		"subscriber_count", len(recipients),
		"batch_count", len(batches),
		"batch_size", bccBatchSize,
	)

	// Send email to subscribers in batches using BCC.
	// This avoids hitting rate limits and recipient count limits.
	// Retry configuration is read from srv.Config.Email.Retry.
	for batchIdx, batch := range batches {
		// Capture loop variables for goroutine
		batchNum := batchIdx + 1
		batchRecipients := batch

		go helpers.SendEmailWithRetry(
			srv,
			func() error {
				return email.SendSubscriberDocumentPublishedEmailWithBCC(
					email.SubscriberDocumentPublishedEmailData{
						BaseURL:           srv.Config.BaseURL,
						DocumentOwner:     owner,
						DocumentShortName: doc.DocNumber,
						DocumentTitle:     doc.Title,
						DocumentType:      doc.DocType,
						DocumentURL:       docURL,
						Product:           productName,
					},
					[]string{from},  // Add sender as TO recipient to avoid spam filters
					batchRecipients, // Batch of subscribers in BCC
					from,
					srv.GetEmailSender(),
				)
			},
			docID,
			fmt.Sprintf("subscriber_notification_batch_%d", batchNum),
			r,
		)

		srv.Logger.Info("subscriber email batch queued for sending",
			"doc_id", docID,
			"method", r.Method,
			"path", r.URL.Path,
			"product", productName,
			"batch_number", batchNum,
			"batch_total", len(batches),
			"batch_recipient_count", len(batchRecipients),
		)
	}
}

// handleReviewPostProcessing handles the asynchronous post-processing tasks after review creation
func handleReviewPostProcessing(srv *server.Server, doc *document.Document, docID string, r *http.Request) {
	// Convert document to Algolia object.
	docObj, err := doc.ToAlgoliaObject(true)
	if err != nil {
		srv.Logger.Error("error converting document to Algolia object",
			"error", err,
			"method", r.Method,
			"path", r.URL.Path,
			"doc_id", docID,
		)
		return
	}

	// Save document object in Algolia.
	res, err := srv.AlgoWrite.Docs.SaveObject(docObj)
	if err != nil {
		srv.Logger.Error("error saving document in Algolia",
			"error", err,
			"method", r.Method,
			"path", r.URL.Path,
			"doc_id", docID,
		)
		return
	}
	err = res.Wait()
	if err != nil {
		srv.Logger.Error("error saving document in Algolia",
			"error", err,
			"method", r.Method,
			"path", r.URL.Path,
			"doc_id", docID,
		)
		return
	}

	// Delete document object from drafts Algolia index.
	delRes, err := srv.AlgoWrite.Drafts.DeleteObject(docID)
	if err != nil {
		srv.Logger.Error("error deleting draft in Algolia",
			"error", err,
			"method", r.Method,
			"path", r.URL.Path,
			"doc_id", docID,
		)
		return
	}
	err = delRes.Wait()
	if err != nil {
		srv.Logger.Error("error deleting draft in Algolia",
			"error", err,
			"method", r.Method,
			"path", r.URL.Path,
			"doc_id", docID,
		)
		return
	}

	docURL, err := getDocumentURL(srv.Config.BaseURL, docID)
	if err != nil {
		srv.Logger.Error("error getting document URL",
			"error", err,
			"method", r.Method,
			"path", r.URL.Path,
			"doc_id", docID,
		)
		return
	}

	notifyProductSubscribers(srv, doc, docID, docURL, r)

	// Compare Algolia and database documents to find data inconsistencies.
	// Get document object from Algolia.
	var algoDoc map[string]any
	err = srv.AlgoSearch.Docs.GetObject(docID, &algoDoc)
	if err != nil {
		srv.Logger.Error("error getting Algolia object for data comparison",
			"error", err,
			"method", r.Method,
			"path", r.URL.Path,
			"doc_id", docID,
		)
		return
	}
	// Get document from database.
	dbDoc := srv.NewDocumentByFileID(docID)
	if err := dbDoc.Get(srv.DB); err != nil {
		srv.Logger.Error(
			"error getting document from database for data comparison",
			"error", err,
			"path", r.URL.Path,
			"method", r.Method,
			"doc_id", docID,
		)
		return
	}
	// Get all reviews for the document.
	var reviews models.DocumentReviews
	if err := reviews.Find(srv.DB, models.DocumentReview{
		Document: srv.NewDocumentByFileID(docID),
	}); err != nil {
		srv.Logger.Error(
			"error getting all reviews for document for data comparison",
			"error", err,
			"method", r.Method,
			"path", r.URL.Path,
			"doc_id", docID,
		)
		return
	}
	if err := CompareAlgoliaAndDatabaseDocument(
		algoDoc, dbDoc, reviews, srv.Config.DocumentTypes.DocumentType,
	); err != nil {
		srv.Logger.Warn(
			"inconsistencies detected between Algolia and database docs",
			"error", err,
			"method", r.Method,
			"path", r.URL.Path,
			"doc_id", docID,
		)
	}
}

// revertReviewsPost attempts to revert the actions that occur when a review is
// created. This is to be used in the case of an error during the review-
// creation process.
func revertReviewsPost(funcs []func() error) error {
	var result *multierror.Error

	for _, fn := range funcs {
		if err := fn(); err != nil {
			result = multierror.Append(result, err)
		}
	}

	return result.ErrorOrNil()
}
