package helpers

import (
	"math"
	"net/http"
	"time"

	"github.com/hashicorp-forge/hermes/internal/server"
)

// SendEmailWithRetry attempts to send an email with exponential backoff retry logic.
// It will retry failed email sends up to maxAttempts times (configurable via srv.Config.Email.Retry).
//
// Retry delays use exponential backoff: initialDelay * 2^(attempt-1) minutes, with the final
// retry using a configurable finalDelay. Delays can be interrupted if the goroutine is cancelled.

func SendEmailWithRetry(
	srv *server.Server,
	emailFunc func() error,
	docID, operation string,
	r *http.Request,
) {
	maxAttempts := 5
	initialDelayMinutes := 1
	finalDelayMinutes := 60

	if srv.Config != nil && srv.Config.Email != nil && srv.Config.Email.Retry != nil {
		if srv.Config.Email.Retry.MaxAttempts > 0 {
			maxAttempts = srv.Config.Email.Retry.MaxAttempts
		}
		if srv.Config.Email.Retry.InitialDelayMinutes > 0 {
			initialDelayMinutes = srv.Config.Email.Retry.InitialDelayMinutes
		}
		if srv.Config.Email.Retry.FinalDelayMinutes > 0 {
			finalDelayMinutes = srv.Config.Email.Retry.FinalDelayMinutes
		}
	}

	maxRetries := maxAttempts - 1
	var err error

	for attempt := 0; attempt <= maxRetries; attempt++ {
		err = emailFunc()
		if err == nil {
			if attempt > 0 {
				srv.Logger.Info("email sent after retry",
					"doc_id", docID,
					"operation", operation,
					"attempt", attempt+1,
					"method", r.Method,
					"path", r.URL.Path,
				)
			}
			return
		}

		srv.Logger.Warn("email send failed",
			"error", err,
			"doc_id", docID,
			"operation", operation,
			"attempt", attempt+1,
			"max_attempts", maxAttempts,
			"method", r.Method,
			"path", r.URL.Path,
		)

		if attempt == maxRetries {
			srv.Logger.Error("email send failed after all retries",
				"error", err,
				"doc_id", docID,
				"operation", operation,
				"total_attempts", maxAttempts,
				"method", r.Method,
				"path", r.URL.Path,
			)
			return
		}

		var delay time.Duration
		if attempt == maxRetries-1 {
			delay = time.Duration(finalDelayMinutes) * time.Minute
		} else {
			delay = time.Duration(initialDelayMinutes*int(math.Pow(2, float64(attempt)))) * time.Minute
		}

		srv.Logger.Info("retrying email send",
			"doc_id", docID,
			"operation", operation,
			"delay", delay.String(),
			"next_attempt", attempt+2,
			"method", r.Method,
			"path", r.URL.Path,
		)

		time.Sleep(delay)
	}
}
