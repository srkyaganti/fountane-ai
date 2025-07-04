# Auth Service

A gRPC-based authentication service that wraps Keycloak for the Fountane AI platform.

## Overview

The Auth Service provides centralized authentication and authorization for all Fountane AI services. It acts as a wrapper around Keycloak, exposing a gRPC interface for:

- User authentication
- Token validation and refresh
- User management (CRUD operations)
- Role-based access control
- Multi-tenant support

## API Reference

### Proto Definition

The service implements the `fountane.auth.AuthService` defined in [`libs/core/proto/auth.proto`](../../../libs/core/proto/auth.proto).

### Available Methods

#### `Authenticate`

Authenticates a user with username and password.

**Request:**

```protobuf
message AuthenticateRequest {
  string username = 1;
  string password = 2;
  string tenant_id = 3;
}
```

**Response:**

```protobuf
message AuthenticateResponse {
  string access_token = 1;
  string refresh_token = 2;
  int32 expires_in = 3;
  User user = 4;
}
```

#### `ValidateToken`

Validates an access token and returns user information.

**Request:**

```protobuf
message ValidateTokenRequest {
  string token = 1;
}
```

**Response:**

```protobuf
message ValidateTokenResponse {
  bool valid = 1;
  string user_id = 2;
  string tenant_id = 3;
  repeated string roles = 4;
}
```

#### `RefreshToken`

Refreshes an access token using a refresh token.

**Request:**

```protobuf
message RefreshTokenRequest {
  string refresh_token = 1;
}
```

**Response:**

```protobuf
message RefreshTokenResponse {
  string access_token = 1;
  string refresh_token = 2;
  int32 expires_in = 3;
}
```

#### `CreateUser`

Creates a new user in the system.

**Request:**

```protobuf
message CreateUserRequest {
  string email = 1;
  string username = 2;
  string password = 3;
  string first_name = 4;
  string last_name = 5;
  string tenant_id = 6;
  map<string, string> attributes = 7;
}
```

#### `UpdateUser`

Updates an existing user's information.

**Request:**

```protobuf
message UpdateUserRequest {
  string user_id = 1;
  optional string email = 2;
  optional string first_name = 3;
  optional string last_name = 4;
  map<string, string> attributes = 5;
}
```

#### `AssignRole` / `RevokeRole`

Manages user roles for authorization.

#### `GetUserRoles`

Retrieves all roles assigned to a user.

## Configuration

The service is configured through environment variables:

| Variable                   | Description                        | Default                 |
| -------------------------- | ---------------------------------- | ----------------------- |
| `KEYCLOAK_AUTH_SERVER_URL` | Keycloak server URL                | `http://keycloak:8080`  |
| `KEYCLOAK_REALM`           | Keycloak realm name                | `fountane`              |
| `KEYCLOAK_CLIENT_ID`       | Service client ID                  | `fountane-auth-service` |
| `KEYCLOAK_CLIENT_SECRET`   | Service client secret              | `secret`                |
| `KEYCLOAK_ADMIN_USERNAME`  | Admin username for user management | `admin`                 |
| `KEYCLOAK_ADMIN_PASSWORD`  | Admin password for user management | `admin`                 |

## Running the Service

### Development

```bash
# Install dependencies
pnpm install

# Run in development mode
nx serve auth-service
```

### Docker

```bash
# Build the image
docker build -f apps/services/auth-service/Dockerfile -t fountane/auth-service .

# Run standalone
docker run -p 50051:50051 \
  -e KEYCLOAK_AUTH_SERVER_URL=http://your-keycloak:8080 \
  -e KEYCLOAK_CLIENT_SECRET=your-secret \
  fountane/auth-service

# Or use Docker Compose
docker-compose up auth-service
```

## Client Integration

### TypeScript/Node.js Example

```typescript
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { fountane } from '@fountane/core/proto';

// Load proto definition
const packageDefinition = protoLoader.loadSync('path/to/auth.proto', {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition) as any;

// Create client
const client = new proto.fountane.auth.AuthService(
  'localhost:50051',
  grpc.credentials.createInsecure(),
);

// Authenticate
client.authenticate(
  {
    username: 'john.doe',
    password: 'password123',
    tenant_id: 'tenant-123',
  },
  (error, response) => {
    if (error) {
      console.error('Authentication failed:', error);
      return;
    }

    console.log('Access token:', response.access_token);
    console.log('User:', response.user);
  },
);

// Validate token
client.validateToken(
  {
    token: 'your-access-token',
  },
  (error, response) => {
    if (error) {
      console.error('Token validation failed:', error);
      return;
    }

    console.log('Token valid:', response.valid);
    console.log('User roles:', response.roles);
  },
);
```

