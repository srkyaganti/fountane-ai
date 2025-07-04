import { Controller } from '@nestjs/common';
import { GrpcMethod, GrpcStreamMethod } from '@nestjs/microservices';
import { Observable, Subject } from 'rxjs';
import { QueueService } from '../queue/queue.service';
import { JobRepository } from '../queue/repositories/job.repository';
import { Metadata, ServerUnaryCall, ServerWritableStream } from '@grpc/grpc-js';
import {
  CreateJobRequest,
  GetJobRequest,
  CancelJobRequest,
  RetryJobRequest,
  ListJobsRequest,
  ListJobsResponse,
  Job,
  JobEvent,
  StreamJobEventsRequest,
  GetJobMetricsRequest,
  JobMetrics,
  CreateQueueRequest,
  Queue,
  PauseQueueRequest,
  ResumeQueueRequest,
  DrainQueueRequest,
  GetQueueStatsRequest,
  QueueStats,
  ScheduleJobRequest,
  ScheduledJob,
  CancelScheduledJobRequest,
  ListScheduledJobsRequest,
  ListScheduledJobsResponse,
} from '../generated/queue';

@Controller()
export class QueueGrpcController {
  private jobEventSubjects: Map<string, Subject<JobEvent>> = new Map();

  constructor(
    private readonly queueService: QueueService,
    private readonly jobRepository: JobRepository,
  ) {}

  @GrpcMethod('QueueService', 'CreateJob')
  async createJob(data: CreateJobRequest, metadata: Metadata): Promise<Job> {
    const job = await this.queueService.createJob({
      queueName: data.queue_name,
      type: data.type,
      data: JSON.parse(data.data.toString()),
      priority: data.priority,
      delay: data.delay_ms,
      attempts: data.max_attempts,
      metadata: data.metadata,
      tenantId: data.tenant_id,
      dependsOn: data.depends_on,
    });

    const jobState = await job.getState();

    this.emitJobEvent({
      job_id: job.id.toString(),
      queue_name: data.queue_name,
      event_type: 'JOB_EVENT_TYPE_CREATED',
      timestamp: { seconds: Date.now() / 1000, nanos: 0 },
      data: {},
    });

    return {
      id: job.id.toString(),
      queue_name: data.queue_name,
      type: data.type,
      data: data.data,
      status: this.mapJobStatus(jobState),
      priority: data.priority || 0,
      attempts: job.attemptsMade,
      max_attempts: data.max_attempts || 3,
      created_at: { seconds: job.timestamp / 1000, nanos: 0 },
      started_at: job.processedOn ? { seconds: job.processedOn / 1000, nanos: 0 } : null,
      completed_at: job.finishedOn ? { seconds: job.finishedOn / 1000, nanos: 0 } : null,
      failed_at: job.failedReason ? { seconds: job.finishedOn / 1000, nanos: 0 } : null,
      error_message: job.failedReason || '',
      metadata: data.metadata,
      tenant_id: data.tenant_id,
      depends_on: data.depends_on,
      progress: job.progress() || 0,
      result_url: '',
    };
  }

  @GrpcMethod('QueueService', 'GetJob')
  async getJob(data: GetJobRequest, metadata: Metadata): Promise<Job | null> {
    const job = await this.queueService.getJob(data.queue_name, data.job_id);
    if (!job) {
      return null;
    }

    const jobState = await job.getState();
    const dbJob = await this.jobRepository.findById(data.job_id);

    return {
      id: job.id.toString(),
      queue_name: data.queue_name,
      type: job.name,
      data: Buffer.from(JSON.stringify(job.data)),
      status: this.mapJobStatus(jobState),
      priority: job.opts.priority || 0,
      attempts: job.attemptsMade,
      max_attempts: job.opts.attempts || 3,
      created_at: { seconds: job.timestamp / 1000, nanos: 0 },
      started_at: job.processedOn ? { seconds: job.processedOn / 1000, nanos: 0 } : null,
      completed_at: job.finishedOn ? { seconds: job.finishedOn / 1000, nanos: 0 } : null,
      failed_at: job.failedReason ? { seconds: job.finishedOn / 1000, nanos: 0 } : null,
      error_message: job.failedReason || '',
      metadata: dbJob?.metadata || {},
      tenant_id: dbJob?.tenantId || '',
      depends_on: [],
      progress: job.progress() || 0,
      result_url: dbJob?.resultUrl || '',
    };
  }

  @GrpcMethod('QueueService', 'CancelJob')
  async cancelJob(data: CancelJobRequest, metadata: Metadata): Promise<{}> {
    await this.queueService.removeJob(data.queue_name, data.job_id);

    this.emitJobEvent({
      job_id: data.job_id,
      queue_name: data.queue_name,
      event_type: 'JOB_EVENT_TYPE_CANCELLED',
      timestamp: { seconds: Date.now() / 1000, nanos: 0 },
      data: {},
    });

    return {};
  }

