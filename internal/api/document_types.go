package api

import (
	"encoding/json"
	"net/http"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp/go-hclog"
)

func DocumentTypesHandler(cfg config.Config, log hclog.Logger) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			w.Header().Set("Content-Type", "application/json")

			enc := json.NewEncoder(w)
			err := enc.Encode(cfg.DocumentTypes.DocumentType)
			if err != nil {
				log.Error("error encoding document types",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path)
				http.Error(w, "{\"error\": \"Error getting document types\"}",
					http.StatusInternalServerError)
				return
			}

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
	})
}
