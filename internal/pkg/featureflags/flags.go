package featureflags

import (
	"hash/fnv"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	"github.com/hashicorp/go-hclog"
)

// FeatureFlagsObj is a record in Algolia
// with "featureFlags" as object ID and
// a map of each feature flag with a
// set of user emails that should have
// access to the flag
type FeatureFlagsObj struct {
	// ObjectID is "featureFlags"
	ObjectID string `json:"objectID,omitempty"`
	// FeatureFlagUserEmails is the map of each feature flag
	// with a set of user emails that should have
	// access to the flag. The map looks as follows:
	// {
	//   "createWorkflow": [
	//      "username1@example.com",
	//      "username2@example.com"
	//   ]
	// }
	FeatureFlagUserEmails map[string][]string `json:"featureFlagUserEmails"`
}

// SetAndToggle sets and toggle feature flags.
func SetAndToggle(
	flags *config.FeatureFlags,
	a *algolia.Client,
	h string,
	email string,
	log hclog.Logger) map[string]bool {
	featureFlags := make(map[string]bool)

	if len(flags.FeatureFlag) > 0 {
		for _, j := range flags.FeatureFlag {
			// Check if "Enabled" is set to enable
			// the feature flag
			if j.Enabled != nil {
				// If "Enabled" is set to true,
				// feature flag is set to true.
				// Otherwise, it's set to false.
				if *j.Enabled {
					featureFlags[j.Name] = true
				} else {
					featureFlags[j.Name] = false
				}
			} else if j.Percentage == 0 {
				// When percentage is set to 0,
				// the feature flag will remain disabled.
				featureFlags[j.Name] = false
			} else if j.Percentage != 0 {
				// If the percentage is provided in the config
				// the feature flag may be toggled.
				featureFlags[j.Name] = toggleFlagPercentage(
					h,
					j.Percentage,
				)
			}

			// Email based feature flag toggle
			// only when feature flag is set to
			// false. This allows for toggling
			// feature flags for specific
			// users using email address
			if !featureFlags[j.Name] {
				featureFlags[j.Name] = toggleFlagEmail(
					a,
					j.Name,
					email,
					log,
				)
			}
		}
	}

	return featureFlags
}

// toggleFlagPercentage toggles a feature flag
// using an id string and percentage value
// using the built-in hash functions
// This function is based on: https://hashi.co/3O2JwTK
func toggleFlagPercentage(s string, p int) bool {
	h := fnv.New32()
	h.Write([]byte(s))
	percent := h.Sum32() % 100
	return int(percent) <= p
}

// toggleFlagEmail toggles a feature flag
// using user email
func toggleFlagEmail(a *algolia.Client, flag string, email string, log hclog.Logger) bool {
	// Return false if algolia client is nil (e.g., when using Meilisearch)
	if a == nil {
		return false
	}

	f := FeatureFlagsObj{}
	err := a.Internal.GetObject("featureFlags", &f)
	if err != nil {
		log.Error("error getting featureFlags object from algolia", "error", err)
		return false
	}

	// Enable feature flag if the user email
	// is found in the list of user emails
	// for the feature flag in Algolia
	for _, k := range f.FeatureFlagUserEmails[flag] {
		if email == k {
			return true
		}
	}

	return false
}
