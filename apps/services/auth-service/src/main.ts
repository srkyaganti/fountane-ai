import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: 'fountane.auth',
      protoPath: join(__dirname, '../../../libs/core/proto/auth.proto'),
      url: '0.0.0.0:50051',
    },
  });

  await app.listen();
  Logger.log('🚀 Auth Service is running on port 50051');
}

bootstrap();
