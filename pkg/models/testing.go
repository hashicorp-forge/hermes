package models

import (
	"log"
	"testing"

	"github.com/hashicorp-forge/hermes/internal/test"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupTest(t *testing.T, dsn string) (
	db *gorm.DB, tearDownFunc func(t *testing.T),
) {
	// Create test database.
	db, dbName, err := test.CreateTestDatabase(t, dsn)
	require.NoError(t, err)

	// Enable citext extension.
	sqlDB, err := db.DB()
	require.NoError(t, err)
	_, err = sqlDB.Exec("CREATE EXTENSION IF NOT EXISTS citext;")
	require.NoError(t, err)

	// Migrate test database.
	err = db.AutoMigrate(
		ModelsToAutoMigrate()...,
	)
	require.NoError(t, err)

	return db, func(t *testing.T) {
		// TODO: add back and make configurable.
		// err := test.DropTestDatabase(dsn, dbName)
		// require.NoError(t, err)
		log.Printf("would have dropped test database %q here", dbName)
	}
}
