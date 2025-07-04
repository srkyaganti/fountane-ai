import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LagoService } from './lago.service';

@Module({
  imports: [HttpModule],
  providers: [LagoService],
  exports: [LagoService],
})
export class LagoModule {}
