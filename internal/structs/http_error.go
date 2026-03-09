package structs

import "fmt"

// HTTPError represents an error with an associated HTTP status code
type HTTPError struct {
	StatusCode int
	Message    string
	Err        error
}

func (e HTTPError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

func NewHTTPError(statusCode int, message string, err error) HTTPError {
	return HTTPError{
		StatusCode: statusCode,
		Message:    message,
		Err:        err,
	}
}
