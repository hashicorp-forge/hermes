package config

import (
	"testing"
)

func TestProfileBasedConfig(t *testing.T) {
	tests := []struct {
		name        string
		filename    string
		profile     string
		wantProfile string
		wantErr     bool
		checkFunc   func(*Config) bool
	}{
		{
			name:        "Testing profile",
			filename:    "../../testing/config-profiles.hcl",
			profile:     "testing",
			wantProfile: "testing",
			wantErr:     false,
			checkFunc: func(c *Config) bool {
				// Verify testing profile specifics
				return c.Postgres != nil && c.Postgres.Host == "postgres" &&
					c.Server != nil && c.Server.Addr == "0.0.0.0:8000" &&
					c.Okta != nil && c.Okta.Disabled
			},
		},
		{
			name:        "Default profile explicitly",
			filename:    "../../testing/config-profiles.hcl",
			profile:     "default",
			wantProfile: "default",
			wantErr:     false,
			checkFunc: func(c *Config) bool {
				// Verify default profile specifics
				return c.Postgres != nil && c.Postgres.Host == "localhost" &&
					c.Server != nil && c.Server.Addr == "127.0.0.1:8000"
			},
		},
		{
			name:        "Default profile implicitly (empty string)",
			filename:    "../../testing/config-profiles.hcl",
			profile:     "",
			wantProfile: "default",
			wantErr:     false,
			checkFunc: func(c *Config) bool {
				// Should get default profile when empty string provided
				return c.Postgres != nil && c.Postgres.Host == "localhost"
			},
		},
		{
			name:     "Non-existent profile",
			filename: "../../testing/config-profiles.hcl",
			profile:  "nonexistent",
			wantErr:  true,
		},
		{
			name:     "Backward compatibility - flat config",
			filename: "../../testing/config.hcl",
			profile:  "",
			wantErr:  false,
			checkFunc: func(c *Config) bool {
				// Flat config should still work
				return c.Postgres != nil && c.Postgres.Host == "postgres"
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg, err := NewConfig(tt.filename, tt.profile)

			if tt.wantErr {
				if err == nil {
					t.Errorf("NewConfig() expected error but got none")
				}
				return
			}

			if err != nil {
				t.Errorf("NewConfig() unexpected error: %v", err)
				return
			}

			if cfg == nil {
				t.Errorf("NewConfig() returned nil config")
				return
			}

			if tt.checkFunc != nil && !tt.checkFunc(cfg) {
				t.Errorf("NewConfig() config validation failed")
			}
		})
	}
}

func TestProfileConfigInitialization(t *testing.T) {
	// Test that nested structs are properly initialized
	cfg, err := NewConfig("../../testing/config-profiles.hcl", "testing")
	if err != nil {
		t.Fatalf("NewConfig() error = %v", err)
	}

	// Check all expected nested structs are initialized (not nil)
	if cfg.Algolia == nil {
		t.Error("Algolia config is nil")
	}
	if cfg.Email == nil {
		t.Error("Email config is nil")
	}
	if cfg.FeatureFlags == nil {
		t.Error("FeatureFlags config is nil")
	}
	if cfg.GoogleWorkspace == nil {
		t.Error("GoogleWorkspace config is nil")
	}
	if cfg.Indexer == nil {
		t.Error("Indexer config is nil")
	}
	if cfg.Okta == nil {
		t.Error("Okta config is nil")
	}
	if cfg.Server == nil {
		t.Error("Server config is nil")
	}
	if cfg.Postgres == nil {
		t.Error("Postgres config is nil")
	}
}
