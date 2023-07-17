package doctypes

import (
	"fmt"
	"strings"
	"sync"

	"github.com/hashicorp-forge/hermes/internal/helpers"
	hcd "github.com/hashicorp-forge/hermes/pkg/hashicorpdocs"
)

var (
	docTypes   = make(map[string]hcd.Doc)
	docTypesMu sync.RWMutex
)

// Register makes a document type available by the provided (case-insensitive)
// name.
func Register(name string, docType hcd.Doc) error {
	docTypesMu.Lock()
	defer docTypesMu.Unlock()

	// Validate custom editable fields.
	for _, f := range docType.GetCustomEditableFields() {
		if !helpers.StringSliceContains(hcd.ValidCustomDocTypeFieldTypes, f.Type) {
			return fmt.Errorf("invalid custom editable field type: %s", f.Type)
		}
	}

	name = strings.ToLower(name)

	if docType == nil {
		return fmt.Errorf("doc type is nil")
	}

	if _, dup := docTypes[name]; dup {
		// return fmt.Errorf("doc type %q is already registered", name)
	}

	docTypes[name] = docType

	return nil
}

// Get returns a document type for a provided (case-insensitive) name or an
// error if it is not registered.
func Get(name string) (hcd.Doc, error) {
	docTypesMu.RLock()
	defer docTypesMu.RUnlock()

	name = strings.ToLower(name)

	if d, ok := docTypes[name]; ok {
		return d, nil
	}
	return nil, fmt.Errorf("doc type %q is not registered", name)
}
