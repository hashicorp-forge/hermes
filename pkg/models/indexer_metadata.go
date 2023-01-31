package models

import (
	"fmt"
	"log"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Indexer is a model for indexer metadata.
type IndexerMetadata struct {
	gorm.Model

	// LastFullIndexAt is the time that the indexer last completed a full index.
	LastFullIndexAt time.Time
}

// Get gets the indexer metadata and assigns it to the receiver.
func (m *IndexerMetadata) Get(db *gorm.DB) error {
	// Don't log "record not found" errors (will still return the error).
	tx := db.Session(&gorm.Session{Logger: logger.New(
		log.Default(),
		logger.Config{IgnoreRecordNotFoundError: true},
	)})
	return tx.
		First(&m, 1). // There should only ever be one row in this table.
		Error
}

// Upsert updates or inserts the indexer metadata.
func (m *IndexerMetadata) Upsert(db *gorm.DB) error {
	tx := db.
		Assign(*m).
		FirstOrCreate(&m, 1)
	if err := tx.Error; err != nil {
		return err
	}
	if tx.RowsAffected != 1 {
		return fmt.Errorf("expected 1 row affected, got %d", tx.RowsAffected)
	}

	return nil
}
