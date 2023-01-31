package main

import (
	"os"
	"path/filepath"

	"github.com/hashicorp-forge/hermes/internal/cmd"
)

func main() {
	// Name of the executable
	os.Args[0] = filepath.Base(os.Args[0])

	os.Exit(cmd.Main(os.Args))
}
