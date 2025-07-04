import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QUEUE_NAMES } from '../queue/queue.module';

@Injectable()
export class QueueHealthIndicator extends HealthIndicator {
  private queues: Map<string, Queue> = new Map();

  constructor(
    @InjectQueue(QUEUE_NAMES.DEFAULT) private defaultQueue: Queue,
    @InjectQueue(QUEUE_NAMES.EMAIL) private emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.NOTIFICATION) private notificationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.DATA_PROCESSING) private dataProcessingQueue: Queue,
    @InjectQueue(QUEUE_NAMES.REPORT_GENERATION) private reportGenerationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.WEBHOOK) private webhookQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SCHEDULED_TASK) private scheduledTaskQueue: Queue,
  ) {
    super();
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

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const errors: string[] = [];
    const details: any = {};

    for (const [name, queue] of this.queues) {
      try {
        const client = await queue.client;
        const isPaused = await queue.isPaused();
        const failedCount = await queue.getFailedCount();
        const waitingCount = await queue.getWaitingCount();

        details[name] = {
          status: 'up',
          isPaused,
          failedCount,
          waitingCount,
        };

        // Check for unhealthy conditions
        if (failedCount > 100) {
          errors.push(`${name} has ${failedCount} failed jobs`);
        }
        if (waitingCount > 1000) {
          errors.push(`${name} has ${waitingCount} waiting jobs`);
        }
      } catch (error) {
        details[name] = {
          status: 'down',
          error: error.message,
        };
        errors.push(`${name} is down: ${error.message}`);
      }
    }

    const isHealthy = errors.length === 0;

    const result = this.getStatus(key, isHealthy, details);

    if (!isHealthy) {
      throw new HealthCheckError('Queue check failed', result);
    }

    return result;
  }
}
