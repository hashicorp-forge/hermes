package api

import (
	"fmt"
	"net/http"

	"github.com/hashicorp/go-hclog"
)

func MeHandler(
	l hclog.Logger,
) http.Handler {

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		errResp := func(httpCode int, userErrMsg, logErrMsg string, err error) {
			l.Error(logErrMsg,
				"method", r.Method,
				"path", r.URL.Path,
				"error", err,
			)
			errJSON := fmt.Sprintf(`{"error": "%s"}`, userErrMsg)
			http.Error(w, errJSON, httpCode)
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
		// The HEAD method is used to determine if the user is currently
		// authenticated.
		case "HEAD":
			w.WriteHeader(http.StatusOK)
			return

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
	})
}
