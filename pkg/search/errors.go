package search

import "errors"

var (
	// ErrNotFound indicates a document was not found in the index.
	ErrNotFound = errors.New("document not found in search index")

	// ErrInvalidQuery indicates the search query is malformed.
	ErrInvalidQuery = errors.New("invalid search query")

	// ErrBackendUnavailable indicates the search backend is not accessible.
	ErrBackendUnavailable = errors.New("search backend unavailable")

	// ErrIndexingFailed indicates document indexing failed.
	ErrIndexingFailed = errors.New("failed to index document")
)

// Error wraps a search error with context.
type Error struct {
	Op  string // Operation that failed
	Err error  // Underlying error
	Msg string // Additional context
}

func (e *Error) Error() string {
	if e.Msg != "" {
		return e.Op + ": " + e.Msg + ": " + e.Err.Error()
	}
	return e.Op + ": " + e.Err.Error()
}

func (e *Error) Unwrap() error {
	return e.Err
}
