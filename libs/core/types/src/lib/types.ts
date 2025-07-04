/**
 * Core types for the Fountane AI platform
 */

// Base entity types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

// Multi-tenancy types
export interface TenantAware {
  tenantId: string;
}

export interface Tenant extends BaseEntity {
  name: string;
  slug: string;
  status: TenantStatus;
  size: TenantSize;
  settings: TenantSettings;
  metadata: Record<string, unknown>;
}

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

export enum TenantSize {
  SMALL = 'small', // <1000 users
  MEDIUM = 'medium', // 1000-10000 users
  LARGE = 'large', // >10000 users
  ENTERPRISE = 'enterprise', // Dedicated resources
}

export interface TenantSettings {
  features: Record<string, boolean>;
  limits: ResourceLimits;
  branding?: BrandingSettings;
}

export interface ResourceLimits {
  maxUsers: number;
  maxProjects: number;
  maxStorage: number; // in GB
  maxApiRequests: number; // per month
}

export interface BrandingSettings {
  primaryColor?: string;
  logo?: string;
  companyName?: string;
}

// User types
export interface User extends BaseEntity, TenantAware {
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  roles: string[];
  permissions: string[];
  status: UserStatus;
  lastLoginAt?: Date;
  metadata: Record<string, unknown>;
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

// Project types
export interface Project extends BaseEntity, TenantAware {
  name: string;
  description?: string;
  status: ProjectStatus;
  type: ProjectType;
  configuration: ProjectConfiguration;
  generationState?: GenerationState;
  metadata: Record<string, unknown>;
}

export enum ProjectStatus {
  DRAFT = 'draft',
  GENERATING = 'generating',
  READY = 'ready',
  DEPLOYED = 'deployed',
  FAILED = 'failed',
  ARCHIVED = 'archived',
}

export enum ProjectType {
  WEB_APP = 'web_app',
  MOBILE_APP = 'mobile_app',
  API_SERVICE = 'api_service',
  WORKFLOW = 'workflow',
  FULL_STACK = 'full_stack',
}

export interface ProjectConfiguration {
  template: string;
  parameters: Record<string, unknown>;
  services: string[];
  integrations: string[];
}

// AI Generation types
export interface GenerationState {
  currentState: GenerationStatus;
  progress: number; // 0-100
  events: GenerationEvent[];
  checkpoints: GenerationCheckpoint[];
  errors: GenerationError[];
}

export enum GenerationStatus {
  INITIALIZING = 'initializing',
  ANALYZING_REQUIREMENTS = 'analyzing_requirements',
  SELECTING_TEMPLATES = 'selecting_templates',
  GENERATING_CODE = 'generating_code',
  COMPILING = 'compiling',
  FIXING_ERRORS = 'fixing_errors',
  TESTING = 'testing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface GenerationEvent {
  id: string;
  timestamp: Date;
  state: GenerationStatus;
  data: Record<string, unknown>;
  metadata: {
    tokensUsed?: number;
    errorCount?: number;
    duration?: number;
  };
}

export interface GenerationCheckpoint {
  id: string;
  timestamp: Date;
  state: GenerationStatus;
  projectSnapshot: string; // S3/MinIO URL
}

export interface GenerationError {
  id: string;
  timestamp: Date;
  type: string;
  message: string;
  stackTrace?: string;
  resolved: boolean;
}

// Service types
export interface ServiceDefinition {
  name: string;
  version: string;
  type: ServiceType;
  grpcContract: string;
  endpoints: ServiceEndpoint[];
  dependencies: string[];
}

export enum ServiceType {
  AUTH = 'auth',
  WORKFLOW = 'workflow',
  QUEUE = 'queue',
  REALTIME = 'realtime',
  FEATURE = 'feature',
  PAYMENT = 'payment',
  CUSTOM = 'custom',
}

export interface ServiceEndpoint {
  name: string;
  method: string;
  input: string;
  output: string;
  authentication: boolean;
}

// Template types
export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  version: string;
  parameters: TemplateParameter[];
  compositions: TemplateComposition[];
  tags: string[];
}

