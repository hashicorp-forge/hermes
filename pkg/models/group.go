package models

import (
	validation "github.com/go-ozzo/ozzo-validation/v4"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Group is a model for an application group.
type Group struct {
	gorm.Model

	// EmailAddress is the email address of the group.
	EmailAddress string `gorm:"default:null;index;not null;type:citext;unique"`
}

// FirstOrCreate finds the first group by email address or creates a group
// record if it does not exist in database db. The result is saved back to the
// receiver.
func (g *Group) FirstOrCreate(db *gorm.DB) error {
	if err := validation.ValidateStruct(g,
		validation.Field(
			&g.EmailAddress, validation.Required),
	); err != nil {
		return err
	}

	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.
			Where(Group{EmailAddress: g.EmailAddress}).
			Omit(clause.Associations).
			Clauses(clause.OnConflict{DoNothing: true}).
			FirstOrCreate(&g).
			Error; err != nil {
			return err
		}

		return nil
	})
}

// Get gets a group from database db by email address, and assigns it to the
// receiver.
func (g *Group) Get(db *gorm.DB) error {
	return db.
		Where(Group{EmailAddress: g.EmailAddress}).
		Preload(clause.Associations).
		First(&g).Error
}

// Upsert updates or inserts the receiver group into database db.
func (g *Group) Upsert(db *gorm.DB) error {
	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.
			Where(Group{EmailAddress: g.EmailAddress}).
			Omit(clause.Associations).
			Assign(*g).
			FirstOrCreate(&g).
			Error; err != nil {
			return err
		}

		return nil
	})
}
