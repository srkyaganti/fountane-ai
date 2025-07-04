import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';
import { N8nService } from '../n8n/n8n.service';
import {
  ExecuteWorkflowRequest,
  ListExecutionsRequest,
  ListExecutionsResponse,
  StreamExecutionLogsRequest,
  Execution,
  ExecutionLog,
  ExecutionStatus,
  TaskStatus,
  LogLevel,
} from '../interfaces/workflow.interface';

@Injectable()
export class ExecutionService {
  private readonly logsSubject = new Subject<ExecutionLog>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly n8nService: N8nService,
  ) {}

  async executeWorkflow(request: ExecuteWorkflowRequest): Promise<Execution> {
    // Validate workflow exists and is active
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: request.workflow_id },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow ${request.workflow_id} not found`);
    }

    if (workflow.status !== 'ACTIVE') {
      throw new BadRequestException('Workflow must be active to execute');
    }

    // Create execution record
    const execution = await this.prisma.execution.create({
      data: {
        workflowId: request.workflow_id,
        tenantId: workflow.tenantId,
        status: 'PENDING',
        inputParameters: request.input_parameters || {},
        triggeredBy: request.trigger_id || 'manual',
        metadata: request.metadata || {},
      },
    });

    // Start execution in n8n
    this.n8nService
      .executeWorkflow(workflow.id, execution.id, request.input_parameters)
      .then((result) => this.handleExecutionComplete(execution.id, result))
      .catch((error) => this.handleExecutionError(execution.id, error));

    // Log execution start
    this.logExecution(execution.id, null, LogLevel.LOG_LEVEL_INFO, 'Workflow execution started');

    return this.mapExecutionToGrpc(execution);
  }

  async getExecution(executionId: string): Promise<Execution> {
    const execution = await this.prisma.execution.findUnique({
      where: { id: executionId },
      include: {
        tasks: true,
      },
    });

    if (!execution) {
      throw new NotFoundException(`Execution ${executionId} not found`);
    }

    return this.mapExecutionToGrpc(execution);
  }

  async listExecutions(request: ListExecutionsRequest): Promise<ListExecutionsResponse> {
    const pageSize = request.page_size || 20;
    const skip = request.page_token ? parseInt(request.page_token, 10) : 0;

    const where: any = {};

    if (request.workflow_id) {
      where.workflowId = request.workflow_id;
    }

    if (request.tenant_id) {
      where.tenantId = request.tenant_id;
    }

    if (request.status) {
      where.status = this.mapGrpcStatusToPrisma(request.status);
    }

    const [executions, total] = await Promise.all([
      this.prisma.execution.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { startedAt: 'desc' },
        include: {
          tasks: true,
        },
      }),
      this.prisma.execution.count({ where }),
    ]);

    return {
      executions: executions.map((e) => this.mapExecutionToGrpc(e)),
      next_page_token: skip + pageSize < total ? String(skip + pageSize) : '',
      total_count: total,
    };
  }

  async cancelExecution(executionId: string, reason: string): Promise<void> {
    const execution = await this.prisma.execution.findUnique({
      where: { id: executionId },
    });

    if (!execution) {
      throw new NotFoundException(`Execution ${executionId} not found`);
    }

    if (execution.status !== 'RUNNING' && execution.status !== 'PENDING') {
      throw new BadRequestException('Can only cancel running or pending executions');
    }

    // Cancel in n8n
    await this.n8nService.cancelExecution(executionId);

    // Update execution status
    await this.prisma.execution.update({
      where: { id: executionId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
        errorMessage: reason,
      },
    });

    // Update task statuses
    await this.prisma.taskExecution.updateMany({
      where: {
        executionId,
        status: { in: ['PENDING', 'RUNNING'] },
      },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });

    // Log cancellation
    this.logExecution(executionId, null, LogLevel.LOG_LEVEL_WARN, `Execution cancelled: ${reason}`);
  }

  async retryExecution(executionId: string, fromTaskId?: string): Promise<Execution> {
    const originalExecution = await this.prisma.execution.findUnique({
      where: { id: executionId },
      include: {
        workflow: true,
      },
    });

    if (!originalExecution) {
      throw new NotFoundException(`Execution ${executionId} not found`);
    }

    if (originalExecution.status !== 'FAILED' && originalExecution.status !== 'CANCELLED') {
      throw new BadRequestException('Can only retry failed or cancelled executions');
    }

    // Create new execution
    const newExecution = await this.prisma.execution.create({
      data: {
        workflowId: originalExecution.workflowId,
        tenantId: originalExecution.tenantId,
        status: 'PENDING',
        inputParameters: originalExecution.inputParameters,
        triggeredBy: `retry:${executionId}`,
        metadata: {
          ...(originalExecution.metadata as any),
          retry_from: executionId,
          retry_from_task: fromTaskId,
        },
      },
    });

    // Start execution
    this.n8nService
      .executeWorkflow(
        originalExecution.workflowId,
        newExecution.id,
        originalExecution.inputParameters as any,
        fromTaskId,
      )
      .then((result) => this.handleExecutionComplete(newExecution.id, result))
      .catch((error) => this.handleExecutionError(newExecution.id, error));

    return this.mapExecutionToGrpc(newExecution);
  }

  streamExecutionLogs(request: StreamExecutionLogsRequest): Observable<ExecutionLog> {
    return this.logsSubject.asObservable().pipe(
      filter((log) => {
        if (log.execution_id !== request.execution_id) return false;
        if (request.task_id && log.task_id !== request.task_id) return false;
        if (request.min_level && log.level < request.min_level) return false;
        return true;
      }),
    );
  }

  private async handleExecutionComplete(executionId: string, result: any): Promise<void> {
    await this.prisma.execution.update({
      where: { id: executionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        outputData: result.output || {},
      },
    });

    this.logExecution(executionId, null, LogLevel.LOG_LEVEL_INFO, 'Workflow execution completed');
  }

  private async handleExecutionError(executionId: string, error: any): Promise<void> {
    await this.prisma.execution.update({
      where: { id: executionId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage: error.message || 'Unknown error',
      },
    });

    this.logExecution(
      executionId,
      null,
      LogLevel.LOG_LEVEL_ERROR,
      `Workflow execution failed: ${error.message}`,
    );
  }

  private logExecution(
    executionId: string,
    taskId: string | null,
    level: LogLevel,
    message: string,
  ): void {
    const log: ExecutionLog = {
      execution_id: executionId,
      task_id: taskId || '',
      level,
      message,
      timestamp: Date.now(),
    };

    // Emit to stream
    this.logsSubject.next(log);

    // Save to database
    this.prisma.executionLog
      .create({
        data: {
          executionId,
          taskId,
          level: this.mapGrpcLogLevelToPrisma(level),
          message,
        },
      })
      .catch((error) => console.error('Failed to save execution log:', error));
  }

  private mapExecutionToGrpc(execution: any): Execution {
    return {
      id: execution.id,
      workflow_id: execution.workflowId,
      tenant_id: execution.tenantId,
      status: this.mapPrismaStatusToGrpc(execution.status),
      input_parameters: execution.inputParameters || {},
      output_data: execution.outputData || {},
      error_message: execution.errorMessage,
      started_at: execution.startedAt.getTime(),
      completed_at: execution.completedAt?.getTime(),
      triggered_by: execution.triggeredBy,
      metadata: execution.metadata || {},
      tasks: execution.tasks?.map((task: any) => ({
        id: task.id,
        step_id: task.stepId,
        name: task.name,
        status: this.mapPrismaTaskStatusToGrpc(task.status),
        input_data: task.inputData || {},
        output_data: task.outputData || {},
        error_message: task.errorMessage,
        retry_count: task.retryCount,
        started_at: task.startedAt.getTime(),
        completed_at: task.completedAt?.getTime(),
      })),
    };
  }

  private mapGrpcStatusToPrisma(status: ExecutionStatus): string {
    const mapping: Record<ExecutionStatus, string> = {
      [ExecutionStatus.EXECUTION_STATUS_UNSPECIFIED]: 'PENDING',
      [ExecutionStatus.EXECUTION_STATUS_PENDING]: 'PENDING',
      [ExecutionStatus.EXECUTION_STATUS_RUNNING]: 'RUNNING',
      [ExecutionStatus.EXECUTION_STATUS_COMPLETED]: 'COMPLETED',
      [ExecutionStatus.EXECUTION_STATUS_FAILED]: 'FAILED',
      [ExecutionStatus.EXECUTION_STATUS_CANCELLED]: 'CANCELLED',
      [ExecutionStatus.EXECUTION_STATUS_TIMED_OUT]: 'TIMED_OUT',
    };
    return mapping[status] || 'PENDING';
  }

  private mapPrismaStatusToGrpc(status: string): ExecutionStatus {
    const mapping: Record<string, ExecutionStatus> = {
      PENDING: ExecutionStatus.EXECUTION_STATUS_PENDING,
      RUNNING: ExecutionStatus.EXECUTION_STATUS_RUNNING,
      COMPLETED: ExecutionStatus.EXECUTION_STATUS_COMPLETED,
      FAILED: ExecutionStatus.EXECUTION_STATUS_FAILED,
      CANCELLED: ExecutionStatus.EXECUTION_STATUS_CANCELLED,
      TIMED_OUT: ExecutionStatus.EXECUTION_STATUS_TIMED_OUT,
    };
    return mapping[status] || ExecutionStatus.EXECUTION_STATUS_PENDING;
  }

  private mapPrismaTaskStatusToGrpc(status: string): TaskStatus {
    const mapping: Record<string, TaskStatus> = {
      PENDING: TaskStatus.TASK_STATUS_PENDING,
      RUNNING: TaskStatus.TASK_STATUS_RUNNING,
      COMPLETED: TaskStatus.TASK_STATUS_COMPLETED,
      FAILED: TaskStatus.TASK_STATUS_FAILED,
      SKIPPED: TaskStatus.TASK_STATUS_SKIPPED,
      CANCELLED: TaskStatus.TASK_STATUS_CANCELLED,
    };
    return mapping[status] || TaskStatus.TASK_STATUS_PENDING;
  }

  private mapGrpcLogLevelToPrisma(level: LogLevel): string {
    const mapping: Record<LogLevel, string> = {
      [LogLevel.LOG_LEVEL_UNSPECIFIED]: 'INFO',
      [LogLevel.LOG_LEVEL_DEBUG]: 'DEBUG',
      [LogLevel.LOG_LEVEL_INFO]: 'INFO',
      [LogLevel.LOG_LEVEL_WARN]: 'WARN',
      [LogLevel.LOG_LEVEL_ERROR]: 'ERROR',
    };
    return mapping[level] || 'INFO';
  }
}
