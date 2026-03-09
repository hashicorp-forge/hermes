package addin

import (
	"embed"
	"io/fs"
	"net/http"

	"github.com/hashicorp/go-hclog"
)

//go:embed dist
var addinContent embed.FS

func AddinHandler(logger hclog.Logger) http.Handler {
	if logger == nil {
		logger = hclog.NewNullLogger()
	}

	logger.Info("initializing Word Add-in handler")
	return http.StripPrefix("/addin/", addinHandler(http.FileServer(httpFileSystem()), logger))
}

func httpFileSystem() http.FileSystem {
	return http.FS(fileSystem())
}

func fileSystem() fs.FS {
	f, err := fs.Sub(addinContent, "dist")
	if err != nil {
		panic(err)
	}

	return f
}

// addinHandler is middleware for serving our single-page application.
func addinHandler(next http.Handler, logger hclog.Logger) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		// Redirect empty paths to taskpane.html for add-in
		if r.URL.Path == "" || r.URL.Path == "/" {
			r.URL.Path = "/taskpane.html"
		}

		next.ServeHTTP(w, r)
	})
}
