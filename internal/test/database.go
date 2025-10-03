package test

import (
	"fmt"
	"testing"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func CreateTestDatabase(t *testing.T, dsn string) (
	db *gorm.DB, dbName string, err error,
) {
	dbName = fmt.Sprintf("hermes-test-%d", time.Now().UnixNano())
	t.Logf("%s: database name: %s", t.Name(), dbName)

	db, err = gorm.Open(postgres.Open(dsn))
	if err != nil {
		err = fmt.Errorf("error connecting to database: %w", err)
		return
	}

	// Create test database.
	if err = db.Exec(
		fmt.Sprintf("CREATE DATABASE %q;", dbName),
	).Error; err != nil {
		err = fmt.Errorf("error creating test database: %w", err)
		return
	}

	dsn = fmt.Sprintf("%s dbname=%s", dsn, dbName)
	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		// TODO: make log mode configurable.
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		err = fmt.Errorf("error connecting to test database: %w", err)
		return
	}

	// Enable citext extension for case-insensitive text columns
	if err = db.Exec("CREATE EXTENSION IF NOT EXISTS citext;").Error; err != nil {
		err = fmt.Errorf("error creating citext extension: %w", err)
		return
	}

	return
}

func DropTestDatabase(dsn, dbName string) error {
	db, err := gorm.Open(postgres.Open(dsn))
	if err != nil {
		return fmt.Errorf("error connecting to database: %w", err)
	}

	// Drop test database.
	if err := db.Exec(
		fmt.Sprintf("DROP DATABASE %q WITH (FORCE);", dbName),
	).Error; err != nil {
		return fmt.Errorf("error dropping test database: %w", err)
	}

	return nil
}

// CreateTestDatabaseWithDSN creates a test database connection using an existing DSN.
// This is useful for testcontainers where the database is already created.
func CreateTestDatabaseWithDSN(t *testing.T, dsn string) (*gorm.DB, error) {
	t.Logf("%s: connecting to database with DSN: %s", t.Name(), dsn)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return nil, fmt.Errorf("error connecting to database: %w", err)
	}

	// Enable citext extension for case-insensitive text columns
	if err = db.Exec("CREATE EXTENSION IF NOT EXISTS citext;").Error; err != nil {
		return nil, fmt.Errorf("error creating citext extension: %w", err)
	}

	return db, nil
}
