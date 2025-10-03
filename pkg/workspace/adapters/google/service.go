package google

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"golang.org/x/oauth2/jwt"

	"github.com/pkg/browser"
	directory "google.golang.org/api/admin/directory/v1"
	"google.golang.org/api/docs/v1"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/gmail/v1"
	oauth2api "google.golang.org/api/oauth2/v2"
	"google.golang.org/api/option"
	"google.golang.org/api/people/v1"
)

// Service provides access to the Google Workspace API.
type Service struct {
	AdminDirectory *directory.Service
	Docs           *docs.Service
	Drive          *drive.Service
	Gmail          *gmail.Service
	OAuth2         *oauth2api.Service
	People         *people.PeopleService
}

// Config is the configuration for interacting with Google Workspace using a
// service account.
type Config struct {
	ClientEmail string `hcl:"client_email,optional"`
	PrivateKey  string `hcl:"private_key,optional"`
	Subject     string `hcl:"subject,optional"`
	TokenURL    string `hcl:"token_url,optional"`

	// CreateDocsAsUser creates Google Docs as the logged-in Hermes user, if true.
	CreateDocsAsUser bool `hcl:"create_docs_as_user,optional"`
}

// New returns a service with the required Google Workspace access for
// Hermes.
func NewFromConfig(cfg *Config) *Service {
	conf := &jwt.Config{
		Email:      cfg.ClientEmail,
		PrivateKey: []byte(cfg.PrivateKey),
		Scopes: []string{
			"https://www.googleapis.com/auth/admin.directory.group.readonly",
			"https://www.googleapis.com/auth/directory.readonly",
			"https://www.googleapis.com/auth/documents",
			"https://www.googleapis.com/auth/drive",
			"https://www.googleapis.com/auth/gmail.send",
		},
		Subject:  cfg.Subject,
		TokenURL: cfg.TokenURL,
	}
	client := conf.Client(context.TODO())

	adminDirectorySrv, err := directory.NewService(context.TODO(), option.WithHTTPClient(client))
	if err != nil {
		log.Fatalf("Unable to retrieve Admin Directory client: %v", err)
	}
	docSrv, err := docs.NewService(context.TODO(), option.WithHTTPClient(client))
	if err != nil {
		log.Fatalf("Unable to retrieve Docs client: %v", err)
	}
	driveSrv, err := drive.NewService(context.TODO(), option.WithHTTPClient(client))
	if err != nil {
		log.Fatalf("Unable to retrieve Drive client: %v", err)
	}
	gmailSrv, err := gmail.NewService(context.TODO(), option.WithHTTPClient(client))
	if err != nil {
		log.Fatalf("Unable to retrieve Drive client: %v", err)
	}
	oAuth2Srv, err := oauth2api.NewService(context.TODO(), option.WithHTTPClient(client))
	if err != nil {
		log.Fatalf("Unable to retrieve OAuth2 client: %v", err)
	}
	peopleSrv, err := people.NewService(context.TODO(), option.WithHTTPClient(client))
	if err != nil {
		log.Fatalf("Unable to retrieve Google People client: %v", err)
	}
	peoplePeopleSrv := people.NewPeopleService(peopleSrv)

	return &Service{
		AdminDirectory: adminDirectorySrv,
		Docs:           docSrv,
		Drive:          driveSrv,
		Gmail:          gmailSrv,
		OAuth2:         oAuth2Srv,
		People:         peoplePeopleSrv,
	}
}

// NOTE: the code below this line was largely copied from the Google Docs Go
// Quickstart (https://developers.google.com/docs/api/quickstart/go) and will
// be replaced to use a service account.

