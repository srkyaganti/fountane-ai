# Auth Service Quick Start

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ and pnpm (for development)
- grpcurl (optional, for testing)

## Quick Start

### 1. Using Docker Compose (Recommended)

```bash
# Navigate to auth service directory
cd apps/services/auth-service

# Start all services
docker-compose up -d

# Wait for services to be ready (about 30 seconds)
sleep 30

# Setup Keycloak realm and test user
./scripts/setup-keycloak.sh

# Check service health
docker-compose ps

# View logs
docker-compose logs -f auth-service
```

### 2. Test the Service

```bash
# Install grpcurl if not already installed
brew install grpcurl  # macOS
# or
go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest  # Go

# Test authentication
grpcurl -plaintext -d '{
  "username": "test@example.com",
  "password": "password123",
  "tenant_id": "default"
}' localhost:50051 fountane.auth.AuthService/Authenticate

# The response should include an access token and user information
```

### 3. Using the Web UI

Access the gRPC Web UI at http://localhost:8081 to interact with the service through a web interface.

### 4. Development Mode

```bash
# Copy environment template
cp .env.example .env

# Install dependencies
pnpm install

# Run in development mode
nx serve auth-service

# In another terminal, run tests
nx test auth-service
```

## Service Endpoints

- **gRPC Service**: `localhost:50051`
- **Keycloak Admin**: http://localhost:8080/admin (admin/admin)
- **gRPC Web UI**: http://localhost:8081
- **PostgreSQL**: `localhost:5433` (keycloak/keycloak)

## Default Test User

- **Username**: test@example.com
- **Password**: password123
- **Tenant ID**: default
- **Role**: user

## Troubleshooting

### Service won't start

```bash
# Check logs
docker-compose logs auth-service

# Ensure Keycloak is healthy
docker-compose ps keycloak

# Restart services
docker-compose restart
```

### Authentication fails

```bash
# Check Keycloak is configured
curl http://localhost:8080/realms/fountane

# Re-run setup
./scripts/setup-keycloak.sh
```

### Port conflicts

If ports are already in use, modify the port mappings in `docker-compose.yml`:

- gRPC: Change `50051:50051` to `50052:50051`
- Keycloak: Change `8080:8080` to `8081:8080`
- PostgreSQL: Change `5433:5432` to `5434:5432`

## Next Steps

1. Review the [full documentation](./README.md)
2. Explore the [API reference](../../../libs/core/proto/auth.proto)
3. Integrate with your services using the client examples
4. Configure production settings
