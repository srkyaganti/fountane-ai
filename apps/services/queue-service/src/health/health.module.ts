import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { QueueHealthIndicator } from './queue-health.indicator';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [QueueHealthIndicator],
})
export class HealthModule {}
