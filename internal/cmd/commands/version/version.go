package version

import (
	"github.com/hashicorp-forge/hermes/internal/cmd/base"
	"github.com/hashicorp-forge/hermes/internal/version"
)

type Command struct {
	*base.Command
}

func (c *Command) Synopsis() string {
	return "Print the version of the binary"
}

func (c *Command) Help() string {
	return `Usage: hermes version

  This command prints the version of the binary.`
}

func (c *Command) Run(args []string) int {
	c.UI.Output(version.Version)

	return 0
}
