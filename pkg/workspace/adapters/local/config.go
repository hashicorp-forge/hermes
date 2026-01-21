// Package local provides a local workspace storage adapter.
package local

import (
	"fmt"
	"path/filepath"
)

// Config contains local workspace adapter configuration.
type Config struct {
	// BasePath is the root directory for all workspace storage.
	BasePath string `hcl:"base_path"`

	// DocsPath is the directory for published documents.
	// Default: ${BasePath}/docs
	DocsPath string `hcl:"docs_path,optional"`

	// DraftsPath is the directory for draft documents.
	// Default: ${BasePath}/drafts
	DraftsPath string `hcl:"drafts_path,optional"`

	// FoldersPath is the directory for folder metadata.
	// Default: ${BasePath}/folders
	FoldersPath string `hcl:"folders_path,optional"`

	// UsersPath is the path to users.json file.
	// Default: ${BasePath}/users.json
	UsersPath string `hcl:"users_path,optional"`

	// TokensPath is the path to tokens.json file.
	// Default: ${BasePath}/tokens.json
	TokensPath string `hcl:"tokens_path,optional"`

	// SMTPConfig contains optional SMTP configuration for emails.
	SMTPConfig *SMTPConfig `hcl:"smtp,block"`

	// FileSystem is the filesystem implementation (for testing).
	// Not configurable via HCL - set programmatically.
	FileSystem FileSystem `hcl:"-"`
}

// SMTPConfig contains SMTP server configuration.
type SMTPConfig struct {
	Host     string `hcl:"host"`
	Port     int    `hcl:"port"`
	Username string `hcl:"username,optional"`
	Password string `hcl:"password,optional"`
	From     string `hcl:"from"`
}

// Validate checks configuration validity and sets defaults.
func (c *Config) Validate() error {
	if c.BasePath == "" {
		return fmt.Errorf("base_path cannot be empty")
	}

	// Set defaults
	if c.DocsPath == "" {
		c.DocsPath = filepath.Join(c.BasePath, "docs")
	}
	if c.DraftsPath == "" {
		c.DraftsPath = filepath.Join(c.BasePath, "drafts")
	}
	if c.FoldersPath == "" {
		c.FoldersPath = filepath.Join(c.BasePath, "folders")
	}
	if c.UsersPath == "" {
		c.UsersPath = filepath.Join(c.BasePath, "users.json")
	}
	if c.TokensPath == "" {
		c.TokensPath = filepath.Join(c.BasePath, "tokens.json")
	}

	// Default to OS filesystem if not set
	if c.FileSystem == nil {
		c.FileSystem = NewOsFileSystem()
	}

	return nil
}

// Example HCL configuration:
//
// workspace "local" {
//   base_path = "/var/hermes/workspace"
//   docs_path = "/var/hermes/workspace/documents"
//
//   smtp {
//     host = "smtp.example.com"
//     port = 587
//     username = "hermes"
//     password = "secret"
//     from = "noreply@example.com"
//   }
// }
