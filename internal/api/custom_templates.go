package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	gw "github.com/hashicorp-forge/hermes/pkg/googleworkspace"
	hcd "github.com/hashicorp-forge/hermes/pkg/hashicorpdocs"
	"github.com/hashicorp/go-hclog"
	"gorm.io/gorm"
)

type TemplateRequest struct {
	Description  string `json:"description,omitempty"`
	TemplateName string `json:"templateName"`
	DocId        string `json:"docId"`
	LongName     string `json:"longName"`
}
type TemplateResponse struct {
	ID string `json:"id"`
}

// TemplatePatchRequest contains a subset of Template fields that are allowed to
// be updated with a PATCH request.
type TemplatePatchRequest struct {
	TemplateName string `json:"templateName,omitempty"`
	LongName     string `json:"longName,omitempty"`
	Description  string `json:"description,omitempty"`
	DocId        string `json:"docId,omitempty"`
}

func TemplateHandler(
	cfg *config.Config,
	l hclog.Logger,
	ar *algolia.Client,
	aw *algolia.Client,
	s *gw.Service,
	db *gorm.DB) http.Handler {

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		errResp := func(httpCode int, userErrMsg, logErrMsg string, err error) {
			l.Error(logErrMsg,
				"method", r.Method,
				"path", r.URL.Path,
				"error", err,
			)
			http.Error(w, userErrMsg, httpCode)
		}

		// Authorize request.
		userEmail := r.Context().Value("userEmail").(string)
		if userEmail == "" {
			errResp(
				http.StatusUnauthorized,
				"No authorization information for request",
				"no user email found in request context",
				nil,
			)
			return
		}

		switch r.Method {
		case "POST":
			// Decode request.
			var req TemplateRequest
			if err := decodeRequest(r, &req); err != nil {
				l.Error("error decoding drafts request", "error", err)
				http.Error(w, fmt.Sprintf("Bad request: %q", err),
					http.StatusBadRequest)
				return
			}

			// template name cannot be empty
			if req.TemplateName == "" {
				http.Error(w, "Bad request: template is required", http.StatusBadRequest)
				return
			}

			// a object of base doc
			baseTemplateObj := &hcd.BaseTemplate{
				TemplateName: req.TemplateName,
				Description:  req.Description,
				DocId:        req.DocId,
				LongName:     req.LongName,
			}

			res, err := aw.Template.SaveObject(baseTemplateObj)
			if err != nil {
				l.Error("error saving template in Algolia", "error", err)
				http.Error(w, "Error creating template",
					http.StatusInternalServerError)
				return
			}
			err = res.Wait()
			if err != nil {
				l.Error("error saving template in Algolia", "error", err)
				http.Error(w, "Error creating template",
					http.StatusInternalServerError)
				return
			}

			// TODO: Delete draft file in the case of an error.

			// Write response.
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)

			resp := &TemplateResponse{
				ID: req.TemplateName,
			}

			enc := json.NewEncoder(w)
			err = enc.Encode(resp)
			if err != nil {
				l.Error("error encoding template response", "error", err)
				http.Error(w, "Error creating template",
					http.StatusInternalServerError)
				return
			}

			l.Info("created template")
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
	})

}

func TemplateUpdateDeleteHandler(
	cfg *config.Config,
	l hclog.Logger,
	ar *algolia.Client,
	aw *algolia.Client,
	s *gw.Service,
	db *gorm.DB) http.Handler {

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get document ID from URL path
		ObjectID, err := parseURLPath(r.URL.Path, "/api/v1/custom-template")
		if err != nil {
			l.Error("error requesting template from algolia",
				"error", err,
				"path", r.URL.Path,
			)
			http.Error(w, "Error requesting template", http.StatusInternalServerError)
			return
		}

		switch r.Method {
		case "DELETE":

			// Delete object in Algolia
			res, err := aw.Template.DeleteObject(ObjectID)
			if err != nil {
				l.Error("error deleting document draft from algolia",
					"error", err,
					"doc_id", ObjectID,
				)
				http.Error(w, "Error deleting document draft",
					http.StatusInternalServerError)
				return
			}
			err = res.Wait()
			if err != nil {
				l.Error("error deleting template from algolia",
					"error", err,
					"doc_id", ObjectID,
				)
				http.Error(w, "Error deleting template",
					http.StatusInternalServerError)
				return
			}

			resp := &DraftsResponse{
				ID: ObjectID,
			}

			// Write response.
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)

			enc := json.NewEncoder(w)
			err = enc.Encode(resp)
			if err != nil {
				l.Error("error encoding document id", "error", err, "templateObjectId", ObjectID)
				http.Error(w, "Error deleting document draft",
					http.StatusInternalServerError)
				return
			}
		case "PATCH":
			// Copy request body so we can use both for validation using the request
			// struct, and then afterwards for patching the document JSON.
			buf, err := ioutil.ReadAll(r.Body)
			if err != nil {
				l.Error("error reading request body",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"object_id", ObjectID)
				http.Error(w, "Error patching template",
					http.StatusInternalServerError)
				return
			}
			// body := ioutil.NopCloser(bytes.NewBuffer(buf))
			newBody := ioutil.NopCloser(bytes.NewBuffer(buf))
			r.Body = newBody

			// Decode request. The request struct validates that the request only
			// contains fields that are allowed to be patched.
			var req TemplatePatchRequest
			if err := decodeRequest(r, &req); err != nil {
				l.Error("error decoding draft patch request", "error", err)
				http.Error(w, fmt.Sprintf("Bad request: %q", err),
					http.StatusBadRequest)
				return
			}

			// fmt.Printf("body: %v\n", body)
			// fmt.Printf("req: %v\n", req)

			type template struct {
				ObjectID string `json:"objectID"`
				TemplateName string `json:"templateName"`
				LongName string `json:"longName"`
				Description string `json:"description"`
				DocId string `json:"docId"`
			}
			
			updateObj := template{
				ObjectID: ObjectID,
				TemplateName: req.TemplateName,
				LongName: req.LongName,
				Description: req.Description,
				DocId: req.DocId,
			}
			
			res, err := aw.Template.PartialUpdateObject(updateObj)

			err = res.Wait()
			if err != nil {
				l.Error("error updating template in algolia",
					"error", err,
					"object_id", ObjectID,
				)
				http.Error(w, "Error deleting template",
					http.StatusInternalServerError)
				return
			}


			w.WriteHeader(http.StatusOK)
			l.Info("patched draft document", "object_id", ObjectID)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
	})
}
