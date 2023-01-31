package links

import (
	"fmt"
	"strings"

	"github.com/hashicorp-forge/hermes/pkg/algolia"
)

// DeleteDocumentRedirectDetails deletes document redirect details from Algolia.
func DeleteDocumentRedirectDetails(
	algo *algolia.Client, id string, docType string, docNumString string) error {

	if docNumString != "" && docType != "" {
		objectID := getObjectID(docType, docNumString)
		res, err := algo.Links.DeleteObject(objectID)
		if err != nil {
			return fmt.Errorf("error deleting redirect link details: %w", err)
		}
		err = res.Wait()
		if err != nil {
			return fmt.Errorf("error deleting redirect link details: %w", err)
		}
	}

	return nil
}

// SaveDocumentRedirectDetails saves the short path of the document as the key
// and the document ID as the value in Algolia.
func SaveDocumentRedirectDetails(
	algo *algolia.Client, id string, docType string, docNumString string) error {

	var ld LinkData

	// Save redirect details when document number {product-abbreviation}-{docnumber} is set
	if docNumString != "" {
		// Save object id as /doctype/{product_abbreviation-docnumber}. Eg. /rfc/lab-001
		ld.ObjectID = getObjectID(docType, docNumString)
		// Save id of the document
		ld.DocumentID = id
		res, err := algo.Links.SaveObject(&ld)
		if err != nil {
			return fmt.Errorf("error saving redirect link details: %w", err)
		}
		err = res.Wait()
		if err != nil {
			return fmt.Errorf("error saving redirect link details: %w", err)
		}
	}

	return nil
}

// getObjectID builds the ID for a document redirect details object in Algolia.
// Object ID's format is: /doctype/{product_abbreviation-docnumber}
// (e.g., "/rfc/lab-001").
func getObjectID(docType, docNumString string) string {
	return fmt.Sprintf(
		"/%s/%s",
		strings.ToLower(docType),
		strings.ToLower(docNumString))
}
