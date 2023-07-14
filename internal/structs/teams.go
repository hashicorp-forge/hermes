package structs

// TeamDocTypeData contains data for each document type.
type TeamDocTypeData struct {
	FolderID        string `json:"folderID"`
	LatestDocNumber int    `json:"latestDocNumber"`
}

// TeamData is the data associated with a product or area.
// This may include product abbreviation, etc.
type TeamData struct {
	Abbreviation string `json:"abbreviation"`
	BUID         uint   `json:"buid"`
	// PerDocTypeData is a map of each document type (RFC, PRD, etc)
	// to the associated data
	PerDocTypeData map[string]TeamDocTypeData `json:"perDocTypeData"`
}

// Teams is the slice of product data.
type Teams struct {
	// ObjectID should be "products"
	ObjectID string              `json:"objectID,omitempty"`
	Data     map[string]TeamData `json:"data"`
}
