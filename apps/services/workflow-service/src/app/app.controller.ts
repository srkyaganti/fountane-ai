import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @GrpcMethod('WorkflowService', 'Health')
  health(): { status: string; service: string } {
    return this.appService.getHealth();
  }
}
