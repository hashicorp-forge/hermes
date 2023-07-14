package db

import (
	"fmt"
	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func EnableUUIDExtension(db *gorm.DB) error {
	err := db.Exec("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";").Error
	if err != nil {
		return err
	}
	return nil
}

// NewDB returns a new migrated database.
func NewDB(cfg config.Postgres) (*gorm.DB, error) {

	// TODO: validate config.
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%d",
		cfg.Host,
		cfg.User,
		cfg.Password,
		cfg.DBName,
		cfg.Port,
	)

	db, err := gorm.Open(postgres.Open(dsn))
	if err != nil {
		return nil, fmt.Errorf("error connecting to database: %w", err)
	}

	// Enable citext extension.
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("error getting sql.DB: %w", err)
	}
	_, err = sqlDB.Exec("CREATE EXTENSION IF NOT EXISTS citext;")
	if err != nil {
		return nil, fmt.Errorf("error enabling citext extension: %w", err)
	}

	if err := db.SetupJoinTable(
		models.Document{},
		"Approvers",
		&models.DocumentReview{},
	); err != nil {
		return nil, fmt.Errorf(
			"error setting up DocumentReviews join table: %w", err)
	}

	if err := db.SetupJoinTable(
		models.User{},
		"RecentlyViewedDocs",
		&models.RecentlyViewedDoc{},
	); err != nil {
		return nil, fmt.Errorf(
			"error setting up RecentlyViewedDocs join table: %w", err)
	}

	// adding uuid.ossp extensioin in the postgres for using the uuid_generate_v4()
	if err = EnableUUIDExtension(db); err != nil {
		fmt.Errorf("error  installing uuid_ossp database: %w", err)
	}

	// Automatically migrate models.
	// TODO: move to manually migrating models with a separate command.
	if err := db.AutoMigrate(
		models.ModelsToAutoMigrate()...,
	); err != nil {
		return nil, fmt.Errorf("error migrating database: %w", err)
	}

	return db, nil
}
