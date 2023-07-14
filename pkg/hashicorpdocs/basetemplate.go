package hashicorpdocs

// BaseDoc contains common document metadata fields used by Hermes.
type BaseTemplate struct {
	TemplateName string `json:"templateID"`
	Description  string `json:"description"`
	LongName     string `json:"longName"`
	DocId        string `json:"docId"`
}