  @GrpcMethod('QueueService', 'RetryJob')
  async retryJob(data: RetryJobRequest, metadata: Metadata): Promise<Job> {
    await this.queueService.retryJob(data.queue_name, data.job_id);

    this.emitJobEvent({
      job_id: data.job_id,
      queue_name: data.queue_name,
      event_type: 'JOB_EVENT_TYPE_RETRIED',
      timestamp: { seconds: Date.now() / 1000, nanos: 0 },
      data: {},
    });

    return this.getJob({ queue_name: data.queue_name, job_id: data.job_id }, metadata);
  }

  @GrpcMethod('QueueService', 'ListJobs')
  async listJobs(data: ListJobsRequest, metadata: Metadata): Promise<ListJobsResponse> {
    const statuses = data.statuses.map((s) => this.mapGrpcStatusToBull(s));
    const jobs = await this.queueService.getJobs(
      data.queue_name,
      statuses as any,
      data.offset,
      data.offset + data.limit,
    );

    const mappedJobs = await Promise.all(
      jobs.map(async (job) => {
        const jobState = await job.getState();
        const dbJob = await this.jobRepository.findById(job.id.toString());

        return {
          id: job.id.toString(),
          queue_name: data.queue_name,
          type: job.name,
          data: Buffer.from(JSON.stringify(job.data)),
          status: this.mapJobStatus(jobState),
          priority: job.opts.priority || 0,
          attempts: job.attemptsMade,
          max_attempts: job.opts.attempts || 3,
          created_at: { seconds: job.timestamp / 1000, nanos: 0 },
          started_at: job.processedOn ? { seconds: job.processedOn / 1000, nanos: 0 } : null,
          completed_at: job.finishedOn ? { seconds: job.finishedOn / 1000, nanos: 0 } : null,
          failed_at: job.failedReason ? { seconds: job.finishedOn / 1000, nanos: 0 } : null,
          error_message: job.failedReason || '',
          metadata: dbJob?.metadata || {},
          tenant_id: dbJob?.tenantId || '',
          depends_on: [],
          progress: job.progress() || 0,
          result_url: dbJob?.resultUrl || '',
        };
      }),
    );

    return {
      jobs: mappedJobs,
      total_count: mappedJobs.length,
    };
  }

  @GrpcMethod('QueueService', 'CreateQueue')
  async createQueue(data: CreateQueueRequest, metadata: Metadata): Promise<Queue> {
    await this.queueService.createQueue(data.name, data.config);

    return {
      name: data.name,
      is_paused: false,
      created_at: { seconds: Date.now() / 1000, nanos: 0 },
      config: data.config,
    };
  }

  @GrpcMethod('QueueService', 'PauseQueue')
  async pauseQueue(data: PauseQueueRequest, metadata: Metadata): Promise<{}> {
    await this.queueService.pauseQueue(data.queue_name);
    return {};
  }

  @GrpcMethod('QueueService', 'ResumeQueue')
  async resumeQueue(data: ResumeQueueRequest, metadata: Metadata): Promise<{}> {
    await this.queueService.resumeQueue(data.queue_name);
    return {};
  }

  @GrpcMethod('QueueService', 'DrainQueue')
  async drainQueue(data: DrainQueueRequest, metadata: Metadata): Promise<{}> {
    await this.queueService.drainQueue(data.queue_name, data.wait_for_active);
    return {};
  }

  @GrpcMethod('QueueService', 'GetQueueStats')
  async getQueueStats(data: GetQueueStatsRequest, metadata: Metadata): Promise<QueueStats> {
    const stats = await this.queueService.getQueueStatus(data.queue_name);
    const metrics = await this.queueService.getQueueMetrics(data.queue_name);

    return {
      queue_name: data.queue_name,
      waiting_count: stats.waiting,
      active_count: stats.active,
      completed_count: stats.completed,
      failed_count: stats.failed,
      delayed_count: stats.delayed,
      jobs_per_minute: metrics.jobsPerMinute,
      average_processing_time_ms: metrics.averageProcessingTime,
    };
  }

