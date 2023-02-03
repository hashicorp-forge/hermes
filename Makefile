.PHONY: default
default: help

.PHONY: build
build: ui/build
	rm -f ./hermes
	CGO_ENABLED=0 go build -o ./hermes ./cmd/hermes

.PHONY: bin
bin:
	CGO_ENABLED=0 go build -o ./hermes ./cmd/hermes

.PHONY: bin/linux
bin/linux: # bin creates hermes binary for linux
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o ./hermes ./cmd/hermes

.PHONY: dev
dev: ## One command to start a dev environment
dev: docker/postgres/start
	$(MAKE) bin && ($(MAKE) run &) && $(MAKE) ui/run && fg

.PHONY: docker/postgres/clear
docker/postgres/clear: ## Stop and clear data for PostgreSQL in Docker
	docker-compose down -v

.PHONY: docker/postgres/start
docker/postgres/start: ## Start PostgreSQL in Docker
	docker-compose up -d && sleep 1

.PHONY: docker/postgres/stop
docker/postgres/stop: ## Stop PostgreSQL in Docker
	docker-compose down

.PHONY: go/build
go/build: ## Run Go build
	CGO_ENABLED=0 go build -o ./hermes ./cmd/hermes

.PHONY: go/test
go/test: ## Run Go test
	go test ./...

.PHONY: go/test/with-docker-postgres
go/test/with-docker-postgres: docker/postgres/start
	HERMES_TEST_POSTGRESQL_DSN="host=localhost user=postgres password=postgres port=5432" \
		go test -count=1 -v ./...

.PHONY: help
help: ## Print this help
	@echo "Usage: make <target>"
	@echo
	@echo "Targets:"
	@egrep '^(.+)\:\ ##\ (.+)' $(MAKEFILE_LIST) | column -t -c 2 -s ':#'

.PHONY: run
run:
	./hermes server -config=config.hcl

.PHONY: test
test:
	go test ./...

.PHONY: ui/build
ui/build:
	cd web; \
	yarn install; \
	rm -rf dist/; \
	yarn build;

.PHONY: ui/test
ui/test: ## Run UI test
	cd web; \
	yarn test:ember;

.PHONY: ui/install-deps
ui/install-deps: ## Install UI application dependencies
	cd web \
		&& yarn install

.PHONY: ui/run
ui/run: ## Run UI application while proxying backend requests
ui/run: ui/install-deps
	cd web \
		&& yarn start:with-proxy
