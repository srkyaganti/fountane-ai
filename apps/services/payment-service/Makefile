.PHONY: help install dev build test migrate docker-build docker-run clean

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	pnpm install
	pnpm prisma:generate

dev: ## Start development server
	docker-compose up -d payment-db payment-redis
	pnpm nx serve payment-service

build: ## Build for production
	pnpm nx build payment-service

test: ## Run tests
	pnpm nx test payment-service

migrate: ## Run database migrations
	pnpm prisma:migrate

migrate-deploy: ## Deploy migrations to production
	pnpm prisma:deploy

docker-build: ## Build Docker image
	docker build -t payment-service -f Dockerfile ../../..

docker-run: ## Run with Docker Compose
	docker-compose up

clean: ## Clean build artifacts
	rm -rf dist/
	docker-compose down -v