  @GrpcMethod('QueueService', 'ScheduleJob')
  async scheduleJob(data: ScheduleJobRequest, metadata: Metadata): Promise<ScheduledJob> {
    const scheduledJob = await this.queueService.scheduleJob({
      queueName: data.queue_name,
      type: data.type,
      data: JSON.parse(data.data.toString()),
      cronExpression: data.cron_expression,
      timezone: data.timezone,
      metadata: data.metadata,
      tenantId: data.tenant_id,
    });

    return {
      id: scheduledJob.id,
      queue_name: data.queue_name,
      type: data.type,
      data: data.data,
      cron_expression: data.cron_expression,
      timezone: data.timezone || 'UTC',
      next_run_at: { seconds: scheduledJob.nextRunAt.getTime() / 1000, nanos: 0 },
      last_run_at: scheduledJob.lastRunAt
        ? { seconds: scheduledJob.lastRunAt.getTime() / 1000, nanos: 0 }
        : null,
      is_active: scheduledJob.isActive,
      metadata: data.metadata,
      tenant_id: data.tenant_id,
    };
  }

  @GrpcMethod('QueueService', 'CancelScheduledJob')
  async cancelScheduledJob(data: CancelScheduledJobRequest, metadata: Metadata): Promise<{}> {
    await this.queueService.cancelScheduledJob(data.scheduled_job_id);
    return {};
  }

  @GrpcMethod('QueueService', 'ListScheduledJobs')
  async listScheduledJobs(
    data: ListScheduledJobsRequest,
    metadata: Metadata,
  ): Promise<ListScheduledJobsResponse> {
    const { jobs, total } = await this.queueService.listScheduledJobs({
      queueName: data.queue_name,
      limit: data.limit,
      offset: data.offset,
      tenantId: data.tenant_id,
    });

    const mappedJobs = jobs.map((job) => ({
      id: job.id,
      queue_name: job.queueName,
      type: job.type,
      data: Buffer.from(JSON.stringify(job.data)),
      cron_expression: job.cronExpression,
      timezone: job.timezone,
      next_run_at: { seconds: job.nextRunAt.getTime() / 1000, nanos: 0 },
      last_run_at: job.lastRunAt ? { seconds: job.lastRunAt.getTime() / 1000, nanos: 0 } : null,
      is_active: job.isActive,
      metadata: job.metadata,
      tenant_id: job.tenantId,
    }));

    return {
      scheduled_jobs: mappedJobs,
      total_count: total,
    };
  }

  @GrpcStreamMethod('QueueService', 'StreamJobEvents')
  streamJobEvents(data: StreamJobEventsRequest, metadata: Metadata): Observable<JobEvent> {
    const key = `${data.queue_name}-${data.tenant_id || 'all'}`;

    if (!this.jobEventSubjects.has(key)) {
      this.jobEventSubjects.set(key, new Subject<JobEvent>());
    }

    return this.jobEventSubjects.get(key).asObservable();
  }

  @GrpcMethod('QueueService', 'GetJobMetrics')
  async getJobMetrics(data: GetJobMetricsRequest, metadata: Metadata): Promise<JobMetrics> {
    const metrics = await this.queueService.getJobMetrics({
      queueName: data.queue_name,
      startTime: new Date(data.start_time.seconds * 1000),
      endTime: new Date(data.end_time.seconds * 1000),
      tenantId: data.tenant_id,
    });

    return {
      total_jobs: metrics.totalJobs,
      completed_jobs: metrics.completedJobs,
      failed_jobs: metrics.failedJobs,
      success_rate: metrics.successRate,
      average_processing_time_ms: metrics.averageProcessingTime,
      jobs_by_type: metrics.jobsByType,
      hourly_metrics: metrics.hourlyMetrics.map((m) => ({
        hour: { seconds: m.hour.getTime() / 1000, nanos: 0 },
        job_count: m.jobCount,
        average_processing_time_ms: m.averageProcessingTime,
      })),
    };
  }

  private mapJobStatus(status: string): string {
    const statusMap: Record<string, string> = {
      waiting: 'JOB_STATUS_WAITING',
      active: 'JOB_STATUS_ACTIVE',
      completed: 'JOB_STATUS_COMPLETED',
      failed: 'JOB_STATUS_FAILED',
      delayed: 'JOB_STATUS_DELAYED',
      cancelled: 'JOB_STATUS_CANCELLED',
    };
    return statusMap[status] || 'JOB_STATUS_UNSPECIFIED';
  }

  private mapGrpcStatusToBull(status: string): string {
    const statusMap: Record<string, string> = {
      JOB_STATUS_WAITING: 'waiting',
      JOB_STATUS_ACTIVE: 'active',
      JOB_STATUS_COMPLETED: 'completed',
      JOB_STATUS_FAILED: 'failed',
      JOB_STATUS_DELAYED: 'delayed',
      JOB_STATUS_CANCELLED: 'cancelled',
    };
    return statusMap[status] || 'waiting';
  }

  private emitJobEvent(event: JobEvent): void {
    this.jobEventSubjects.forEach((subject) => {
      subject.next(event);
    });
  }
}
