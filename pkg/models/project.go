package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Project struct {
	ID        uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`

	// Name is the name of the project
	Name string `gorm:"default:null;index;not null;type:citext;unique"`

	// TeamID is the foreign key to the Team that this project belongs to
	TeamID uuid.UUID `gorm:"type:uuid;index;not null"`

	// Team is the Team that this project belongs to
	Team Team `gorm:"foreignKey:TeamID"`
}
