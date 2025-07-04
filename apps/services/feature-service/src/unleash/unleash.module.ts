import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UnleashService } from './unleash.service';
import unleashConfig from './unleash.config';

@Global()
@Module({
  imports: [ConfigModule.forFeature(unleashConfig)],
  providers: [UnleashService],
  exports: [UnleashService],
})
export class UnleashModule {}
