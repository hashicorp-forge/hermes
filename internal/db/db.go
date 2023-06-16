package db

import (
	"fmt"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/internal/datadog"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/lib/pq"
	sqltrace "gopkg.in/DataDog/dd-trace-go.v1/contrib/database/sql"
	gormtrace "gopkg.in/DataDog/dd-trace-go.v1/contrib/gorm.io/gorm.v1"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// NewDB returns a new migrated database.
// TODO: move the Datadog config to a functional option (this will require
// refactoring to abstract away the gorm DB into an internal DB struct).
func NewDB(cfg config.Postgres, dd datadog.Config) (*gorm.DB, error) {
	// TODO: validate config.
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%d",
		cfg.Host,
		cfg.User,
		cfg.Password,
		cfg.DBName,
		cfg.Port,
	)

	var (
		db  *gorm.DB
		err error
	)
	if dd.Enabled {
		// Create a traced database connection if Datadog is enabled.
		sqltraceOpts := []sqltrace.Option{}
		if dd.Service != "" {
			sqltraceOpts = append(
				sqltraceOpts, sqltrace.WithServiceName(dd.Service))
		} else {
			sqltraceOpts = append(sqltraceOpts, sqltrace.WithServiceName("hermes"))
		}
		sqltrace.Register(
			"postgres",
			&pq.Driver{},
			sqltraceOpts...,
		)

		db, err = gormtrace.Open(postgres.Open(dsn), &gorm.Config{})
		if err != nil {
			return nil, fmt.Errorf("error connecting to database: %w", err)
		}
	} else {
		db, err = gorm.Open(postgres.Open(dsn))
		if err != nil {
			return nil, fmt.Errorf("error connecting to database: %w", err)
		}
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

	// Automatically migrate models.
	// TODO: move to manually migrating models with a separate command.
	if err := db.AutoMigrate(
		models.ModelsToAutoMigrate()...,
	); err != nil {
		return nil, fmt.Errorf("error migrating database: %w", err)
	}

	return db, nil
}
