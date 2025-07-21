package config

// Auth contains authentication configurations.
type Auth struct {
	// Microsoft contains the Microsoft authentication configuration.
	Microsoft *MicrosoftAuth `hcl:"microsoft,block"`
}
