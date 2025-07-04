import { Injectable } from '@nestjs/common';
import { Observable, of } from 'rxjs';

@Injectable()
export class AppService {
  getFeature(data: any): Observable<any> {
    return of({ message: 'Feature Service is running!' });
  }
}
