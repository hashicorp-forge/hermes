package helpers

// RemoveStringSliceDuplicates removes duplicate strings from a string slice.
func RemoveStringSliceDuplicates(in []string) []string {
	keys := make(map[string]bool)
	out := []string{}
	for _, s := range in {
		if _, seen := keys[s]; !seen {
			keys[s] = true
			out = append(out, s)
		}
	}
	return out
}

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
