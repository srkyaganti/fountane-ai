export interface CreateJobDto {
  queueName: string;
  type: string;
  data: any;
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
  tenantId: string;
  metadata?: Record<string, string>;
  schedulePattern?: string;
  timezone?: string;
  dependsOn?: string[];
}

export interface UpdateJobDto {
  data?: any;
  metadata?: Record<string, string>;
}

export interface JobFilterDto {
  types?: string;
  start?: number;
  end?: number;
  tenantId?: string;
}

export interface JobStatusDto {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  total: number;
}

export interface ScheduleJobDto {
  queueName: string;
  type: string;
  data: any;
  cronExpression: string;
  timezone?: string;
  metadata?: Record<string, string>;
  tenantId: string;
}

export interface ListScheduledJobsDto {
  queueName?: string;
  limit: number;
  offset: number;
  tenantId?: string;
}

export interface JobMetricsDto {
  queueName: string;
  startTime: Date;
  endTime: Date;
  tenantId?: string;
}

export interface JobMetricsResult {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  successRate: number;
  averageProcessingTime: number;
  jobsByType: Record<string, number>;
  hourlyMetrics: Array<{
    hour: Date;
    jobCount: number;
    averageProcessingTime: number;
  }>;
}

export interface ScheduledJobResult {
  id: string;
  queueName: string;
  type: string;
  data: any;
  cronExpression: string;
  timezone: string;
  nextRunAt: Date;
  lastRunAt?: Date;
  isActive: boolean;
  metadata: Record<string, string>;
  tenantId: string;
}

export interface QueueMetrics {
  jobsPerMinute: number;
  averageProcessingTime: number;
}
