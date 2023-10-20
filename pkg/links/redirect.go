package links

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/hashicorp-forge/hermes/pkg/algolia"
	"github.com/hashicorp/go-hclog"
)

// sharedRFCsFolderURL is the Google Drive URL to the shared RFCs folder
const sharedRFCsFolderURL = "https://drive.google.com/drive/folders/0AJA7q1x_uaLUUk9PVA"

// sharedPRDsFolderURL is the Google Drive URL to the shared PRDs folder
const sharedPRDsFolderURL = "https://drive.google.com/drive/folders/0AJvQodV_kfUeUk9PVA"

type LinkData struct {
	// ObjectID is the short link path
	ObjectID string `json:"objectID,omitempty"`
	// DocumentID is the ID to the document
	DocumentID string `json:"documentID,omitempty"`
}

// RedirectHandler handles redirects from Hashilinks
func RedirectHandler(algo *algolia.Client, algoCfg *algolia.Config, log hclog.Logger) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Only allow GET requests.
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		// Check if the path matches exact paths such as "/l/rfc", "/l/rfc/", "/l/prd"
		// or "/l/prd/". If so, redirect to the appropriate Google Drive shared
		// folder URL. This is to support short link paths that existed in Hashilinks.
		// Eg. https://go.hashi.co/rfc, https://go.hashi.co/prd.
		redirectURL := matchStaticPathRedirects(r.URL.Path)
		if redirectURL != "" {
			http.Redirect(w, r, redirectURL, http.StatusTemporaryRedirect)
			return
		}

		// Parse url path and validate
		p, err := parseAndValidatePath(r.URL.Path)
		if err != nil {
			log.Error("invalid url path", "error", err)
			http.Error(w, "Invalid url path", http.StatusBadRequest)
			return
		}

		// Get document associated with the short link path from Algolia
		ld := LinkData{
			ObjectID: p,
		}

		err = algo.Links.GetObject(p, &ld)
		if err != nil {
			log.Error("error getting redirect link from algolia", "error", err, "id", p)
			http.Error(w, "Error getting redirect link", http.StatusInternalServerError)
			return
		}

		// Redirect request
		if ld.DocumentID != "" {
			redirectPath := fmt.Sprintf("/document/%s", ld.DocumentID)
			log.Info("document id for short link found",
				"short_path", p,
				"document_id", ld.DocumentID,
				"redirect_path", redirectPath,
			)
			http.Redirect(w, r, redirectPath, http.StatusTemporaryRedirect)
		}
	})
}

// parseAndValidatePath parses the short URL that is requested on "/l"
// route that has the format /l/doctype/product-docnumber and validates
// that the path has only two fields and removes the "/l" prefix to help
// get a valid short URL key to perform a look up in Algolia
func parseAndValidatePath(p string) (string, error) {
	// Remove redirect url path "/l"
	p = strings.TrimPrefix(p, "/l")

	// Remove empty entries and validate path
	urlPath := strings.Split(p, "/")
	var resultPath []string
	for _, v := range urlPath {
		// Only append non-empty values, this remove
		// any empty strings in the slice
		if v != "" {
			resultPath = append(resultPath, v)
		}
	}
	// Check if there are only two fields in the resultPath slice
	// Eg. The path /rfc/lab-001 will have ["rfc", "lab-001"]
	// otherwise, the path is invalid
	if len(resultPath) != 2 {
		return "", fmt.Errorf("invalid url path")
	}

	return fmt.Sprintf("/%s/%s",
		strings.ToLower(resultPath[0]), strings.ToLower(resultPath[1])), nil
}

// matchStaticPathRedirects matches the URL path provided
// with string paths and returns the appropriate
// redirect URL
func matchStaticPathRedirects(p string) string {
	switch {
	case p == "/l/rfc" || p == "/l/rfc/":
		return sharedRFCsFolderURL
	case p == "/l/prd" || p == "/l/prd/":
		return sharedPRDsFolderURL
	}
	return ""
}
