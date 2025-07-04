import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowService } from './workflow.service';
import { PrismaService } from '../prisma/prisma.service';
import { N8nService } from '../n8n/n8n.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateWorkflowRequest, WorkflowStatus } from '../interfaces/workflow.interface';

describe('WorkflowService', () => {
  let service: WorkflowService;
  let prismaService: jest.Mocked<PrismaService>;
  let n8nService: jest.Mocked<N8nService>;

  const mockWorkflow = {
    id: 'workflow-123',
    name: 'Test Workflow',
    description: 'A test workflow',
    tenantId: 'tenant-123',
    definition: {
      steps: [
        {
          id: 'step-1',
          name: 'Test Step',
          type: 'STEP_TYPE_SERVICE',
          service: {
            service: 'TestService',
            method: 'testMethod',
            timeout_seconds: 30,
          },
          input: {
            test: 'value',
          },
        },
      ],
    },
    status: 'ACTIVE',
    version: 1,
    metadata: {},
    createdBy: 'system',
    updatedBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      workflow: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      workflowMetrics: {
        findMany: jest.fn(),
      },
    };

    const mockN8nService = {
      syncWorkflow: jest.fn(),
      deleteWorkflow: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: N8nService,
          useValue: mockN8nService,
        },
      ],
    }).compile();

    service = module.get<WorkflowService>(WorkflowService);
    prismaService = module.get(PrismaService);
    n8nService = module.get(N8nService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createWorkflow', () => {
    it('should create a workflow successfully', async () => {
      const request: CreateWorkflowRequest = {
        name: 'Test Workflow',
        description: 'A test workflow',
        tenant_id: 'tenant-123',
        definition: {
          steps: [
            {
              id: 'step-1',
              name: 'Test Step',
              type: 1, // STEP_TYPE_SERVICE
              service: {
                service: 'TestService',
                method: 'testMethod',
                timeout_seconds: 30,
              },
              input: {
                test: 'value',
              },
            },
          ],
        },
      };

      prismaService.workflow.create.mockResolvedValue(mockWorkflow);

      const result = await service.createWorkflow(request);

      expect(prismaService.workflow.create).toHaveBeenCalledWith({
        data: {
          name: request.name,
          description: request.description,
          tenantId: request.tenant_id,
          definition: request.definition,
          metadata: {},
          status: 'DRAFT',
          createdBy: 'system',
          updatedBy: 'system',
        },
      });

      expect(result).toMatchObject({
        id: mockWorkflow.id,
        name: mockWorkflow.name,
        description: mockWorkflow.description,
        tenant_id: mockWorkflow.tenantId,
      });
    });

    it('should throw BadRequestException for invalid workflow definition', async () => {
      const request: CreateWorkflowRequest = {
        name: 'Test Workflow',
        description: 'A test workflow',
        tenant_id: 'tenant-123',
        definition: {
          steps: [], // Empty steps should cause validation error
        },
      };

      await expect(service.createWorkflow(request)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getWorkflow', () => {
    it('should return workflow when found', async () => {
      prismaService.workflow.findUnique.mockResolvedValue(mockWorkflow);

      const result = await service.getWorkflow('workflow-123');

      expect(prismaService.workflow.findUnique).toHaveBeenCalledWith({
        where: { id: 'workflow-123' },
      });

      expect(result.id).toBe(mockWorkflow.id);
    });

    it('should throw NotFoundException when workflow not found', async () => {
      prismaService.workflow.findUnique.mockResolvedValue(null);

      await expect(service.getWorkflow('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listWorkflows', () => {
    it('should return paginated workflow list', async () => {
      const workflows = [mockWorkflow];
      const total = 1;

      prismaService.workflow.findMany.mockResolvedValue(workflows);
      prismaService.workflow.count.mockResolvedValue(total);

      const result = await service.listWorkflows({
        tenant_id: 'tenant-123',
        page_size: 20,
      });

      expect(result.workflows).toHaveLength(1);
      expect(result.total_count).toBe(1);
      expect(result.next_page_token).toBe('');
    });
  });

  describe('deleteWorkflow', () => {
    it('should delete workflow successfully', async () => {
      prismaService.workflow.findUnique.mockResolvedValue(mockWorkflow);
      const mockExecution = { count: jest.fn().mockResolvedValue(0) };
      (prismaService as any).execution = mockExecution;
      prismaService.workflow.update.mockResolvedValue(mockWorkflow);
      n8nService.deleteWorkflow.mockResolvedValue(undefined);

      await service.deleteWorkflow('workflow-123');

      expect(n8nService.deleteWorkflow).toHaveBeenCalledWith('workflow-123');
      expect(prismaService.workflow.update).toHaveBeenCalledWith({
        where: { id: 'workflow-123' },
        data: { status: 'ARCHIVED' },
      });
    });

    it('should throw NotFoundException when workflow not found', async () => {
      prismaService.workflow.findUnique.mockResolvedValue(null);

      await expect(service.deleteWorkflow('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
