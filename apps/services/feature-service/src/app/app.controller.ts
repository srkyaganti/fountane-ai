import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @GrpcMethod('FeatureService', 'GetFeature')
  getFeature(data: any): Observable<any> {
    return this.appService.getFeature(data);
  }
}
