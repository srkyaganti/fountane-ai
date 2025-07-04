// This file contains TypeScript interfaces generated from the workflow.proto file
// These interfaces match the protobuf message definitions

export interface Empty {}

// Workflow Management
export interface CreateWorkflowRequest {
  name: string;
  description: string;
  tenant_id: string;
  definition: WorkflowDefinition;
  metadata?: Record<string, string>;
}

export interface UpdateWorkflowRequest {
  workflow_id: string;
  name?: string;
  description?: string;
  definition?: WorkflowDefinition;
  metadata?: Record<string, string>;
}

export interface DeleteWorkflowRequest {
  workflow_id: string;
}

export interface GetWorkflowRequest {
  workflow_id: string;
}

export interface ListWorkflowsRequest {
  tenant_id: string;
  page_size?: number;
  page_token?: string;
  status?: WorkflowStatus;
}

export interface ListWorkflowsResponse {
  workflows: Workflow[];
  next_page_token: string;
  total_count: number;
}

// Execution Management
export interface ExecuteWorkflowRequest {
  workflow_id: string;
  input_parameters?: Record<string, string>;
  trigger_id?: string;
  metadata?: Record<string, string>;
}

export interface GetExecutionRequest {
  execution_id: string;
}

export interface ListExecutionsRequest {
  workflow_id?: string;
  tenant_id?: string;
  status?: ExecutionStatus;
  page_size?: number;
  page_token?: string;
}

export interface ListExecutionsResponse {
  executions: Execution[];
  next_page_token: string;
  total_count: number;
}

export interface CancelExecutionRequest {
  execution_id: string;
  reason: string;
}

export interface RetryExecutionRequest {
  execution_id: string;
  from_task_id?: string;
}

// Template Management
export interface CreateTemplateRequest {
  name: string;
  description: string;
  category: string;
  definition: WorkflowDefinition;
  metadata?: Record<string, string>;
}

export interface ListTemplatesRequest {
  category?: string;
  page_size?: number;
  page_token?: string;
}

export interface ListTemplatesResponse {
  templates: WorkflowTemplate[];
  next_page_token: string;
  total_count: number;
}

export interface InstantiateTemplateRequest {
  template_id: string;
  name: string;
  tenant_id: string;
  parameter_overrides?: Record<string, string>;
}

// Monitoring
export interface GetWorkflowMetricsRequest {
  workflow_id: string;
  start_time: number;
  end_time: number;
}

export interface WorkflowMetrics {
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  cancelled_executions: number;
  average_duration_seconds: number;
  error_counts?: Record<string, number>;
}

export interface StreamExecutionLogsRequest {
  execution_id: string;
  task_id?: string;
  min_level?: LogLevel;
}

export interface ExecutionLog {
  execution_id: string;
  task_id: string;
  level: LogLevel;
  message: string;
  timestamp: number;
  metadata?: Record<string, string>;
}

// Core Data Models
export interface Workflow {
  id: string;
  name: string;
  description: string;
  tenant_id: string;
  definition: WorkflowDefinition;
  status: WorkflowStatus;
  version: number;
  metadata?: Record<string, string>;
  created_at: number;
  updated_at: number;
  created_by: string;
  updated_by: string;
}

export interface WorkflowDefinition {
  steps: Step[];
  triggers?: Trigger[];
  error_handler?: ErrorHandler;
  global_parameters?: Record<string, string>;
}

export interface Step {
  id: string;
  name: string;
  type: StepType;
  service?: ServiceStepConfig;
  parallel?: ParallelStepConfig;
  conditional?: ConditionalStepConfig;
  loop?: LoopStepConfig;
  wait?: WaitStepConfig;
  human_task?: HumanTaskStepConfig;
  retry?: RetryPolicy;
  input?: Record<string, string>;
  depends_on?: string[];
}

export interface ServiceStepConfig {
  service: string;
  method: string;
  timeout_seconds: number;
}

export interface ParallelStepConfig {
  steps: Step[];
  max_concurrency?: number;
}

export interface ConditionalStepConfig {
  condition: string;
  if_steps: Step[];
  else_steps?: Step[];
}

export interface LoopStepConfig {
  items_expression: string;
  item_variable: string;
  steps: Step[];
  max_iterations?: number;
}

export interface WaitStepConfig {
  duration_seconds?: number;
  until_expression?: string;
}

export interface HumanTaskStepConfig {
  assignee_expression: string;
  form_schema: string;
  timeout_hours: number;
}

export interface Trigger {
  id: string;
  type: TriggerType;
  webhook?: WebhookTriggerConfig;
  schedule?: ScheduleTriggerConfig;
  event?: EventTriggerConfig;
}

export interface WebhookTriggerConfig {
  path: string;
  allowed_methods: string[];
  headers?: Record<string, string>;
}

