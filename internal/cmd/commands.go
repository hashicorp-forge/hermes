package cmd

import (
	"github.com/hashicorp/go-hclog"
	"github.com/mitchellh/cli"

	"github.com/hashicorp-forge/hermes/internal/cmd/base"
	"github.com/hashicorp-forge/hermes/internal/cmd/commands/canary"
	"github.com/hashicorp-forge/hermes/internal/cmd/commands/indexer"
	"github.com/hashicorp-forge/hermes/internal/cmd/commands/operator"
	"github.com/hashicorp-forge/hermes/internal/cmd/commands/server"
	"github.com/hashicorp-forge/hermes/internal/cmd/commands/version"
)

// Commands is the mapping of all the available commands.
var Commands map[string]cli.CommandFactory

func initCommands(log hclog.Logger, ui cli.Ui) {
	b := base.NewCommand(log, ui)

	Commands = map[string]cli.CommandFactory{
		"canary": func() (cli.Command, error) {
			return &canary.Command{
				Command: b,
			}, nil
		},
		"indexer": func() (cli.Command, error) {
			return &indexer.Command{
				Command: b,
			}, nil
		},
		"operator": func() (cli.Command, error) {
			return &operator.Command{
				Command: b,
			}, nil
		},
		"operator migrate-algolia-to-postgresql": func() (cli.Command, error) {
			return &operator.MigrateAlgoliaToPostgreSQLCommand{
				Command: b,
			}, nil
		},
		"server": func() (cli.Command, error) {
			return &server.Command{
				Command: b,
			}, nil
		},
		"version": func() (cli.Command, error) {
			return &version.Command{
				Command: b,
			}, nil
		},
	}
}
