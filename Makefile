# Build configuration
BUILD_DIR := build
BIN_DIR := $(BUILD_DIR)/bin
COVERAGE_DIR := $(BUILD_DIR)/coverage
TEST_DIR := $(BUILD_DIR)/test

.PHONY: default
default: help

.PHONY: build
build: web/build
	@mkdir -p $(BIN_DIR)
	rm -f $(BIN_DIR)/hermes
	CGO_ENABLED=0 go build -o $(BIN_DIR)/hermes ./cmd/hermes
	@ln -sf $(BIN_DIR)/hermes ./hermes || true

.PHONY: bin
bin:
	@mkdir -p $(BIN_DIR)
	CGO_ENABLED=0 go build -o $(BIN_DIR)/hermes ./cmd/hermes
	@ln -sf $(BIN_DIR)/hermes ./hermes || true

.PHONY: bin/linux
bin/linux: # bin creates hermes binary for linux
	@mkdir -p $(BIN_DIR)
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o $(BIN_DIR)/hermes-linux ./cmd/hermes

.PHONY: dev
dev: ## One command to start a dev environment
dev: docker/postgres/start
	$(MAKE) bin && ($(MAKE) run &) && $(MAKE) web/run && fg

.PHONY: docker/postgres/clear
docker/postgres/clear: ## Stop and clear data for PostgreSQL in Docker
	docker-compose down -v

.PHONY: docker/postgres/start
docker/postgres/start: ## Start PostgreSQL in Docker
	docker-compose up -d && sleep 1

.PHONY: docker/postgres/stop
docker/postgres/stop: ## Stop PostgreSQL in Docker
	docker-compose down

.PHONY: docker/meilisearch/start
docker/meilisearch/start: ## Start Meilisearch in Docker
	docker-compose up -d meilisearch
	@echo "Waiting for Meilisearch to be ready..."
	@until curl -s http://localhost:7700/health > /dev/null 2>&1; do sleep 1; done
	@echo "Meilisearch is ready at http://localhost:7700"

.PHONY: docker/meilisearch/stop
docker/meilisearch/stop: ## Stop Meilisearch in Docker
	docker-compose stop meilisearch

.PHONY: docker/meilisearch/clear
docker/meilisearch/clear: ## Stop and clear data for Meilisearch in Docker
	docker-compose down meilisearch -v

.PHONY: docker/dev/start
docker/dev/start: ## Start full development environment (PostgreSQL + Meilisearch)
	docker-compose up -d
	@echo "Waiting for services to be ready..."
	@until docker-compose ps | grep -q "postgres.*healthy" 2>/dev/null; do sleep 1; done
	@until docker-compose ps | grep -q "meilisearch.*healthy" 2>/dev/null; do sleep 1; done
	@echo "Development environment ready!"
	@echo "  PostgreSQL: localhost:5432"
	@echo "  Meilisearch: http://localhost:7700"

.PHONY: docker/dev/stop
docker/dev/stop: ## Stop development environment
	docker-compose down

.PHONY: clean
clean: ## Clean build artifacts
	@echo "Cleaning build artifacts..."
	rm -rf $(BIN_DIR) $(COVERAGE_DIR) $(TEST_DIR)
	rm -f ./hermes
	@echo "✓ Build artifacts cleaned"

.PHONY: coverage
coverage: ## Generate and open HTML coverage report
	@if [ -f "$(COVERAGE_DIR)/coverage.out" ]; then \
		go tool cover -html=$(COVERAGE_DIR)/coverage.out -o $(COVERAGE_DIR)/coverage.html; \
		echo "✓ Coverage report generated: $(COVERAGE_DIR)/coverage.html"; \
		open $(COVERAGE_DIR)/coverage.html 2>/dev/null || xdg-open $(COVERAGE_DIR)/coverage.html 2>/dev/null || echo "Open manually: $(COVERAGE_DIR)/coverage.html"; \
	else \
		echo "⚠️  No coverage data found. Run 'make go/test' first."; \
	fi

.PHONY: coverage/api
coverage/api: ## Generate and open HTML coverage report for API tests
	@if [ -f "$(COVERAGE_DIR)/api_unit.out" ]; then \
		go tool cover -html=$(COVERAGE_DIR)/api_unit.out -o $(COVERAGE_DIR)/api_unit.html; \
		echo "✓ API unit coverage: $(COVERAGE_DIR)/api_unit.html"; \
		open $(COVERAGE_DIR)/api_unit.html 2>/dev/null || xdg-open $(COVERAGE_DIR)/api_unit.html 2>/dev/null || echo "Open manually: $(COVERAGE_DIR)/api_unit.html"; \
	else \
		echo "⚠️  No API unit coverage data. Run 'make test/api/unit' first."; \
	fi

.PHONY: go/build
go/build: ## Run Go build
	@mkdir -p $(BIN_DIR)
	CGO_ENABLED=0 go build -o $(BIN_DIR)/hermes ./cmd/hermes
	@ln -sf $(BIN_DIR)/hermes ./hermes || true

