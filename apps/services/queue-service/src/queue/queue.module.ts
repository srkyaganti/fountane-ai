import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import {
  DefaultQueueProcessor,
  EmailQueueProcessor,
  NotificationQueueProcessor,
  DataProcessingQueueProcessor,
  ReportGenerationQueueProcessor,
  WebhookQueueProcessor,
  ScheduledTaskQueueProcessor,
} from './queue.processor';
import { QueueMonitorService } from './queue-monitor.service';
import { QueueSchedulerService } from './queue-scheduler.service';
import { JobRepository } from './repositories/job.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueGrpcController } from '../grpc/queue.grpc.controller';

export const QUEUE_NAMES = {
  DEFAULT: 'default',
  EMAIL: 'email',
  NOTIFICATION: 'notification',
  DATA_PROCESSING: 'data-processing',
  REPORT_GENERATION: 'report-generation',
  WEBHOOK: 'webhook',
  SCHEDULED_TASK: 'scheduled-task',
};

@Module({
  imports: [
    PrismaModule,
    ...Object.values(QUEUE_NAMES).map((name) => BullModule.registerQueue({ name })),
  ],
  providers: [
    QueueService,
    DefaultQueueProcessor,
    EmailQueueProcessor,
    NotificationQueueProcessor,
    DataProcessingQueueProcessor,
    ReportGenerationQueueProcessor,
    WebhookQueueProcessor,
    ScheduledTaskQueueProcessor,
    QueueMonitorService,
    QueueSchedulerService,
    JobRepository,
  ],
  controllers: [QueueController, QueueGrpcController],
  exports: [QueueService, QueueMonitorService, JobRepository],
})
export class QueueModule {}
