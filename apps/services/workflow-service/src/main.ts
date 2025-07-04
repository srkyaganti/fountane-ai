import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: 'fountane.workflow',
      protoPath: join(__dirname, '../../../libs/core/proto/workflow.proto'),
      url: '0.0.0.0:50052',
    },
  });

  await app.listen();
  Logger.log('🚀 Workflow Service is running on port 50052');
}

bootstrap();
