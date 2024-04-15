package models

func ModelsToAutoMigrate() []interface{} {
	return []interface{}{
		&DocumentType{},
		&Document{},
		&DocumentCustomField{},
		&DocumentFileRevision{},
		DocumentGroupReview{},
		&DocumentRelatedResource{},
		&DocumentRelatedResourceExternalLink{},
		&DocumentRelatedResourceHermesDocument{},
		&DocumentReview{},
		&DocumentTypeCustomField{},
		&Group{},
		&IndexerFolder{},
		&IndexerMetadata{},
		&Product{},
		&ProductLatestDocumentNumber{},
		&Project{},
		&ProjectRelatedResource{},
		&ProjectRelatedResourceExternalLink{},
		&ProjectRelatedResourceHermesDocument{},
		&User{},
	}
}
