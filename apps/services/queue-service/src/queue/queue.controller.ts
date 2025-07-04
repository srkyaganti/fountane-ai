import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { QueueService } from './queue.service';
import { CreateJobDto, UpdateJobDto, JobFilterDto } from './dto/job.dto';

@Controller('queues')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post(':queueName/jobs')
  @HttpCode(HttpStatus.CREATED)
  async createJob(@Param('queueName') queueName: string, @Body() createJobDto: CreateJobDto) {
    createJobDto.queueName = queueName;
    const job = await this.queueService.createJob(createJobDto);
    return {
      id: job.id,
      queueName,
      type: createJobDto.type,
      status: await job.getState(),
      createdAt: new Date(job.timestamp),
    };
  }

  @Get(':queueName/jobs')
  async getJobs(@Param('queueName') queueName: string, @Query() filter: JobFilterDto) {
    const jobs = await this.queueService.getJobs(
      queueName,
      filter.types?.split(',') as any,
      filter.start,
      filter.end,
    );

    return jobs.map((job) => ({
      id: job.id,
      type: job.name,
      data: job.data,
      progress: job.progress(),
      attemptsMade: job.attemptsMade,
      createdAt: new Date(job.timestamp),
      processedAt: job.processedOn ? new Date(job.processedOn) : null,
      finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
    }));
  }

  @Get(':queueName/jobs/:jobId')
  async getJob(@Param('queueName') queueName: string, @Param('jobId') jobId: string) {
    const job = await this.queueService.getJob(queueName, jobId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      type: job.name,
      data: job.data,
      state: await job.getState(),
      progress: job.progress(),
      attemptsMade: job.attemptsMade,
      createdAt: new Date(job.timestamp),
      processedAt: job.processedOn ? new Date(job.processedOn) : null,
      finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
    };
  }

  @Put(':queueName/jobs/:jobId')
  async updateJob(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
    @Body() updateDto: UpdateJobDto,
  ) {
    const job = await this.queueService.updateJob(queueName, jobId, updateDto);
    return {
      id: job.id,
      updated: true,
    };
  }

  @Delete(':queueName/jobs/:jobId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeJob(@Param('queueName') queueName: string, @Param('jobId') jobId: string) {
    await this.queueService.removeJob(queueName, jobId);
  }

  @Post(':queueName/jobs/:jobId/retry')
  @HttpCode(HttpStatus.NO_CONTENT)
  async retryJob(@Param('queueName') queueName: string, @Param('jobId') jobId: string) {
    await this.queueService.retryJob(queueName, jobId);
  }

  @Post(':queueName/jobs/:jobId/promote')
  @HttpCode(HttpStatus.NO_CONTENT)
  async promoteJob(@Param('queueName') queueName: string, @Param('jobId') jobId: string) {
    await this.queueService.promoteJob(queueName, jobId);
  }

  @Post(':queueName/pause')
  @HttpCode(HttpStatus.NO_CONTENT)
  async pauseQueue(@Param('queueName') queueName: string) {
    await this.queueService.pauseQueue(queueName);
  }

  @Post(':queueName/resume')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resumeQueue(@Param('queueName') queueName: string) {
    await this.queueService.resumeQueue(queueName);
  }

  @Post(':queueName/clean')
  async cleanQueue(
    @Param('queueName') queueName: string,
    @Query('grace') grace: number = 0,
    @Query('status') status?: string,
  ) {
    const jobs = await this.queueService.cleanQueue(queueName, grace, status);
    return {
      cleaned: jobs.length,
      jobs: jobs.map((job) => job.id),
    };
  }

  @Get(':queueName/status')
  async getQueueStatus(@Param('queueName') queueName: string) {
    return this.queueService.getQueueStatus(queueName);
  }

  @Get('status')
  async getAllQueuesStatus() {
    return this.queueService.getAllQueuesStatus();
  }

  @GrpcMethod('QueueService', 'CreateJob')
  async grpcCreateJob(data: CreateJobDto) {
    const job = await this.queueService.createJob(data);
    return {
      id: job.id.toString(),
      queueName: data.queueName,
      type: data.type,
      status: await job.getState(),
      createdAt: job.timestamp,
    };
  }

  @GrpcMethod('QueueService', 'GetJob')
  async grpcGetJob(data: { queueName: string; jobId: string }) {
    const job = await this.queueService.getJob(data.queueName, data.jobId);
    if (!job) {
      return null;
    }

    return {
      id: job.id.toString(),
      type: job.name,
      data: JSON.stringify(job.data),
      state: await job.getState(),
      progress: job.progress(),
      attemptsMade: job.attemptsMade,
      createdAt: job.timestamp,
    };
  }

  @GrpcMethod('QueueService', 'GetQueueStatus')
  async grpcGetQueueStatus(data: { queueName: string }) {
    return this.queueService.getQueueStatus(data.queueName);
  }
}
