package models

import (
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestIndexerFolder(t *testing.T) {
	dsn := os.Getenv("HERMES_TEST_POSTGRESQL_DSN")
	if dsn == "" {
		t.Skip("HERMES_TEST_POSTGRESQL_DSN environment variable isn't set")
	}

	t.Run("Get and Upsert", func(t *testing.T) {
		assert, require := assert.New(t), require.New(t)
		db, tearDownTest := setupTest(t, dsn)
		defer tearDownTest(t)

		// Get folder, which won't exist yet (should error).
		l := IndexerFolder{
			GoogleDriveID: "ID1",
		}
		err := l.Get(db)
		require.Error(err)
		require.ErrorIs(err, gorm.ErrRecordNotFound)

		// Insert folder using Upsert.
		time1 := time.Date(2001, 1, 1, 0, 0, 0, 0, time.UTC)
		l = IndexerFolder{
			GoogleDriveID: "ID1",
			LastIndexedAt: time1,
		}
		err = l.Upsert(db)
		require.NoError(err)
		assert.EqualValues(1, l.ID)
		assert.Equal("ID1", l.GoogleDriveID)
		assert.Equal(time1, l.LastIndexedAt)

		// Get folder.
		l = IndexerFolder{
			GoogleDriveID: "ID1",
		}
		err = l.Get(db)
		require.NoError(err)
		assert.EqualValues(1, l.ID)
		assert.Equal("ID1", l.GoogleDriveID)
		assert.Equal(time1, l.LastIndexedAt.UTC())

		// Insert another folder using Upsert.
		time2 := time.Date(2002, 1, 1, 0, 0, 0, 0, time.UTC)
		l = IndexerFolder{
			GoogleDriveID: "ID2",
			LastIndexedAt: time2,
		}
		err = l.Upsert(db)
		require.NoError(err)
		assert.EqualValues(2, l.ID)
		assert.Equal("ID2", l.GoogleDriveID)
		assert.Equal(time2, l.LastIndexedAt.UTC())

		// Get folder.
		l = IndexerFolder{
			GoogleDriveID: "ID2",
		}
		err = l.Get(db)
		require.NoError(err)
		assert.EqualValues(2, l.ID)
		assert.Equal("ID2", l.GoogleDriveID)
		assert.Equal(time2, l.LastIndexedAt.UTC())

		// Update the second folder using Upsert.
		time3 := time.Date(2003, 1, 1, 0, 0, 0, 0, time.UTC)
		l = IndexerFolder{
			GoogleDriveID: "ID2",
			LastIndexedAt: time3,
		}
		err = l.Upsert(db)
		require.NoError(err)
		assert.EqualValues(2, l.ID)
		assert.Equal("ID2", l.GoogleDriveID)
		assert.Equal(time3, l.LastIndexedAt.UTC())

		// Get folder.
		l = IndexerFolder{
			GoogleDriveID: "ID2",
		}
		err = l.Get(db)
		require.NoError(err)
		assert.EqualValues(2, l.ID)
		assert.Equal("ID2", l.GoogleDriveID)
		assert.Equal(time3, l.LastIndexedAt.UTC())
	})
}
