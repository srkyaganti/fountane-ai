import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RealtimeController } from './realtime.controller';
import { CentrifugoModule } from '../centrifugo/centrifugo.module';
import { CentrifugoService } from '../centrifugo/centrifugo.service';
import { ChannelService } from '../channels/channel.service';
import { MessageService } from '../messages/message.service';
import { PresenceService } from '../presence/presence.service';
import configuration from '../config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    CentrifugoModule,
  ],
  controllers: [RealtimeController],
  providers: [CentrifugoService, ChannelService, MessageService, PresenceService],
})
export class AppModule {}
