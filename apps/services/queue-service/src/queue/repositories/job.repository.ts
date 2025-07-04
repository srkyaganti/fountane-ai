import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class JobRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    id: string;
    queueName: string;
    type: string;
    data: any;
    status: string;
    tenantId: string;
    metadata?: Record<string, string>;
    priority?: number;
    maxAttempts?: number;
    dependsOn?: string[];
  }) {
    return this.prisma.job.create({
      data: {
        id: data.id,
        queueName: data.queueName,
        type: data.type,
        data: data.data,
        status: data.status,
        tenantId: data.tenantId,
        metadata: data.metadata || {},
        priority: data.priority || 0,
        maxAttempts: data.maxAttempts || 3,
        dependsOn: data.dependsOn || [],
      },
    });
  }

  async findById(id: string) {
    return this.prisma.job.findUnique({
      where: { id },
    });
  }

  async update(
    id: string,
    data: {
      status?: string;
      data?: any;
      metadata?: Record<string, string>;
      startedAt?: Date;
      completedAt?: Date;
      failedAt?: Date;
      errorMessage?: string;
      resultUrl?: string;
      attempts?: number;
    },
  ) {
    return this.prisma.job.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.job.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findByTenant(
    tenantId: string,
    options?: {
      status?: string[];
      queueName?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: Prisma.JobWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (options?.status?.length) {
      where.status = { in: options.status };
    }

    if (options?.queueName) {
      where.queueName = options.queueName;
    }

    return this.prisma.job.findMany({
      where,
      take: options?.limit,
      skip: options?.offset,
      orderBy: { createdAt: 'desc' },
    });
  }

  async countByTenant(
    tenantId: string,
    options?: {
      status?: string[];
      queueName?: string;
    },
  ) {
    const where: Prisma.JobWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (options?.status?.length) {
      where.status = { in: options.status };
    }

    if (options?.queueName) {
      where.queueName = options.queueName;
    }

    return this.prisma.job.count({ where });
  }

  async getMetrics(options: {
    queueName: string;
    startTime: Date;
    endTime: Date;
    tenantId?: string;
  }) {
    const where: Prisma.JobWhereInput = {
      queueName: options.queueName,
      createdAt: {
        gte: options.startTime,
        lte: options.endTime,
      },
      deletedAt: null,
    };

    if (options.tenantId) {
      where.tenantId = options.tenantId;
    }

    const [total, completed, failed] = await Promise.all([
      this.prisma.job.count({ where }),
      this.prisma.job.count({ where: { ...where, status: 'completed' } }),
      this.prisma.job.count({ where: { ...where, status: 'failed' } }),
    ]);

    const jobsByType = await this.prisma.job.groupBy({
      by: ['type'],
      where,
      _count: true,
    });

    const processingTimes = await this.prisma.job.findMany({
      where: {
        ...where,
        status: 'completed',
        startedAt: { not: null },
        completedAt: { not: null },
      },
      select: {
        startedAt: true,
        completedAt: true,
      },
    });

    const avgProcessingTime =
      processingTimes.length > 0
        ? processingTimes.reduce((sum, job) => {
            const duration = job.completedAt!.getTime() - job.startedAt!.getTime();
            return sum + duration;
          }, 0) / processingTimes.length
        : 0;

    return {
      total,
      completed,
      failed,
      successRate: total > 0 ? (completed / total) * 100 : 0,
      averageProcessingTime: avgProcessingTime,
      jobsByType: jobsByType.reduce(
        (acc, item) => {
          acc[item.type] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  async createJobEvent(data: {
    jobId: string;
    queueName: string;
    eventType: string;
    data?: any;
    tenantId?: string;
  }) {
    return this.prisma.jobEvent.create({
      data: {
        jobId: data.jobId,
        queueName: data.queueName,
        eventType: data.eventType,
        data: data.data || {},
        tenantId: data.tenantId,
      },
    });
  }

  async getJobEvents(options: {
    jobId?: string;
    queueName?: string;
    eventTypes?: string[];
    tenantId?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: Prisma.JobEventWhereInput = {};

    if (options.jobId) {
      where.jobId = options.jobId;
    }

    if (options.queueName) {
      where.queueName = options.queueName;
    }

    if (options.eventTypes?.length) {
      where.eventType = { in: options.eventTypes };
    }

    if (options.tenantId) {
      where.tenantId = options.tenantId;
    }

    return this.prisma.jobEvent.findMany({
      where,
      take: options.limit,
      skip: options.offset,
      orderBy: { createdAt: 'desc' },
    });
  }
}
