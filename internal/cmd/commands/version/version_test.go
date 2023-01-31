package version

import (
	"regexp"
	"testing"

	"github.com/hashicorp/go-hclog"
	"github.com/mitchellh/cli"

	"github.com/hashicorp-forge/hermes/internal/cmd/base"
)

func TestVersion(t *testing.T) {
	log := hclog.NewNullLogger()
	ui := cli.NewMockUi()
	c := &Command{
		Command: base.NewCommand(log, ui),
	}

	args := []string{}
	if code := c.Run(args); code != 0 {
		t.Fatalf("bad: \n%s", ui.ErrorWriter.String())
	}

	output := ui.OutputWriter.String()
	if matched, _ := regexp.MatchString(`^\d\.\d\.\d\n$`, output); !matched {
		t.Fatalf("output is not a valid version: %s", output)
	}
}
