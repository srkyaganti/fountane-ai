import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';
import { WorkflowDefinition } from '../interfaces/workflow.interface';

@Injectable()
export class N8nService {
  private readonly logger = new Logger(N8nService.name);
  private readonly n8nApiUrl: string;
  private readonly n8nApiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.n8nApiUrl = this.configService.get<string>('N8N_API_URL', 'http://localhost:5678/api/v1');
    this.n8nApiKey = this.configService.get<string>('N8N_API_KEY', '');
  }

  async syncWorkflow(workflowId: string, definition: WorkflowDefinition): Promise<void> {
    try {
      // Check if mapping exists
      const mapping = await this.prisma.n8nMapping.findUnique({
        where: { workflowId },
      });

      const n8nWorkflow = this.convertToN8nFormat(workflowId, definition);

      if (mapping) {
        // Update existing n8n workflow
        await this.updateN8nWorkflow(mapping.n8nWorkflowId, n8nWorkflow);

        await this.prisma.n8nMapping.update({
          where: { workflowId },
          data: {
            syncStatus: 'synced',
            lastSyncedAt: new Date(),
            syncError: null,
          },
        });
      } else {
        // Create new n8n workflow
        const n8nResponse = await this.createN8nWorkflow(n8nWorkflow);

        await this.prisma.n8nMapping.create({
          data: {
            workflowId,
            n8nWorkflowId: n8nResponse.id,
            n8nWebhookUrl: n8nResponse.webhookUrl,
            syncStatus: 'synced',
            lastSyncedAt: new Date(),
          },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to sync workflow ${workflowId}:`, error);

      await this.prisma.n8nMapping.upsert({
        where: { workflowId },
        create: {
          workflowId,
          n8nWorkflowId: '',
          syncStatus: 'error',
          syncError: error.message,
        },
        update: {
          syncStatus: 'error',
          syncError: error.message,
        },
      });

      throw error;
    }
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    const mapping = await this.prisma.n8nMapping.findUnique({
      where: { workflowId },
    });

    if (mapping && mapping.n8nWorkflowId) {
      try {
        await this.deleteN8nWorkflow(mapping.n8nWorkflowId);
        await this.prisma.n8nMapping.delete({
          where: { workflowId },
        });
      } catch (error) {
        this.logger.error(`Failed to delete n8n workflow:`, error);
      }
    }
  }

  async executeWorkflow(
    workflowId: string,
    executionId: string,
    inputData: Record<string, string>,
    fromNodeId?: string,
  ): Promise<any> {
    const mapping = await this.prisma.n8nMapping.findUnique({
      where: { workflowId },
    });

    if (!mapping || !mapping.n8nWorkflowId) {
      throw new Error('Workflow not synced with n8n');
    }

    const response = await firstValueFrom(
      this.httpService.post(
        `${this.n8nApiUrl}/executions`,
        {
          workflowId: mapping.n8nWorkflowId,
          data: inputData,
          startNode: fromNodeId,
        },
        {
          headers: {
            'X-N8N-API-KEY': this.n8nApiKey,
          },
        },
      ),
    );

    // Store n8n execution ID for tracking
    await this.prisma.execution.update({
      where: { id: executionId },
      data: {
        metadata: {
          n8n_execution_id: response.data.id,
        },
      },
    });

    return response.data;
  }

  async cancelExecution(executionId: string): Promise<void> {
    const execution = await this.prisma.execution.findUnique({
      where: { id: executionId },
    });

    const n8nExecutionId = execution?.metadata?.['n8n_execution_id'];
    if (!n8nExecutionId) {
      return;
    }

    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.n8nApiUrl}/executions/${n8nExecutionId}/stop`,
          {},
          {
            headers: {
              'X-N8N-API-KEY': this.n8nApiKey,
            },
          },
        ),
      );
    } catch (error) {
      this.logger.error(`Failed to cancel n8n execution:`, error);
    }
  }

  private convertToN8nFormat(workflowId: string, definition: WorkflowDefinition): any {
    const nodes: any[] = [];
    const connections: any = {};

    // Convert steps to n8n nodes
    definition.steps.forEach((step, index) => {
      const node = this.convertStepToNode(step, index);
      nodes.push(node);

      // Build connections based on dependencies
      if (step.depends_on && step.depends_on.length > 0) {
        step.depends_on.forEach((dep) => {
          if (!connections[dep]) {
            connections[dep] = { main: [[]] };
          }
          connections[dep].main[0].push({
            node: step.id,
            type: 'main',
            index: 0,
          });
        });
      }
    });

    // Add start node if no dependencies
    const startNodes = definition.steps.filter((s) => !s.depends_on || s.depends_on.length === 0);
    if (startNodes.length > 0) {
      nodes.unshift({
        id: 'start',
        name: 'Start',
        type: 'n8n-nodes-base.start',
        typeVersion: 1,
        position: [250, 300],
        parameters: {},
      });

      connections['start'] = {
        main: [startNodes.map((s) => ({ node: s.id, type: 'main', index: 0 }))],
      };
    }

    return {
      name: `Workflow_${workflowId}`,
      nodes,
      connections,
      active: true,
      settings: {
        executionOrder: 'v1',
      },
    };
  }

  private convertStepToNode(step: any, index: number): any {
    const baseNode = {
      id: step.id,
      name: step.name,
      position: [250 + index * 200, 300],
    };

    switch (step.type) {
      case 'STEP_TYPE_SERVICE':
        return {
          ...baseNode,
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          parameters: {
            method: 'POST',
            url: `{{$env.SERVICE_GATEWAY_URL}}/${step.service?.service}/${step.service?.method}`,
            sendBody: true,
            bodyParameters: {
              parameters: Object.entries(step.input || {}).map(([key, value]) => ({
                name: key,
                value,
              })),
            },
            options: {
              timeout: step.service?.timeout_seconds || 30,
            },
          },
        };

      case 'STEP_TYPE_WAIT':
        return {
          ...baseNode,
          type: 'n8n-nodes-base.wait',
          typeVersion: 1,
          parameters: {
            resume: 'timeInterval',
            amount: step.wait?.duration_seconds || 60,
            unit: 'seconds',
          },
        };

      case 'STEP_TYPE_CONDITIONAL':
        return {
          ...baseNode,
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          parameters: {
            conditions: {
              string: [
                {
                  value1: step.conditional?.condition,
                  operation: 'isNotEmpty',
                },
              ],
            },
          },
        };

      default:
        // Default to no-op node
        return {
          ...baseNode,
          type: 'n8n-nodes-base.noOp',
          typeVersion: 1,
          parameters: {},
        };
    }
  }

  private async createN8nWorkflow(workflow: any): Promise<any> {
    const response = await firstValueFrom(
      this.httpService.post(`${this.n8nApiUrl}/workflows`, workflow, {
        headers: {
          'X-N8N-API-KEY': this.n8nApiKey,
        },
      }),
    );
    return response.data;
  }

  private async updateN8nWorkflow(n8nWorkflowId: string, workflow: any): Promise<void> {
    await firstValueFrom(
      this.httpService.put(`${this.n8nApiUrl}/workflows/${n8nWorkflowId}`, workflow, {
        headers: {
          'X-N8N-API-KEY': this.n8nApiKey,
        },
      }),
    );
  }

  private async deleteN8nWorkflow(n8nWorkflowId: string): Promise<void> {
    await firstValueFrom(
      this.httpService.delete(`${this.n8nApiUrl}/workflows/${n8nWorkflowId}`, {
        headers: {
          'X-N8N-API-KEY': this.n8nApiKey,
        },
      }),
    );
  }
}