.PHONY: go/test
go/test: ## Run Go test with parallel execution
	@mkdir -p $(COVERAGE_DIR)
	go test -parallel 4 -timeout 5m -coverprofile=$(COVERAGE_DIR)/coverage.out ./...

.PHONY: go/test/with-docker-postgres
go/test/with-docker-postgres: docker/postgres/start
	HERMES_TEST_POSTGRESQL_DSN="host=localhost user=postgres password=postgres port=5432" \
		go test -count=1 -v ./...

.PHONY: test/api/unit
test/api/unit: ## Run API unit tests (no external dependencies)
	@echo "Running API unit tests..."
	@mkdir -p $(COVERAGE_DIR)
	cd tests/api && go test -v -short -coverprofile=../../$(COVERAGE_DIR)/api_unit.out \
		-run "TestFixtures|TestModel|TestClient|TestWith|TestHelpers|TestDocument" ./...
	@echo "✓ Coverage report: $(COVERAGE_DIR)/api_unit.out"

.PHONY: test/api/integration
test/api/integration: ## Run API integration tests with testcontainers (requires Docker)
	@echo "Running API integration tests with testcontainers (parallel execution)..."
	@echo "⚡ Running up to 8 tests in parallel"
	@mkdir -p $(COVERAGE_DIR) $(TEST_DIR)
	cd tests/api && go test -parallel 8 -v -tags=integration -timeout 15m \
		-coverprofile=../../$(COVERAGE_DIR)/api_integration.out ./... 2>&1 | tee ../../$(TEST_DIR)/api_integration.log
	@echo "✓ Coverage report: $(COVERAGE_DIR)/api_integration.out"
	@echo "✓ Test log: $(TEST_DIR)/api_integration.log"

.PHONY: test/api/integration/local
test/api/integration/local: ## Run API integration tests with local containers (requires docker/dev/start)
test/api/integration/local: docker/dev/start
	@echo "Running API integration tests with local Docker Compose..."
	cd tests/api && \
	HERMES_TEST_POSTGRESQL_DSN="host=localhost user=postgres password=postgres port=5432 sslmode=disable" \
	HERMES_TEST_MEILISEARCH_HOST="http://localhost:7700" \
	go test -v -tags=integration -timeout 10m ./...

.PHONY: test/api
test/api: ## Run all API tests (unit + integration with testcontainers)
test/api: test/api/unit test/api/integration

.PHONY: test/api/quick
test/api/quick: ## Run quick API unit tests
	@echo "Running quick API unit tests..."
	@mkdir -p $(TEST_DIR)
	cd tests/api && go test -v -short -run TestFixtures_DocumentBuilder -timeout 30s 2>&1 | tee ../../$(TEST_DIR)/api_quick.log

.PHONY: help
help: ## Print this help
	@echo "Usage: make <target>"
	@echo
	@echo "Targets:"
	@egrep '^(.+)\:\ ##\ (.+)' $(MAKEFILE_LIST) | column -t -c 2 -s ':#'

.PHONY: run
run:
	./hermes server -config=config.hcl

.PHONY: test/unit
test/unit: ## Run all unit tests (no external dependencies)
	@echo "Running all unit tests..."
	@mkdir -p $(COVERAGE_DIR)
	go test -short -coverprofile=$(COVERAGE_DIR)/unit.out ./...
	@echo "✓ Coverage report: $(COVERAGE_DIR)/unit.out"

.PHONY: test/integration
test/integration: ## Run all integration tests with testcontainers (requires Docker)
	@echo "Running all integration tests with testcontainers (parallel execution)..."
	@echo "⏱️  Global timeout: 10 minutes per test package"
	@echo "⚡ Running up to 8 tests in parallel"
	@mkdir -p $(COVERAGE_DIR) $(TEST_DIR)
	go test -parallel 8 -tags=integration -timeout 10m -v -coverprofile=$(COVERAGE_DIR)/integration.out ./... 2>&1 | tee $(TEST_DIR)/integration.log
	@echo "✓ Coverage report: $(COVERAGE_DIR)/integration.out"
	@echo "✓ Test log: $(TEST_DIR)/integration.log"

.PHONY: test
test: ## Run all tests (unit + integration)
	@echo "Running all tests (unit + integration)..."
	@$(MAKE) test/unit || echo "⚠️  Some unit tests failed, continuing with integration tests..."
	@$(MAKE) test/integration

.PHONY: web/build
web/build:
	cd web; \
	yarn install; \
	rm -rf dist/; \
	yarn build;

.PHONY: web/test
web/test: ## Run web test
	cd web; \
	yarn test:ember;

.PHONY: web/install-deps
web/install-deps: ## Install web application dependencies
	cd web \
		&& yarn install

.PHONY: web/run
web/run: ## Run web application while proxying backend requests
web/run: web/install-deps
	cd web \
		&& yarn start:with-proxy

web/set-yarn-version: ## Set yarn version
	cd web \
		&& yarn set version 3.3.0
