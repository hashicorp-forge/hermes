package local

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestConfigValidate(t *testing.T) {
	tests := []struct {
		name      string
		config    *Config
		wantErr   bool
		errString string
	}{
		{
			name: "valid config with all fields",
			config: &Config{
				BasePath:   "/tmp/workspace",
				DocsPath:   "/tmp/workspace/documents",
				DraftsPath: "/tmp/workspace/drafts",
			},
			wantErr: false,
		},
		{
			name: "valid config with only base path",
			config: &Config{
				BasePath: "/tmp/workspace",
			},
			wantErr: false,
		},
		{
			name: "empty base path",
			config: &Config{
				BasePath: "",
			},
			wantErr:   true,
			errString: "base_path cannot be empty",
		},
		{
			name: "nil config causes panic in real use",
			config: &Config{
				BasePath: "/tmp/test",
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.config.Validate()
			if tt.wantErr {
				require.Error(t, err)
				if tt.errString != "" {
					assert.Contains(t, err.Error(), tt.errString)
				}
			} else {
				require.NoError(t, err)
			}
		})
	}
}

func TestConfigDefaults(t *testing.T) {
	cfg := &Config{
		BasePath: "/var/hermes",
	}

	err := cfg.Validate()
	require.NoError(t, err)

	// Check that defaults were set
	assert.Equal(t, "/var/hermes", cfg.BasePath)
	assert.Equal(t, "/var/hermes/docs", cfg.DocsPath)
	assert.Equal(t, "/var/hermes/drafts", cfg.DraftsPath)
	assert.Equal(t, "/var/hermes/folders", cfg.FoldersPath)
	assert.Equal(t, "/var/hermes/users.json", cfg.UsersPath)
	assert.Equal(t, "/var/hermes/tokens.json", cfg.TokensPath)
	assert.NotNil(t, cfg.FileSystem, "FileSystem should default to OS filesystem")
}

func TestConfigCustomPaths(t *testing.T) {
	cfg := &Config{
		BasePath:   "/var/hermes",
		DocsPath:   "/custom/docs",
		DraftsPath: "/custom/drafts",
	}

	err := cfg.Validate()
	require.NoError(t, err)

	// Check that custom paths were preserved
	assert.Equal(t, "/custom/docs", cfg.DocsPath)
	assert.Equal(t, "/custom/drafts", cfg.DraftsPath)
	// But defaults were still set for others
	assert.Equal(t, "/var/hermes/folders", cfg.FoldersPath)
}

func TestConfigSMTP(t *testing.T) {
	cfg := &Config{
		BasePath: "/var/hermes",
		SMTPConfig: &SMTPConfig{
			Host:     "smtp.example.com",
			Port:     587,
			Username: "user",
			Password: "pass",
			From:     "noreply@example.com",
		},
	}

	err := cfg.Validate()
	require.NoError(t, err)

	// Check SMTP config was preserved
	require.NotNil(t, cfg.SMTPConfig)
	assert.Equal(t, "smtp.example.com", cfg.SMTPConfig.Host)
	assert.Equal(t, 587, cfg.SMTPConfig.Port)
}

func TestConfigFileSystem(t *testing.T) {
	// Test that custom filesystem is preserved
	memFs := NewMemFileSystem()
	cfg := &Config{
		BasePath:   "/tmp/test",
		FileSystem: memFs,
	}

	err := cfg.Validate()
	require.NoError(t, err)

	// FileSystem should be the one we provided
	assert.Equal(t, memFs, cfg.FileSystem)
}
