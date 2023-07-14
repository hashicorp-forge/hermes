package models

func ModelsToAutoMigrate() []interface{} {
	return []interface{}{
		&DocumentType{},
		&Document{},
		&DocumentCustomField{},
		&DocumentReview{},
		&DocumentTypeCustomField{},
		&IndexerFolder{},
		&IndexerMetadata{},
		&Product{},
		&ProductLatestDocumentNumber{},
		&User{},
		&Team{},
	}
}
