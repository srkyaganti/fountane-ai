# Realtime Service

The Realtime Service is a gRPC microservice that provides real-time bidirectional communication capabilities for the Fountane AI platform. It wraps Centrifugo to provide WebSocket connections with presence tracking, message history, and channel management.

## Features

- **Channel Management**: Create and manage different types of channels (USER, TEAM, SYSTEM, PRESENCE, PRIVATE)
- **Message Publishing**: Publish messages to channels with metadata support
- **Presence Tracking**: Track online users and their status in channels
- **Message History**: Store and retrieve message history with configurable retention
- **Connection Management**: Handle user connections, disconnections, and token refresh
- **Subscription Management**: Manage user subscriptions to channels with access control
- **JWT Authentication**: Secure connections using JWT tokens

## Architecture

The service follows a layered architecture:

```
realtime-service/
├── src/
│   ├── app/              # gRPC controllers and module
│   ├── centrifugo/       # Centrifugo client integration
│   ├── channels/         # Channel management logic
│   ├── messages/         # Message handling and publishing
│   ├── presence/         # User presence tracking
│   └── config/           # Service configuration
```

## API

The service implements the gRPC `RealtimeService` as defined in `libs/core/proto/realtime.proto`:

### Channel Management

- `CreateChannel`: Create a new channel with settings
- `DeleteChannel`: Delete an existing channel
- `ListChannels`: List channels with pagination

### Publishing

- `Publish`: Publish a single message to a channel
- `PublishBatch`: Publish multiple messages in batch

### Presence

- `GetPresence`: Get list of users present in a channel
- `GetPresenceStats`: Get presence statistics for a channel

### History

- `GetHistory`: Retrieve message history with filtering
- `RemoveHistory`: Remove message history for a channel

### Connection Management

- `DisconnectUser`: Disconnect a user from all channels
- `RefreshConnection`: Refresh user connection token

### Subscription Management

- `Subscribe`: Subscribe a user to a channel
- `Unsubscribe`: Unsubscribe a user from a channel

## Configuration

Environment variables:

```bash
# Service Configuration
PORT=50054
SERVICE_NAME=realtime-service

# Centrifugo Configuration
CENTRIFUGO_URL=http://localhost:8000
CENTRIFUGO_API_KEY=your-api-key
CENTRIFUGO_SECRET=your-secret
CENTRIFUGO_TOKEN_HMAC_SECRET_KEY=your-token-secret

# JWT Configuration
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=24h

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=fountane
POSTGRES_PASSWORD=fountane
POSTGRES_DATABASE=fountane_realtime
```

## Development

### Running locally

```bash
# Install dependencies
pnpm install

# Run the service
pnpm nx serve realtime-service

# Run tests
pnpm nx test realtime-service

# Build the service
pnpm nx build realtime-service
```

### Docker

```bash
# Build the Docker image
docker build -f apps/services/realtime-service/Dockerfile -t fountane-realtime-service .

# Run with docker-compose
docker-compose up realtime-service
```

## Channel Types

- **USER**: One-to-one user notifications
- **TEAM**: Many-to-many team communication
- **SYSTEM**: One-to-many system broadcasts
- **PRESENCE**: Channels for tracking user presence
- **PRIVATE**: Private invite-only channels

## Channel Settings

Each channel can be configured with:

- `historyEnabled`: Enable/disable message history
- `historyTtlSeconds`: Message retention period
- `presenceEnabled`: Enable/disable presence tracking
- `pushNotificationsEnabled`: Enable/disable push notifications
- `maxSubscribers`: Maximum number of subscribers

## Security

- All connections are authenticated using JWT tokens
- Channel access is controlled through permission checks
- Token refresh mechanism for long-lived connections
- Rate limiting and connection limits per user

## Integration

The service integrates with:

- **Centrifugo**: WebSocket server for real-time messaging
- **Redis**: For caching and pub/sub
- **PostgreSQL**: For persistent storage (future implementation)
- **Auth Service**: For user authentication and authorization

## Monitoring

The service exposes:

- Health check endpoint on the gRPC port
- Structured logs with correlation IDs
- Metrics for message throughput and channel activity
- Connection and subscription statistics
