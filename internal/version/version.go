package version

import (
	"runtime/debug"
)

const Version = "0.4.0"

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
				shortRevision := setting.Value
				if len(shortRevision) > 7 {
					shortRevision = setting.Value[:7]
				}
				return shortRevision
			}
		}
	}
	return ""
}
