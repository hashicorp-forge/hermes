package helpers

// StringSliceContains returns true if a string is present in a slice of
// strings.
func StringSliceContains(values []string, s string) bool {
	for _, v := range values {
		if s == v {
			return true
		}
	}
	return false
}