### Python Example

```python
import grpc
import auth_pb2
import auth_pb2_grpc

# Create channel and stub
channel = grpc.insecure_channel('localhost:50051')
stub = auth_pb2_grpc.AuthServiceStub(channel)

# Authenticate
try:
    response = stub.Authenticate(auth_pb2.AuthenticateRequest(
        username='john.doe',
        password='password123',
        tenant_id='tenant-123'
    ))
    print(f"Access token: {response.access_token}")
    print(f"User ID: {response.user.id}")
except grpc.RpcError as e:
    print(f"Authentication failed: {e.details()}")

# Validate token
try:
    response = stub.ValidateToken(auth_pb2.ValidateTokenRequest(
        token='your-access-token'
    ))
    print(f"Token valid: {response.valid}")
    print(f"User roles: {response.roles}")
except grpc.RpcError as e:
    print(f"Token validation failed: {e.details()}")
```

### Go Example

```go
package main

import (
    "context"
    "log"

    "google.golang.org/grpc"
    pb "your-project/proto/auth"
)

func main() {
    // Create connection
    conn, err := grpc.Dial("localhost:50051", grpc.WithInsecure())
    if err != nil {
        log.Fatalf("Failed to connect: %v", err)
    }
    defer conn.Close()

    client := pb.NewAuthServiceClient(conn)

    // Authenticate
    authResp, err := client.Authenticate(context.Background(), &pb.AuthenticateRequest{
        Username: "john.doe",
        Password: "password123",
        TenantId: "tenant-123",
    })
    if err != nil {
        log.Fatalf("Authentication failed: %v", err)
    }

    log.Printf("Access token: %s", authResp.AccessToken)
    log.Printf("User ID: %s", authResp.User.Id)

    // Validate token
    validateResp, err := client.ValidateToken(context.Background(), &pb.ValidateTokenRequest{
        Token: authResp.AccessToken,
    })
    if err != nil {
        log.Fatalf("Token validation failed: %v", err)
    }

    log.Printf("Token valid: %v", validateResp.Valid)
    log.Printf("User roles: %v", validateResp.Roles)
}
```

## Testing

### Unit Tests

```bash
nx test auth-service
```

### E2E Tests

```bash
nx e2e auth-service-e2e
```

### Manual Testing with grpcurl

```bash
# List services
grpcurl -plaintext localhost:50051 list

# Describe service
grpcurl -plaintext localhost:50051 describe fountane.auth.AuthService

# Authenticate
grpcurl -plaintext -d '{
  "username": "test@example.com",
  "password": "password123",
  "tenant_id": "default"
}' localhost:50051 fountane.auth.AuthService/Authenticate

# Validate token
grpcurl -plaintext -d '{
  "token": "your-access-token-here"
}' localhost:50051 fountane.auth.AuthService/ValidateToken
```

## Multi-Tenancy

The service supports multi-tenancy through:

1. **Tenant ID in Authentication**: Users authenticate within a specific tenant context
2. **User Attributes**: Tenant ID is stored as a user attribute in Keycloak
3. **Role Scoping**: Roles can be scoped to specific tenants

## Security Considerations

1. **Transport Security**: Use TLS in production (change from `grpc.credentials.createInsecure()`)
2. **Secret Management**: Store Keycloak credentials securely (use Kubernetes secrets, AWS Secrets Manager, etc.)
3. **Token Expiry**: Configure appropriate token expiration times
4. **Rate Limiting**: Implement rate limiting to prevent brute force attacks
5. **Audit Logging**: All authentication attempts are logged

## Monitoring

The service exposes metrics and health checks:

- **Health Check**: gRPC health check on `/grpc.health.v1.Health/Check`
- **Metrics**: Prometheus metrics on port 9090 (when enabled)
- **Logging**: Structured logs with correlation IDs

## Troubleshooting

### Common Issues

1. **Connection to Keycloak Failed**
   - Check `KEYCLOAK_AUTH_SERVER_URL` is correct
   - Ensure Keycloak is running and accessible
   - Verify network connectivity between services

2. **Authentication Failed**
   - Verify user exists in Keycloak
   - Check realm configuration
   - Ensure client credentials are correct

3. **Token Validation Failed**
   - Token might be expired
   - Realm or client configuration might have changed
   - Check Keycloak logs for details

### Debug Mode

Enable debug logging:

```bash
export LOG_LEVEL=debug
nx serve auth-service
```
