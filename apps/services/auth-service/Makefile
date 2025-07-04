.PHONY: help build run test clean setup logs

# Default target
help:
	@echo "Available commands:"
	@echo "  make build         - Build the auth service Docker image"
	@echo "  make run          - Run the auth service with dependencies"
	@echo "  make setup        - Setup Keycloak realm and test data"
	@echo "  make test         - Run tests"
	@echo "  make test-grpc    - Test gRPC endpoints"
	@echo "  make logs         - Show service logs"
	@echo "  make clean        - Stop and remove containers"
	@echo "  make dev          - Run in development mode"

# Build the Docker image
build:
	docker build -f Dockerfile -t fountane/auth-service ../../../

# Run the service with dependencies
run:
	docker-compose up -d

# Setup Keycloak
setup:
	@echo "Waiting for services to be ready..."
	@sleep 10
	./scripts/setup-keycloak.sh

# Run tests
test:
	nx test auth-service

# Test gRPC endpoints
test-grpc:
	@echo "Testing authentication..."
	@grpcurl -plaintext -d '{"username": "test@example.com", "password": "password123", "tenant_id": "default"}' \
		localhost:50051 fountane.auth.AuthService/Authenticate || echo "grpcurl not installed. Install with: brew install grpcurl"

# Show logs
logs:
	docker-compose logs -f auth-service

# Clean up
clean:
	docker-compose down -v

# Development mode
dev:
	@cp .env.example .env 2>/dev/null || true
	nx serve auth-service

# E2E tests
e2e:
	nx e2e auth-service-e2e

# Proto compilation
proto:
	cd ../../../ && pnpm proto:compile