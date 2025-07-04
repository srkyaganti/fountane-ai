# Fountane AI - Complete Technical Implementation Specification

## Table of Contents

1. [System Overview](about:blank#system-overview)
2. [Architecture Philosophy](about:blank#architecture-philosophy)
3. [Technology Stack](about:blank#technology-stack)
4. [Monorepo Structure](about:blank#monorepo-structure)
5. [Core Services Specification](about:blank#core-services-specification)
6. [Shared Libraries Design](about:blank#shared-libraries-design)
7. [Template System Architecture](about:blank#template-system-architecture)
8. [AI Code Generation Pipeline](about:blank#ai-code-generation-pipeline)
9. [Development Workflow](about:blank#development-workflow)
10. [Deployment Architecture](about:blank#deployment-architecture)
11. [Security & Compliance](about:blank#security-compliance)
12. [Monitoring & Observability](about:blank#monitoring-observability)
13. [Testing Strategy](about:blank#testing-strategy)
14. [Documentation Requirements](about:blank#documentation-requirements)

---

## 1. System Overview

### Purpose

Fountane AI is an enterprise intelligence platform that enables rapid development and deployment of AI-powered business applications. The system allows non-technical CIOs to transform their vision into working, production-ready applications within days instead of months.

### Core Principles

- **Type Safety First**: Every interaction between services must be type-safe and validated at compile time
- **AI-Friendly Architecture**: All APIs and workflows must be designed for AI consumption and generation
- **Enterprise-Ready**: Security, compliance, and scalability built into every component
- **Self-Documenting**: Code structure and APIs must be intuitive and well-documented
- **Minimal Human Intervention**: Architecture should guide AI to generate correct code with minimal fixes

### Success Metrics

- One developer can manage 3-4 concurrent demo projects
- 95% of generated code compiles without errors
- Demo delivery time reduced from weeks to 48-72 hours
- All generated applications pass enterprise security audits

---

## 2. Architecture Philosophy

### Microservices Design Principles

### Service Boundaries

Each microservice must:
- Have a single, well-defined responsibility
- Own its data and never share databases
- Communicate only through well-defined gRPC contracts
- Be independently deployable and scalable
- Include comprehensive health checks and metrics

### Communication Patterns

- **Synchronous**: gRPC for service-to-service communication
- **Asynchronous**: Redis-based queues (BullMQ) for background jobs
- **Real-time**: WebSocket (Centrifugo) for client updates
- **Events**: Event bus for loose coupling between services

### API Design Philosophy

### gRPC Service Design

Every gRPC service must follow these patterns:
- Use Protocol Buffers version 3
- Include semantic versioning in package names
- Implement standard CRUD operations where applicable
- Use consistent naming conventions across all services
- Include detailed field comments for AI understanding

### Error Handling Strategy

- Use standard gRPC status codes
- Include detailed error messages in metadata
- Implement circuit breakers for resilience
- Log all errors with correlation IDs
- Provide actionable error messages for AI interpretation

### Data Architecture

### Database Design

- PostgreSQL as primary datastore for all services
- Each service owns its schema
- Use Prisma for type-safe database access
- Implement soft deletes for audit trails
- Standard audit fields on all tables (created_at, updated_at, created_by, updated_by)

### Caching Strategy

- Redis for session management and caching
- Cache-aside pattern for read-heavy operations
- TTL-based expiration for all cached data
- Cache invalidation through event bus

---

## 3. Technology Stack

### Core Technologies

### Languages & Frameworks

- **Primary Language**: TypeScript (strict mode enabled)
- **Backend Framework**: NestJS for service implementation
- **Frontend Framework**: Next.js 15 with App Router
- **Mobile Framework**: React Native with Expo
- **API Protocol**: gRPC with gRPC-Web for browser clients
- **Schema Definition**: Protocol Buffers v3

### Infrastructure Components

- **Container Runtime**: Docker with multi-stage builds
- **Orchestration**: Kubernetes with Helm charts
- **Service Mesh**: Istio for traffic management
- **API Gateway**: Kong for external API management
- **Message Queue**: BullMQ (Redis-based)
- **Event Streaming**: Redis Streams
- **Search Engine**: Elasticsearch for full-text search

### Development Tools

- **Monorepo Tool**: Nx version 21+
- **Package Manager**: pnpm for efficient dependency management
- **Code Generation**: Nx generators and custom templates
- **API Documentation**: Protobuf with buf.build
- **Testing Framework**: Jest with Supertest
- **E2E Testing**: Playwright for web, Detox for mobile

### Third-Party Services (Self-Hosted)

### Authentication & Authorization

- **Primary**: Keycloak 23.0+
- **Features Required**:
    - OAuth2/OIDC support
    - SAML for enterprise SSO
    - Multi-factor authentication
    - Fine-grained permissions
    - User federation

### Workflow Orchestration

- **Primary**: n8n (latest stable)
- **Alternative**: Temporal for complex workflows
- **Requirements**:
    - REST API for programmatic access
    - Webhook support
    - Error handling and retries
    - Visual workflow designer

### Feature Management

- **Primary**: Unleash (latest stable)
- **Requirements**:
    - SDK support for TypeScript, React, React Native
    - Gradual rollouts
    - User targeting
    - A/B testing capabilities

### Payment Processing

- **Primary**: Lago (latest stable)
- **Requirements**:
    - Subscription management
    - Usage-based billing
    - Invoice generation
    - Webhook events

### Observability Stack

- **Metrics**: Prometheus + Grafana
- **Logging**: Grafana Loki
- **Tracing**: Grafana Tempo
- **Error Tracking**: Sentry self-hosted

---

## 4. Monorepo Structure

### Directory Organization

```
fountane-ai/
├── apps/                           # Deployable applications
│   ├── services/                   # Microservices
│   │   ├── auth-service/           # Keycloak wrapper service
│   │   ├── workflow-service/       # n8n wrapper service
│   │   ├── queue-service/          # BullMQ wrapper service
│   │   ├── realtime-service/       # Centrifugo wrapper service
│   │   ├── feature-service/        # Unleash wrapper service
│   │   ├── payment-service/        # Lago wrapper service
│   │   └── gateway/                # Kong API gateway configuration
│   ├── web/                        # Web applications
│   │   ├── admin-dashboard/        # Internal admin dashboard
│   │   ├── client-portal/          # Customer-facing portal
│   │   └── demo-template/          # Template for generated demos
│   └── mobile/                     # Mobile applications
│       └── demo-template/          # Template for generated mobile apps
├── libs/                           # Shared libraries
│   ├── core/                       # Core functionality
│   │   ├── grpc-contracts/         # Protobuf definitions
│   │   ├── sdk-generator/          # SDK generation from protos
│   │   ├── types/                  # Shared TypeScript types
│   │   ├── utils/                  # Shared utilities
│   │   └── constants/              # Shared constants
│   ├── backend/                    # Backend-specific libs
│   │   ├── database/               # Prisma schemas and migrations
│   │   ├── auth/                   # Auth middleware and guards
│   │   ├── logging/                # Structured logging
│   │   ├── tracing/                # OpenTelemetry setup
│   │   └── testing/                # Testing utilities
│   ├── frontend/                   # Frontend-specific libs
│   │   ├── ui-components/          # Shared React components
│   │   ├── hooks/                  # Shared React hooks
│   │   ├── styles/                 # Shared styles and themes
│   │   └── api-client/             # tRPC client setup
│   └── templates/                  # Code generation templates
│       ├── service-template/       # Microservice template
│       ├── api-template/           # API endpoint template
│       └── component-template/     # React component template
├── tools/                          # Build and development tools
│   ├── generators/                 # Nx custom generators
│   ├── scripts/                    # Build and deployment scripts
│   └── docker/                     # Docker configurations
├── infrastructure/                 # Infrastructure as code
│   ├── kubernetes/                 # K8s manifests and Helm charts
│   ├── terraform/                  # Terraform modules
│   └── ansible/                    # Configuration management
├── docs/                           # Documentation
│   ├── architecture/               # Architecture decisions
│   ├── api/                        # API documentation
│   ├── guides/                     # Developer guides
│   └── runbooks/                   # Operational runbooks
├── nx.json                         # Nx configuration
├── package.json                    # Root package.json
├── pnpm-workspace.yaml            # pnpm workspace configuration
├── tsconfig.base.json             # Base TypeScript configuration
├── .env.example                   # Environment variables template
└── docker-compose.yml             # Local development setup
```

### Nx Configuration Requirements

### Workspace Configuration (nx.json)

- Set implicit dependencies between services
- Configure caching for build, test, and lint targets
- Define task pipelines for dependent builds
- Set up affected command defaults
- Configure distributed task execution

### Project Configuration Standards

Each project must have:
- Clearly defined build, serve, test, and lint targets
- Proper output paths configuration
- Dependency declarations
- Custom executors where needed
- Environment-specific configurations

---

## 5. Core Services Specification

### 5.1 Auth Service (Keycloak Wrapper)

### Purpose

Provides a simplified, type-safe interface to Keycloak for authentication and authorization across all Fountane AI applications.

### gRPC Service Definition Requirements

```protobuf
service AuthService {
  // User Management  rpc CreateUser(CreateUserRequest) returns (User);
  rpc GetUser(GetUserRequest) returns (User);
  rpc UpdateUser(UpdateUserRequest) returns (User);
  rpc DeleteUser(DeleteUserRequest) returns (Empty);
  rpc ListUsers(ListUsersRequest) returns (ListUsersResponse);
  // Authentication  rpc Login(LoginRequest) returns (LoginResponse);
  rpc Logout(LogoutRequest) returns (Empty);
  rpc RefreshToken(RefreshTokenRequest) returns (RefreshTokenResponse);
  rpc ValidateToken(ValidateTokenRequest) returns (ValidateTokenResponse);
  // Password Management  rpc ResetPassword(ResetPasswordRequest) returns (Empty);
  rpc ChangePassword(ChangePasswordRequest) returns (Empty);
  rpc SendPasswordResetEmail(SendPasswordResetEmailRequest) returns (Empty);
  // Role & Permission Management  rpc AssignRole(AssignRoleRequest) returns (Empty);
  rpc RemoveRole(RemoveRoleRequest) returns (Empty);
  rpc GetUserRoles(GetUserRolesRequest) returns (GetUserRolesResponse);
  rpc CheckPermission(CheckPermissionRequest) returns (CheckPermissionResponse);
  // SSO Management  rpc ConfigureSSO(ConfigureSSORequest) returns (SSOConfiguration);
  rpc ListSSOProviders(ListSSOProvidersRequest) returns (ListSSOProvidersResponse);
  // Multi-tenancy  rpc CreateTenant(CreateTenantRequest) returns (Tenant);
  rpc SwitchTenant(SwitchTenantRequest) returns (SwitchTenantResponse);
}
```

### Implementation Requirements

- Implement automatic Keycloak realm creation for new tenants
- Cache user sessions in Redis with sliding expiration
- Implement rate limiting for login attempts
- Support both JWT and opaque tokens
- Integrate with enterprise SSO providers (SAML, OIDC)
- Implement user impersonation for support purposes
- Audit log all authentication events
- Support MFA with TOTP and SMS options

### Database Schema Requirements

- Users table with Keycloak ID mapping
- User profiles with extended attributes
- Audit logs for all auth events
- Session tracking for concurrent login limits
- Password history for policy enforcement

### 5.2 Workflow Service (n8n Wrapper)

### Purpose

Provides a JSON-based DSL for defining and executing business workflows without requiring knowledge of n8n’s internal structure.

### gRPC Service Definition Requirements

```protobuf
service WorkflowService {
  // Workflow Management  rpc CreateWorkflow(CreateWorkflowRequest) returns (Workflow);
  rpc UpdateWorkflow(UpdateWorkflowRequest) returns (Workflow);
  rpc DeleteWorkflow(DeleteWorkflowRequest) returns (Empty);
  rpc GetWorkflow(GetWorkflowRequest) returns (Workflow);
  rpc ListWorkflows(ListWorkflowsRequest) returns (ListWorkflowsResponse);
  // Execution Management  rpc ExecuteWorkflow(ExecuteWorkflowRequest) returns (Execution);
  rpc GetExecution(GetExecutionRequest) returns (Execution);
  rpc ListExecutions(ListExecutionsRequest) returns (ListExecutionsResponse);
  rpc CancelExecution(CancelExecutionRequest) returns (Empty);
  rpc RetryExecution(RetryExecutionRequest) returns (Execution);
  // Template Management  rpc CreateTemplate(CreateTemplateRequest) returns (WorkflowTemplate);
  rpc ListTemplates(ListTemplatesRequest) returns (ListTemplatesResponse);
  rpc InstantiateTemplate(InstantiateTemplateRequest) returns (Workflow);
  // Monitoring  rpc GetWorkflowMetrics(GetWorkflowMetricsRequest) returns (WorkflowMetrics);
  rpc StreamExecutionLogs(StreamExecutionLogsRequest) returns (stream ExecutionLog);
}
```

### JSON DSL Specification

The workflow DSL must support:
- Sequential and parallel execution
- Conditional branching
- Loop constructs
- Error handling and compensation
- External service calls
- Human approval steps
- Scheduled execution
- Event triggers

Example DSL structure:

```json
{  "id": "customer-onboarding",  "version": "1.0",  "triggers": [    {      "type": "webhook",      "config": { "path": "/webhooks/new-customer" }    }  ],  "steps": [    {      "id": "validate-customer",      "type": "service",      "service": "CustomerService.ValidateCustomer",      "input": { "customerId": "{{trigger.customerId}}" },      "retry": { "attempts": 3, "backoff": "exponential" }    },    {      "id": "parallel-setup",      "type": "parallel",      "steps": [        {          "id": "create-account",          "type": "service",          "service": "AccountService.CreateAccount"        },        {          "id": "send-welcome-email",          "type": "service",          "service": "EmailService.SendTemplate",          "input": { "template": "welcome" }        }      ]    }  ],  "errorHandler": {    "type": "compensate",    "notificationChannel": "ops-alerts"  }}
```

### Implementation Requirements

- Translate JSON DSL to n8n workflow format
- Store workflow definitions in PostgreSQL
- Version control for workflow changes
- Implement workflow validation before save
- Support workflow imports/exports
- Real-time execution monitoring via WebSocket
- Implement retry policies and dead letter queues
- Support for long-running workflows with checkpoints

### 5.3 Queue Service (BullMQ Wrapper)

### Purpose

Provides reliable background job processing with a simple API that hides BullMQ complexity.

### gRPC Service Definition Requirements

```protobuf
service QueueService {
  // Job Management  rpc CreateJob(CreateJobRequest) returns (Job);
  rpc GetJob(GetJobRequest) returns (Job);
  rpc CancelJob(CancelJobRequest) returns (Empty);
  rpc RetryJob(RetryJobRequest) returns (Job);
  rpc ListJobs(ListJobsRequest) returns (ListJobsResponse);
  // Queue Management  rpc CreateQueue(CreateQueueRequest) returns (Queue);
  rpc PauseQueue(PauseQueueRequest) returns (Empty);
  rpc ResumeQueue(ResumeQueueRequest) returns (Empty);
  rpc DrainQueue(DrainQueueRequest) returns (Empty);
  rpc GetQueueStats(GetQueueStatsRequest) returns (QueueStats);
  // Scheduled Jobs  rpc ScheduleJob(ScheduleJobRequest) returns (ScheduledJob);
  rpc CancelScheduledJob(CancelScheduledJobRequest) returns (Empty);
  rpc ListScheduledJobs(ListScheduledJobsRequest) returns (ListScheduledJobsResponse);
  // Monitoring  rpc StreamJobEvents(StreamJobEventsRequest) returns (stream JobEvent);
  rpc GetJobMetrics(GetJobMetricsRequest) returns (JobMetrics);
}
```

### Job Types to Support

- Email sending
- Report generation
- Data imports/exports
- Webhook deliveries
- Scheduled maintenance
- Batch processing
- Video/Image processing
- Third-party API sync

### Implementation Requirements

- Implement job priority levels
- Support job dependencies
- Implement rate limiting per queue
- Dead letter queue for failed jobs
- Job progress tracking
- Bulk job operations
- Job result storage in S3/MinIO
- Graceful shutdown handling

### 5.4 Realtime Service (Centrifugo Wrapper)

### Purpose

Provides real-time bidirectional communication between servers and clients with presence, history, and room management.

### gRPC Service Definition Requirements

```protobuf
service RealtimeService {
  // Channel Management  rpc CreateChannel(CreateChannelRequest) returns (Channel);
  rpc DeleteChannel(DeleteChannelRequest) returns (Empty);
  rpc ListChannels(ListChannelsRequest) returns (ListChannelsResponse);
  // Publishing  rpc Publish(PublishRequest) returns (PublishResponse);
  rpc PublishBatch(PublishBatchRequest) returns (PublishBatchResponse);
  // Presence  rpc GetPresence(GetPresenceRequest) returns (GetPresenceResponse);
  rpc GetPresenceStats(GetPresenceStatsRequest) returns (GetPresenceStatsResponse);
  // History  rpc GetHistory(GetHistoryRequest) returns (GetHistoryResponse);
  rpc RemoveHistory(RemoveHistoryRequest) returns (Empty);
  // Connection Management  rpc DisconnectUser(DisconnectUserRequest) returns (Empty);
  rpc RefreshConnection(RefreshConnectionRequest) returns (Empty);
  // Subscription Management  rpc Subscribe(SubscribeRequest) returns (SubscribeResponse);
  rpc Unsubscribe(UnsubscribeRequest) returns (Empty);
}
```

### Channel Types to Support

- User notifications (1:1)
- Team channels (many:many)
- System broadcasts (1:many)
- Presence channels
- Private channels with invite-only access

### Implementation Requirements

- JWT-based authentication for connections
- Channel access control via permissions
- Message history with configurable retention
- Presence tracking with timeout handling
- Horizontal scaling with Redis pub/sub
- Message delivery guarantees
- Reconnection handling
- Rate limiting per user/channel

### 5.5 Feature Service (Unleash Wrapper)

### Purpose

Provides feature flag management with targeting, gradual rollouts, and A/B testing capabilities.

### gRPC Service Definition Requirements

```protobuf
service FeatureService {
  // Feature Flag Management  rpc CreateFeature(CreateFeatureRequest) returns (Feature);
  rpc UpdateFeature(UpdateFeatureRequest) returns (Feature);
  rpc DeleteFeature(DeleteFeatureRequest) returns (Empty);
  rpc GetFeature(GetFeatureRequest) returns (Feature);
  rpc ListFeatures(ListFeaturesRequest) returns (ListFeaturesResponse);
  // Feature Evaluation  rpc IsEnabled(IsEnabledRequest) returns (IsEnabledResponse);
  rpc GetVariant(GetVariantRequest) returns (GetVariantResponse);
  rpc EvaluateFeatures(EvaluateFeaturesRequest) returns (EvaluateFeaturesResponse);
  // Targeting Rules  rpc AddTargetingRule(AddTargetingRuleRequest) returns (TargetingRule);
  rpc RemoveTargetingRule(RemoveTargetingRuleRequest) returns (Empty);
  rpc UpdateTargetingRule(UpdateTargetingRuleRequest) returns (TargetingRule);
  // Metrics & Analytics  rpc RecordImpression(RecordImpressionRequest) returns (Empty);
  rpc GetFeatureMetrics(GetFeatureMetricsRequest) returns (FeatureMetrics);
  // Environment Management  rpc CreateEnvironment(CreateEnvironmentRequest) returns (Environment);
  rpc CopyEnvironment(CopyEnvironmentRequest) returns (Environment);
}
```

### Feature Flag Types

- Boolean flags (on/off)
- Percentage rollouts
- User targeting
- Group targeting
- Time-based activation
- Multi-variant experiments

### Implementation Requirements

- SDK generation for all platforms
- Local flag caching with updates
- Audit log for all changes
- Integration with analytics
- Import/export capabilities
- Flag dependencies
- Stale flag detection
- Performance metrics tracking

### 5.6 Payment Service (Lago Wrapper)

### Purpose

Provides subscription management, usage-based billing, and payment processing with multi-currency support.

### gRPC Service Definition Requirements

```protobuf
service PaymentService {
  // Customer Management  rpc CreateCustomer(CreateCustomerRequest) returns (Customer);
  rpc UpdateCustomer(UpdateCustomerRequest) returns (Customer);
  rpc GetCustomer(GetCustomerRequest) returns (Customer);
  rpc ListCustomers(ListCustomersRequest) returns (ListCustomersResponse);
  // Subscription Management  rpc CreateSubscription(CreateSubscriptionRequest) returns (Subscription);
  rpc UpdateSubscription(UpdateSubscriptionRequest) returns (Subscription);
  rpc CancelSubscription(CancelSubscriptionRequest) returns (Subscription);
  rpc ReactivateSubscription(ReactivateSubscriptionRequest) returns (Subscription);
  // Usage Tracking  rpc RecordUsage(RecordUsageRequest) returns (Empty);
  rpc GetUsage(GetUsageRequest) returns (GetUsageResponse);
  // Billing  rpc GenerateInvoice(GenerateInvoiceRequest) returns (Invoice);
  rpc GetInvoice(GetInvoiceRequest) returns (Invoice);
  rpc ListInvoices(ListInvoicesRequest) returns (ListInvoicesResponse);
  // Payment Methods  rpc AddPaymentMethod(AddPaymentMethodRequest) returns (PaymentMethod);
  rpc RemovePaymentMethod(RemovePaymentMethodRequest) returns (Empty);
  rpc SetDefaultPaymentMethod(SetDefaultPaymentMethodRequest) returns (Empty);
  // Webhooks  rpc HandleWebhook(HandleWebhookRequest) returns (HandleWebhookResponse);
}
```

### Billing Models to Support

- Flat-rate subscriptions
- Tiered pricing
- Usage-based billing
- Per-seat pricing
- One-time charges
- Discounts and coupons

### Implementation Requirements

- PCI compliance considerations
- Multi-currency support
- Tax calculation integration
- Dunning management
- Revenue recognition
- Subscription lifecycle events
- Payment retry logic
- Billing portal generation

---

## 6. Shared Libraries Design

### 6.1 gRPC Contracts Library

### Purpose

Central repository for all Protocol Buffer definitions and generated code.

### Structure

```
libs/core/grpc-contracts/
├── proto/
│   ├── auth/
│   │   └── v1/
│   │       ├── auth.proto
│   │       └── auth_types.proto
│   ├── workflow/
│   │   └── v1/
│   │       ├── workflow.proto
│   │       └── workflow_types.proto
│   ├── common/
│   │   ├── pagination.proto
│   │   ├── errors.proto
│   │   └── metadata.proto
│   └── buf.yaml
├── generated/
│   ├── typescript/
│   ├── go/
│   └── python/
├── scripts/
│   ├── generate-code.sh
│   └── validate-breaking-changes.sh
└── package.json
```

### Implementation Requirements

- Use buf.build for proto management
- Implement breaking change detection
- Generate TypeScript, Go, and Python code
- Include gRPC-Web support
- Implement proto documentation generation
- Version management for backward compatibility
- Custom options for field validation

### 6.2 SDK Generator Library

### Purpose

Automatically generates type-safe SDKs from gRPC contracts for use in applications.

### Generated SDK Structure

```tsx
// Example generated SDKexport class AuthServiceClient {
  constructor(private transport: Transport) {}
  async createUser(request: CreateUserRequest): Promise<User> {
    // Implementation with retry logic, error handling, etc.  }
  async login(request: LoginRequest): Promise<LoginResponse> {
    // Implementation with token management  }
  // ... other methods}
```

### Requirements

- Generate SDKs for TypeScript, Python, Go
- Include retry logic with exponential backoff
- Implement circuit breaker pattern
- Add request/response interceptors
- Include comprehensive error types
- Generate mock clients for testing
- Support both callback and promise APIs

### 6.3 Database Library

### Purpose

Centralized database schemas, migrations, and utilities using Prisma.

### Structure

```
libs/backend/database/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── client.ts
│   ├── middleware/
│   │   ├── soft-delete.ts
│   │   ├── audit-log.ts
│   │   └── multi-tenancy.ts
│   ├── utils/
│   │   ├── pagination.ts
│   │   └── search.ts
│   └── types/
│       └── generated.ts
└── package.json
```

### Schema Requirements

- Multi-tenancy support via RLS
- Soft deletes on all tables
- Audit fields (created_at, updated_at, etc.)
- UUID primary keys
- Optimistic locking support
- Full-text search indexes
- JSON field validation

### 6.4 UI Components Library

### Purpose

Shared React components for consistent UI across all web applications.

### Component Categories

- **Layout Components**: Header, Footer, Sidebar, Layout
- **Form Components**: Input, Select, DatePicker, FileUpload
- **Data Display**: Table, Card, Timeline, Stats
- **Feedback**: Alert, Toast, Modal, Drawer
- **Navigation**: Breadcrumb, Tabs, Stepper
- **Charts**: Line, Bar, Pie, Area (using Recharts)

### Implementation Requirements

- Built with shadcn/ui as base
- Full TypeScript support
- Dark mode support
- Responsive design
- Storybook documentation
- Unit tests for all components
- Performance optimization

### 6.5 Cross-Platform Styling Library

### Purpose

Shared styling system that works across Next.js and React Native applications.

### Structure

```
libs/frontend/styles/
├── tokens/
│   ├── colors.ts
│   ├── typography.ts
│   ├── spacing.ts
│   ├── shadows.ts
│   └── animations.ts
├── themes/
│   ├── light.ts
│   ├── dark.ts
│   └── high-contrast.ts
├── utils/
│   ├── responsive.ts
│   └── platform.ts
└── index.ts
```

### Requirements

- Design token system
- Platform-specific implementations
- Theme switching support
- Responsive helpers
- Animation presets
- Consistent naming convention
- TypeScript autocomplete

---

## 7. Template System Architecture

### 7.1 Backend Service Template

### Purpose

Standardized template for creating new microservices with all boilerplate configured.

### Template Structure

```
templates/backend-service/
├── src/
│   ├── main.ts                 # Service entry point
│   ├── app.module.ts          # NestJS root module
│   ├── config/
│   │   ├── configuration.ts   # Configuration management
│   │   └── validation.ts      # Environment validation
│   ├── grpc/
│   │   ├── server.ts         # gRPC server setup
│   │   └── interceptors/     # gRPC interceptors
│   ├── health/
│   │   ├── health.controller.ts
│   │   └── health.service.ts
│   ├── metrics/
│   │   └── metrics.service.ts
│   └── tracing/
│       └── tracing.service.ts
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── jest.config.js
└── package.json
```

### Included Features

- gRPC server with reflection
- Health checks (readiness/liveness)
- Prometheus metrics endpoint
- OpenTelemetry tracing
- Structured logging with Pino
- Configuration validation
- Graceful shutdown handling
- Error handling middleware
- Rate limiting
- API versioning support

### 7.2 Web Application Template

### Purpose

Next.js template with authentication, API integration, and common features pre-configured.

### Template Structure

```
templates/web-app/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── reset-password/
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   └── dashboard/
│   │   └── api/
│   │       └── trpc/
│   ├── components/
│   │   ├── layouts/
│   │   ├── features/
│   │   └── ui/
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   ├── use-feature-flag.ts
│   │   └── use-realtime.ts
│   ├── lib/
│   │   ├── trpc.ts
│   │   ├── auth.ts
│   │   └── api-client.ts
│   ├── styles/
│   │   └── globals.css
│   └── types/
│       └── index.ts
├── public/
├── .env.local.example
├── next.config.js
├── tailwind.config.js
└── package.json
```

### Included Features

- Authentication flows with Keycloak
- tRPC integration for type-safe APIs
- WebSocket connection management
- Feature flag integration
- Internationalization setup
- SEO optimization
- PWA configuration
- Error boundary setup
- Analytics integration
- Performance monitoring

### 7.3 Mobile Application Template

### Purpose

React Native template with cross-platform components and native features configured.

### Template Structure

```
templates/mobile-app/
├── src/
│   ├── app/
│   │   ├── _layout.tsx
│   │   ├── (auth)/
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   └── _layout.tsx
│   │   ├── (tabs)/
│   │   │   ├── home.tsx
│   │   │   ├── profile.tsx
│   │   │   └── _layout.tsx
│   │   └── index.tsx
│   ├── components/
│   │   ├── common/
│   │   ├── features/
│   │   └── ui/
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   ├── use-storage.ts
│   │   └── use-notifications.ts
│   ├── lib/
│   │   ├── api-client.ts
│   │   ├── storage.ts
│   │   └── notifications.ts
│   ├── navigation/
│   │   └── types.ts
│   └── styles/
│       └── theme.ts
├── assets/
├── app.json
├── babel.config.js
├── metro.config.js
└── package.json
```

### Included Features

- Expo Router for navigation
- Authentication with secure storage
- Push notification setup
- Camera and media handling
- Offline support with sync
- Biometric authentication
- Deep linking configuration
- Over-the-air updates
- Crash reporting
- Performance monitoring

### 7.4 Workflow Template Library

### Purpose

Pre-built workflow patterns for common business processes.

### Template Categories

1. **User Onboarding**
    - Account creation
    - Email verification
    - Profile setup
    - Welcome sequence
2. **Approval Workflows**
    - Single approver
    - Multi-level approval
    - Parallel approval
    - Escalation rules
3. **Data Processing**
    - ETL pipelines
    - Report generation
    - Data validation
    - Batch imports
4. **Integration Patterns**
    - Webhook processing
    - API synchronization
    - Event streaming
    - File processing

---

## 8. AI Code Generation Pipeline

### 8.1 Generation Process

### Phase 1: Requirement Analysis

1. Parse natural language requirements
2. Identify required services and features
3. Select appropriate templates
4. Determine integration points
5. Create project structure

### Phase 2: Code Generation

1. Clone selected templates
2. Generate service contracts (Protocol Buffers)
3. Generate database schemas
4. Create API endpoints
5. Generate UI components
6. Configure integrations

### Phase 3: Validation & Compilation

1. Run TypeScript compilation
2. Validate gRPC contracts
3. Check database migrations
4. Run linting and formatting
5. Execute unit tests

### Phase 4: Error Correction

1. Parse compilation errors
2. Apply fixes based on error patterns
3. Re-run validation
4. Iterate until successful
5. Log corrections for learning

### Phase 5: Enhancement

1. Add business logic
2. Customize UI components
3. Configure workflows
4. Set up integrations
5. Add documentation

### 8.2 AI Guidance System

### Code Context Management

- Maintain awareness of available services
- Track imported dependencies
- Understand project structure
- Follow established patterns
- Respect type constraints

### Error Pattern Recognition

- Common TypeScript errors and fixes
- gRPC contract mismatches
- Database schema conflicts
- Import resolution issues
- Type inference problems

### Generation Constraints

- Only use existing gRPC methods
- Follow template structures
- Respect naming conventions
- Maintain consistent style
- Preserve type safety

### 8.3 Quality Assurance Rules

### Code Quality Checks

- No any types in TypeScript
- All functions have return types
- Error handling in all async operations
- Proper null/undefined checks
- Consistent naming conventions

### Security Checks

- No hardcoded credentials
- Input validation on all endpoints
- SQL injection prevention
- XSS protection
- CSRF token validation

### Performance Checks

- N+1 query detection
- Proper database indexing
- Caching strategy implementation
- Bundle size optimization
- Memory leak prevention

---

## 9. Development Workflow

### 9.1 Local Development Setup

### Prerequisites

- Node.js 20.x LTS
- pnpm 8.x
- Docker Desktop
- Kubernetes (via Docker Desktop or Minikube)
- PostgreSQL client tools
- Redis client tools

### Initial Setup Steps

1. Clone repository
2. Install dependencies: `pnpm install`
3. Copy environment files: `cp .env.example .env`
4. Start infrastructure: `docker-compose up -d`
5. Run migrations: `pnpm migrate:dev`
6. Seed database: `pnpm seed`
7. Start services: `pnpm dev`

### Development Commands

```bash
# Start all servicespnpm dev
# Start specific servicepnpm nx serve auth-service
# Run affected testspnpm affected:test
# Generate new servicepnpm nx g @fountane/plugin:service my-service
# Update dependenciespnpm update:deps
# Format codepnpm format
# Lint codepnpm lint
# Type checkpnpm type-check
```

### 9.2 Git Workflow

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: New features
- `fix/*`: Bug fixes
- `chore/*`: Maintenance tasks

### Commit Message Format

```
type(scope): subject

body

footer
```

Types: feat, fix, docs, style, refactor, test, chore

### Pull Request Process

1. Create feature branch from develop
2. Implement changes with tests
3. Run affected tests locally
4. Create PR with description
5. Pass CI checks
6. Code review by team
7. Merge to develop

### 9.3 CI/CD Pipeline

### GitHub Actions Workflows

### PR Validation

```yaml
name: PR Validationon: [pull_request]jobs:  validate:    steps:      - Checkout code      - Setup Node.js and pnpm      - Install dependencies      - Run affected lint      - Run affected tests      - Run affected build      - Upload coverage reports
```

### Main Branch Deployment

```yaml
name: Deployon:  push:    branches: [main]jobs:  deploy:    steps:      - Checkout code      - Build affected services      - Build Docker images      - Push to registry      - Deploy to Kubernetes      - Run smoke tests
```

### Quality Gates

- 90% code coverage minimum
- No critical security vulnerabilities
- All tests passing
- No linting errors
- Performance benchmarks met

---

## 10. Deployment Architecture

### 10.1 Kubernetes Architecture

### Namespace Structure

- `fountane-system`: Core platform services
- `fountane-apps`: Generated applications
- `fountane-monitoring`: Observability stack
- `fountane-data`: Databases and caches

### Resource Requirements

```yaml
# Minimum per serviceresources:  requests:    memory: "256Mi"    cpu: "100m"  limits:    memory: "512Mi"    cpu: "500m"
```

### Service Mesh Configuration

- Istio for traffic management
- mTLS between all services
- Circuit breakers configured
- Retry policies defined
- Rate limiting enabled

### 10.2 High Availability Setup

### Database HA

- PostgreSQL with streaming replication
- Automated failover with Patroni
- Point-in-time recovery setup
- Regular backup testing

### Redis HA

- Redis Sentinel for automatic failover
- Persistence enabled
- Regular snapshots
- Memory limits configured

### Service HA

- Minimum 3 replicas per service
- Pod disruption budgets
- Health checks configured
- Graceful shutdown handling

### 10.3 Scaling Strategy

### Horizontal Pod Autoscaling

```yaml
metrics:- type: Resource  resource:    name: cpu    target:      type: Utilization      averageUtilization: 70- type: Resource  resource:    name: memory    target:      type: Utilization      averageUtilization: 80
```

### Vertical Pod Autoscaling

- Enabled for non-critical services
- Recommendations mode for critical services
- Update policy: “Auto”

### Cluster Autoscaling

- Node pools with autoscaling
- Spot instances for non-critical workloads
- Reserved instances for core services

---

## 11. Security & Compliance

### 11.1 Security Architecture

### Network Security

- Network policies for pod-to-pod communication
- Ingress controllers with WAF
- DDoS protection
- TLS 1.3 minimum
- Certificate management with cert-manager

### Authentication & Authorization

- OAuth2/OIDC for user authentication
- mTLS for service-to-service
- RBAC for Kubernetes resources
- API key management
- Token rotation policies

### Data Security

- Encryption at rest (AES-256)
- Encryption in transit (TLS)
- Database column encryption for PII
- Secrets management with Vault
- Key rotation schedules

### 11.2 Compliance Requirements

### Data Privacy

- GDPR compliance tools
- Data retention policies
- Right to deletion implementation
- Data portability features
- Consent management

### Audit & Compliance

- Comprehensive audit logging
- Log retention policies
- Compliance reporting
- Access control matrices
- Regular security scans

### Industry Standards

- SOC 2 Type II controls
- ISO 27001 alignment
- HIPAA ready components
- PCI DSS considerations
- NIST framework adoption

### 11.3 Security Scanning

### Static Analysis

- SonarQube for code quality
- Snyk for dependency scanning
- Docker image scanning
- Secret detection
- License compliance

### Dynamic Analysis

- OWASP ZAP for web vulnerabilities
- API security testing
- Penetration testing schedule
- Load testing for DoS prevention
- Chaos engineering practices

---

## 12. Monitoring & Observability

### 12.1 Metrics Collection

### Application Metrics

- Request rate, error rate, duration (RED)
- Business metrics per service
- Custom metrics via Prometheus
- SLI/SLO tracking
- Cost per transaction

### Infrastructure Metrics

- Node resources (CPU, memory, disk)
- Pod resources and limits
- Network traffic and errors
- Database performance
- Cache hit rates

### 12.2 Logging Architecture

### Log Collection

- Structured JSON logging
- Correlation ID propagation
- Log levels: ERROR, WARN, INFO, DEBUG
- Sensitive data masking
- Log sampling for high volume

### Log Storage

- Loki for log aggregation
- 30-day retention for standard logs
- 90-day retention for audit logs
- Log archival to object storage
- Full-text search capabilities

### 12.3 Distributed Tracing

### Trace Collection

- OpenTelemetry instrumentation
- Automatic trace propagation
- Custom span attributes
- Sampling strategies
- Error trace retention

### Trace Analysis

- Service dependency maps
- Latency analysis
- Error root cause analysis
- Performance bottlenecks
- Critical path analysis

### 12.4 Alerting Strategy

### Alert Categories

- **Critical**: Immediate action required
- **Warning**: Investigation needed
- **Info**: Awareness only

### Alert Rules

```yaml
examples:- name: High Error Rate  condition: error_rate > 5%  duration: 5m  severity: critical- name: Memory Pressure  condition: memory_usage > 90%  duration: 10m  severity: warning
```

### Alert Routing

- PagerDuty for critical alerts
- Slack for warnings
- Email for daily summaries
- Escalation policies
- On-call rotations

---

## 13. Testing Strategy

### 13.1 Unit Testing

### Coverage Requirements

- Minimum 90% code coverage
- 100% coverage for critical paths
- Branch coverage tracking
- Mutation testing for quality

### Testing Standards

- Arrange-Act-Assert pattern
- Mock external dependencies
- Test edge cases
- Property-based testing
- Snapshot testing for UI

### 13.2 Integration Testing

### API Testing

- Contract testing with Pact
- gRPC service testing
- REST endpoint testing
- GraphQL query testing
- WebSocket connection testing

### Database Testing

- Migration testing
- Query performance testing
- Transaction isolation testing
- Concurrent access testing
- Data integrity checks

### 13.3 End-to-End Testing

### Test Scenarios

- User journey testing
- Cross-service workflows
- Payment flow testing
- Authentication flows
- Error handling paths

### Test Environment

- Isolated test namespaces
- Test data management
- Service virtualization
- Test parallelization
- Flaky test detection

### 13.4 Performance Testing

### Load Testing

- Gradual ramp-up tests
- Spike tests
- Soak tests
- Stress tests
- Capacity planning

### Performance Metrics

- Response time percentiles (p50, p95, p99)
- Throughput (requests per second)
- Error rates under load
- Resource utilization
- Database query performance

---

## 14. Documentation Requirements

### 14.1 API Documentation

### gRPC Documentation

- Proto file comments
- Service method descriptions
- Message field descriptions
- Example requests/responses
- Error code documentation

### REST API Documentation

- OpenAPI 3.0 specifications
- Interactive API explorer
- Authentication guides
- Rate limiting information
- Webhook documentation

### 14.2 Developer Documentation

### Getting Started Guides

- Local development setup
- First service tutorial
- First UI component
- Debugging guide
- Troubleshooting guide

### Architecture Documentation

- System design documents
- Service interaction diagrams
- Data flow diagrams
- Security architecture
- Decision records (ADRs)

### 14.3 Operational Documentation

### Runbooks

- Service deployment procedures
- Incident response procedures
- Backup and recovery
- Scaling procedures
- Maintenance windows

### Monitoring Guides

- Dashboard descriptions
- Alert response guides
- Performance tuning
- Capacity planning
- Cost optimization

### 14.4 User Documentation

### End User Guides

- Feature documentation
- Video tutorials
- FAQ sections
- Troubleshooting guides
- Best practices

### Administrator Guides

- System configuration
- User management
- Security settings
- Integration guides
- Reporting features

---

## Implementation Priorities

### Phase 1: Foundation (Weeks 1-2)

1. Set up Nx monorepo structure
2. Configure base TypeScript/ESLint/Prettier
3. Set up PostgreSQL and Redis
4. Implement auth service with Keycloak
5. Create first gRPC contract and SDK

### Phase 2: Core Services (Weeks 3-4)

1. Implement queue service with BullMQ
2. Implement realtime service with Centrifugo
3. Create base templates for services
4. Set up CI/CD pipeline
5. Implement logging and monitoring

### Phase 3: Templates & Generation (Weeks 5-6)

1. Create web application template
2. Create mobile application template
3. Implement workflow service
4. Build AI code generation pipeline
5. Create developer documentation

### Phase 4: Production Readiness (Weeks 7-8)

1. Security hardening
2. Performance optimization
3. Complete test coverage
4. Operational runbooks
5. Launch preparation

---

## Success Criteria

### Technical Metrics

- [ ]  95% of generated code compiles without errors
- [ ]  90% test coverage across all services
- [ ]  Sub-100ms p95 latency for all APIs
- [ ]  Zero critical security vulnerabilities
- [ ]  99.9% uptime for core services

### Business Metrics

- [ ]  Demo delivery in under 72 hours
- [ ]  One developer handles 3-4 projects
- [ ]  80% reduction in boilerplate code
- [ ]  Enterprise security compliance
- [ ]  Positive developer experience feedback

### Operational Metrics

- [ ]  Automated deployment pipeline
- [ ]  Self-healing infrastructure
- [ ]  Comprehensive monitoring
- [ ]  Disaster recovery tested
- [ ]  Documentation completeness

---

This specification provides the complete blueprint for implementing Fountane AI. Each section contains sufficient detail for an AI assistant or development team to implement the system component by component, ensuring consistency, quality, and enterprise readiness throughout the platform.