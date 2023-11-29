package models

import (
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestProject(t *testing.T) {
	dsn := os.Getenv("HERMES_TEST_POSTGRESQL_DSN")
	if dsn == "" {
		t.Skip("HERMES_TEST_POSTGRESQL_DSN environment variable isn't set")
	}

	t.Run("Create, Get, and Update", func(t *testing.T) {
		db, tearDownTest := setupTest(t, dsn)
		defer tearDownTest(t)

		t.Run("Create a project without a Creator", func(t *testing.T) {
			assert, _ := assert.New(t), require.New(t)
			p := Project{
				Title: "Title1",
			}
			err := p.Create(db)
			assert.Error(err)
			assert.Empty(p.ID)
		})

		t.Run("Create a project without a Title", func(t *testing.T) {
			assert, _ := assert.New(t), require.New(t)
			p := Project{
				Creator: User{
					EmailAddress: "a@a.com",
				},
			}
			err := p.Create(db)
			assert.Error(err)
			assert.Empty(p.ID)
		})

		t.Run("Create a minimal project", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			p := Project{
				Creator: User{
					EmailAddress: "a@a.com",
				},
				Title: "Title1",
			}
			err := p.Create(db)
			require.NoError(err)
			assert.Equal("a@a.com", p.Creator.EmailAddress)
			assert.EqualValues(1, p.Creator.ID)
			assert.EqualValues(1, p.CreatorID)
			assert.EqualValues(1, p.ID)
			assert.WithinDuration(time.Now(), p.ProjectCreatedAt, 1*time.Second)
			assert.WithinDuration(time.Now(), p.ProjectModifiedAt, 1*time.Second)
			assert.Equal(ActiveProjectStatus, p.Status)
			assert.Equal("Title1", p.Title)
		})

		t.Run("Get the project", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			p := Project{}

			err := p.Get(db, 1)
			require.NoError(err)
			assert.Equal("a@a.com", p.Creator.EmailAddress)
			assert.EqualValues(1, p.Creator.ID)
			assert.EqualValues(1, p.CreatorID)
			assert.EqualValues(1, p.ID)
			assert.WithinDuration(time.Now(), p.ProjectCreatedAt, 1*time.Second)
			assert.WithinDuration(time.Now(), p.ProjectModifiedAt, 1*time.Second)
			assert.Equal(ActiveProjectStatus, p.Status)
			assert.Equal("Title1", p.Title)
		})

		t.Run("Update the project", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			p := Project{
				Model: gorm.Model{
					ID: 1,
				},
				Title: "UpdatedTitle1",
			}

			err := p.Update(db)
			require.NoError(err)
			assert.Equal("a@a.com", p.Creator.EmailAddress)
			assert.EqualValues(1, p.Creator.ID)
			assert.EqualValues(1, p.CreatorID)
			assert.EqualValues(1, p.ID)
			assert.WithinDuration(time.Now(), p.ProjectModifiedAt, 1*time.Second)
			assert.NotEqualf(p.ProjectCreatedAt, p.ProjectModifiedAt,
				"ProjectModifiedAt should not be equal to ProjectCreatedAt")
			assert.Equal(ActiveProjectStatus, p.Status)
			assert.Equal("UpdatedTitle1", p.Title)
		})

		t.Run("Get the project", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			p := Project{}

			err := p.Get(db, 1)
			require.NoError(err)
			assert.Equal("a@a.com", p.Creator.EmailAddress)
			assert.EqualValues(1, p.Creator.ID)
			assert.EqualValues(1, p.CreatorID)
			assert.EqualValues(1, p.ID)
			assert.WithinDuration(time.Now(), p.ProjectCreatedAt, 1*time.Second)
			assert.WithinDuration(time.Now(), p.ProjectModifiedAt, 1*time.Second)
			assert.Equal(ActiveProjectStatus, p.Status)
			assert.Equal("UpdatedTitle1", p.Title)
		})

		t.Run("Update a project that doesn't exist", func(t *testing.T) {
			_, require := assert.New(t), require.New(t)
			p := Project{
				Model: gorm.Model{
					ID: 10,
				},
				Title: "UpdatedTitle1",
			}

			err := p.Update(db)
			require.Error(err)
		})

		t.Run("Create a second project with all fields", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			p := Project{
				Creator: User{
					EmailAddress: "b@b.com",
				},
				Description: &[]string{"Description2"}[0],
				JiraIssueID: &[]string{"JiraIssueID2"}[0],
				Title:       "Title2",
			}
			err := p.Create(db)
			require.NoError(err)
			assert.Equal("b@b.com", p.Creator.EmailAddress)
			assert.EqualValues(2, p.Creator.ID)
			assert.EqualValues(2, p.CreatorID)
			assert.EqualValues(2, p.ID)
			require.NotNil(p.Description)
			assert.Equal("Description2", *p.Description)
			require.NotNil(p.JiraIssueID)
			assert.Equal("JiraIssueID2", *p.JiraIssueID)
			assert.WithinDuration(time.Now(), p.ProjectCreatedAt, 1*time.Second)
			assert.WithinDuration(time.Now(), p.ProjectModifiedAt, 1*time.Second)
			assert.Equal(ActiveProjectStatus, p.Status)
			assert.Equal("Title2", p.Title)
		})

		t.Run("Get the second project", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			p := Project{}

			err := p.Get(db, 2)
			require.NoError(err)
			assert.Equal("b@b.com", p.Creator.EmailAddress)
			assert.EqualValues(2, p.Creator.ID)
			assert.EqualValues(2, p.CreatorID)
			assert.EqualValues(2, p.ID)
			require.NotNil(p.Description)
			assert.Equal("Description2", *p.Description)
			require.NotNil(p.JiraIssueID)
			assert.Equal("JiraIssueID2", *p.JiraIssueID)
			assert.WithinDuration(time.Now(), p.ProjectCreatedAt, 1*time.Second)
			assert.WithinDuration(time.Now(), p.ProjectModifiedAt, 1*time.Second)
			assert.Equal(ActiveProjectStatus, p.Status)
			assert.Equal("Title2", p.Title)
		})

		t.Run("Update the second project to remove optional fields",
			func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				p := Project{
					Model: gorm.Model{
						ID: 2,
					},
					Description: &[]string{""}[0],
					JiraIssueID: &[]string{""}[0],
				}

				err := p.Update(db)
				require.NoError(err)
				assert.Equal("b@b.com", p.Creator.EmailAddress)
				assert.EqualValues(2, p.Creator.ID)
				assert.EqualValues(2, p.CreatorID)
				assert.EqualValues(2, p.ID)
				require.NotNil(p.Description)
				assert.Equal("", *p.Description)
				require.NotNil(p.JiraIssueID)
				assert.Equal("", *p.JiraIssueID)
				assert.WithinDuration(time.Now(), p.ProjectCreatedAt, 1*time.Second)
				assert.WithinDuration(time.Now(), p.ProjectModifiedAt, 1*time.Second)
				assert.Equal(ActiveProjectStatus, p.Status)
				assert.Equal("Title2", p.Title)
			})

		t.Run("Get the second project", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			p := Project{}

			err := p.Get(db, 2)
			require.NoError(err)
			assert.Equal("b@b.com", p.Creator.EmailAddress)
			assert.EqualValues(2, p.Creator.ID)
			assert.EqualValues(2, p.CreatorID)
			assert.EqualValues(2, p.ID)
			require.NotNil(p.Description)
			assert.Equal("", *p.Description)
			require.NotNil(p.JiraIssueID)
			assert.Equal("", *p.JiraIssueID)
			assert.WithinDuration(time.Now(), p.ProjectCreatedAt, 1*time.Second)
			assert.WithinDuration(time.Now(), p.ProjectModifiedAt, 1*time.Second)
			assert.Equal(ActiveProjectStatus, p.Status)
			assert.Equal("Title2", p.Title)
		})

		t.Run("Update the second project again", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			p := Project{
				Model: gorm.Model{
					ID: 2,
				},
				Description: &[]string{"UpdatedDescription2"}[0],
				JiraIssueID: &[]string{"UpdatedJiraIssueID2"}[0],
				Title:       "UpdatedTitle2",
			}

			err := p.Update(db)
			require.NoError(err)
			assert.Equal("b@b.com", p.Creator.EmailAddress)
			assert.EqualValues(2, p.Creator.ID)
			assert.EqualValues(2, p.CreatorID)
			assert.EqualValues(2, p.ID)
			require.NotNil(p.Description)
			assert.Equal("UpdatedDescription2", *p.Description)
			require.NotNil(p.JiraIssueID)
			assert.Equal("UpdatedJiraIssueID2", *p.JiraIssueID)
			assert.WithinDuration(time.Now(), p.ProjectCreatedAt, 1*time.Second)
			assert.WithinDuration(time.Now(), p.ProjectModifiedAt, 1*time.Second)
			assert.Equal(ActiveProjectStatus, p.Status)
			assert.Equal("UpdatedTitle2", p.Title)
		})

		t.Run("Get the second project", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			p := Project{}

			err := p.Get(db, 2)
			require.NoError(err)
			assert.Equal("b@b.com", p.Creator.EmailAddress)
			assert.EqualValues(2, p.Creator.ID)
			assert.EqualValues(2, p.CreatorID)
			assert.EqualValues(2, p.ID)
			require.NotNil(p.Description)
			assert.Equal("UpdatedDescription2", *p.Description)
			require.NotNil(p.JiraIssueID)
			assert.Equal("UpdatedJiraIssueID2", *p.JiraIssueID)
			assert.WithinDuration(time.Now(), p.ProjectCreatedAt, 1*time.Second)
			assert.WithinDuration(time.Now(), p.ProjectModifiedAt, 1*time.Second)
			assert.Equal(ActiveProjectStatus, p.Status)
			assert.Equal("UpdatedTitle2", p.Title)
		})
	})
}

