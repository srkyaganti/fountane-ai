# Gateway Service

The Gateway Service is the single entry point for all client applications to interact with the Fountane AI platform. It provides authentication, authorization, rate limiting, and intelligent routing to backend microservices.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Rate Limiting**: Protects backend services from abuse
- **Request Routing**: Intelligently routes requests to appropriate microservices
- **Health Checks**: Kubernetes-ready health and readiness endpoints
- **Security**: Helmet.js integration for security headers
- **CORS Support**: Configurable CORS for cross-origin requests
- **Request Validation**: Validates and sanitizes incoming requests

## Architecture

The gateway service acts as a reverse proxy, routing requests to appropriate backend services:

```
Client → Gateway Service → Backend Services (via gRPC)
```

### Service Routes

- `/api/auth/*` → Authentication endpoints (handled directly)
- `/api/workflow/*` → Workflow Service
- `/api/queue/*` → Queue Service
- `/api/realtime/*` → Realtime Service
- `/api/feature/*` → Feature Service
- `/api/payment/*` → Payment Service

## Prerequisites

- Node.js 20+
- pnpm 8+
- Running Auth Service on port 50051
- Other backend services running on their respective ports

## Development

1. Install dependencies:

```bash
pnpm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Start the service:

```bash
pnpm nx serve gateway-service
```

## Configuration

Key environment variables:

- `PORT`: Service port (default: 3000)
- `JWT_SECRET`: Secret for JWT token signing
- `AUTH_SERVICE_URL`: Auth service gRPC endpoint
- `RATE_LIMIT_TTL`: Rate limit time window in ms
- `RATE_LIMIT_MAX`: Max requests per time window

## API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/validate` - Validate token

### Health Checks

- `GET /api/health` - General health check
- `GET /api/health/ready` - Readiness probe
- `GET /api/health/live` - Liveness probe

## Security

The gateway implements multiple security layers:

1. **Helmet.js**: Sets various HTTP headers for security
2. **Rate Limiting**: Prevents abuse and DDoS attacks
3. **JWT Validation**: Validates tokens on every request
4. **CORS**: Configurable cross-origin resource sharing
5. **Input Validation**: Sanitizes and validates all inputs

## Error Handling

The gateway provides consistent error responses:

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Invalid token"
}
```

## Monitoring

The service exposes metrics and logs for monitoring:

- Structured JSON logging
- Request/response timing
- Error tracking
- Service health metrics

## Testing

Run tests:

```bash
pnpm nx test gateway-service
```

Run e2e tests:

```bash
pnpm nx e2e gateway-service-e2e
```

## Deployment

Build the Docker image:

```bash
docker build -f apps/services/gateway-service/Dockerfile -t fountane-gateway-service .
```

Run with Docker:

```bash
docker run -p 3000:3000 --env-file .env fountane-gateway-service
```

## Troubleshooting

### Common Issues

1. **502 Bad Gateway**: Backend service is not reachable
   - Check if the backend service is running
   - Verify the service URL in environment variables

2. **401 Unauthorized**: Token validation failed
   - Ensure JWT_SECRET matches across services
   - Check token expiration

3. **429 Too Many Requests**: Rate limit exceeded
   - Adjust RATE_LIMIT_MAX if needed
   - Implement client-side rate limiting
