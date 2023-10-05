package datadog

import (
	"os"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/internal/version"
)

// Config contains configuration for working with Datadog.
type Config struct {
	// Enabled enables sending metrics to Datadog.
	Enabled bool

	// Env is the Datadog environment.
	Env string

	// Service is the Datadog service name.
	Service string

	// ServiceVersion is the Datadog service version.
	ServiceVersion string
}

// New creates an instance of Datadog configuration.
func NewConfig(cfg config.Config) *Config {
	d := &Config{}

	// If the config doesn't contain a "datadog" block, check for values of
	// Datadog environment variables.
	if cfg.Datadog == nil {
		if val, ok := os.LookupEnv("DD_RUNTIME_METRICS_ENABLED"); ok {
			if val != "" {
				d.Enabled = true
			}
		}
		if val, ok := os.LookupEnv("DD_ENV"); ok {
			if val != "" {
				d.Env = val
			}
		}
		if val, ok := os.LookupEnv("DD_SERVICE"); ok {
			if val != "" {
				d.Service = val
			}
		}
		if val, ok := os.LookupEnv("DD_VERSION"); ok {
			if val != "" {
				d.ServiceVersion = val
			}
		}
	}

	// If the config contains a "datadog" block, use it to set/override values.
	if cfg.Datadog != nil {
		d.Enabled = cfg.Datadog.Enabled
		d.Env = cfg.Datadog.Env
		d.Service = cfg.Datadog.Service
		d.ServiceVersion = cfg.Datadog.ServiceVersion
	}

	// Set default values if certain values are empty.
	if d.Service == "" {
		d.Service = "hermes"
	}
	if d.ServiceVersion == "" {
		d.ServiceVersion = version.Version
	}

	return d
}
