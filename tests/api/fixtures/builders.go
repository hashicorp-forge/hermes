// Package fixtures provides builders for creating test data.
package fixtures

import (
	"fmt"
	"testing"
	"time"

	"github.com/hashicorp-forge/hermes/pkg/models"
	"gorm.io/gorm"
)

// DocumentBuilder builds test documents with a fluent API.
type DocumentBuilder struct {
	doc *models.Document
}

// NewDocument creates a new document builder with sensible defaults.
// Note: DocumentType and Product are set by name only. The builder will
// look up these associations when Create() is called.
func NewDocument() *DocumentBuilder {
	now := time.Now()
	return &DocumentBuilder{
		doc: &models.Document{
			GoogleFileID:       generateID(),
			Title:              "Test Document",
			DocumentType:       models.DocumentType{Name: "RFC"},
			Status:             models.WIPDocumentStatus,
			DocumentCreatedAt:  now,
			DocumentModifiedAt: now,
			// Don't set Product by default - let tests explicitly set it if needed
		},
	}
}

// WithGoogleFileID sets the Google file ID.
func (b *DocumentBuilder) WithGoogleFileID(id string) *DocumentBuilder {
	b.doc.GoogleFileID = id
	return b
}

// WithTitle sets the document title.
func (b *DocumentBuilder) WithTitle(title string) *DocumentBuilder {
	b.doc.Title = title
	return b
}

// WithDocType sets the document type.
func (b *DocumentBuilder) WithDocType(docType string) *DocumentBuilder {
	b.doc.DocumentType = models.DocumentType{Name: docType}
	return b
}

// WithStatus sets the document status.
func (b *DocumentBuilder) WithStatus(status models.DocumentStatus) *DocumentBuilder {
	b.doc.Status = status
	return b
}

// WithProduct sets the document product.
func (b *DocumentBuilder) WithProduct(product string) *DocumentBuilder {
	b.doc.Product = models.Product{
		Name: product,
	}
	return b
}

// WithOwner sets the document owner.
func (b *DocumentBuilder) WithOwner(email string) *DocumentBuilder {
	b.doc.Owner = &models.User{
		EmailAddress: email,
	}
	return b
}

// WithContributor adds a contributor to the document.
func (b *DocumentBuilder) WithContributor(email string) *DocumentBuilder {
	b.doc.Contributors = append(b.doc.Contributors, &models.User{
		EmailAddress: email,
	})
	return b
}

// WithApprover adds an approver to the document.
func (b *DocumentBuilder) WithApprover(email string) *DocumentBuilder {
	b.doc.Approvers = append(b.doc.Approvers, &models.User{
		EmailAddress: email,
	})
	return b
}

// WithSummary sets the document summary.
func (b *DocumentBuilder) WithSummary(summary string) *DocumentBuilder {
	b.doc.Summary = &summary
	return b
}

// WithDocNumber sets the document number.
func (b *DocumentBuilder) WithDocNumber(docNumber int) *DocumentBuilder {
	b.doc.DocumentNumber = docNumber
	return b
}

// WithCreatedTime sets the document created time.
func (b *DocumentBuilder) WithCreatedTime(t time.Time) *DocumentBuilder {
	b.doc.DocumentCreatedAt = t
	return b
}

// WithModifiedTime sets the document modified time.
func (b *DocumentBuilder) WithModifiedTime(t time.Time) *DocumentBuilder {
	b.doc.DocumentModifiedAt = t
	return b
}

// WithCustomField adds a custom field to the document.
func (b *DocumentBuilder) WithCustomField(name, value string) *DocumentBuilder {
	b.doc.CustomFields = append(b.doc.CustomFields, &models.DocumentCustomField{
		Value: value,
		DocumentTypeCustomField: models.DocumentTypeCustomField{
			Name: name,
		},
	})
	return b
}

// Build returns the document without saving to database.
func (b *DocumentBuilder) Build() *models.Document {
	return b.doc
}

