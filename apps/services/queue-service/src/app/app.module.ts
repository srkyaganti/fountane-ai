import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QueueModule } from '../queue/queue.module';
import { QueueConfigModule } from '../config/queue-config.module';
import { HealthModule } from '../health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_DB', 0),
        },
        defaultJobOptions: {
          removeOnComplete: configService.get('QUEUE_REMOVE_ON_COMPLETE', 100),
          removeOnFail: configService.get('QUEUE_REMOVE_ON_FAIL', 100),
          attempts: configService.get('QUEUE_DEFAULT_ATTEMPTS', 3),
          backoff: {
            type: 'exponential',
            delay: configService.get('QUEUE_BACKOFF_DELAY', 2000),
          },
        },
      }),
      inject: [ConfigService],
    }),
    QueueConfigModule,
    QueueModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
