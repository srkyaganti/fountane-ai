import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { WorkflowController } from '../workflow/workflow.controller';
import { WorkflowService } from '../workflow/workflow.service';
import { ExecutionService } from '../execution/execution.service';
import { TemplateService } from '../template/template.service';
import { N8nService } from '../n8n/n8n.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local', '.env.production'],
    }),
    HttpModule.registerAsync({
      useFactory: () => ({
        timeout: 30000,
        maxRedirects: 5,
      }),
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController, WorkflowController],
  providers: [
    AppService,
    PrismaService,
    WorkflowService,
    ExecutionService,
    TemplateService,
    N8nService,
  ],
})
export class AppModule {}