// Create saves the document to the database and returns it.
func (b *DocumentBuilder) Create(t *testing.T, db *gorm.DB) *models.Document {
	// Look up document type by name if set
	if b.doc.DocumentType.Name != "" {
		var docType models.DocumentType
		if err := db.Where("name = ?", b.doc.DocumentType.Name).First(&docType).Error; err != nil {
			t.Fatalf("Failed to find document type %s: %v", b.doc.DocumentType.Name, err)
		}
		b.doc.DocumentTypeID = docType.ID
		b.doc.DocumentType = docType
	}

	// Look up product by name if set, or use first available product if not set
	if b.doc.Product.Name != "" {
		var product models.Product
		if err := db.Where("name = ?", b.doc.Product.Name).First(&product).Error; err != nil {
			t.Fatalf("Failed to find product %s: %v", b.doc.Product.Name, err)
		}
		b.doc.ProductID = product.ID
		b.doc.Product = product
	} else if b.doc.ProductID == 0 {
		// Product is required, so use first available if not explicitly set
		var product models.Product
		if err := db.First(&product).Error; err != nil {
			t.Fatalf("Failed to find any product for document: %v", err)
		}
		b.doc.ProductID = product.ID
		b.doc.Product = product
	}

	// Look up or create owner if set
	if b.doc.Owner != nil && b.doc.Owner.EmailAddress != "" {
		var owner models.User
		err := db.Where("email_address = ?", b.doc.Owner.EmailAddress).First(&owner).Error
		if err != nil {
			// Create the owner if they don't exist
			if err := db.Create(b.doc.Owner).Error; err != nil {
				t.Fatalf("Failed to create owner: %v", err)
			}
			owner = *b.doc.Owner
		}
		b.doc.OwnerID = &owner.ID
		b.doc.Owner = &owner
	}

	// Look up or create contributors
	for i, contrib := range b.doc.Contributors {
		if contrib.EmailAddress != "" {
			var user models.User
			err := db.Where("email_address = ?", contrib.EmailAddress).First(&user).Error
			if err != nil {
				// Create the contributor if they don't exist
				if err := db.Create(contrib).Error; err != nil {
					t.Fatalf("Failed to create contributor: %v", err)
				}
				user = *contrib
			}
			b.doc.Contributors[i] = &user
		}
	}

	// Look up or create approvers
	for i, approver := range b.doc.Approvers {
		if approver.EmailAddress != "" {
			var user models.User
			err := db.Where("email_address = ?", approver.EmailAddress).First(&user).Error
			if err != nil {
				// Create the approver if they don't exist
				if err := db.Create(approver).Error; err != nil {
					t.Fatalf("Failed to create approver: %v", err)
				}
				user = *approver
			}
			b.doc.Approvers[i] = &user
		}
	}

	if err := db.Create(b.doc).Error; err != nil {
		t.Fatalf("Failed to create document: %v", err)
	}
	return b.doc
}

// UserBuilder builds test users with a fluent API.
type UserBuilder struct {
	user *models.User
}

// NewUser creates a new user builder with sensible defaults.
func NewUser() *UserBuilder {
	return &UserBuilder{
		user: &models.User{
			EmailAddress: "test@example.com",
		},
	}
}

// WithEmail sets the user email.
func (b *UserBuilder) WithEmail(email string) *UserBuilder {
	b.user.EmailAddress = email
	return b
}

// Build returns the user without saving to database.
func (b *UserBuilder) Build() *models.User {
	return b.user
}

// Create saves the user to the database and returns it.
func (b *UserBuilder) Create(t *testing.T, db *gorm.DB) *models.User {
	if err := db.Create(b.user).Error; err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}
	return b.user
}

// ProductBuilder builds test products with a fluent API.
type ProductBuilder struct {
	product *models.Product
}

// NewProduct creates a new product builder with sensible defaults.
func NewProduct() *ProductBuilder {
	return &ProductBuilder{
		product: &models.Product{
			Name:         "Test Product",
			Abbreviation: "TP",
		},
	}
}

// WithName sets the product name.
func (b *ProductBuilder) WithName(name string) *ProductBuilder {
	b.product.Name = name
	return b
}

// WithAbbreviation sets the product abbreviation.
func (b *ProductBuilder) WithAbbreviation(abbr string) *ProductBuilder {
	b.product.Abbreviation = abbr
	return b
}

// Build returns the product without saving to database.
func (b *ProductBuilder) Build() *models.Product {
	return b.product
}

// Create saves the product to the database and returns it.
func (b *ProductBuilder) Create(t *testing.T, db *gorm.DB) *models.Product {
	if err := db.Create(b.product).Error; err != nil {
		t.Fatalf("Failed to create product: %v", err)
	}
	return b.product
}

// ProjectBuilder builds test projects with a fluent API.
type ProjectBuilder struct {
	project *models.Project
}

// NewProject creates a new project builder with sensible defaults.
func NewProject() *ProjectBuilder {
	desc := "A test project"
	now := time.Now()
	return &ProjectBuilder{
		project: &models.Project{
			Title:             "Test Project",
			Description:       &desc,
			Status:            models.ActiveProjectStatus,
			ProjectCreatedAt:  now,
			ProjectModifiedAt: now,
		},
	}
}

// WithTitle sets the project title.
func (b *ProjectBuilder) WithTitle(title string) *ProjectBuilder {
	b.project.Title = title
	return b
}

// WithDescription sets the project description.
func (b *ProjectBuilder) WithDescription(desc string) *ProjectBuilder {
	b.project.Description = &desc
	return b
}

// WithStatus sets the project status.
func (b *ProjectBuilder) WithStatus(status models.ProjectStatus) *ProjectBuilder {
	b.project.Status = status
	return b
}

// WithCreator sets the project creator.
func (b *ProjectBuilder) WithCreator(email string) *ProjectBuilder {
	b.project.Creator = models.User{
		EmailAddress: email,
	}
	return b
}

// Build returns the project without saving to database.
func (b *ProjectBuilder) Build() *models.Project {
	return b.project
}

// Create saves the project to the database and returns it.
func (b *ProjectBuilder) Create(t *testing.T, db *gorm.DB) *models.Project {
	if err := db.Create(b.project).Error; err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}
	return b.project
}

// generateID generates a unique ID for testing.
func generateID() string {
	return fmt.Sprintf("test-%d", time.Now().UnixNano())
}
