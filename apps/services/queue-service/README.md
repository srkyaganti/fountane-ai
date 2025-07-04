# Queue Service

A robust background job processing service built with NestJS and Bull, providing reliable task execution for the Fountane AI platform.

## Features

- **Multiple Queue Types**: Support for email, notifications, data processing, reports, webhooks, and scheduled tasks
- **Job Management**: Create, retry, cancel, and monitor jobs
- **Scheduled Jobs**: Cron-based job scheduling with timezone support
- **Job Dependencies**: Support for job dependencies and chaining
- **Monitoring**: Real-time metrics, health checks, and Bull Board UI
- **Multi-tenancy**: Tenant isolation for all operations
- **gRPC & REST APIs**: Dual protocol support for flexibility
- **Event Streaming**: Real-time job event streaming
- **Automatic Cleanup**: Configurable retention policies

## Architecture

The service follows the master document specifications and implements:

- gRPC service interface as defined in `libs/core/proto/queue.proto`
- BullMQ for Redis-based queue management
- PostgreSQL for job metadata and audit trails
- Prometheus metrics for monitoring
- Health checks for Kubernetes readiness/liveness probes

## Job Types Supported

1. **Email**: Transactional and bulk email sending
2. **Notification**: Push notifications and in-app alerts
3. **Data Processing**: Import/export and ETL operations
4. **Report Generation**: Async report generation with progress tracking
5. **Webhook Delivery**: Reliable webhook delivery with retries
6. **Scheduled Tasks**: Cron-based recurring tasks

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- pnpm

### Installation

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma generate

# Run database migrations
pnpm prisma migrate dev
```

### Configuration

Create a `.env` file based on `.env.example`:

```env
PORT=3003
GRPC_PORT=50053
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/queue_service
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Running Locally

```bash
# Development mode
pnpm nx serve queue-service

# Production mode
pnpm nx build queue-service
node dist/apps/services/queue-service/main.js
```

### Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f queue-service
```

## API Documentation

### REST API

Base URL: `http://localhost:3003/api/v1`

#### Create Job

```bash
POST /queues/:queueName/jobs
{
  "type": "email",
  "data": {
    "to": "user@example.com",
    "subject": "Welcome",
    "body": "..."
  },
  "priority": 1,
  "tenantId": "tenant123"
}
```

#### Get Job Status

```bash
GET /queues/:queueName/jobs/:jobId
```

#### List Jobs

```bash
GET /queues/:queueName/jobs?statuses=waiting,active&limit=10
```

### gRPC API

Connect to `localhost:50053` with the proto definition in `libs/core/proto/queue.proto`.

### Bull Board UI

Access the queue management UI at: `http://localhost:3003/admin/queues`

## Monitoring

### Health Checks

- `GET /health` - Combined health status
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

### Metrics

Prometheus metrics available at `/metrics` (when enabled).

## Development

### Testing

```bash
# Unit tests
pnpm nx test queue-service

# E2E tests
pnpm nx e2e queue-service-e2e
```

### Linting

```bash
pnpm nx lint queue-service
```

## Deployment

The service is designed to run in Kubernetes with horizontal scaling support.

### Kubernetes Resources

- Deployment with 2+ replicas
- Service for gRPC and HTTP
- ConfigMap for configuration
- Secret for sensitive data
- HPA for auto-scaling

### Environment Variables

See `.env.example` for all available configuration options.

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   - Ensure Redis is running and accessible
   - Check REDIS_HOST and REDIS_PORT configuration

2. **Jobs Not Processing**
   - Check if queues are paused
   - Verify Redis connection
   - Check processor logs for errors

3. **Database Errors**
   - Run migrations: `pnpm prisma migrate deploy`
   - Verify DATABASE_URL is correct

## License

MIT