export enum TemplateCategory {
  SERVICE = 'service',
  WEB_APP = 'web_app',
  MOBILE_APP = 'mobile_app',
  WORKFLOW = 'workflow',
}

export interface TemplateParameter {
  name: string;
  type: ParameterType;
  required: boolean;
  default?: unknown;
  description?: string;
  validation?: ValidationRule;
}

export enum ParameterType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ENUM = 'enum',
  SERVICE_REFERENCE = 'service_reference',
  OBJECT = 'object',
  ARRAY = 'array',
}

export interface ValidationRule {
  pattern?: string;
  min?: number;
  max?: number;
  enum?: string[];
  custom?: string; // JavaScript expression
}

export interface TemplateComposition {
  id: string;
  templates: string[];
  parameters: Record<string, unknown>;
}

// Workflow types
export interface WorkflowDefinition {
  id: string;
  version: string;
  name: string;
  description: string;
  triggers: TriggerDefinition[];
  inputs: InputDefinition[];
  steps: StepDefinition[];
  outputs: OutputDefinition[];
  errorHandling: ErrorHandlingStrategy;
}

export interface TriggerDefinition {
  type: TriggerType;
  configuration: Record<string, unknown>;
}

export enum TriggerType {
  WEBHOOK = 'webhook',
  SCHEDULE = 'schedule',
  EVENT = 'event',
  MANUAL = 'manual',
}

export interface InputDefinition {
  name: string;
  type: string;
  required: boolean;
  default?: unknown;
}

export type StepDefinition =
  | ServiceStep
  | ParallelStep
  | ChoiceStep
  | WaitStep
  | HumanApprovalStep
  | SubWorkflowStep;

export interface ServiceStep {
  id: string;
  type: 'service';
  service: string;
  input: Record<string, unknown>;
  output?: Record<string, string>;
  retry?: RetryPolicy;
  timeout?: number;
  onError?: ErrorHandler;
}

export interface ParallelStep {
  id: string;
  type: 'parallel';
  branches: Array<{
    id: string;
    steps: StepDefinition[];
  }>;
}

export interface ChoiceStep {
  id: string;
  type: 'choice';
  choices: Array<{
    condition: string;
    next: string;
  }>;
  default?: string;
}

export interface WaitStep {
  id: string;
  type: 'wait';
  seconds?: number;
  until?: string; // ISO timestamp
}

export interface HumanApprovalStep {
  id: string;
  type: 'human_approval';
  assignee: string;
  timeout?: number;
  onTimeout?: string;
}

export interface SubWorkflowStep {
  id: string;
  type: 'sub_workflow';
  workflowId: string;
  input: Record<string, unknown>;
}

export interface OutputDefinition {
  name: string;
  value: string; // JSONPath expression
}

export interface ErrorHandlingStrategy {
  type: 'retry' | 'compensate' | 'fail';
  maxRetries?: number;
  backoffRate?: number;
  compensationWorkflow?: string;
  alertChannel?: string;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffRate: number;
  maxDelay?: number;
}

export interface ErrorHandler {
  type: 'retry' | 'compensate' | 'ignore' | 'fail';
  configuration?: Record<string, unknown>;
}

// API types
export interface ApiRequest<T = unknown> {
  data: T;
  metadata: RequestMetadata;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: ApiError;
  metadata: ResponseMetadata;
}

export interface RequestMetadata {
  requestId: string;
  timestamp: Date;
  userId?: string;
  tenantId?: string;
  correlationId?: string;
}

export interface ResponseMetadata extends RequestMetadata {
  duration: number;
  version: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stackTrace?: string;
}

