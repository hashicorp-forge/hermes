package models

func ModelsToAutoMigrate() []interface{} {
	return []interface{}{
		&DocumentType{},
		&Document{},
		&DocumentCustomField{},
		&DocumentFileRevision{},
		&DocumentRelatedResource{},
		&DocumentRelatedResourceExternalLink{},
		&DocumentRelatedResourceHermesDocument{},
		&DocumentReview{},
		&DocumentTypeCustomField{},
		&IndexerFolder{},
		&IndexerMetadata{},
		&Product{},
		&ProductLatestDocumentNumber{},
		&User{},
	}
}
