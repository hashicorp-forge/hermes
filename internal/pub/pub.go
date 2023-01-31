package pub

import (
	"embed"
	"io/fs"
	"net/http"
)

//go:embed assets/*
var assetsFS embed.FS

func Handler() http.Handler {
	return http.FileServer(httpFileSystem())
}

func httpFileSystem() http.FileSystem {
	return http.FS(fileSystem())
}

func fileSystem() fs.FS {
	f, err := fs.Sub(assetsFS, "assets")
	if err != nil {
		panic(err)
	}

	return f
}
