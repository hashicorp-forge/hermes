package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/algolia/algoliasearch-client-go/v3/algolia/search"
	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/internal/db"
	"github.com/hashicorp-forge/hermes/internal/pkg/doctypes"
	hcd "github.com/hashicorp-forge/hermes/pkg/hashicorpdocs"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp/go-hclog"
	"gorm.io/gorm"
)

// Define a variable to hold the retrieved object
type template struct {
	//
	ObjectId     string `json:"objectId"`
	Description  string `json:"description,omitempty"`
	TemplateName string `json:"templateName"`
	DocId        string `json:"docId"`
	LongName     string `json:"longName"`
}

// retrieve the doctypes and stores in a object
func GetDocTypeArray(cfg config.Config) []template {
	// Initialize the Algolia client
	appID := cfg.Algolia.ApplicationID
	apiKey := cfg.Algolia.WriteAPIKey
	// Initialize the search client
	client := search.NewClient(appID, apiKey)
	// Specify the index name
	indexName := "template"
	// Create a search index instance
	index := client.InitIndex(indexName)
	// fetch all objectIds and append in
	var record template
	// use BrowseObjects to Get all records as an iterator
	it, err := index.BrowseObjects()
	if err != nil {
		fmt.Println("error browsing document types")
	}
	//objectArray contains array of template objects
	var objectArray []template
	// loop to traverse through all the template objects
	for {
		rec, err := it.Next(&record)
		if err != nil {
			break
		}
		jsonData, err := json.Marshal(rec)
		if err != nil {
			fmt.Println("Error converting to JSON:", err)
			break
		}
		// temporary object variable to store and append to object Array
		var object template
		error := json.Unmarshal([]byte(jsonData), &object)
		if error != nil {
			fmt.Println("Error converting JSON to object:", err)
			break
		}
		objectArray = append(objectArray, object)
	}
	// fmt.Printf("objectArray: %v\n", objectArray)
	return objectArray
}

func registerDocumentTypes(cfg config.Config, db *gorm.DB) error {
	var objectArray []template = GetDocTypeArray(cfg)
	// fmt.Printf("objectArray from register document types : %v\n", objectArray)
	for _, d := range objectArray {
		dt := models.DocumentType{
			Name:         d.TemplateName,
			LongName:     d.LongName,
			Description:  d.Description,
			Checks:       nil,
			CustomFields: nil,
		}
		// Upsert document type.
		if err := dt.Upsert(db); err != nil {
			return fmt.Errorf("error upserting document type: %w", err)
		}
	}
	return nil
}

// new version of handler - retrieve data from algolia
func DocumentTypesHandler(cfg config.Config, log hclog.Logger) http.Handler {

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			w.Header().Set("Content-Type", "application/json")
			//objectArray contains array of template objects
			var objectArray []template = GetDocTypeArray(cfg)
			// Convert the object to JSON
			response, err := json.Marshal(objectArray)
			if err != nil {
				log.Error("error encoding document types",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path)
				http.Error(w, "{\"error\": \"Error getting document types\"}",
					http.StatusInternalServerError)
				return
			}
			// Write the JSON response directly to the ResponseWriter
			w.Write(response)
			// Initialize database.
			db, err := db.NewDB(*cfg.Postgres)
			if err != nil {
				fmt.Printf("err initializing db : %v\n", err)
			}
			if err := registerDocumentTypes(cfg, db); err != nil {
				fmt.Printf("err registering document types : %v\n", err)
			}
			// Register document types.
			// TODO: remove this and use the database for all document type lookups.
			// var objectArray []template=GetDocTypeArray(cfg)
			docTypes := map[string]hcd.Doc{}
			for i := 0; i < len(objectArray); i++ {
				doctype := objectArray[i].TemplateName
				doctype = strings.ToLower(doctype)
				docTypes[doctype] = &hcd.COMMONTEMPLATE{}
			}
			for name, dt := range docTypes {
				if err = doctypes.Register(name, dt); err != nil {
					fmt.Printf("err: %v\n", err)
				}
			}
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
	})
}
