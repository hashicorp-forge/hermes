package api

import (
	"encoding/json"
	"net/http"

	"github.com/hashicorp-forge/hermes/internal/server"
)

func DocumentTypesHandler(srv server.Server) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			w.Header().Set("Content-Type", "application/json")

			enc := json.NewEncoder(w)
			err := enc.Encode(srv.Config.DocumentTypes.DocumentType)
			if err != nil {
				srv.Logger.Error("error encoding document types",
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
