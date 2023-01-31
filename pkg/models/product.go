package models

import (
	validation "github.com/go-ozzo/ozzo-validation/v4"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Product is a model for product data.
type Product struct {
	gorm.Model

	// Name is the name of the product.
	Name string `gorm:"default:null;index;not null;type:citext;unique"`

	// Abbreviation is a short group of capitalized letters to represent the
	// product.
	Abbreviation string `gorm:"default:null;not null;type:citext;unique"`

	// UserSubscribers are the users that subscribed to this product.
	UserSubscribers []User `gorm:"many2many:user_product_subscriptions;"`
}

// FirstOrCreate finds the first product by name or creates a record if it does
// not exist in database db.
func (p *Product) FirstOrCreate(db *gorm.DB) error {
	if err := validation.ValidateStruct(p,
		validation.Field(
			&p.ID,
			validation.When(p.Name == "",
				validation.Required.Error("either ID or Name is required")),
		),
		validation.Field(
			&p.Name,
			validation.When(p.ID == 0,
				validation.Required.Error("either ID or Name is required"))),
	); err != nil {
		return err
	}

	return db.
		Where(Product{Name: p.Name}).
		FirstOrCreate(&p).
		Error
}

// Get gets a product from database db by name, and assigns it back to the
// receiver.
func (p *Product) Get(db *gorm.DB) error {
	if err := validation.ValidateStruct(p,
		validation.Field(
			&p.ID,
			validation.When(p.Name == "",
				validation.Required.Error("either ID or Name is required")),
		),
		validation.Field(
			&p.Name,
			validation.When(p.ID == 0,
				validation.Required.Error("either ID or Name is required"))),
	); err != nil {
		return err
	}

	return db.
		Where(Product{Name: p.Name}).
		Preload(clause.Associations).
		First(&p).
		Error
}

// Upsert updates or inserts a product into database db.
func (p *Product) Upsert(db *gorm.DB) error {
	return db.
		Where(Product{Name: p.Name}).
		Assign(*p).
		FirstOrCreate(&p).
		Error
}
