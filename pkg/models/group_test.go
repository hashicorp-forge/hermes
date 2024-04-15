package models

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGroupModel(t *testing.T) {
	dsn := os.Getenv("HERMES_TEST_POSTGRESQL_DSN")
	if dsn == "" {
		t.Skip("HERMES_TEST_POSTGRESQL_DSN environment variable isn't set")
	}

	t.Run("FirstOrCreate", func(t *testing.T) {
		db, tearDownTest := setupTest(t, dsn)
		defer tearDownTest(t)

		t.Run("Create first group", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			u := Group{
				EmailAddress: "a@a.com",
			}
			err := u.FirstOrCreate(db)
			require.NoError(err)
			assert.EqualValues(1, u.ID)
			assert.Equal("a@a.com", u.EmailAddress)
		})

		t.Run("Get first group using FirstOrCreate", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			u := Group{
				EmailAddress: "a@a.com",
			}
			err := u.FirstOrCreate(db)
			require.NoError(err)
			assert.EqualValues(1, u.ID)
			assert.Equal("a@a.com", u.EmailAddress)
		})

		t.Run("Create second group", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			u := Group{
				EmailAddress: "b@b.com",
			}
			err := u.FirstOrCreate(db)
			require.NoError(err)
			assert.EqualValues(2, u.ID)
			assert.Equal("b@b.com", u.EmailAddress)
		})

		t.Run("Get second group using FirstOrCreate", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			u := Group{
				EmailAddress: "b@b.com",
			}
			err := u.FirstOrCreate(db)
			require.NoError(err)
			assert.EqualValues(2, u.ID)
			assert.Equal("b@b.com", u.EmailAddress)
		})
	})
}
