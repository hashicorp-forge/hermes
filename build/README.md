# Build Directory

This directory contains all build artifacts and is excluded from git (except this file).

## Structure

```
build/
├── bin/          # Compiled binaries
│   ├── hermes       # Main binary
│   └── hermes-linux # Linux binary
├── coverage/     # Test coverage reports
│   ├── coverage.out     # General coverage
│   ├── coverage.html    # HTML coverage report
│   ├── api_unit.out     # API unit test coverage
│   ├── api_unit.html    # API unit coverage HTML
│   └── ...
└── test/         # Test outputs and logs
    ├── integration.log     # Integration test output
    ├── api_integration.log # API integration test output
    └── ...
```

## Usage

All build artifacts are automatically placed here by the Makefile:

- `make build` - Builds binary to `build/bin/hermes`
- `make bin` - Builds binary (quick)
- `make bin/linux` - Builds Linux binary
- `make test/unit` - Runs tests with coverage to `build/coverage/`
- `make test/integration` - Runs integration tests with logs to `build/test/`
- `make coverage` - Opens HTML coverage report
- `make clean` - Removes all build artifacts

## Symlink

A symlink `./hermes` in the project root points to `build/bin/hermes` for convenience.
