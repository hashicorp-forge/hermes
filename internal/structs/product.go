package structs

// ProductDocTypeData contains data for each document type.
type ProductDocTypeData struct {
	FolderID        string `json:"folderID"`
	LatestDocNumber int    `json:"latestDocNumber"`
}

// ProductData is the data associated with a product or area.
// This may include product abbreviation, etc.
type ProductData struct {
	Abbreviation string `json:"abbreviation"`
	// PerDocTypeData is a map of each document type (RFC, PRD, etc)
	// to the associated data
	PerDocTypeData map[string]ProductDocTypeData `json:"perDocTypeData"`
}

// Products is the slice of product data.
type Products struct {
	// ObjectID should be "products"
	ObjectID string                 `json:"objectID,omitempty"`
	Data     map[string]ProductData `json:"data"`
}
