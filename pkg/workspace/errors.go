package workspace

import (
	"errors"
	"fmt"
)

var (
	// ErrNotFound is returned when a resource is not found.
	ErrNotFound = errors.New("resource not found")

	// ErrAlreadyExists is returned when a resource already exists.
	ErrAlreadyExists = errors.New("resource already exists")

	// ErrInvalidInput is returned when input validation fails.
	ErrInvalidInput = errors.New("invalid input")

	// ErrPermissionDenied is returned when access is denied.
	ErrPermissionDenied = errors.New("permission denied")

	// ErrNotImplemented is returned when a feature is not implemented.
	ErrNotImplemented = errors.New("not implemented")
)

// NotFoundError creates a not found error with context.
func NotFoundError(resourceType, id string) error {
	return fmt.Errorf("%w: %s with id %q", ErrNotFound, resourceType, id)
}

// AlreadyExistsError creates an already exists error with context.
func AlreadyExistsError(resourceType, id string) error {
	return fmt.Errorf("%w: %s with id %q", ErrAlreadyExists, resourceType, id)
}

// InvalidInputError creates an invalid input error with context.
func InvalidInputError(field, reason string) error {
	return fmt.Errorf("%w: field %q - %s", ErrInvalidInput, field, reason)
}

// PermissionDeniedError creates a permission denied error with context.
func PermissionDeniedError(operation, resource string) error {
	return fmt.Errorf("%w: cannot %s %s", ErrPermissionDenied, operation, resource)
}
