package config

// MicrosoftAuth contains the configuration for Microsoft authentication.
type MicrosoftAuth struct {
	ClientID     string `hcl:"client_id"`     // App Registration client ID
	ClientSecret string `hcl:"client_secret"` // App Registration client secret
	TenantID     string `hcl:"tenant_id"`     // Directory (tenant) ID
	RedirectURI  string `hcl:"redirect_uri"`  // Redirect URI
}
