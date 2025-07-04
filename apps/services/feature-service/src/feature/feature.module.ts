import { Module } from '@nestjs/common';
import { FeatureController } from './feature.controller';
import { FeatureService } from './feature.service';
import { FeatureRepository } from './feature.repository';
import { UnleashModule } from '../unleash/unleash.module';
import { CacheModule } from '../cache/cache.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [UnleashModule, CacheModule, AuditModule],
  controllers: [FeatureController],
  providers: [FeatureService, FeatureRepository],
  exports: [FeatureService],
})
export class FeatureModule {}
