package models

import (
	"fmt"
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// User is a model for an application user.
type User struct {
	gorm.Model

	// EmailAddress is the email address of the user.
	EmailAddress string `gorm:"default:null;index;not null;type:citext;unique"`

	// ProductSubscriptions are the products that have been subscribed to by the
	// user.
	//By default, GORM will create a join table named user_product_subscriptions to represent this association.
	//	The join table will have foreign keys that reference the primary keys of the User and Product tables.
	ProductSubscriptions []Product `gorm:"many2many:user_product_subscriptions;"`

	// RecentlyViewedDocs are the documents recently viewed by the user.
	RecentlyViewedDocs []Document `gorm:"many2many:recently_viewed_docs;"`
}

type RecentlyViewedDoc struct {
	UserID     int `gorm:"primaryKey"`
	DocumentID int `gorm:"primaryKey"`
	ViewedAt   time.Time
}

// BeforeSave is a hook to find or create associations before saving.
func (u *User) BeforeSave(tx *gorm.DB) error {
	if err := u.getAssociations(tx); err != nil {
		return fmt.Errorf("error getting associations: %w", err)
	}

	return nil
}

// FirstOrCreate finds the first user by email address or creates a user record
// if it does not exist in database db. The result is saved back to the
// receiver.
func (u *User) FirstOrCreate(db *gorm.DB) error {
	if err := validation.ValidateStruct(u,
		validation.Field(
			&u.EmailAddress, validation.Required),
	); err != nil {
		return err
	}

	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.
			Where(User{EmailAddress: u.EmailAddress}).
			Omit(clause.Associations).
			Clauses(clause.OnConflict{DoNothing: true}).
			FirstOrCreate(&u).
			Error; err != nil {
			return err
		}

		if err := u.Get(tx); err != nil {
			return fmt.Errorf(
				"error getting the record after find or create: %w", err)
		}

		return nil
	})
}

// Get gets a user from database db by email address, and assigns it to the
// receiver.
func (u *User) Get(db *gorm.DB) error {
	return db.
		Where(User{EmailAddress: u.EmailAddress}).
		Preload(clause.Associations).
		First(&u).Error
}

// Upsert updates or inserts the receiver user into database db.
func (u *User) Upsert(db *gorm.DB) error {
	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.
			Where(User{EmailAddress: u.EmailAddress}).
			Omit(clause.Associations).
			Assign(*u).
			FirstOrCreate(&u).
			Error; err != nil {
			return err
		}

		// Replace associations.
		if err := tx.
			Model(&u).
			Association("ProductSubscriptions").
			Replace(u.ProductSubscriptions); err != nil {
			return err
		}
		if err := tx.
			Model(&u).
			Association("RecentlyViewedDocs").
			Replace(u.RecentlyViewedDocs); err != nil {
			return err
		}

		if err := u.Get(tx); err != nil {
			return fmt.Errorf("error getting the user after upsert")
		}

		return nil
	})
}

// getAssociations gets required associations, creating them where appropriate.
func (u *User) getAssociations(tx *gorm.DB) error {
	// Get product subscriptions.
	var ps []Product
	for _, p := range u.ProductSubscriptions {
		if err := p.Get(tx); err != nil {
			return fmt.Errorf("error getting product: %w", err)
		}
		ps = append(ps, p)
	}
	u.ProductSubscriptions = ps

	// Get recently viewed documents.
	var rvd []Document
	for _, d := range u.RecentlyViewedDocs {
		if err := d.Get(tx); err != nil {
			return fmt.Errorf("error getting document: %w", err)
		}
		rvd = append(rvd, d)
	}
	u.RecentlyViewedDocs = rvd

	return nil
}
