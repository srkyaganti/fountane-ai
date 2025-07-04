import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job, JobsOptions as JobOptions } from 'bullmq';
import { QUEUE_NAMES } from './queue.module';
import { JobRepository } from './repositories/job.repository';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateJobDto,
  JobStatusDto,
  UpdateJobDto,
  ScheduleJobDto,
  ListScheduledJobsDto,
  JobMetricsDto,
  JobMetricsResult,
  ScheduledJobResult,
  QueueMetrics,
} from './dto/job.dto';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private queues: Map<string, Queue> = new Map();

  constructor(
    @InjectQueue(QUEUE_NAMES.DEFAULT) private defaultQueue: Queue,
    @InjectQueue(QUEUE_NAMES.EMAIL) private emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.NOTIFICATION) private notificationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.DATA_PROCESSING) private dataProcessingQueue: Queue,
    @InjectQueue(QUEUE_NAMES.REPORT_GENERATION) private reportGenerationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.WEBHOOK) private webhookQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SCHEDULED_TASK) private scheduledTaskQueue: Queue,
    private readonly jobRepository: JobRepository,
    private readonly prisma: PrismaService,
  ) {
    this.initializeQueues();
  }

  private initializeQueues() {
    this.queues.set(QUEUE_NAMES.DEFAULT, this.defaultQueue);
    this.queues.set(QUEUE_NAMES.EMAIL, this.emailQueue);
    this.queues.set(QUEUE_NAMES.NOTIFICATION, this.notificationQueue);
    this.queues.set(QUEUE_NAMES.DATA_PROCESSING, this.dataProcessingQueue);
    this.queues.set(QUEUE_NAMES.REPORT_GENERATION, this.reportGenerationQueue);
    this.queues.set(QUEUE_NAMES.WEBHOOK, this.webhookQueue);
    this.queues.set(QUEUE_NAMES.SCHEDULED_TASK, this.scheduledTaskQueue);
  }

  async createJob(createJobDto: CreateJobDto): Promise<Job> {
    const queue = this.getQueue(createJobDto.queueName);
    const options: JobOptions = {
      priority: createJobDto.priority,
      delay: createJobDto.delay,
      attempts: createJobDto.attempts || 3,
      backoff: createJobDto.backoff,
      removeOnComplete: createJobDto.removeOnComplete ?? true,
      removeOnFail: createJobDto.removeOnFail ?? false,
    };

    if (createJobDto.schedulePattern) {
      options.repeat = {
        cron: createJobDto.schedulePattern,
        tz: createJobDto.timezone || 'UTC',
      };
    }

    const job = await queue.add(createJobDto.type, createJobDto.data, options);

    await this.jobRepository.create({
      id: job.id.toString(),
      queueName: createJobDto.queueName,
      type: createJobDto.type,
      data: createJobDto.data,
      status: 'waiting',
      tenantId: createJobDto.tenantId,
      metadata: createJobDto.metadata,
      priority: createJobDto.priority,
      maxAttempts: createJobDto.attempts,
      dependsOn: createJobDto.dependsOn,
    });

    await this.jobRepository.createJobEvent({
      jobId: job.id.toString(),
      queueName: createJobDto.queueName,
      eventType: 'CREATED',
      tenantId: createJobDto.tenantId,
    });

    this.logger.log(`Job ${job.id} created in queue ${createJobDto.queueName}`);
    return job;
  }

  async getJob(queueName: string, jobId: string): Promise<Job | null> {
    const queue = this.getQueue(queueName);
    return queue.getJob(jobId);
  }

  async getJobs(
    queueName: string,
    types?: ('waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused')[],
    start?: number,
    end?: number,
  ): Promise<Job[]> {
    const queue = this.getQueue(queueName);
    const jobTypes = types || ['waiting', 'active', 'completed', 'failed', 'delayed'];
    const jobs: Job[] = [];

    for (const type of jobTypes) {
      const typeJobs = await queue.getJobs([type], start, end);
      jobs.push(...typeJobs);
    }

    return jobs;
  }

  async updateJob(queueName: string, jobId: string, updateDto: UpdateJobDto): Promise<Job> {
    const job = await this.getJob(queueName, jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found in queue ${queueName}`);
    }

    await job.update(updateDto.data);
    await this.jobRepository.update(jobId, {
      data: updateDto.data,
      metadata: updateDto.metadata,
    });

    return job;
  }

  async removeJob(queueName: string, jobId: string): Promise<void> {
    const job = await this.getJob(queueName, jobId);
    if (job) {
      await job.remove();
      await this.jobRepository.delete(jobId);
      this.logger.log(`Job ${jobId} removed from queue ${queueName}`);
    }
  }

  async retryJob(queueName: string, jobId: string): Promise<void> {
    const job = await this.getJob(queueName, jobId);
    if (job) {
      await job.retry();
      this.logger.log(`Job ${jobId} retried in queue ${queueName}`);
    }
  }

  async promoteJob(queueName: string, jobId: string): Promise<void> {
    const job = await this.getJob(queueName, jobId);
    if (job) {
      await job.promote();
      this.logger.log(`Job ${jobId} promoted in queue ${queueName}`);
    }
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
    this.logger.log(`Queue ${queueName} paused`);
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
    this.logger.log(`Queue ${queueName} resumed`);
  }

  async cleanQueue(queueName: string, grace: number = 0, status?: string): Promise<Job[]> {
    const queue = this.getQueue(queueName);
    return queue.clean(grace, status);
  }

  async getQueueStatus(queueName: string): Promise<JobStatusDto> {
    const queue = this.getQueue(queueName);
    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.getPausedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
      total: waiting + active + completed + failed + delayed + paused,
    };
  }

  async getAllQueuesStatus(): Promise<Record<string, JobStatusDto>> {
    const status: Record<string, JobStatusDto> = {};

    for (const [name] of this.queues) {
      status[name] = await this.getQueueStatus(name);
    }

    return status;
  }

  private getQueue(queueName: string): Queue {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    return queue;
  }

  async createQueue(name: string, config?: Record<string, string>): Promise<void> {
    await this.prisma.queue.upsert({
      where: { name },
      update: { config },
      create: { name, config },
    });
    this.logger.log(`Queue ${name} created/updated`);
  }

  async drainQueue(queueName: string, waitForActive: boolean = false): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.drain(waitForActive);
    this.logger.log(`Queue ${queueName} drained`);
  }

  async getQueueMetrics(queueName: string): Promise<QueueMetrics> {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    const recentJobs = await this.prisma.job.count({
      where: {
        queueName,
        createdAt: { gte: oneMinuteAgo },
      },
    });

    const processingTimes = await this.prisma.job.findMany({
      where: {
        queueName,
        status: 'completed',
        startedAt: { not: null },
        completedAt: { not: null },
      },
      select: {
        startedAt: true,
        completedAt: true,
      },
      take: 100,
      orderBy: { completedAt: 'desc' },
    });

    const avgProcessingTime =
      processingTimes.length > 0
        ? processingTimes.reduce((sum, job) => {
            const duration = job.completedAt!.getTime() - job.startedAt!.getTime();
            return sum + duration;
          }, 0) / processingTimes.length
        : 0;

    return {
      jobsPerMinute: recentJobs,
      averageProcessingTime: avgProcessingTime,
    };
  }

  async scheduleJob(dto: ScheduleJobDto): Promise<ScheduledJobResult> {
    const scheduledJob = await this.prisma.scheduledJob.create({
      data: {
        queueName: dto.queueName,
        type: dto.type,
        data: dto.data,
        cronExpression: dto.cronExpression,
        timezone: dto.timezone || 'UTC',
        tenantId: dto.tenantId,
        metadata: dto.metadata,
        nextRunAt: this.calculateNextRun(dto.cronExpression, dto.timezone),
      },
    });

    const queue = this.getQueue(dto.queueName);
    await queue.add(
      dto.type,
      { ...dto.data, scheduledJobId: scheduledJob.id },
      {
        repeat: {
          cron: dto.cronExpression,
          tz: dto.timezone || 'UTC',
        },
      },
    );

    return {
      id: scheduledJob.id,
      queueName: scheduledJob.queueName,
      type: scheduledJob.type,
      data: scheduledJob.data,
      cronExpression: scheduledJob.cronExpression,
      timezone: scheduledJob.timezone,
      nextRunAt: scheduledJob.nextRunAt,
      lastRunAt: scheduledJob.lastRunAt,
      isActive: scheduledJob.isActive,
      metadata: scheduledJob.metadata as Record<string, string>,
      tenantId: scheduledJob.tenantId,
    };
  }

  async cancelScheduledJob(scheduledJobId: string): Promise<void> {
    const scheduledJob = await this.prisma.scheduledJob.update({
      where: { id: scheduledJobId },
      data: { isActive: false, deletedAt: new Date() },
    });

    const queue = this.getQueue(scheduledJob.queueName);
    const repeatableJobs = await queue.getRepeatableJobs();

    for (const job of repeatableJobs) {
      if (job.name === scheduledJob.type) {
        await queue.removeRepeatableByKey(job.key);
      }
    }

    this.logger.log(`Scheduled job ${scheduledJobId} cancelled`);
  }

  async listScheduledJobs(dto: ListScheduledJobsDto): Promise<{
    jobs: ScheduledJobResult[];
    total: number;
  }> {
    const where: any = {
      isActive: true,
      deletedAt: null,
    };

    if (dto.queueName) {
      where.queueName = dto.queueName;
    }

    if (dto.tenantId) {
      where.tenantId = dto.tenantId;
    }

    const [jobs, total] = await Promise.all([
      this.prisma.scheduledJob.findMany({
        where,
        take: dto.limit,
        skip: dto.offset,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.scheduledJob.count({ where }),
    ]);

    return {
      jobs: jobs.map((job) => ({
        id: job.id,
        queueName: job.queueName,
        type: job.type,
        data: job.data,
        cronExpression: job.cronExpression,
        timezone: job.timezone,
        nextRunAt: job.nextRunAt,
        lastRunAt: job.lastRunAt,
        isActive: job.isActive,
        metadata: job.metadata as Record<string, string>,
        tenantId: job.tenantId,
      })),
      total,
    };
  }

  async getJobMetrics(dto: JobMetricsDto): Promise<JobMetricsResult> {
    const baseMetrics = await this.jobRepository.getMetrics({
      queueName: dto.queueName,
      startTime: dto.startTime,
      endTime: dto.endTime,
      tenantId: dto.tenantId,
    });

    const hourlyMetrics = await this.getHourlyMetrics(dto);

    return {
      totalJobs: baseMetrics.total,
      completedJobs: baseMetrics.completed,
      failedJobs: baseMetrics.failed,
      successRate: baseMetrics.successRate,
      averageProcessingTime: baseMetrics.averageProcessingTime,
      jobsByType: baseMetrics.jobsByType,
      hourlyMetrics,
    };
  }

  private async getHourlyMetrics(dto: JobMetricsDto): Promise<
    Array<{
      hour: Date;
      jobCount: number;
      averageProcessingTime: number;
    }>
  > {
    const hours: Date[] = [];
    const currentHour = new Date(dto.startTime);
    currentHour.setMinutes(0, 0, 0);

    while (currentHour <= dto.endTime) {
      hours.push(new Date(currentHour));
      currentHour.setHours(currentHour.getHours() + 1);
    }

    const metrics = await Promise.all(
      hours.map(async (hour) => {
        const nextHour = new Date(hour);
        nextHour.setHours(nextHour.getHours() + 1);

        const jobsInHour = await this.prisma.job.findMany({
          where: {
            queueName: dto.queueName,
            tenantId: dto.tenantId,
            createdAt: {
              gte: hour,
              lt: nextHour,
            },
            status: 'completed',
            startedAt: { not: null },
            completedAt: { not: null },
          },
          select: {
            startedAt: true,
            completedAt: true,
          },
        });

        const avgTime =
          jobsInHour.length > 0
            ? jobsInHour.reduce((sum, job) => {
                const duration = job.completedAt!.getTime() - job.startedAt!.getTime();
                return sum + duration;
              }, 0) / jobsInHour.length
            : 0;

        return {
          hour,
          jobCount: jobsInHour.length,
          averageProcessingTime: avgTime,
        };
      }),
    );

    return metrics;
  }

  private calculateNextRun(cronExpression: string, timezone?: string): Date {
    // This is a simplified implementation
    // In production, use a proper cron parser library
    return new Date(Date.now() + 3600000); // 1 hour from now
  }
}
