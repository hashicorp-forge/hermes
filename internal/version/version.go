package version

import (
	"runtime/debug"
)

const Version = "0.2.0"

// GetVersion returns
// the version number
func GetVersion() string {
	return Version
}

// GetShortRevision returns a short
// commit or checkout revision
// from build information
func GetShortRevision() string {
	if info, ok := debug.ReadBuildInfo(); ok {
		for _, setting := range info.Settings {
			if setting.Key == "vcs.revision" {
				var shortRevision string
				if len(setting.Value) > 7 {
					shortRevision = setting.Value[:7]
				}
				return shortRevision
			}
		}
	}
	return ""
}
