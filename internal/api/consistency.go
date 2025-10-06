package api

import (
	"context"
	"encoding/json"
	"fmt"
	"reflect"
	"regexp"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp-forge/hermes/pkg/search"
	"github.com/hashicorp/go-hclog"
	"github.com/hashicorp/go-multierror"
	"github.com/iancoleman/strcase"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

// DocumentConsistencyChecker validates documents across storage layers.
type DocumentConsistencyChecker struct {
	searchProvider search.Provider
	db             *gorm.DB
	logger         hclog.Logger
	docTypes       []*config.DocumentType
}

// CheckOptions configures consistency validation.
type CheckOptions struct {
	// ValidateOwners ensures the document has owners in the search index.
	ValidateOwners bool

	// ValidateContributors ensures the document has contributors in the search index.
	ValidateContributors bool

	// ValidateProduct ensures the document has a product association.
	ValidateProduct bool

	// ValidateReviews compares review data between search and database.
	ValidateReviews bool

	// StrictMode returns an error instead of just logging warnings.
	StrictMode bool
}

// NewDocumentConsistencyChecker creates a new consistency checker.
func NewDocumentConsistencyChecker(
	searchProvider search.Provider,
	db *gorm.DB,
	logger hclog.Logger,
	docTypes []*config.DocumentType,
) *DocumentConsistencyChecker {
	return &DocumentConsistencyChecker{
		searchProvider: searchProvider,
		db:             db,
		logger:         logger,
		docTypes:       docTypes,
	}
}

// CheckDocumentConsistency validates a document across search and database.
// This replaces the legacy compareAlgoliaAndDatabaseDocument function with
// a provider-agnostic implementation.
func (c *DocumentConsistencyChecker) CheckDocumentConsistency(
	ctx context.Context,
	docID string,
	opts CheckOptions,
) error {
	// Get document from search index.
	searchDoc, err := c.searchProvider.DocumentIndex().GetObject(ctx, docID)
	if err != nil {
		return fmt.Errorf("search index lookup failed: %w", err)
	}

	// Convert search document to map for compatibility with validation logic.
	searchDocBytes, err := json.Marshal(searchDoc)
	if err != nil {
		return fmt.Errorf("error marshaling search document: %w", err)
	}
	var searchDocMap map[string]any
	if err := json.Unmarshal(searchDocBytes, &searchDocMap); err != nil {
		return fmt.Errorf("error unmarshaling search document: %w", err)
	}

	// Get document from database with all necessary preloads.
	var dbDoc models.Document
	if err := c.db.Where("google_file_id = ?", docID).
		Preload("Product").
		Preload("DocumentType").
		Preload("Owner").
		Preload("Approvers").
		Preload("Contributors").
		Preload("CustomFields").
		Preload("CustomFields.DocumentTypeCustomField").
		Preload("FileRevisions").
		First(&dbDoc).Error; err != nil {
		return fmt.Errorf("database lookup failed: %w", err)
	}

	// Get document reviews if validation is requested.
	var dbDocReviews models.DocumentReviews
	if opts.ValidateReviews {
		if err := c.db.
			Preload("User").
			Where(&models.DocumentReview{
				Document: models.Document{
					GoogleFileID: docID,
				},
			}).
			Find(&dbDocReviews).Error; err != nil {
			return fmt.Errorf("error getting document reviews: %w", err)
		}
	}

	// Perform comprehensive comparison using the same logic as the legacy function.
	err = c.compareDocuments(searchDocMap, dbDoc, dbDocReviews)

	if err != nil {
		if opts.StrictMode {
			return err
		}
		// In non-strict mode, just log warnings.
		c.logger.Warn("document consistency check found issues",
			"doc_id", docID,
			"error", err,
		)
	}

	// Perform additional validation checks based on options.
	if opts.ValidateOwners {
		owners, _ := getStringSliceValue(searchDocMap, "owners")
		if len(owners) == 0 {
			err := fmt.Errorf("document %s missing owners in search index", docID)
			if opts.StrictMode {
				return err
			}
			c.logger.Warn("document missing owners", "doc_id", docID)
		}
	}

	if opts.ValidateContributors {
		contributors, _ := getStringSliceValue(searchDocMap, "contributors")
		if len(contributors) == 0 {
			c.logger.Warn("document missing contributors", "doc_id", docID)
		}
	}

	if opts.ValidateProduct {
		product, _ := getStringValue(searchDocMap, "product")
		if product == "" {
			err := fmt.Errorf("document %s missing product in search index", docID)
			if opts.StrictMode {
				return err
			}
			c.logger.Warn("document missing product in search", "doc_id", docID)
		}
		if dbDoc.Product.Name == "" {
			err := fmt.Errorf("document %s missing product in database", docID)
			if opts.StrictMode {
				return err
			}
			c.logger.Warn("document missing product in database", "doc_id", docID)
		}
	}

	return nil
}

// compareDocuments performs detailed comparison between search and database documents.
// This is the provider-agnostic version of compareAlgoliaAndDatabaseDocument.
func (c *DocumentConsistencyChecker) compareDocuments(
	searchDoc map[string]any,
	dbDoc models.Document,
	dbDocReviews models.DocumentReviews,
) error {
	var result *multierror.Error

	// Compare objectID.
	searchGoogleFileID, err := getStringValue(searchDoc, "objectID")
	if err != nil {
		result = multierror.Append(
			result, fmt.Errorf("error getting objectID value: %w", err))
	}
	if searchGoogleFileID != dbDoc.GoogleFileID {
		result = multierror.Append(result,
			fmt.Errorf(
				"objectID not equal, search=%v, db=%v",
				searchGoogleFileID, dbDoc.GoogleFileID),
		)
	}

	// Compare title.
	searchTitle, err := getStringValue(searchDoc, "title")
	if err != nil {
		result = multierror.Append(
			result, fmt.Errorf("error getting title value: %w", err))
	} else {
		if searchTitle != dbDoc.Title {
			result = multierror.Append(result,
				fmt.Errorf(
					"title not equal, search=%v, db=%v",
					searchTitle, dbDoc.Title),
			)
		}
	}

	// Compare docType.
	searchDocType, err := getStringValue(searchDoc, "docType")
	if err != nil {
		result = multierror.Append(
			result, fmt.Errorf("error getting docType value: %w", err))
	} else {
		dbDocType := dbDoc.DocumentType.Name
		if searchDocType != dbDocType {
			result = multierror.Append(result,
				fmt.Errorf(
					"docType not equal, search=%v, db=%v",
					searchDocType, dbDocType),
			)
		}
	}

	// Compare docNumber.
	searchDocNumber, err := getStringValue(searchDoc, "docNumber")
	if err != nil {
		result = multierror.Append(
			result, fmt.Errorf("error getting docNumber value: %w", err))
	} else {
		// Replace "-???" (how draft doc numbers are defined in search) with a zero.
		re := regexp.MustCompile(`-\?\?\?$`)
		searchDocNumber = re.ReplaceAllString(searchDocNumber, "-000")

		var dbDocNumber string
		// If document number in search isn't empty, build the database document number.
		if searchDocNumber != "" {
			dbDocNumber = fmt.Sprintf(
				"%s-%03d", dbDoc.Product.Abbreviation, dbDoc.DocumentNumber)
		}
		if searchDocNumber != dbDocNumber {
			// Some legacy documents may not have the three digit number padding.
			dbDocNumberNoPadding := fmt.Sprintf(
				"%s-%d", dbDoc.Product.Abbreviation, dbDoc.DocumentNumber)
			if searchDocNumber != dbDocNumberNoPadding {
				result = multierror.Append(result,
					fmt.Errorf(
						"docNumber not equal, search=%v, db=%v",
						searchDocNumber, dbDocNumber),
				)
			}
		}
	}

	// Compare appCreated.
	searchAppCreated, err := getBooleanValue(searchDoc, "appCreated")
	if err != nil {
		result = multierror.Append(
			result, fmt.Errorf("error getting appCreated value: %w", err))
	} else {
		dbAppCreated := !dbDoc.Imported
		if searchAppCreated != dbAppCreated {
			result = multierror.Append(result,
				fmt.Errorf(
					"appCreated not equal, search=%v, db=%v",
					searchAppCreated, dbAppCreated),
			)
		}
	}

	// Compare approvedBy.
	searchApprovedBy, err := getStringSliceValue(searchDoc, "approvedBy")
	if err != nil {
		result = multierror.Append(
			result, fmt.Errorf("error getting approvedBy value: %w", err))
	}
	dbApprovedBy := []string{}
	for _, r := range dbDocReviews {
		if r.Status == models.ApprovedDocumentReviewStatus {
			dbApprovedBy = append(dbApprovedBy, r.User.EmailAddress)
		}
	}
	if !assert.ElementsMatch(fakeT{}, searchApprovedBy, dbApprovedBy) {
		result = multierror.Append(result,
			fmt.Errorf(
				"approvedBy not equal, search=%v, db=%v",
				searchApprovedBy, dbApprovedBy),
		)
	}

	// Compare approvers.
	searchApprovers, err := getStringSliceValue(searchDoc, "approvers")
	if err != nil {
		result = multierror.Append(
			result, fmt.Errorf("error getting approvers value: %w", err))
	}
	dbApprovers := []string{}
	for _, a := range dbDoc.Approvers {
		dbApprovers = append(dbApprovers, a.EmailAddress)
	}
	if !assert.ElementsMatch(fakeT{}, searchApprovers, dbApprovers) {
		result = multierror.Append(result,
			fmt.Errorf(
				"approvers not equal, search=%v, db=%v",
				searchApprovers, dbApprovers),
		)
	}

	// Compare changesRequestedBy.
	searchChangesRequestedBy, err := getStringSliceValue(
		searchDoc, "changesRequestedBy")
	if err != nil {
		result = multierror.Append(
			result, fmt.Errorf("error getting changesRequestedBy value: %w", err))
	}
	dbChangesRequestedBy := []string{}
	for _, r := range dbDocReviews {
		if r.Status == models.ChangesRequestedDocumentReviewStatus {
			dbChangesRequestedBy = append(dbChangesRequestedBy, r.User.EmailAddress)
		}
	}
	if !assert.ElementsMatch(
		fakeT{}, searchChangesRequestedBy, dbChangesRequestedBy,
	) {
		result = multierror.Append(result,
			fmt.Errorf(
				"changesRequestedBy not equal, search=%v, db=%v",
				searchChangesRequestedBy, dbChangesRequestedBy),
		)
	}

	// Compare contributors.
	searchContributors, err := getStringSliceValue(searchDoc, "contributors")
	if err != nil {
		result = multierror.Append(
			result, fmt.Errorf("error getting contributors value: %w", err))
	}
	dbContributors := []string{}
	for _, c := range dbDoc.Contributors {
		dbContributors = append(dbContributors, c.EmailAddress)
	}
	if !assert.ElementsMatch(fakeT{}, searchContributors, dbContributors) {
		result = multierror.Append(result,
			fmt.Errorf(
				"contributors not equal, search=%v, db=%v",
				searchContributors, dbContributors),
		)
	}

	// Compare createdTime.
	searchCreatedTime, err := getInt64Value(searchDoc, "createdTime")
	if err != nil {
		result = multierror.Append(
			result, fmt.Errorf("error getting createdTime value: %w", err))
	} else {
		dbCreatedTime := dbDoc.DocumentCreatedAt.Unix()
		if searchCreatedTime != dbCreatedTime {
			result = multierror.Append(result,
				fmt.Errorf(
					"createdTime not equal, search=%v, db=%v",
					searchCreatedTime, dbCreatedTime),
			)
		}
	}

	// Compare custom fields.
	foundDocType := false
	for _, dt := range c.docTypes {
		if dt.Name == searchDocType {
			foundDocType = true
			for _, cf := range dt.CustomFields {
				searchCFName := strcase.ToLowerCamel(cf.Name)

				switch cf.Type {
				case "string":
					searchCFVal, err := getStringValue(searchDoc, searchCFName)
					if err != nil {
						result = multierror.Append(
							result, fmt.Errorf(
								"error getting custom field (%s) value: %w", searchCFName, err))
					} else {
						var dbCFVal string
						for _, c := range dbDoc.CustomFields {
							if c.DocumentTypeCustomField.Name == cf.Name {
								dbCFVal = c.Value
								break
							}
						}
						if searchCFVal != dbCFVal {
							result = multierror.Append(result,
								fmt.Errorf(
									"custom field %s not equal, search=%v, db=%v",
									searchCFName, searchCFVal, dbCFVal),
							)
						}
					}
				case "people":
					searchCFVal, err := getStringSliceValue(searchDoc, searchCFName)
					if err != nil {
						result = multierror.Append(
							result, fmt.Errorf(
								"error getting custom field (%s) value: %w", searchCFName, err))
					} else {
						var dbCFVal []string
						for _, c := range dbDoc.CustomFields {
							if c.DocumentTypeCustomField.Name == cf.Name {
								// Unmarshal person custom field value to string slice.
								if err := json.Unmarshal(
									[]byte(c.Value), &dbCFVal,
								); err != nil {
									result = multierror.Append(result,
										fmt.Errorf(
											"error unmarshaling custom field %s to string slice",
											searchCFName),
									)
								}
								break
							}
						}
						if !assert.ElementsMatch(fakeT{}, searchCFVal, dbCFVal) {
							result = multierror.Append(result,
								fmt.Errorf(
									"custom field %s not equal, search=%v, db=%v",
									searchCFName, searchCFVal, dbCFVal),
							)
						}
					}
				default:
					result = multierror.Append(result,
						fmt.Errorf(
							"unknown type for custom field key %q: %s", dt.Name, cf.Type))
				}
			}
			break
		}
	}
	if !foundDocType {
		result = multierror.Append(result,
			fmt.Errorf(
				"doc type %q not found", searchDocType))
	}

	// Compare fileRevisions.
	searchFileRevisions, err := getMapStringStringValue(searchDoc, "fileRevisions")
	if err != nil {
		result = multierror.Append(
			result, fmt.Errorf("error getting fileRevisions value: %w", err))
	} else {
		dbFileRevisions := make(map[string]string)
		for _, fr := range dbDoc.FileRevisions {
			dbFileRevisions[fr.GoogleDriveFileRevisionID] = fr.Name
		}
		if !reflect.DeepEqual(searchFileRevisions, dbFileRevisions) {
			result = multierror.Append(result,
				fmt.Errorf(
					"fileRevisions not equal, search=%v, db=%v",
					searchFileRevisions, dbFileRevisions),
			)
		}
	}

	// Compare modifiedTime.
	searchModifiedTime, err := getInt64Value(searchDoc, "modifiedTime")
	if err != nil {
		result = multierror.Append(
			result, fmt.Errorf("error getting modifiedTime value: %w", err))
	} else {
		dbModifiedTime := dbDoc.DocumentModifiedAt.Unix()
		if searchModifiedTime != dbModifiedTime {
			result = multierror.Append(result,
				fmt.Errorf(
					"modifiedTime not equal, search=%v, db=%v",
					searchModifiedTime, dbModifiedTime),
			)
		}
	}

	// Compare owner.
	searchOwners, err := getStringSliceValue(searchDoc, "owners")
	if err != nil {
		result = multierror.Append(
			result, fmt.Errorf("error getting owners value: %w", err))
	} else {
		var searchOwner, dbOwner string
		if dbDoc.Owner != nil {
			dbOwner = dbDoc.Owner.EmailAddress
		}
		if len(searchOwners) > 0 {
			searchOwner = searchOwners[0]
		}
		if searchOwner != dbOwner {
			result = multierror.Append(result,
				fmt.Errorf(
					"owners not equal, search=%#v, db=%#v",
					searchOwner, dbOwner),
			)
		}
	}

	// Compare product.
	searchProduct, err := getStringValue(searchDoc, "product")
	if err != nil {
		result = multierror.Append(
			result, fmt.Errorf("error getting product value: %w", err))
	} else {
		dbProduct := dbDoc.Product.Name
		if searchProduct != dbProduct {
			result = multierror.Append(result,
				fmt.Errorf(
					"product not equal, search=%v, db=%v",
					searchProduct, dbProduct),
			)
		}
	}

	// Compare status.
	searchStatus, err := getStringValue(searchDoc, "status")
	if err != nil {
		result = multierror.Append(
			result, fmt.Errorf("error getting status value: %w", err))
	} else {
		var dbStatus string
		switch dbDoc.Status {
		case models.WIPDocumentStatus:
			dbStatus = "WIP"
		case models.InReviewDocumentStatus:
			dbStatus = "In-Review"
		case models.ApprovedDocumentStatus:
			dbStatus = "Approved"
		case models.ObsoleteDocumentStatus:
			dbStatus = "Obsolete"
		}

		// Standardize on "In-Review" status for the sake of comparison.
		if searchStatus == "In Review" {
			searchStatus = "In-Review"
		}

		if searchStatus != dbStatus {
			result = multierror.Append(result,
				fmt.Errorf(
					"status not equal, search=%v, db=%v",
					searchStatus, dbStatus),
			)
		}
	}

	// Compare summary.
	searchSummary, err := getStringValue(searchDoc, "summary")
	if err != nil {
		result = multierror.Append(
			result, fmt.Errorf("error getting summary value: %w", err))
	} else {
		dbSummary := dbDoc.Summary
		if dbSummary != nil && searchSummary != *dbSummary {
			result = multierror.Append(result,
				fmt.Errorf(
					"summary not equal, search=%v, db=%v",
					searchSummary, *dbSummary),
			)
		}
	}

	return result.ErrorOrNil()
}