func TestProjectReplaceRelatedResources(t *testing.T) {
	dsn := os.Getenv("HERMES_TEST_POSTGRESQL_DSN")
	if dsn == "" {
		t.Skip("HERMES_TEST_POSTGRESQL_DSN environment variable isn't set")
	}

	t.Run("Get and Replace", func(t *testing.T) {
		db, tearDownTest := setupTest(t, dsn)
		defer tearDownTest(t)

		t.Run("Create a document type", func(t *testing.T) {
			_, require := assert.New(t), require.New(t)
			dt := DocumentType{
				Name:     "DT1",
				LongName: "DocumentType1",
			}
			err := dt.FirstOrCreate(db)
			require.NoError(err)
		})

		t.Run("Create a product", func(t *testing.T) {
			_, require := assert.New(t), require.New(t)
			p := Product{
				Name:         "Product1",
				Abbreviation: "P1",
			}
			err := p.FirstOrCreate(db)
			require.NoError(err)
		})

		t.Run("Create documents", func(t *testing.T) {
			_, require := assert.New(t), require.New(t)
			d := Document{
				GoogleFileID: "GoogleFileID1",
				DocumentType: DocumentType{
					Name: "DT1",
				},
				Product: Product{
					Name: "Product1",
				},
			}
			err := d.Create(db)
			require.NoError(err)

			d = Document{
				GoogleFileID: "GoogleFileID2",
				DocumentType: DocumentType{
					Name: "DT1",
				},
				Product: Product{
					Name: "Product1",
				},
			}
			err = d.Create(db)
			require.NoError(err)

			d = Document{
				GoogleFileID: "GoogleFileID3",
				DocumentType: DocumentType{
					Name: "DT1",
				},
				Product: Product{
					Name: "Product1",
				},
			}
			err = d.Create(db)
			require.NoError(err)
		})

		t.Run("Create a project", func(t *testing.T) {
			_, require := assert.New(t), require.New(t)
			p := Project{
				Creator: User{
					EmailAddress: "a@a.com",
				},
				Title: "Title1",
			}
			err := p.Create(db)
			require.NoError(err)
			require.EqualValues(1, p.ID)
		})

		t.Run("Add external link related resources", func(t *testing.T) {
			_, require := assert.New(t), require.New(t)

			rr := ProjectRelatedResourceExternalLink{
				RelatedResource: ProjectRelatedResource{
					ProjectID: 1,
					SortOrder: 1,
				},
				Name: "Name1",
				URL:  "URL1",
			}
			err := rr.Create(db)
			require.NoError(err)

			rr = ProjectRelatedResourceExternalLink{
				RelatedResource: ProjectRelatedResource{
					ProjectID: 1,
					SortOrder: 2,
				},
				Name: "Name2",
				URL:  "URL2",
			}
			err = rr.Create(db)
			require.NoError(err)

			rr = ProjectRelatedResourceExternalLink{
				RelatedResource: ProjectRelatedResource{
					ProjectID: 1,
					SortOrder: 3,
				},
				Name: "Name3",
				URL:  "URL3",
			}
			err = rr.Create(db)
			require.NoError(err)
		})

		t.Run("Get the project", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			p := Project{}

			err := p.Get(db, 1)
			require.NoError(err)
			assert.Len(p.RelatedResources, 3)
		})

		t.Run("Replace related resources", func(t *testing.T) {
			_, require := assert.New(t), require.New(t)
			p := Project{
				Model: gorm.Model{
					ID: 1,
				},
			}
			err := p.ReplaceRelatedResources(db,
				[]ProjectRelatedResourceExternalLink{
					{
						RelatedResource: ProjectRelatedResource{
							ProjectID: 1,
							SortOrder: 1,
						},
						Name: "Name4",
						URL:  "URL4",
					},
				},
				[]ProjectRelatedResourceHermesDocument{
					{
						RelatedResource: ProjectRelatedResource{
							ProjectID: 1,
							SortOrder: 2,
						},
						Document: Document{
							GoogleFileID: "GoogleFileID1",
						},
					},
					{
						RelatedResource: ProjectRelatedResource{
							ProjectID: 1,
							SortOrder: 3,
						},
						Document: Document{
							GoogleFileID: "GoogleFileID3",
						},
					},
				},
			)
			require.NoError(err)
		})

		t.Run("Get the project", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			p := Project{}

			err := p.Get(db, 1)
			require.NoError(err)
			assert.Len(p.RelatedResources, 3)
		})

		t.Run("Get typed related resources", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			p := Project{
				Model: gorm.Model{
					ID: 1,
				},
			}
			elrrs, hdrrs, err := p.GetRelatedResources(db)
			require.NoError(err)
			require.Len(elrrs, 1)
			assert.Equal("Name4", elrrs[0].Name)
			assert.Equal("URL4", elrrs[0].URL)
			assert.Equal(1, elrrs[0].RelatedResource.SortOrder)
			require.Len(hdrrs, 2)
			assert.Equal("GoogleFileID1", hdrrs[0].Document.GoogleFileID)
			assert.Equal(2, hdrrs[0].RelatedResource.SortOrder)
			assert.Equal("GoogleFileID3", hdrrs[1].Document.GoogleFileID)
			assert.Equal(3, hdrrs[1].RelatedResource.SortOrder)
		})
	})
}
