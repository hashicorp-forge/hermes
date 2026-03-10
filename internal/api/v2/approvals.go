package api

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/hashicorp-forge/hermes/internal/email"
	"github.com/hashicorp-forge/hermes/internal/helpers"
	"github.com/hashicorp-forge/hermes/internal/server"
	"github.com/hashicorp-forge/hermes/pkg/document"
	hcd "github.com/hashicorp-forge/hermes/pkg/hashicorpdocs"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"gorm.io/gorm"
)

func ApprovalsHandler(srv server.Server) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Validate request.
		docID, err := parseResourceIDFromURL(r.URL.Path, "approvals")
		if err != nil {
			srv.Logger.Error("error parsing document ID",
				"error", err,
				"method", r.Method,
				"path", r.URL.Path,
			)
			http.Error(w, "Document ID not found", http.StatusNotFound)
			return
		}

		// Get document from database.
		model := srv.NewDocumentByFileID(docID)
		if err := model.Get(srv.DB); err != nil {
			srv.Logger.Error("error getting document from database",
				"error", err,
				"path", r.URL.Path,
				"method", r.Method,
				"doc_id", docID,
			)
			http.Error(w, "Error accessing document",
				http.StatusInternalServerError)
			return
		}

		// Get reviews for the document.
		var reviews models.DocumentReviews
		if err := reviews.Find(srv.DB, models.DocumentReview{
			Document: srv.NewDocumentByFileID(docID),
		}); err != nil {
			srv.Logger.Error("error getting reviews for document",
				"error", err,
				"method", r.Method,
				"path", r.URL.Path,
				"doc_id", docID,
			)
			return
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
			return
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
			http.Error(w, "Error accessing document",
				http.StatusInternalServerError)
			return
		}

		userEmail := r.Context().Value("userEmail").(string)

		switch r.Method {
		case "HEAD":
			// Authorization probe for clients: return 200 if user can approve, else 403.
			if doc.Status != "In-Review" && doc.Status != "Approved" {
				w.WriteHeader(http.StatusForbidden)
				return
			}

			if contains(doc.ApprovedBy, userEmail) {
				srv.Logger.Warn("approval check failed: user already approved",
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
					"user_email", userEmail)
				w.WriteHeader(http.StatusForbidden)
				return
			}

			inApproverGroup, err := isUserInGroups(
				userEmail, doc.ApproverGroups, srv)
			if err != nil {
				srv.Logger.Error("error calculating if user is in an approver group",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
				)
				http.Error(w, "Error accessing document",
					http.StatusInternalServerError)
				return
			}
			if !contains(doc.Approvers, userEmail) && !inApproverGroup {
				srv.Logger.Warn("approval check failed: user not an approver",
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
					"user_email", userEmail)
				w.WriteHeader(http.StatusForbidden)
				return
			}

			w.WriteHeader(http.StatusOK)
			return
		case "DELETE":
			// Authorize request.
			if doc.Status != "In-Review" {
				srv.Logger.Warn("cannot request changes: document not in review",
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
					"user_email", userEmail,
					"status", doc.Status)
				http.Error(w,
					"Can only request changes of documents in the \"In-Review\" status",
					http.StatusBadRequest)
				return
			}
			if !contains(doc.Approvers, userEmail) {
				srv.Logger.Warn("unauthorized changes request: user not an approver",
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
					"user_email", userEmail)
				http.Error(w, "Not authorized as a document approver",
					http.StatusUnauthorized)
				return
			}
			if contains(doc.ChangesRequestedBy, userEmail) {
				srv.Logger.Warn("changes already requested by user",
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
					"user_email", userEmail)
				http.Error(w, "Document already has changes requested by user",
					http.StatusBadRequest)
				return
			}

			// Check if document is locked (Google-only: suggestions in
			// Google Docs headers can cause internal API errors).
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

			// Add email to slice of users who have requested changes of the document.
			doc.ChangesRequestedBy = append(doc.ChangesRequestedBy, userEmail)

			// If user had previously approved, delete email from slice of users who
			// have approved the document.
			var newApprovedBy []string
			for _, a := range doc.ApprovedBy {
				if a != userEmail {
					newApprovedBy = append(newApprovedBy, a)
				}
			}
			doc.ApprovedBy = newApprovedBy

			// Get latest file revision.
			var revisionID string
			if srv.SharePoint != nil {
				latestRev, err := srv.SharePoint.GetLatestVersion(docID)
				if err != nil {
					srv.Logger.Error("error getting latest revision",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID)
					http.Error(w, "Error requesting changes of document",
						http.StatusInternalServerError)
					return
				}
				revisionID = latestRev.ID
			} else {
				latestRev, err := srv.GWService.GetLatestRevision(docID)
				if err != nil {
					srv.Logger.Error("error getting latest revision",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID)
					http.Error(w, "Error requesting changes of document",
						http.StatusInternalServerError)
					return
				}
				// Mark latest revision to be kept forever.
				_, err = srv.GWService.KeepRevisionForever(docID, latestRev.Id)
				if err != nil {
					srv.Logger.Error("error marking revision to keep forever",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID,
						"rev_id", latestRev.Id)
					http.Error(w, "Error updating document status",
						http.StatusInternalServerError)
					return
				}
				revisionID = latestRev.Id
			}

			// Record file revision in the Algolia document object.
			revisionName := fmt.Sprintf("Changes requested by %s", userEmail)
			doc.SetFileRevision(revisionID, revisionName)

			// Create file revision in the database.
			fr := models.DocumentFileRevision{
				Document:       srv.NewDocumentByFileID(docID),
				FileRevisionID: revisionID,
				Name:           revisionName,
			}
			if err := fr.Create(srv.DB); err != nil {
				srv.Logger.Error("error creating document file revision",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
					"rev_id", revisionID)
				http.Error(w, "Error updating document status",
					http.StatusInternalServerError)
				return
			}

			// Update document reviews in the database.
			if err := updateDocumentReviewsInDatabase(*doc, srv.DB, srv.IsSharePoint()); err != nil {
				srv.Logger.Error("error updating document reviews in the database",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Error updating document status",
					http.StatusInternalServerError)
				return
			}

			// Replace the doc header (Google-only; SharePoint headers
			// are managed by the Hermes Add-In for Word).
			if !srv.IsSharePoint() {
				if err := doc.ReplaceHeader(
					srv.Config.BaseURL, false, srv.GWService,
				); err != nil {
					srv.Logger.Error("error replacing doc header",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path,
					)
					http.Error(w, "Error updating document status",
						http.StatusInternalServerError)
					return
				}
			}

			// Write response.
			w.WriteHeader(http.StatusOK)

			// Log success.
			srv.Logger.Info("changes requested successfully",
				"doc_id", docID,
				"method", r.Method,
				"path", r.URL.Path,
			)

			// Log document access with Datadog ACCESS tag
			srv.Logger.Info("ACCESS",
				"user_email", userEmail,
				"doc_id", docID,
				"operation", "changes_requested",
				"updated_attributes", "[changesRequestedBy, approvedBy, fileRevision]",
				"mode", "published",
			)

			// Request post-processing.
			go func() {
				// Convert document to Algolia object.
				docObj, err := doc.ToAlgoliaObject(true)
				if err != nil {
					srv.Logger.Error("error converting document to Algolia object",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID,
					)
					http.Error(w, "Error updating document status",
						http.StatusInternalServerError)
					return
				}

				// Save new modified doc object in Algolia.
				res, err := srv.AlgoWrite.Docs.SaveObject(docObj)
				if err != nil {
					srv.Logger.Error("error saving approved document in Algolia",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID)
					http.Error(w, "Error updating document status",
						http.StatusInternalServerError)
					return
				}
				err = res.Wait()
				if err != nil {
					srv.Logger.Error("error saving patched document in Algolia",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID)
					http.Error(w, "Error updating document status",
						http.StatusInternalServerError)
					return
				}

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
			}()

		case "OPTIONS":
			// Document is not in review or approved status.
			if doc.Status != "In-Review" && doc.Status != "Approved" {
				w.Header().Set("Allowed", "")
				return
			}

			// Document already approved by user.
			if contains(doc.ApprovedBy, userEmail) {
				w.Header().Set("Allowed", "")
				return
			}

			// User is not an approver or in an approver group.
			inApproverGroup, err := isUserInGroups(
				userEmail, doc.ApproverGroups, srv)
			if err != nil {
				srv.Logger.Error("error calculating if user is in an approver group",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
				)
				http.Error(w, "Error accessing document",
					http.StatusInternalServerError)
				return
			}
			if !contains(doc.Approvers, userEmail) && !inApproverGroup {
				w.Header().Set("Allowed", "")
				return
			}

			// User can approve.
			w.Header().Set("Allowed", "POST")
			return

		case "POST":
			// Authorize request.
			if doc.Status != "In-Review" && doc.Status != "Approved" {
				srv.Logger.Warn("cannot approve: document not in correct status",
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
					"user_email", userEmail,
					"status", doc.Status)
				http.Error(w,
					`Document status must be "In-Review" or "Approved" to approve`,
					http.StatusBadRequest)
				return
			}
			if contains(doc.ApprovedBy, userEmail) {
				srv.Logger.Warn("document already approved by user",
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
					"user_email", userEmail)
				http.Error(w,
					"Document already approved by user",
					http.StatusBadRequest)
				return
			}
			inApproverGroup, err := isUserInGroups(
				userEmail, doc.ApproverGroups, srv)
			if err != nil {
				srv.Logger.Error("error calculating if user is in an approver group",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
				)
				http.Error(w, "Error accessing document",
					http.StatusInternalServerError)
				return
			}
			if !contains(doc.Approvers, userEmail) && !inApproverGroup {
				srv.Logger.Warn("unauthorized approval attempt: user not an approver",
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
					"user_email", userEmail)
				http.Error(w,
					"Not authorized as a document approver",
					http.StatusUnauthorized)
				return
			}

			// Check if document is locked (Google-only: suggestions in
			// Google Docs headers can cause internal API errors).
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

			// If the user is a group approver, they won't be in the approvers list.
			if !contains(doc.Approvers, userEmail) {
				doc.Approvers = append(doc.Approvers, userEmail)

				// Add approver in database.
				model.Approvers = append(model.Approvers, &models.User{
					EmailAddress: userEmail,
				})
				if err := model.Upsert(srv.DB); err != nil {
					srv.Logger.Error(
						"error updating document in the database to add approver",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID,
					)
					http.Error(w, "Error approving document",
						http.StatusInternalServerError)
					return
				}
			}

			// Add email to slice of users who have approved the document.
			doc.ApprovedBy = append(doc.ApprovedBy, userEmail)

			// If the user had previously requested changes, delete email from slice
			// of users who have requested changes of the document.
			var newChangesRequestedBy []string
			for _, a := range doc.ChangesRequestedBy {
				if a != userEmail {
					newChangesRequestedBy = append(newChangesRequestedBy, a)
				}
			}
			doc.ChangesRequestedBy = newChangesRequestedBy

			// Get latest file revision.
			var revisionID string
			if srv.SharePoint != nil {
				latestRev, err := srv.SharePoint.GetLatestVersion(docID)
				if err != nil {
					srv.Logger.Error("error getting latest revision",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID)
					http.Error(w, "Error creating review",
						http.StatusInternalServerError)
					return
				}
				revisionID = latestRev.ID
			} else {
				latestRev, err := srv.GWService.GetLatestRevision(docID)
				if err != nil {
					srv.Logger.Error("error getting latest revision",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID)
					http.Error(w, "Error creating review",
						http.StatusInternalServerError)
					return
				}
				_, err = srv.GWService.KeepRevisionForever(docID, latestRev.Id)
				if err != nil {
					srv.Logger.Error("error marking revision to keep forever",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID,
						"rev_id", latestRev.Id)
					http.Error(w, "Error updating document status",
						http.StatusInternalServerError)
					return
				}
				revisionID = latestRev.Id
			}

			// Record file revision in the Algolia document object.
			revisionName := fmt.Sprintf("Approved by %s", userEmail)
			doc.SetFileRevision(revisionID, revisionName)

			// Create file revision in the database.
			fr := models.DocumentFileRevision{
				Document:       srv.NewDocumentByFileID(docID),
				FileRevisionID: revisionID,
				Name:           revisionName,
			}
			if err := fr.Create(srv.DB); err != nil {
				srv.Logger.Error("error creating document file revision",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
					"rev_id", revisionID)
				http.Error(w, "Error updating document status",
					http.StatusInternalServerError)
				return
			}

			// Update document reviews in the database.
			if err := updateDocumentReviewsInDatabase(*doc, srv.DB, srv.IsSharePoint()); err != nil {
				srv.Logger.Error("error updating document reviews in the database",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Error approving document",
					http.StatusInternalServerError)
				return
			}

			// Replace the doc header (Google-only; SharePoint headers
			// are managed by the Hermes Add-In for Word).
			if !srv.IsSharePoint() {
				err = doc.ReplaceHeader(srv.Config.BaseURL, false, srv.GWService)
				if err != nil {
					srv.Logger.Error("error replacing doc header",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path,
					)
					http.Error(w, "Error approving document",
						http.StatusInternalServerError)
					return
				}
			}

			// Write response.
			w.WriteHeader(http.StatusOK)

			// Log success.
			srv.Logger.Info("approval created",
				"doc_id", docID,
				"method", r.Method,
				"path", r.URL.Path,
			)

			// Log document access with Datadog ACCESS tag
			srv.Logger.Info("ACCESS",
				"user_email", userEmail,
				"doc_id", docID,
				"operation", "document_approved",
				"updated_attributes", "[approvedBy, status]",
				"mode", "published",
			)

			// Request post-processing.
			go func() {
				// Send email to document owner and approverGroup, if enabled.
				if srv.Config.Email != nil && srv.Config.Email.Enabled &&
					len(doc.Owners) > 0 {
					// Get name of document approver.
					approver := email.User{
						EmailAddress: userEmail,
					}
					if srv.SharePoint != nil {
						ppl, err := srv.SharePoint.GetPersonByEmail(userEmail)
						if err != nil {
							srv.Logger.Warn("error searching directory for approver",
								"error", err,
								"method", r.Method,
								"path", r.URL.Path,
								"doc_id", docID,
								"person", doc.Owners[0],
							)
						} else {
							approver.Name = ppl.DisplayName
						}
					} else {
						ppl, err := srv.GWService.SearchPeople(
							userEmail, "emailAddresses,names")
						if err != nil {
							srv.Logger.Warn("error searching directory for approver",
								"error", err,
								"method", r.Method,
								"path", r.URL.Path,
								"doc_id", docID,
								"person", doc.Owners[0],
							)
						} else if len(ppl) == 1 {
							approver.Name = ppl[0].Names[0].DisplayName
						}
					}

					// Get document URL.
					docURL, err := getDocumentURL(srv.Config.BaseURL, docID)
					if err != nil {
						srv.Logger.Error("error getting document URL",
							"error", err,
							"doc_id", docID,
							"method", r.Method,
							"path", r.URL.Path,
						)
					} else {
						// Build recipient set: owners + members of approver groups (deduplicated).
						recipientSet := map[string]struct{}{}
						for _, o := range doc.Owners {
							if strings.TrimSpace(o) == "" {
								continue
							}
							recipientSet[strings.ToLower(o)] = struct{}{}
						}

						// Expand approver groups to include all members.
						for _, g := range doc.ApproverGroups {
							var members []string
							var gErr error
							if srv.SharePoint != nil {
								members, gErr = srv.SharePoint.GetGroupMemberEmails(g)
							} else {
								groupMembers, err := srv.GWService.AdminDirectory.Members.List(g).Do()
								if err != nil {
									gErr = err
								} else {
									for _, m := range groupMembers.Members {
										members = append(members, m.Email)
									}
								}
							}
							if gErr != nil {
								srv.Logger.Warn("error expanding approver group members",
									"group", g,
									"error", gErr,
									"doc_id", docID,
								)
								continue
							}
							for _, m := range members {
								if strings.TrimSpace(m) == "" {
									continue
								}
								recipientSet[strings.ToLower(m)] = struct{}{}
							}
						}

						// Convert set to slice
						var recipients []string
						approverEmailLower := strings.ToLower(userEmail)
						for addr := range recipientSet {
							if addr == approverEmailLower {
								continue
							}
							recipients = append(recipients, addr)
						}

						if len(recipients) == 0 {
							srv.Logger.Warn("no recipients for approval email",
								"doc_id", docID,
								"method", r.Method,
								"path", r.URL.Path,
							)
						} else {
							go helpers.SendEmailWithRetry(
								&srv,
								func() error {
									return email.SendDocumentApprovedEmail(
										email.DocumentApprovedEmailData{
											BaseURL:                  srv.Config.BaseURL,
											DocumentOwner:            doc.Owners[0],
											DocumentApprover:         approver,
											DocumentNonApproverCount: len(doc.Approvers) - len(doc.ApprovedBy),
											DocumentShortName:        doc.DocNumber,
											DocumentTitle:            doc.Title,
											DocumentType:             doc.DocType,
											DocumentStatus:           doc.Status,
											DocumentURL:              docURL,
											Product:                  doc.Product,
										},
										recipients,
										srv.Config.Email.FromAddress,
										srv.GetEmailSender(),
									)
								},
								docID,
								"document_approved",
								r,
							)

							srv.Logger.Info("document approved email queued",
								"doc_id", docID,
								"recipient_count", len(recipients),
								"method", r.Method,
								"path", r.URL.Path,
							)
						}
					}
				} // Convert document to Algolia object.
				docObj, err := doc.ToAlgoliaObject(true)
				if err != nil {
					srv.Logger.Error("error converting document to Algolia object",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID,
					)
					http.Error(w, "Error updating document status",
						http.StatusInternalServerError)
					return
				}

				// Save new modified doc object in Algolia.
				res, err := srv.AlgoWrite.Docs.SaveObject(docObj)
				if err != nil {
					srv.Logger.Error("error saving approved document in Algolia",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID)
					http.Error(w, "Error updating document status",
						http.StatusInternalServerError)
					return
				}
				err = res.Wait()
				if err != nil {
					srv.Logger.Error("error saving approved document in Algolia",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID)
					http.Error(w, "Error updating document status",
						http.StatusInternalServerError)
					return
				}

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
			}()

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
	})
}

// updateDocumentReviewsInDatabase takes a document and updates the associated
// document reviews in the database.
func updateDocumentReviewsInDatabase(doc document.Document, db *gorm.DB, useSharePoint bool) error {
	var docReviews []models.DocumentReview
	for _, a := range doc.Approvers {
		u := models.User{
			EmailAddress: a,
		}
		if helpers.StringSliceContains(doc.ApprovedBy, a) {
			docReviews = append(docReviews, models.DocumentReview{
				Document: models.NewDocumentByFileID(doc.ObjectID, useSharePoint),
				User:     u,
				Status:   models.ApprovedDocumentReviewStatus,
			})
		} else if helpers.StringSliceContains(doc.ChangesRequestedBy, a) {
			docReviews = append(docReviews, models.DocumentReview{
				Document: models.NewDocumentByFileID(doc.ObjectID, useSharePoint),
				User:     u,
				Status:   models.ChangesRequestedDocumentReviewStatus,
			})
		}
	}

	// Upsert document reviews in database.
	for _, dr := range docReviews {
		if err := dr.Update(db); err != nil {
			return fmt.Errorf("error upserting document review: %w", err)
		}
	}

	return nil
}
