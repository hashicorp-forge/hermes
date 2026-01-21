package google

import (
	"time"

	"github.com/cenkalti/backoff/v4"
	"github.com/hashicorp/go-hclog"
)

// defaultBackoff returns a default exponential backoff configuration for Google
// Workspace APIs.
func defaultBackoff() *backoff.ExponentialBackOff {
	bo := backoff.NewExponentialBackOff()
	bo.MaxElapsedTime = 2 * time.Minute

	return bo
}

// backoffNotify is an exponential backoff notify function that logs the error
// and wait duration as a warning.
func backoffNotify(err error, d time.Duration) {
	// TODO: enable passing in a logger.
	l := hclog.Default()
	l.Warn("backoff error (retrying)",
		"error", err,
		"delay", d,
	)
}
