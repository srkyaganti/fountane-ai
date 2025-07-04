import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowService } from '../workflow/workflow.service';
import {
  CreateTemplateRequest,
  ListTemplatesRequest,
  ListTemplatesResponse,
  InstantiateTemplateRequest,
  WorkflowTemplate,
  Workflow,
} from '../interfaces/workflow.interface';

@Injectable()
export class TemplateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
  ) {}

  async createTemplate(request: CreateTemplateRequest): Promise<WorkflowTemplate> {
    // Validate template name is unique
    const existing = await this.prisma.workflowTemplate.findUnique({
      where: { name: request.name },
    });

    if (existing) {
      throw new BadRequestException(`Template with name ${request.name} already exists`);
    }

    // Create template
    const template = await this.prisma.workflowTemplate.create({
      data: {
        name: request.name,
        description: request.description,
        category: request.category,
        definition: request.definition as any,
        parameterSchemas: this.extractParameterSchemas(request.definition),
        tags: this.extractTags(request),
        metadata: request.metadata || {},
      },
    });

    return this.mapTemplateToGrpc(template);
  }

  async listTemplates(request: ListTemplatesRequest): Promise<ListTemplatesResponse> {
    const pageSize = request.page_size || 20;
    const skip = request.page_token ? parseInt(request.page_token, 10) : 0;

    const where: any = {};

    if (request.category) {
      where.category = request.category;
    }

    const [templates, total] = await Promise.all([
      this.prisma.workflowTemplate.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.workflowTemplate.count({ where }),
    ]);

    return {
      templates: templates.map((t) => this.mapTemplateToGrpc(t)),
      next_page_token: skip + pageSize < total ? String(skip + pageSize) : '',
      total_count: total,
    };
  }

  async instantiateTemplate(request: InstantiateTemplateRequest): Promise<Workflow> {
    const template = await this.prisma.workflowTemplate.findUnique({
      where: { id: request.template_id },
    });

    if (!template) {
      throw new NotFoundException(`Template ${request.template_id} not found`);
    }

    // Apply parameter overrides to the template definition
    const definition = this.applyParameterOverrides(
      template.definition as any,
      request.parameter_overrides || {},
    );

    // Create workflow from template
    const createRequest = {
      name: request.name,
      description: template.description || `Created from template: ${template.name}`,
      tenant_id: request.tenant_id,
      definition,
      metadata: {
        template_id: template.id,
        template_name: template.name,
      },
    };

    return this.workflowService.createWorkflow(createRequest);
  }

  private extractParameterSchemas(definition: any): any {
    const schemas: Record<string, any> = {};

    // Extract parameters from global parameters
    if (definition.global_parameters) {
      for (const [key, value] of Object.entries(definition.global_parameters)) {
        schemas[key] = {
          name: key,
          type: this.inferParameterType(value),
          default_value: value,
          required: false,
          description: `Global parameter: ${key}`,
        };
      }
    }

    // Extract parameters from step inputs
    if (definition.steps) {
      for (const step of definition.steps) {
        if (step.input) {
          for (const [key, value] of Object.entries(step.input)) {
            if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
              const paramName = value.slice(2, -2).trim();
              if (!schemas[paramName]) {
                schemas[paramName] = {
                  name: paramName,
                  type: 'PARAMETER_TYPE_STRING',
                  required: true,
                  description: `Used in step: ${step.name}`,
                };
              }
            }
          }
        }
      }
    }

    return schemas;
  }

  private inferParameterType(value: any): string {
    if (typeof value === 'string') return 'PARAMETER_TYPE_STRING';
    if (typeof value === 'number') return 'PARAMETER_TYPE_NUMBER';
    if (typeof value === 'boolean') return 'PARAMETER_TYPE_BOOLEAN';
    if (Array.isArray(value)) return 'PARAMETER_TYPE_ARRAY';
    if (typeof value === 'object') return 'PARAMETER_TYPE_OBJECT';
    return 'PARAMETER_TYPE_STRING';
  }

  private extractTags(request: CreateTemplateRequest): string[] {
    const tags: string[] = [request.category];

    // Extract tags from metadata
    if (request.metadata?.tags) {
      const metaTags = request.metadata.tags.split(',').map((t) => t.trim());
      tags.push(...metaTags);
    }

    // Extract tags from workflow definition features
    if (request.definition.triggers?.length > 0) {
      tags.push('triggered');
    }

    if (request.definition.steps?.some((s) => s.type === 'STEP_TYPE_PARALLEL')) {
      tags.push('parallel');
    }

    if (request.definition.steps?.some((s) => s.type === 'STEP_TYPE_HUMAN_TASK')) {
      tags.push('human-approval');
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  private applyParameterOverrides(definition: any, overrides: Record<string, string>): any {
    const result = JSON.parse(JSON.stringify(definition)); // Deep clone

    // Apply overrides to global parameters
    if (result.global_parameters) {
      for (const [key, value] of Object.entries(overrides)) {
        if (key in result.global_parameters) {
          result.global_parameters[key] = value;
        }
      }
    }

    // Apply overrides to step inputs
    if (result.steps) {
      for (const step of result.steps) {
        if (step.input) {
          for (const [key, value] of Object.entries(step.input)) {
            if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
              const paramName = value.slice(2, -2).trim();
              if (paramName in overrides) {
                step.input[key] = overrides[paramName];
              }
            }
          }
        }
      }
    }

    return result;
  }

  private mapTemplateToGrpc(template: any): WorkflowTemplate {
    return {
      id: template.id,
      name: template.name,
      description: template.description || '',
      category: template.category,
      definition: template.definition,
      parameter_schemas: template.parameterSchemas || {},
      tags: template.tags || [],
      created_at: template.createdAt.getTime(),
      updated_at: template.updatedAt.getTime(),
    };
  }
}
