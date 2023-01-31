package models

import (
	"fmt"
	"log"
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// IndexerFolder is a model for a  indexer folder.
type IndexerFolder struct {
	gorm.Model

	// GoogleDriveID is the Google Drive ID of the folder.
	GoogleDriveID string `gorm:"default:null;not null;uniqueIndex"`

	// LastIndexedAt is the time that the folder was last indexed.
	LastIndexedAt time.Time
}

// Get gets the indexer folder and assigns it to the receiver.
func (f *IndexerFolder) Get(db *gorm.DB) error {
	if err := validation.ValidateStruct(f,
		validation.Field(&f.GoogleDriveID, validation.Required),
	); err != nil {
		return err
	}

	// Don't log "record not found" errors (will still return the error).
	tx := db.Session(&gorm.Session{Logger: logger.New(
		log.Default(),
		logger.Config{IgnoreRecordNotFoundError: true},
	)})
	return tx.
		Where(IndexerFolder{GoogleDriveID: f.GoogleDriveID}).
		First(&f).
		Error
}

// Upsert updates or inserts the receiver indexer folder into database db.
func (l *IndexerFolder) Upsert(db *gorm.DB) error {
	if err := validation.ValidateStruct(l,
		validation.Field(&l.GoogleDriveID, validation.Required),
	); err != nil {
		return err
	}

	tx := db.
		Where(IndexerFolder{GoogleDriveID: l.GoogleDriveID}).
		Assign(*l).
		FirstOrCreate(&l)
	if err := tx.Error; err != nil {
		return err
	}
	if tx.RowsAffected != 1 {
		return fmt.Errorf("expected 1 row affected, got %d", tx.RowsAffected)
	}

	return nil
}
