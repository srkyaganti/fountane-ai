import { Controller } from '@nestjs/common';
import { GrpcMethod, GrpcStreamMethod } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { WorkflowService } from './workflow.service';
import { ExecutionService } from '../execution/execution.service';
import { TemplateService } from '../template/template.service';
import {
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  DeleteWorkflowRequest,
  GetWorkflowRequest,
  ListWorkflowsRequest,
  ListWorkflowsResponse,
  ExecuteWorkflowRequest,
  GetExecutionRequest,
  ListExecutionsRequest,
  ListExecutionsResponse,
  CancelExecutionRequest,
  RetryExecutionRequest,
  CreateTemplateRequest,
  ListTemplatesRequest,
  ListTemplatesResponse,
  InstantiateTemplateRequest,
  GetWorkflowMetricsRequest,
  StreamExecutionLogsRequest,
  Workflow,
  Execution,
  WorkflowTemplate,
  WorkflowMetrics,
  ExecutionLog,
  Empty,
} from '../interfaces/workflow.interface';

@Controller()
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly executionService: ExecutionService,
    private readonly templateService: TemplateService,
  ) {}

  // Workflow Management
  @GrpcMethod('WorkflowService', 'CreateWorkflow')
  async createWorkflow(request: CreateWorkflowRequest): Promise<Workflow> {
    return this.workflowService.createWorkflow(request);
  }

  @GrpcMethod('WorkflowService', 'UpdateWorkflow')
  async updateWorkflow(request: UpdateWorkflowRequest): Promise<Workflow> {
    return this.workflowService.updateWorkflow(request);
  }

  @GrpcMethod('WorkflowService', 'DeleteWorkflow')
  async deleteWorkflow(request: DeleteWorkflowRequest): Promise<Empty> {
    await this.workflowService.deleteWorkflow(request.workflow_id);
    return {};
  }

  @GrpcMethod('WorkflowService', 'GetWorkflow')
  async getWorkflow(request: GetWorkflowRequest): Promise<Workflow> {
    return this.workflowService.getWorkflow(request.workflow_id);
  }

  @GrpcMethod('WorkflowService', 'ListWorkflows')
  async listWorkflows(request: ListWorkflowsRequest): Promise<ListWorkflowsResponse> {
    return this.workflowService.listWorkflows(request);
  }

  // Execution Management
  @GrpcMethod('WorkflowService', 'ExecuteWorkflow')
  async executeWorkflow(request: ExecuteWorkflowRequest): Promise<Execution> {
    return this.executionService.executeWorkflow(request);
  }

  @GrpcMethod('WorkflowService', 'GetExecution')
  async getExecution(request: GetExecutionRequest): Promise<Execution> {
    return this.executionService.getExecution(request.execution_id);
  }

  @GrpcMethod('WorkflowService', 'ListExecutions')
  async listExecutions(request: ListExecutionsRequest): Promise<ListExecutionsResponse> {
    return this.executionService.listExecutions(request);
  }

  @GrpcMethod('WorkflowService', 'CancelExecution')
  async cancelExecution(request: CancelExecutionRequest): Promise<Empty> {
    await this.executionService.cancelExecution(request.execution_id, request.reason);
    return {};
  }

  @GrpcMethod('WorkflowService', 'RetryExecution')
  async retryExecution(request: RetryExecutionRequest): Promise<Execution> {
    return this.executionService.retryExecution(request.execution_id, request.from_task_id);
  }

  // Template Management
  @GrpcMethod('WorkflowService', 'CreateTemplate')
  async createTemplate(request: CreateTemplateRequest): Promise<WorkflowTemplate> {
    return this.templateService.createTemplate(request);
  }

  @GrpcMethod('WorkflowService', 'ListTemplates')
  async listTemplates(request: ListTemplatesRequest): Promise<ListTemplatesResponse> {
    return this.templateService.listTemplates(request);
  }

  @GrpcMethod('WorkflowService', 'InstantiateTemplate')
  async instantiateTemplate(request: InstantiateTemplateRequest): Promise<Workflow> {
    return this.templateService.instantiateTemplate(request);
  }

  // Monitoring
  @GrpcMethod('WorkflowService', 'GetWorkflowMetrics')
  async getWorkflowMetrics(request: GetWorkflowMetricsRequest): Promise<WorkflowMetrics> {
    return this.workflowService.getWorkflowMetrics(request);
  }

  @GrpcStreamMethod('WorkflowService', 'StreamExecutionLogs')
  streamExecutionLogs(request: StreamExecutionLogsRequest): Observable<ExecutionLog> {
    return this.executionService.streamExecutionLogs(request);
  }
}
