import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: 'fountane.realtime',
      protoPath: join(__dirname, '../../../libs/core/proto/realtime.proto'),
      url: '0.0.0.0:50054',
    },
  });

  await app.listen();
  Logger.log('🚀 Realtime Service is running on port 50054');
}

bootstrap();
