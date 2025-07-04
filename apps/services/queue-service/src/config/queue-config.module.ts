import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QUEUE_NAMES } from '../queue/queue.module';

@Module({
  imports: [
    ConfigModule,
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
  ],
  providers: [
    {
      provide: 'BULL_BOARD_QUEUES',
      useFactory: (
        defaultQueue: Queue,
        emailQueue: Queue,
        notificationQueue: Queue,
        dataProcessingQueue: Queue,
        reportGenerationQueue: Queue,
        webhookQueue: Queue,
        scheduledTaskQueue: Queue,
      ) => {
        return [
          new BullAdapter(defaultQueue),
          new BullAdapter(emailQueue),
          new BullAdapter(notificationQueue),
          new BullAdapter(dataProcessingQueue),
          new BullAdapter(reportGenerationQueue),
          new BullAdapter(webhookQueue),
          new BullAdapter(scheduledTaskQueue),
        ];
      },
      inject: [
        `BullQueue_${QUEUE_NAMES.DEFAULT}`,
        `BullQueue_${QUEUE_NAMES.EMAIL}`,
        `BullQueue_${QUEUE_NAMES.NOTIFICATION}`,
        `BullQueue_${QUEUE_NAMES.DATA_PROCESSING}`,
        `BullQueue_${QUEUE_NAMES.REPORT_GENERATION}`,
        `BullQueue_${QUEUE_NAMES.WEBHOOK}`,
        `BullQueue_${QUEUE_NAMES.SCHEDULED_TASK}`,
      ],
    },
  ],
  exports: [],
})
export class QueueConfigModule {}