// New reads Google API credentials and returns a service with the required
// access for Hermes.
func New() *Service {
	b, err := ioutil.ReadFile("credentials.json")
	if err != nil {
		log.Fatalf("Unable to read client secret file: %v", err)
	}

	// If modifying these scopes, delete your previously saved token.json.
	gc, err := google.ConfigFromJSON(b,
		"https://www.googleapis.com/auth/admin.directory.group.readonly",
		"https://www.googleapis.com/auth/directory.readonly",
		"https://www.googleapis.com/auth/documents",
		"https://www.googleapis.com/auth/drive",
		"https://www.googleapis.com/auth/gmail.send")
	if err != nil {
		log.Fatalf("Unable to parse client secret file to config: %v", err)
	}
	client := getClient(gc)

	adminDirectorySrv, err := directory.NewService(context.TODO(), option.WithHTTPClient(client))
	if err != nil {
		log.Fatalf("Unable to retrieve Admin Directory client: %v", err)
	}
	docSrv, err := docs.NewService(context.TODO(), option.WithHTTPClient(client))
	if err != nil {
		log.Fatalf("Unable to retrieve Google Docs client: %v", err)
	}
	driveSrv, err := drive.NewService(context.TODO(), option.WithHTTPClient(client))
	if err != nil {
		log.Fatalf("Unable to retrieve Google Drive client: %v", err)
	}
	gmailSrv, err := gmail.NewService(context.TODO(), option.WithHTTPClient(client))
	if err != nil {
		log.Fatalf("Unable to retrieve Drive client: %v", err)
	}
	oAuth2Srv, err := oauth2api.NewService(context.TODO(), option.WithHTTPClient(client))
	if err != nil {
		log.Fatalf("Unable to retrieve OAuth2 client: %v", err)
	}
	peopleSrv, err := people.NewService(context.TODO(), option.WithHTTPClient(client))
	if err != nil {
		log.Fatalf("Unable to retrieve Google People client: %v", err)
	}
	peoplePeopleSrv := people.NewPeopleService(peopleSrv)

	return &Service{
		AdminDirectory: adminDirectorySrv,
		Docs:           docSrv,
		Drive:          driveSrv,
		Gmail:          gmailSrv,
		OAuth2:         oAuth2Srv,
		People:         peoplePeopleSrv,
	}
}

// Retrieves a token, saves the token, then returns the generated client.
func getClient(config *oauth2.Config) *http.Client {
	tokFile := "token.json"
	tok, err := tokenFromFile(tokFile)
	if err != nil || !tok.Valid() {
		log.Printf("token doesn't exist or is expired, so getting a new one...")
		tok = getTokenFromWeb(config)
		saveToken(tokFile, tok)
	}
	return config.Client(context.Background(), tok)
}

// Requests a token from the web, then returns the retrieved token.
func getTokenFromWeb(config *oauth2.Config) *oauth2.Token {
	var authCode string

	m := http.NewServeMux()
	// TODO: remove hardcoded port.
	s := http.Server{Addr: ":9999", Handler: m}
	config.RedirectURL = "http://localhost:9999/callback"

	m.HandleFunc("/callback", func(w http.ResponseWriter, r *http.Request) {
		// Get authorization code from request.
		authCode = r.FormValue("code")

		// Write response.
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("The token has been recorded and this window can be closed."))

		// Shutdown server in a goroutine so it doesn't shutdown before writing a
		// response.
		go func() {
			if err := s.Shutdown(context.Background()); err != nil {
				log.Fatal("error shutting down server: %w", err)
			}
		}()
	})

	authURL := config.AuthCodeURL("state-token")
	fmt.Printf("Go to the following link in your browser and authorize the app:"+
		"\n%v\n", authURL)
	browser.OpenURL(authURL)

	if err := s.ListenAndServe(); err != http.ErrServerClosed {
		log.Fatal("error starting listener: %w", err)
	}

	tok, err := config.Exchange(context.Background(), authCode)
	if err != nil {
		log.Fatalf("Unable to retrieve token from web: %v", err)
	}
	return tok
}

// Saves a token to a file path.
func saveToken(path string, token *oauth2.Token) {
	fmt.Printf("Saving credential file to: %s\n", path)
	f, err := os.OpenFile(path, os.O_RDWR|os.O_CREATE|os.O_TRUNC, 0600)
	if err != nil {
		log.Fatalf("Unable to cache OAuth token: %v", err)
	}
	defer f.Close()
	json.NewEncoder(f).Encode(token)
}

// Retrieves a token from a local file.
func tokenFromFile(file string) (*oauth2.Token, error) {
	f, err := os.Open(file)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	tok := &oauth2.Token{}
	err = json.NewDecoder(f).Decode(tok)
	return tok, err
}
