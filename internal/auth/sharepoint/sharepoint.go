package sharepoint

import (
	"context"
	"fmt"
	"net/http"

	sp "github.com/hashicorp-forge/hermes/pkg/sharepointhelper"
	"github.com/hashicorp/go-hclog"
)

// AuthenticateRequest authenticates an HTTP request using SharePoint.
func AuthenticateRequest(
	spSvc *sp.Service, log hclog.Logger, next http.Handler,
) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Println("AuthenticateRequest function called")
		log.Info("AuthenticateRequest function called")

		// Validate SharePoint token or session
		//userEmail, err := spSvc.ValidateToken(r.Header.Get("Authorization"))
		accessToken, _ := spSvc.GetToken()
		userEmail, err := spSvc.ValidateToken(accessToken)
		if err != nil {
			log.Error("SharePoint authentication failed", "error", err)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		fmt.Println("SharePoint authentication successful, userEmail:", userEmail)
		log.Info("SharePoint authentication successful", "userEmail", userEmail)
		// Add userEmail to the request context
		ctx := r.Context()
		ctx = context.WithValue(ctx, "userEmail", userEmail)
		r = r.WithContext(ctx)

		// Proceed to the next handler
		next.ServeHTTP(w, r)
	})
}
