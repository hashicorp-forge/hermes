package algolia

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"time"

	"github.com/hashicorp/go-hclog"
)

// AlgoliaProxyHandler proxies Algolia API requests from the Hermes frontend.
func AlgoliaProxyHandler(
	c *Client, cfg *Config, log hclog.Logger) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Create HTTP request.
		url := fmt.Sprintf("https://%s-dsn.algolia.net%s?%s",
			c.Docs.GetAppID(), r.URL.Path, r.URL.RawQuery)
		client := &http.Client{
			Timeout: time.Second * 10,
		}
		req, err := http.NewRequest(r.Method, url, r.Body)
		if err != nil {
			log.Error("error executing search request", "error", err)
			http.Error(w, "Error executing search request",
				http.StatusInternalServerError)
			return
		}

		// Add Algolia auth headers.
		req.Header.Add("X-Algolia-API-Key", cfg.SearchAPIKey)
		req.Header.Add("X-Algolia-Application-Id", c.Docs.GetAppID())

		// Execute HTTP request.
		resp, err := client.Do(req)
		if err != nil {
			log.Error("error executing search request", "error", err)
			http.Error(w, "Error executing search request",
				http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		// Build and write HTTP response.
		w.WriteHeader(resp.StatusCode)
		for k, v := range resp.Header {
			w.Header().Add(k, v[0])
		}
		respBody, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			log.Error("error executing search request", "error", err)
			http.Error(w, "Error executing search request",
				http.StatusInternalServerError)
			return
		}
		w.Write(respBody)
	})
}
