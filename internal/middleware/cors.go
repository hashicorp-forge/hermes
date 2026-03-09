package middleware

import (
	"net/http"
	"strings"

	"github.com/hashicorp/go-hclog"
)

// CorsMiddleware adds CORS headers to responses
func CorsMiddleware(log hclog.Logger, next http.Handler) http.Handler {
	return CorsMiddlewareWithConfig(log, next, true)
}

// CorsMiddlewareWithConfig adds CORS headers to responses with configurable development mode
func CorsMiddlewareWithConfig(log hclog.Logger, next http.Handler, isDevelopment bool) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get the Origin header
		origin := r.Header.Get("Origin")

		var isAllowed bool

		if isDevelopment {
			// Development mode: be permissive with CORS for local development and Office 365 add-ins
			allowedOrigins := []string{
				"http://localhost:3000",
				"https://localhost:3000",
				"https://localhost:8443",
				"http://localhost:8443",
				"https://localhost:8000",
				"http://localhost:8000",
			}

			// Check explicit allowed origins
			for _, allowedOrigin := range allowedOrigins {
				if origin == allowedOrigin {
					isAllowed = true
					break
				}
			}

			// Allow localhost origins in development
			if !isAllowed && (strings.Contains(origin, "localhost") || strings.Contains(origin, "127.0.0.1")) {
				isAllowed = true
			}

			// Allow Office 365 origins and browser extensions for development
			if !isAllowed && (strings.Contains(origin, "officeapps.live.com") ||
				strings.Contains(origin, "office.com") ||
				strings.Contains(origin, "sharepoint.com") ||
				strings.HasPrefix(origin, "moz-extension://") ||
				strings.HasPrefix(origin, "chrome-extension://") ||
				strings.HasPrefix(origin, "ms-appx-web://") ||
				origin == "" || origin == "null") {
				isAllowed = true
			}
		} else {
			// Production mode: only allow same-origin requests and specific Office 365 domains
			if origin == "" || origin == "null" {
				// Allow requests with no origin (same-origin requests, Office add-ins in iframe)
				isAllowed = true
			} else if strings.Contains(origin, "officeapps.live.com") ||
				strings.Contains(origin, "office.com") ||
				strings.Contains(origin, "sharepoint.com") {
				// Allow Office 365 origins in production for Word Add-in
				isAllowed = true
			}
			// In production, all other cross-origin requests are denied
		}

		// Set CORS headers for allowed origins
		if isAllowed {
			// Handle null/empty origin case for Firefox add-ins
			allowOrigin := origin
			if origin == "" || origin == "null" {
				allowOrigin = "*"
			}

			// Set CORS headers for the preflight request
			if r.Method == http.MethodOptions {
				w.Header().Set("Access-Control-Allow-Origin", allowOrigin)
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Cookie, Cache-Control")
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Access-Control-Max-Age", "86400") // 24 hours
				w.Header().Set("Vary", "Origin")
				w.WriteHeader(http.StatusNoContent)
				return
			}

			// Set CORS headers for the actual request
			w.Header().Set("Access-Control-Allow-Origin", allowOrigin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Vary", "Origin")
		} else {
			log.Warn("CORS request denied", "origin", origin, "method", r.Method, "url", r.URL.Path)
		}

		// Call the next handler
		next.ServeHTTP(w, r)
	})
}