export interface ScheduleTriggerConfig {
  cron_expression: string;
  timezone: string;
}

export interface EventTriggerConfig {
  event_type: string;
  filters?: Record<string, string>;
}

export interface ErrorHandler {
  type: ErrorHandlerType;
  notification_channel?: string;
  compensation_steps?: CompensationStep[];
}

export interface CompensationStep {
  step_id: string;
  compensation_service: string;
  compensation_method: string;
}

export interface RetryPolicy {
  attempts: number;
  backoff: BackoffStrategy;
  initial_delay_seconds: number;
  max_delay_seconds: number;
}

export interface Execution {
  id: string;
  workflow_id: string;
  tenant_id: string;
  status: ExecutionStatus;
  input_parameters?: Record<string, string>;
  output_data?: Record<string, string>;
  error_message?: string;
  started_at: number;
  completed_at?: number;
  triggered_by: string;
  metadata?: Record<string, string>;
  tasks?: TaskExecution[];
}

export interface TaskExecution {
  id: string;
  step_id: string;
  name: string;
  status: TaskStatus;
  input_data?: Record<string, string>;
  output_data?: Record<string, string>;
  error_message?: string;
  retry_count: number;
  started_at: number;
  completed_at?: number;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  definition: WorkflowDefinition;
  parameter_schemas?: Record<string, ParameterSchema>;
  tags: string[];
  created_at: number;
  updated_at: number;
}

export interface ParameterSchema {
  name: string;
  type: ParameterType;
  default_value?: string;
  required: boolean;
  description: string;
  allowed_values?: string[];
}

// Enums
export enum WorkflowStatus {
  WORKFLOW_STATUS_UNSPECIFIED = 0,
  WORKFLOW_STATUS_DRAFT = 1,
  WORKFLOW_STATUS_ACTIVE = 2,
  WORKFLOW_STATUS_INACTIVE = 3,
  WORKFLOW_STATUS_ARCHIVED = 4,
}

export enum ExecutionStatus {
  EXECUTION_STATUS_UNSPECIFIED = 0,
  EXECUTION_STATUS_PENDING = 1,
  EXECUTION_STATUS_RUNNING = 2,
  EXECUTION_STATUS_COMPLETED = 3,
  EXECUTION_STATUS_FAILED = 4,
  EXECUTION_STATUS_CANCELLED = 5,
  EXECUTION_STATUS_TIMED_OUT = 6,
}

export enum TaskStatus {
  TASK_STATUS_UNSPECIFIED = 0,
  TASK_STATUS_PENDING = 1,
  TASK_STATUS_RUNNING = 2,
  TASK_STATUS_COMPLETED = 3,
  TASK_STATUS_FAILED = 4,
  TASK_STATUS_SKIPPED = 5,
  TASK_STATUS_CANCELLED = 6,
}

export enum StepType {
  STEP_TYPE_UNSPECIFIED = 0,
  STEP_TYPE_SERVICE = 1,
  STEP_TYPE_PARALLEL = 2,
  STEP_TYPE_CONDITIONAL = 3,
  STEP_TYPE_LOOP = 4,
  STEP_TYPE_WAIT = 5,
  STEP_TYPE_HUMAN_TASK = 6,
}

export enum TriggerType {
  TRIGGER_TYPE_UNSPECIFIED = 0,
  TRIGGER_TYPE_WEBHOOK = 1,
  TRIGGER_TYPE_SCHEDULE = 2,
  TRIGGER_TYPE_EVENT = 3,
}

export enum ErrorHandlerType {
  ERROR_HANDLER_TYPE_UNSPECIFIED = 0,
  ERROR_HANDLER_TYPE_COMPENSATE = 1,
  ERROR_HANDLER_TYPE_RETRY = 2,
  ERROR_HANDLER_TYPE_IGNORE = 3,
  ERROR_HANDLER_TYPE_FAIL = 4,
}

export enum BackoffStrategy {
  BACKOFF_STRATEGY_UNSPECIFIED = 0,
  BACKOFF_STRATEGY_LINEAR = 1,
  BACKOFF_STRATEGY_EXPONENTIAL = 2,
  BACKOFF_STRATEGY_FIXED = 3,
}

export enum LogLevel {
  LOG_LEVEL_UNSPECIFIED = 0,
  LOG_LEVEL_DEBUG = 1,
  LOG_LEVEL_INFO = 2,
  LOG_LEVEL_WARN = 3,
  LOG_LEVEL_ERROR = 4,
}

export enum ParameterType {
  PARAMETER_TYPE_UNSPECIFIED = 0,
  PARAMETER_TYPE_STRING = 1,
  PARAMETER_TYPE_NUMBER = 2,
  PARAMETER_TYPE_BOOLEAN = 3,
  PARAMETER_TYPE_OBJECT = 4,
  PARAMETER_TYPE_ARRAY = 5,
}
