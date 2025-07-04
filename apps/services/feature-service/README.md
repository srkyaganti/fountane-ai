# Feature Service

The Feature Service provides feature flag management capabilities for the Fountane AI platform, acting as a type-safe gRPC wrapper around Unleash.

## Overview

This service enables:

- Feature flag creation and management
- Gradual rollouts and A/B testing
- User and group targeting
- Real-time feature evaluation
- Metrics and analytics collection
- Multi-environment support

## Architecture

The service follows a layered architecture:

- **gRPC Controller Layer**: Handles incoming gRPC requests
- **Service Layer**: Business logic and orchestration
- **Repository Layer**: Data persistence and retrieval
- **Integration Layer**: Unleash client integration
- **Cache Layer**: Redis-based caching for performance
- **Audit Layer**: Comprehensive audit logging

## API Methods

### Feature Management

- `CreateFeature`: Create a new feature flag
- `UpdateFeature`: Update feature flag properties
- `DeleteFeature`: Remove a feature flag
- `GetFeature`: Retrieve feature details
- `ListFeatures`: List features with filtering

### Feature Evaluation

- `IsEnabled`: Check if a feature is enabled for a context
- `GetVariant`: Get the active variant for a feature
- `EvaluateFeatures`: Batch evaluate multiple features

### Targeting Rules

- `AddTargetingRule`: Add targeting rules to a feature
- `UpdateTargetingRule`: Modify existing targeting rules
- `RemoveTargetingRule`: Remove targeting rules

### Metrics & Analytics

- `RecordImpression`: Record feature usage
- `GetFeatureMetrics`: Retrieve feature metrics

### Environment Management

- `CreateEnvironment`: Create new environments
- `CopyEnvironment`: Copy environment configurations

## Configuration

### Environment Variables

```bash
# Unleash Configuration
UNLEASH_URL=http://unleash:4242/api
UNLEASH_APP_NAME=fountane-feature-service
UNLEASH_INSTANCE_ID=fountane-feature-service-instance
UNLEASH_API_TOKEN=your-api-token
UNLEASH_ENVIRONMENT=development
UNLEASH_REFRESH_INTERVAL=15000
UNLEASH_METRICS_INTERVAL=60000

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

# Service Configuration
NODE_ENV=production
LOG_LEVEL=info
```

## Development

### Running Locally

```bash
# Install dependencies
npm install

# Start the service
nx serve feature-service
```

### Building

```bash
# Build the service
nx build feature-service

# Build Docker image
docker build -f apps/services/feature-service/Dockerfile -t fountane-feature-service .
```

### Testing

```bash
# Run unit tests
nx test feature-service

# Run integration tests
nx test feature-service --integration
```

## Client Integration

### TypeScript Example

```typescript
import { credentials } from '@grpc/grpc-js';
import { FeatureServiceClient } from '@fountane/proto/feature';

const client = new FeatureServiceClient('localhost:50053', credentials.createInsecure());

// Check if a feature is enabled
const response = await client.isEnabled({
  featureName: 'new-dashboard',
  context: {
    userId: 'user-123',
    tenantId: 'tenant-456',
    properties: {
      plan: 'premium',
    },
  },
});

console.log('Feature enabled:', response.enabled);
```

### Python Example

```python
import grpc
from fountane.proto import feature_pb2, feature_pb2_grpc

channel = grpc.insecure_channel('localhost:50053')
stub = feature_pb2_grpc.FeatureServiceStub(channel)

# Evaluate multiple features
request = feature_pb2.EvaluateFeaturesRequest(
    feature_names=['feature1', 'feature2'],
    context=feature_pb2.EvaluationContext(
        user_id='user-123',
        tenant_id='tenant-456'
    )
)

response = stub.EvaluateFeatures(request)
for name, evaluation in response.evaluations.items():
    print(f"{name}: enabled={evaluation.enabled}, variant={evaluation.variant}")
```

## Feature Types

### Boolean Flags

Simple on/off toggles for features.

### Percentage Rollouts

Gradually roll out features to a percentage of users.

### Variant Flags

A/B testing with multiple variants.

### Targeted Flags

Enable features for specific users, groups, or attributes.

## Caching Strategy

The service implements a multi-level caching strategy:

1. **Feature Evaluation Cache**: 5-minute TTL for evaluation results
2. **Feature Definition Cache**: 1-minute TTL for feature configurations
3. **Invalidation**: Automatic cache invalidation on feature updates

## Monitoring

### Health Check

The service exposes a gRPC health check on port 50053.

### Metrics

- Feature evaluation count
- Cache hit/miss rates
- Evaluation latency
- Error rates

### Logging

Structured logging with correlation IDs for request tracing.

## Security

- API token authentication for Unleash
- gRPC SSL/TLS support
- Audit logging for all changes
- Role-based access control (when integrated with Auth Service)

## Troubleshooting

### Common Issues

1. **Unleash Connection Failed**
   - Check UNLEASH_URL configuration
   - Verify API token is correct
   - Ensure Unleash service is running

2. **Cache Connection Failed**
   - Verify Redis is running
   - Check REDIS_HOST and REDIS_PORT
   - Confirm Redis password is correct

3. **Feature Not Found**
   - Ensure feature exists in Unleash
   - Check environment configuration
   - Verify feature name spelling

## Contributing

Please follow the project's contribution guidelines and ensure all tests pass before submitting pull requests.
