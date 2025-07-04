import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CentrifugoService } from './centrifugo.service';

@Module({
  imports: [ConfigModule],
  providers: [CentrifugoService],
  exports: [CentrifugoService],
})
export class CentrifugoModule {}
