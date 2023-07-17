package api

import (
	"encoding/json"
	"fmt"
	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	gw "github.com/hashicorp-forge/hermes/pkg/googleworkspace"
	hcd "github.com/hashicorp-forge/hermes/pkg/hashicorpdocs"
	"github.com/hashicorp/go-hclog"
	"gorm.io/gorm"
	"net/http"
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
