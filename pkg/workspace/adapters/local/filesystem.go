// Package local provides a local workspace storage adapter.
package local

import (
	"github.com/spf13/afero"
)

// FileSystem abstracts filesystem operations for testability.
// It embeds afero.Fs to provide a standard filesystem interface.
type FileSystem interface {
	afero.Fs
}

// NewOsFileSystem creates a real OS filesystem adapter.
// Use this for production code that needs to interact with the actual filesystem.
func NewOsFileSystem() FileSystem {
	return afero.NewOsFs()
}

// NewMemFileSystem creates an in-memory filesystem for testing.
// This is much faster than using real disk I/O and provides perfect isolation
// between tests without requiring temporary directories.
func NewMemFileSystem() FileSystem {
	return afero.NewMemMapFs()
}
