import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const logger = new Logger('QueueService');
  const port = process.env.PORT || 3003;
  const grpcPort = process.env.GRPC_PORT || 50053;

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');

  const microservice = app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'queue',
      protoPath: 'libs/core/proto/queue.proto',
      url: `0.0.0.0:${grpcPort}`,
    },
  });

  await app.startAllMicroservices();
  await app.listen(port);

  logger.log(`Queue service is running on http://localhost:${port}`);
  logger.log(`gRPC server is running on port ${grpcPort}`);
}

bootstrap();
