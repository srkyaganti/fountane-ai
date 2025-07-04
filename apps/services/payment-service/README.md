# Payment Service

The Payment Service is a Lago wrapper that provides subscription management, usage-based billing, and payment processing capabilities for the Fountane AI platform.

## Overview

This service implements the payment functionality as specified in the Fountane AI technical documentation, providing:

- Customer management
- Subscription lifecycle management
- Usage tracking and metering
- Invoice generation and management
- Payment method management
- Webhook handling for payment events

## Architecture

The Payment Service follows a microservice architecture pattern:

- **gRPC API**: Exposes payment operations via Protocol Buffers
- **Lago Integration**: Wraps Lago API for billing operations
- **Stripe Integration**: Handles payment processing
- **PostgreSQL**: Stores local payment data and audit trails
- **Event-driven**: Processes webhooks from payment providers

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Redis (for caching)
- Lago account and API key
- Stripe account and API keys

## Setup

1. **Install dependencies**:

   ```bash
   pnpm install
   ```

2. **Configure environment**:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Setup database**:

   ```bash
   pnpm prisma:migrate
   ```

4. **Generate Prisma client**:
   ```bash
   pnpm prisma:generate
   ```

## Development

Run the service in development mode:

```bash
pnpm nx serve payment-service
```

## API Operations

### Customer Management

- `CreateCustomer`: Create a new customer
- `UpdateCustomer`: Update customer information
- `GetCustomer`: Retrieve customer details
- `ListCustomers`: List all customers with pagination

### Subscription Management

- `CreateSubscription`: Create a new subscription
- `UpdateSubscription`: Modify subscription items
- `CancelSubscription`: Cancel an active subscription
- `ReactivateSubscription`: Reactivate a canceled subscription

### Usage Tracking

- `RecordUsage`: Record usage events for billing
- `GetUsage`: Retrieve usage records for a period

### Billing

- `GenerateInvoice`: Generate invoice for a billing period
- `GetInvoice`: Retrieve invoice details
- `ListInvoices`: List invoices with filters

### Payment Methods

- `AddPaymentMethod`: Add a payment method
- `RemovePaymentMethod`: Remove a payment method
- `SetDefaultPaymentMethod`: Set default payment method

### Webhooks

- `HandleWebhook`: Process webhooks from payment providers

## Database Schema

The service uses Prisma ORM with the following main models:

- **Customer**: Stores customer information
- **Subscription**: Manages subscription lifecycle
- **Invoice**: Tracks generated invoices
- **PaymentMethod**: Stores payment methods
- **UsageRecord**: Records usage events
- **WebhookEvent**: Logs webhook events

## Testing

Run tests:

```bash
pnpm nx test payment-service
```

## Building

Build for production:

```bash
pnpm nx build payment-service
```

## Docker

Build Docker image:

```bash
docker build -t payment-service -f apps/services/payment-service/Dockerfile .
```

Run with Docker:

```bash
docker run -p 50052:50052 --env-file .env payment-service
```

## Monitoring

The service includes:

- Structured logging with correlation IDs
- Health check endpoints
- Metrics collection
- Error tracking

## Security

- All API calls require authentication
- Webhook signatures are validated
- PCI compliance through Stripe
- Encrypted sensitive data storage

## Troubleshooting

Common issues:

1. **Database connection errors**: Check DATABASE_URL and PostgreSQL status
2. **Lago API errors**: Verify LAGO_API_KEY and network connectivity
3. **Webhook failures**: Check webhook secrets and payload validation

## Support

For issues or questions, refer to the Fountane AI documentation or contact the platform team.