// Pagination types
export interface PaginationRequest {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Event types
export interface DomainEvent<T = unknown> {
  id: string;
  type: string;
  aggregateId: string;
  aggregateType: string;
  timestamp: Date;
  version: number;
  data: T;
  metadata: EventMetadata;
}

export interface EventMetadata {
  userId?: string;
  tenantId?: string;
  correlationId?: string;
  causationId?: string;
  source: string;
}

// Job/Queue types
export interface Job<T = unknown> {
  id: string;
  type: string;
  data: T;
  status: JobStatus;
  priority: JobPriority;
  attempts: number;
  maxAttempts: number;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
  result?: unknown;
  metadata: JobMetadata;
}

export enum JobStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum JobPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  CRITICAL = 20,
}

export interface JobMetadata {
  userId?: string;
  tenantId?: string;
  correlationId?: string;
  retryCount: number;
  lastError?: string;
}

// Real-time types
export interface RealtimeChannel {
  id: string;
  name: string;
  type: ChannelType;
  presence: boolean;
  history: boolean;
  private: boolean;
  metadata: Record<string, unknown>;
}

export enum ChannelType {
  USER = 'user',
  TEAM = 'team',
  PROJECT = 'project',
  SYSTEM = 'system',
  CUSTOM = 'custom',
}

export interface RealtimeMessage<T = unknown> {
  id: string;
  channelId: string;
  userId: string;
  timestamp: Date;
  type: string;
  data: T;
  metadata?: Record<string, unknown>;
}

// Feature flag types
export interface FeatureFlag {
  id: string;
  name: string;
  description?: string;
  type: FeatureFlagType;
  enabled: boolean;
  rules: TargetingRule[];
  variants?: FeatureVariant[];
  tags: string[];
  metadata: Record<string, unknown>;
}

export enum FeatureFlagType {
  BOOLEAN = 'boolean',
  PERCENTAGE = 'percentage',
  VARIANT = 'variant',
  GRADUAL = 'gradual',
}

export interface TargetingRule {
  id: string;
  type: 'user' | 'group' | 'percentage' | 'custom';
  condition: Record<string, unknown>;
  enabled: boolean;
}

export interface FeatureVariant {
  id: string;
  name: string;
  weight: number;
  payload?: unknown;
}

// Payment types
export interface Customer extends BaseEntity, TenantAware {
  externalId: string; // Lago customer ID
  email: string;
  name: string;
  billingAddress?: Address;
  paymentMethods: PaymentMethod[];
  subscriptions: Subscription[];
  metadata: Record<string, unknown>;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'other';
  isDefault: boolean;
  details: Record<string, unknown>;
}

export interface Subscription {
  id: string;
  customerId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelledAt?: Date;
  metadata: Record<string, unknown>;
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELLED = 'cancelled',
  UNPAID = 'unpaid',
}

// MCP Protocol types
export interface MCPMessage {
  jsonrpc: '2.0';
  id: string;
  method: MCPMethod;
  params?: MCPParams;
  result?: unknown;
  error?: MCPError;
}

export enum MCPMethod {
  INIT = 'fountane/init',
  GATHER_REQUIREMENTS = 'fountane/gatherRequirements',
  GENERATE_CODE = 'fountane/generateCode',
  VALIDATE_OUTPUT = 'fountane/validateOutput',
  GET_CONTEXT = 'fountane/getContext',
  UPDATE_PROGRESS = 'fountane/updateProgress',
}

export type MCPParams = Record<string, unknown>;

export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

export interface MCPContext {
  projectId: string;
  availableServices: ServiceDefinition[];
  availableTemplates: TemplateDefinition[];
  constraints: ProjectConstraints;
  history: ConversationHistory[];
}

export interface ProjectConstraints {
  allowedServices: string[];
  requiredCompliance: string[];
  resourceLimits: ResourceLimits;
  customConstraints: Record<string, unknown>;
}

export interface ConversationHistory {
  id: string;
  timestamp: Date;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
}