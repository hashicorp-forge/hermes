package models

import (
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestIndexerMetadata(t *testing.T) {
	dsn := os.Getenv("HERMES_TEST_POSTGRESQL_DSN")
	if dsn == "" {
		t.Skip("HERMES_TEST_POSTGRESQL_DSN environment variable isn't set")
	}

	t.Run("Get and Upsert", func(t *testing.T) {
		assert, require := assert.New(t), require.New(t)
		db, tearDownTest := setupTest(t, dsn)
		defer tearDownTest(t)

		// Get metadata, which won't exist yet (should error).
		l := IndexerMetadata{}
		err := l.Get(db)
		require.Error(err)
		require.ErrorIs(gorm.ErrRecordNotFound, err)

		// Insert metadata using upsert.
		time1 := time.Date(2001, 1, 1, 0, 0, 0, 0, time.UTC)
		l = IndexerMetadata{
			LastFullIndexAt: time1,
		}
		err = l.Upsert(db)
		require.NoError(err)
		assert.EqualValues(1, l.ID)
		assert.Equal(time1, l.LastFullIndexAt)

		// Get metadata.
		l = IndexerMetadata{}
		err = l.Get(db)
		require.NoError(err)
		assert.EqualValues(1, l.ID)
		assert.Equal(time1, l.LastFullIndexAt.UTC())

		// Update metadata using upsert.
		time2 := time.Date(2002, 1, 1, 0, 0, 0, 0, time.UTC)
		l = IndexerMetadata{
			LastFullIndexAt: time2,
		}
		err = l.Upsert(db)
		require.NoError(err)
		assert.EqualValues(1, l.ID)
		assert.Equal(time2, l.LastFullIndexAt.UTC())

		// Get metadata.
		l = IndexerMetadata{}
		err = l.Get(db)
		require.NoError(err)
		assert.EqualValues(1, l.ID)
		assert.Equal(time2, l.LastFullIndexAt.UTC())
	})
}
