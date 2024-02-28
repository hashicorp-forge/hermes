package operator

import (
	"github.com/hashicorp-forge/hermes/internal/cmd/base"
	"github.com/mitchellh/cli"
)

type Command struct {
	*base.Command
}

func (c *Command) Synopsis() string {
	return "Perform operator-specific tasks"
}

func (c *Command) Help() string {
	return `Usage: hermes operator <subcommand> [options] [args]

  This command groups subcommands for operators interacting with Hermes.`
}

func (c *Command) Run(args []string) int {
	return cli.RunResultHelp
}
