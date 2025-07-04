import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { N8nService } from '../n8n/n8n.service';
import {
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  ListWorkflowsRequest,
  ListWorkflowsResponse,
  GetWorkflowMetricsRequest,
  Workflow,
  WorkflowMetrics,
  WorkflowStatus,
} from '../interfaces/workflow.interface';

@Injectable()
export class WorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly n8nService: N8nService,
  ) {}

  async createWorkflow(request: CreateWorkflowRequest): Promise<Workflow> {
    // Validate workflow definition
    this.validateWorkflowDefinition(request.definition);

    // Create workflow in database
    const workflow = await this.prisma.workflow.create({
      data: {
        name: request.name,
        description: request.description,
        tenantId: request.tenant_id,
        definition: request.definition as any,
        metadata: request.metadata || {},
        status: 'DRAFT',
        createdBy: 'system', // TODO: Get from auth context
        updatedBy: 'system',
      },
    });

    // Sync with n8n if workflow is active
    if (workflow.status === 'ACTIVE') {
      await this.n8nService.syncWorkflow(workflow.id, request.definition);
    }

    return this.mapWorkflowToGrpc(workflow);
  }

  async updateWorkflow(request: UpdateWorkflowRequest): Promise<Workflow> {
    const existing = await this.prisma.workflow.findUnique({
      where: { id: request.workflow_id },
    });

    if (!existing) {
      throw new NotFoundException(`Workflow ${request.workflow_id} not found`);
    }

    // Validate workflow definition if provided
    if (request.definition) {
      this.validateWorkflowDefinition(request.definition);
    }

    // Update workflow
    const workflow = await this.prisma.workflow.update({
      where: { id: request.workflow_id },
      data: {
        name: request.name || existing.name,
        description: request.description || existing.description,
        definition: request.definition ? (request.definition as any) : existing.definition,
        metadata: request.metadata
          ? { ...(existing.metadata as any), ...request.metadata }
          : existing.metadata,
        version: { increment: 1 },
        updatedBy: 'system', // TODO: Get from auth context
      },
    });

    // Sync with n8n
    await this.n8nService.syncWorkflow(workflow.id, workflow.definition as any);

    return this.mapWorkflowToGrpc(workflow);
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow ${workflowId} not found`);
    }

    // Check if there are active executions
    const activeExecutions = await this.prisma.execution.count({
      where: {
        workflowId,
        status: { in: ['PENDING', 'RUNNING'] },
      },
    });

    if (activeExecutions > 0) {
      throw new BadRequestException('Cannot delete workflow with active executions');
    }

    // Delete from n8n
    await this.n8nService.deleteWorkflow(workflowId);

    // Soft delete by setting status to ARCHIVED
    await this.prisma.workflow.update({
      where: { id: workflowId },
      data: { status: 'ARCHIVED' },
    });
  }

  async getWorkflow(workflowId: string): Promise<Workflow> {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow ${workflowId} not found`);
    }

    return this.mapWorkflowToGrpc(workflow);
  }

  async listWorkflows(request: ListWorkflowsRequest): Promise<ListWorkflowsResponse> {
    const pageSize = request.page_size || 20;
    const skip = request.page_token ? parseInt(request.page_token, 10) : 0;

    const where: any = {
      tenantId: request.tenant_id,
    };

    if (request.status) {
      where.status = this.mapGrpcStatusToPrisma(request.status);
    }

    const [workflows, total] = await Promise.all([
      this.prisma.workflow.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.workflow.count({ where }),
    ]);

    return {
      workflows: workflows.map((w) => this.mapWorkflowToGrpc(w)),
      next_page_token: skip + pageSize < total ? String(skip + pageSize) : '',
      total_count: total,
    };
  }

  async getWorkflowMetrics(request: GetWorkflowMetricsRequest): Promise<WorkflowMetrics> {
    const startDate = new Date(request.start_time * 1000);
    const endDate = new Date(request.end_time * 1000);

    // Get aggregated metrics
    const metrics = await this.prisma.workflowMetrics.findMany({
      where: {
        workflowId: request.workflow_id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Calculate totals
    const result = metrics.reduce(
      (acc, metric) => ({
        total_executions: acc.total_executions + metric.totalExecutions,
        successful_executions: acc.successful_executions + metric.successfulExecutions,
        failed_executions: acc.failed_executions + metric.failedExecutions,
        cancelled_executions: acc.cancelled_executions + metric.cancelledExecutions,
        average_duration_seconds: acc.average_duration_seconds + (metric.averageDurationMs || 0),
        error_counts: this.mergeErrorCounts(acc.error_counts, metric.errorCounts as any),
      }),
      {
        total_executions: 0,
        successful_executions: 0,
        failed_executions: 0,
        cancelled_executions: 0,
        average_duration_seconds: 0,
        error_counts: {},
      },
    );

    // Calculate average duration
    if (result.total_executions > 0) {
      result.average_duration_seconds =
        result.average_duration_seconds / result.total_executions / 1000;
    }

    return result;
  }

  private validateWorkflowDefinition(definition: any): void {
    if (!definition.steps || definition.steps.length === 0) {
      throw new BadRequestException('Workflow must have at least one step');
    }

    // Validate step IDs are unique
    const stepIds = new Set<string>();
    for (const step of definition.steps) {
      if (stepIds.has(step.id)) {
        throw new BadRequestException(`Duplicate step ID: ${step.id}`);
      }
      stepIds.add(step.id);
    }

    // Validate dependencies exist
    for (const step of definition.steps) {
      if (step.depends_on) {
        for (const dep of step.depends_on) {
          if (!stepIds.has(dep)) {
            throw new BadRequestException(`Step ${step.id} depends on non-existent step ${dep}`);
          }
        }
      }
    }
  }

  private mapWorkflowToGrpc(workflow: any): Workflow {
    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description || '',
      tenant_id: workflow.tenantId,
      definition: workflow.definition,
      status: this.mapPrismaStatusToGrpc(workflow.status),
      version: workflow.version,
      metadata: workflow.metadata || {},
      created_at: workflow.createdAt.getTime(),
      updated_at: workflow.updatedAt.getTime(),
      created_by: workflow.createdBy,
      updated_by: workflow.updatedBy,
    };
  }

  private mapGrpcStatusToPrisma(status: WorkflowStatus): string {
    const mapping: Record<WorkflowStatus, string> = {
      [WorkflowStatus.WORKFLOW_STATUS_UNSPECIFIED]: 'DRAFT',
      [WorkflowStatus.WORKFLOW_STATUS_DRAFT]: 'DRAFT',
      [WorkflowStatus.WORKFLOW_STATUS_ACTIVE]: 'ACTIVE',
      [WorkflowStatus.WORKFLOW_STATUS_INACTIVE]: 'INACTIVE',
      [WorkflowStatus.WORKFLOW_STATUS_ARCHIVED]: 'ARCHIVED',
    };
    return mapping[status] || 'DRAFT';
  }

  private mapPrismaStatusToGrpc(status: string): WorkflowStatus {
    const mapping: Record<string, WorkflowStatus> = {
      DRAFT: WorkflowStatus.WORKFLOW_STATUS_DRAFT,
      ACTIVE: WorkflowStatus.WORKFLOW_STATUS_ACTIVE,
      INACTIVE: WorkflowStatus.WORKFLOW_STATUS_INACTIVE,
      ARCHIVED: WorkflowStatus.WORKFLOW_STATUS_ARCHIVED,
    };
    return mapping[status] || WorkflowStatus.WORKFLOW_STATUS_DRAFT;
  }

  private mergeErrorCounts(
    existing: Record<string, number>,
    new_counts: Record<string, number> | null,
  ): Record<string, number> {
    if (!new_counts) return existing;

    const result = { ...existing };
    for (const [key, value] of Object.entries(new_counts)) {
      result[key] = (result[key] || 0) + value;
    }
    return result;
  }
}
