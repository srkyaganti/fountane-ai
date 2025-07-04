import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from './queue.service';

@Injectable()
export class QueueSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(QueueSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  async onModuleInit() {
    // Restore scheduled jobs on startup
    await this.restoreScheduledJobs();
  }

  private async restoreScheduledJobs() {
    try {
      const activeJobs = await this.prisma.scheduledJob.findMany({
        where: {
          isActive: true,
          deletedAt: null,
        },
      });

      for (const job of activeJobs) {
        await this.queueService.createJob({
          queueName: job.queueName,
          type: job.type,
          data: { ...job.data, scheduledJobId: job.id },
          tenantId: job.tenantId,
          metadata: job.metadata as Record<string, string>,
          schedulePattern: job.cronExpression,
          timezone: job.timezone,
        });
      }

      this.logger.log(`Restored ${activeJobs.length} scheduled jobs`);
    } catch (error) {
      this.logger.error('Failed to restore scheduled jobs', error);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkScheduledJobs() {
    try {
      const now = new Date();

      // Find jobs that should have run
      const overdueJobs = await this.prisma.scheduledJob.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          nextRunAt: {
            lte: now,
          },
        },
      });

      for (const job of overdueJobs) {
        // Create a one-time job for this scheduled execution
        await this.queueService.createJob({
          queueName: job.queueName,
          type: job.type,
          data: { ...job.data, scheduledJobId: job.id },
          tenantId: job.tenantId,
          metadata: {
            ...(job.metadata as Record<string, string>),
            scheduledJobId: job.id,
            scheduledAt: job.nextRunAt.toISOString(),
          },
        });

        // Update next run time
        const nextRunAt = this.calculateNextRun(job.cronExpression, job.timezone);
        await this.prisma.scheduledJob.update({
          where: { id: job.id },
          data: {
            lastRunAt: now,
            nextRunAt,
          },
        });
      }

      if (overdueJobs.length > 0) {
        this.logger.log(`Triggered ${overdueJobs.length} overdue scheduled jobs`);
      }
    } catch (error) {
      this.logger.error('Failed to check scheduled jobs', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupInactiveScheduledJobs() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deleted = await this.prisma.scheduledJob.deleteMany({
        where: {
          isActive: false,
          deletedAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      if (deleted.count > 0) {
        this.logger.log(`Cleaned up ${deleted.count} inactive scheduled jobs`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup inactive scheduled jobs', error);
    }
  }

  private calculateNextRun(cronExpression: string, timezone?: string): Date {
    // This is a simplified implementation
    // In production, use a proper cron parser library like node-cron or cron-parser
    const parts = cronExpression.split(' ');
    const now = new Date();

    // Basic parsing for common patterns
    if (cronExpression === '0 * * * *') {
      // Every hour
      now.setHours(now.getHours() + 1);
      now.setMinutes(0, 0, 0);
    } else if (cronExpression === '0 0 * * *') {
      // Every day at midnight
      now.setDate(now.getDate() + 1);
      now.setHours(0, 0, 0, 0);
    } else if (cronExpression === '*/5 * * * *') {
      // Every 5 minutes
      now.setMinutes(Math.ceil(now.getMinutes() / 5) * 5, 0, 0);
    } else {
      // Default to 1 hour from now
      now.setHours(now.getHours() + 1);
    }

    return now;
  }
}
