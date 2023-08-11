package hashicorpdocs

// BaseDoc contains common document metadata fields used by Hermes.
type BaseTemplate struct {
	TemplateName string `json:"templateName"`
	Description  string `json:"description"`
	DocId        string `json:"docId"`
}
