package models

import (
	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"time"
)

// Product is a model for product data.
type Product struct {
	ID        uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`

	// Name is the name of the product.
	Name string `gorm:"default:null;index;not null;type:citext;unique"`

	// Abbreviation is a short group of capitalized letters to represent the
	// product.
	Abbreviation string `gorm:"default:null;not null;type:citext;unique"`

	// UserSubscribers are the users that subscribed to this product.
	UserSubscribers []User `gorm:"many2many:user_product_subscriptions;"`

	// Teams is the list of teams associated with the BU.
	Teams []Team `gorm:"foreignKey:BUID;constraint:Teams_BU_mapping"`
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
			validation.When(p.ID == uuid.Nil,
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
			validation.When(p.ID == uuid.Nil,
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

// Upsert updates or inserts a BU into the database, including associated teams.
func (p *Product) Upsert(db *gorm.DB) error {
	return db.Transaction(func(tx *gorm.DB) error {
		// Upsert the BU.
		if err := tx.
			Where(Product{Name: p.Name}).
			Omit(clause.Associations).
			Assign(*p).
			Clauses(clause.OnConflict{DoNothing: true}).
			FirstOrCreate(&p).
			Error; err != nil {
			return err
		}

		// Save the associated teams.
		for _, team := range p.Teams {
			// Assign the BU ID to the team.
			team.BUID = p.ID

			// Upsert the team.
			if err := tx.
				Where(Team{Name: team.Name}).
				Omit(clause.Associations).
				Clauses(clause.OnConflict{DoNothing: true}).
				Create(&team).
				Error; err != nil {
				return err
			}
		}

		return nil
	})
}
