# Hermes Testing Environment Makefile

.PHONY: help
help: ## Show this help message
	@echo "Hermes Testing Environment"
	@echo "=========================="
	@echo ""
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

.PHONY: build
build: ## Build all containers
	docker-compose build

.PHONY: build-hermes
build-hermes: ## Build only Hermes backend
	docker-compose build hermes

.PHONY: build-web
build-web: ## Build only web frontend
	docker-compose build web

.PHONY: up
up: ## Start all services (build if needed)
	docker-compose up --build -d
	@echo "Waiting for services to be healthy..."
	@sleep 5
	@$(MAKE) status

.PHONY: down
down: ## Stop all services
	docker-compose down

.PHONY: restart
restart: ## Restart all services
	docker-compose restart

.PHONY: restart-hermes
restart-hermes: ## Restart only Hermes backend
	docker-compose restart hermes

.PHONY: restart-web
restart-web: ## Restart only web frontend
	docker-compose restart web

.PHONY: clean
clean: ## Stop services and remove volumes
	docker-compose down -v

.PHONY: status
status: ## Show service status
	docker-compose ps

.PHONY: logs
logs: ## Show logs from all services
	docker-compose logs -f

.PHONY: logs-hermes
logs-hermes: ## Show logs from Hermes backend
	docker-compose logs -f hermes

.PHONY: logs-web
logs-web: ## Show logs from web frontend
	docker-compose logs -f web

.PHONY: logs-postgres
logs-postgres: ## Show logs from PostgreSQL
	docker-compose logs -f postgres

.PHONY: logs-meilisearch
logs-meilisearch: ## Show logs from Meilisearch
	docker-compose logs -f meilisearch

.PHONY: shell-hermes
shell-hermes: ## Open shell in Hermes container
	docker-compose exec hermes /bin/sh

.PHONY: shell-web
shell-web: ## Open shell in web container
	docker-compose exec web /bin/sh

.PHONY: shell-postgres
shell-postgres: ## Open PostgreSQL shell
	docker-compose exec postgres psql -U postgres -d hermes_test

.PHONY: canary
canary: ## Run canary test in container
	docker-compose exec hermes /app/hermes canary -search-backend=meilisearch

.PHONY: test
test: up canary ## Start services and run canary test
	@echo ""
	@echo "✅ All tests passed!"

.PHONY: open
open: ## Open web UI in browser
	@echo "Opening http://localhost:4201"
	@open http://localhost:4201 || xdg-open http://localhost:4201 || echo "Please open http://localhost:4201 in your browser"

.PHONY: rebuild
rebuild: clean build up ## Clean, rebuild, and start everything

.PHONY: rebuild-hermes
rebuild-hermes: ## Rebuild and restart Hermes backend
	docker-compose build --no-cache hermes
	docker-compose up -d hermes

.PHONY: rebuild-web
rebuild-web: ## Rebuild and restart web frontend
	docker-compose build --no-cache web
	docker-compose up -d web
