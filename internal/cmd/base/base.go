package base

import (
	"bytes"
	"context"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/hashicorp/go-hclog"
	"github.com/mitchellh/cli"
)

// Command is a base collection of common logic and data embedded in all
// commands.
type Command struct {
	// Context is the base context for the command. It is up to commands to
	// utilize this context so that cancellation works in a timely manner.
	Context context.Context

	// Flags is the flag set for the command.
	Flags *flag.FlagSet

	// Log is the logger to use.
	Log hclog.Logger

	// ShutdownCh is a channel that can be used for shutdown notifications
	// for commands.
	ShutdownCh chan struct{}

	// UI is used to write to the CLI.
	UI cli.Ui
}

// NewCommand returns a new instance of a base.Command type.
func NewCommand(log hclog.Logger, ui cli.Ui) *Command {
	ctx, cancel := context.WithCancel(context.Background())
	ret := &Command{
		Context:    ctx,
		Log:        log,
		ShutdownCh: MakeShutdownCh(),
		UI:         ui,
	}

	go func() {
		<-ret.ShutdownCh
		cancel()
	}()

	return ret
}

// MakeShutdownCh returns a channel that can be used for shutdown
// notifications for commands. This channel will send a message for every
// SIGINT or SIGTERM received.
func MakeShutdownCh() chan struct{} {
	resultCh := make(chan struct{})

	shutdownCh := make(chan os.Signal, 1)
	signal.Notify(shutdownCh, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-shutdownCh
		close(resultCh)
	}()
	return resultCh
}

// WaitForInterrupt waits for an interrupt signal and runs a provided shutdown
// function. While the graceful shutdown is in progress, another interrupt can
// trigger a forced-shutdown and will immediately exit.
func (c *Command) WaitForInterrupt(shutdownFunc func()) int {
	shutdownTriggered := false

	for !shutdownTriggered {
		<-c.ShutdownCh
		c.Log.Info("shutdown triggered, interrupt again to force")

		// Add a force-shutdown goroutine to consume another interrupt.
		abortForceShutdownCh := make(chan struct{})
		defer close(abortForceShutdownCh)
		go func() {
			shutdownCh := make(chan os.Signal, 1)
			signal.Notify(shutdownCh, os.Interrupt, syscall.SIGTERM)
			select {
			case <-shutdownCh:
				c.Log.Error("second interrupt received, forcing shutdown")
				os.Exit(1)
			case <-abortForceShutdownCh:
				// No-op, we just use this to shut down the goroutine.
			}
		}()

		// Run provided shutdown function.
		shutdownFunc()
		c.Log.Info("shutdown complete")

		shutdownTriggered = true
	}

	return 0
}

// FlagSet is a wrapper around a flag set.
type FlagSet struct {
	*flag.FlagSet
}

// NewFlagSet creates a new flag set.
func NewFlagSet(f *flag.FlagSet) *FlagSet {
	return &FlagSet{f}
}

// Help generates usage text for a flag set.
func (f *FlagSet) Help() string {
	var out bytes.Buffer

	fmt.Fprintf(&out, "\n\nCommand Options:\n")
	f.SetOutput(&out)
	f.PrintDefaults()

	return strings.TrimSuffix(out.String(), "\n")
}
