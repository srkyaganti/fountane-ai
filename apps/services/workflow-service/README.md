# Workflow Service

The Workflow Service provides workflow orchestration capabilities for the Fountane AI platform. It allows users to define, execute, and monitor complex business workflows using a JSON-based DSL.

## Features

- **Workflow Management**: Create, update, delete, and list workflows
- **Execution Management**: Execute workflows, monitor progress, cancel/retry executions
- **Template System**: Create reusable workflow templates
- **n8n Integration**: Leverages n8n for actual workflow execution
- **Real-time Monitoring**: Stream execution logs in real-time
- **Multi-tenancy**: Full tenant isolation for workflows and executions

## Architecture

The service acts as a wrapper around n8n, providing:

- A simplified JSON DSL for workflow definition
- gRPC API for service-to-service communication
- PostgreSQL storage for workflow definitions and execution history
- Real-time execution monitoring via streaming

## Getting Started

### Prerequisites

- PostgreSQL database
- Redis (for caching and queues)
- n8n instance running and accessible
- Node.js 18+

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/workflow_db

# n8n Integration
N8N_API_URL=http://localhost:5678/api/v1
N8N_API_KEY=your-n8n-api-key

# Service Configuration
GRPC_PORT=50052
```

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start the service
npm run start:dev
```

## API Overview

### Workflow Management

- `CreateWorkflow`: Create a new workflow definition
- `UpdateWorkflow`: Update an existing workflow
- `DeleteWorkflow`: Delete a workflow (soft delete)
- `GetWorkflow`: Get workflow details
- `ListWorkflows`: List workflows with pagination

### Execution Management

- `ExecuteWorkflow`: Start a new workflow execution
- `GetExecution`: Get execution details
- `ListExecutions`: List executions with filtering
- `CancelExecution`: Cancel a running execution
- `RetryExecution`: Retry a failed execution

### Template Management

- `CreateTemplate`: Create a reusable workflow template
- `ListTemplates`: Browse available templates
- `InstantiateTemplate`: Create a workflow from a template

### Monitoring

- `GetWorkflowMetrics`: Get workflow performance metrics
- `StreamExecutionLogs`: Stream real-time execution logs

## Workflow DSL

The service uses a simplified JSON DSL for defining workflows:

```json
{
  "steps": [
    {
      "id": "validate-data",
      "name": "Validate Input Data",
      "type": "STEP_TYPE_SERVICE",
      "service": {
        "service": "ValidationService",
        "method": "ValidateCustomerData",
        "timeout_seconds": 30
      },
      "input": {
        "customerId": "{{input.customerId}}"
      }
    },
    {
      "id": "process-payment",
      "name": "Process Payment",
      "type": "STEP_TYPE_SERVICE",
      "service": {
        "service": "PaymentService",
        "method": "ProcessPayment",
        "timeout_seconds": 60
      },
      "input": {
        "amount": "{{input.amount}}",
        "currency": "{{input.currency}}"
      },
      "depends_on": ["validate-data"],
      "retry": {
        "attempts": 3,
        "backoff": "BACKOFF_STRATEGY_EXPONENTIAL",
        "initial_delay_seconds": 5,
        "max_delay_seconds": 60
      }
    }
  ],
  "triggers": [
    {
      "id": "webhook-trigger",
      "type": "TRIGGER_TYPE_WEBHOOK",
      "webhook": {
        "path": "/webhooks/new-order",
        "allowed_methods": ["POST"]
      }
    }
  ],
  "error_handler": {
    "type": "ERROR_HANDLER_TYPE_COMPENSATE",
    "notification_channel": "ops-alerts"
  }
}
```

## Development

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Database Management

```bash
# Create a new migration
npm run prisma:migrate:dev

# Open Prisma Studio
npm run prisma:studio
```

### Building for Production

```bash
# Build the service
npm run build

# Run in production
npm run start:prod
```

## Deployment

The service can be deployed using Docker:

```bash
# Build Docker image
nx run workflow-service:docker-build

# Run with Docker Compose
docker-compose up workflow-service
```

## Monitoring

The service exports metrics in Prometheus format and provides health checks:

- Health check: gRPC method `WorkflowService.Health`
- Metrics endpoint: Configured via environment variables

## Security

- All workflows are tenant-isolated
- Service-to-service authentication via gRPC metadata
- Input validation on all API endpoints
- Audit logging for all operations
