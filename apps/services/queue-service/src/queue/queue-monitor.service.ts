import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QUEUE_NAMES } from './queue.module';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QueueMonitorService {
  private readonly logger = new Logger(QueueMonitorService.name);
  private queues: Map<string, Queue> = new Map();

  constructor(
    @InjectQueue(QUEUE_NAMES.DEFAULT) private defaultQueue: Queue,
    @InjectQueue(QUEUE_NAMES.EMAIL) private emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.NOTIFICATION) private notificationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.DATA_PROCESSING) private dataProcessingQueue: Queue,
    @InjectQueue(QUEUE_NAMES.REPORT_GENERATION) private reportGenerationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.WEBHOOK) private webhookQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SCHEDULED_TASK) private scheduledTaskQueue: Queue,
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

  @Interval(60000) // Run every minute
  async collectMetrics() {
    this.logger.debug('Collecting queue metrics');

    for (const [queueName, queue] of this.queues) {
      try {
        const [waiting, active, completed, failed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
        ]);

        const hour = new Date();
        hour.setMinutes(0, 0, 0);

        // Get jobs completed in the last hour
        const completedJobs = await this.prisma.job.findMany({
          where: {
            queueName,
            status: 'completed',
            completedAt: {
              gte: hour,
            },
          },
          select: {
            type: true,
            startedAt: true,
            completedAt: true,
          },
        });

        const jobsByType = completedJobs.reduce(
          (acc, job) => {
            acc[job.type] = (acc[job.type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );

        const totalProcessingTime = completedJobs.reduce((sum, job) => {
          if (job.startedAt && job.completedAt) {
            return sum + (job.completedAt.getTime() - job.startedAt.getTime());
          }
          return sum;
        }, 0);

        await this.prisma.jobMetric.upsert({
          where: {
            queueName_hour_tenantId: {
              queueName,
              hour,
              tenantId: null,
            },
          },
          update: {
            jobCount: waiting + active + completed + failed,
            completedCount: completed,
            failedCount: failed,
            totalProcessingTime,
            jobsByType,
          },
          create: {
            queueName,
            hour,
            jobCount: waiting + active + completed + failed,
            completedCount: completed,
            failedCount: failed,
            totalProcessingTime,
            jobsByType,
          },
        });

        this.logger.debug(`Metrics collected for queue ${queueName}`);
      } catch (error) {
        this.logger.error(`Failed to collect metrics for queue ${queueName}`, error);
      }
    }
  }

  @Interval(300000) // Run every 5 minutes
  async cleanupOldJobs() {
    this.logger.debug('Cleaning up old jobs');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      // Clean up old completed jobs
      const deletedJobs = await this.prisma.job.deleteMany({
        where: {
          status: 'completed',
          completedAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      // Clean up old job events
      const deletedEvents = await this.prisma.jobEvent.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      // Clean up old metrics
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const deletedMetrics = await this.prisma.jobMetric.deleteMany({
        where: {
          hour: {
            lt: ninetyDaysAgo,
          },
        },
      });

      this.logger.log(
        `Cleanup completed: ${deletedJobs.count} jobs, ${deletedEvents.count} events, ${deletedMetrics.count} metrics deleted`,
      );
    } catch (error) {
      this.logger.error('Failed to clean up old data', error);
    }
  }

  @Interval(10000) // Run every 10 seconds
  async checkQueueHealth() {
    for (const [queueName, queue] of this.queues) {
      try {
        const isPaused = await queue.isPaused();
        const waiting = await queue.getWaitingCount();
        const active = await queue.getActiveCount();
        const failed = await queue.getFailedCount();

        // Alert if queue has too many waiting jobs
        if (waiting > 1000) {
          this.logger.warn(`Queue ${queueName} has ${waiting} waiting jobs`);
        }

        // Alert if queue has too many failed jobs
        if (failed > 100) {
          this.logger.warn(`Queue ${queueName} has ${failed} failed jobs`);
        }

        // Update queue status in database
        await this.prisma.queue.upsert({
          where: { name: queueName },
          update: { isPaused },
          create: { name: queueName, isPaused },
        });
      } catch (error) {
        this.logger.error(`Failed to check health for queue ${queueName}`, error);
      }
    }
  }

  async getQueueHealth(queueName?: string): Promise<any> {
    const queues = queueName
      ? [[queueName, this.queues.get(queueName)]]
      : Array.from(this.queues.entries());

    const health = {};

    for (const [name, queue] of queues) {
      if (!queue) continue;

      const [waiting, active, completed, failed, delayed, paused, isPaused] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
        queue.getPausedCount(),
        queue.isPaused(),
      ]);

      health[name] = {
        status: isPaused ? 'paused' : 'active',
        counts: {
          waiting,
          active,
          completed,
          failed,
          delayed,
          paused,
        },
        health: this.calculateHealthScore({
          waiting,
          active,
          failed,
        }),
      };
    }

    return health;
  }

  private calculateHealthScore(metrics: {
    waiting: number;
    active: number;
    failed: number;
  }): 'healthy' | 'degraded' | 'unhealthy' {
    if (metrics.failed > 100 || metrics.waiting > 1000) {
      return 'unhealthy';
    }
    if (metrics.failed > 50 || metrics.waiting > 500) {
      return 'degraded';
    }
    return 'healthy';
  }
}
