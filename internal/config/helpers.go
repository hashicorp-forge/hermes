package config

import (
	"fmt"
)

// ValidateFeatureFlags validates the feature flags defined in the config.
func ValidateFeatureFlags(flags []*FeatureFlag) error {
	for _, f := range flags {
		if f.Name == "" {
			return fmt.Errorf("feature flag 'name' cannot be empty")
		}
		if f.Enabled != nil && f.Percentage > 0 {
			return fmt.Errorf("invalid definition of feature flag %q: only one of 'enabled' or 'percentage' parameter can be set", f.Name)
		}
		if f.Enabled == nil && f.Percentage == 0 {
			return fmt.Errorf("invalid definition of feature flag %q: at least one of 'enabled' or a non-zero value for 'percentage' parameter should be set", f.Name)
		}
	}
	return nil
}
