import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface FeatureMetric {
  featureName: string;
  timestamp: Date;
  enabled: boolean;
  variant?: string;
  evaluationTime?: number;
  context?: any;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private metrics: FeatureMetric[] = []; // In production, this would use Prometheus or similar

  constructor(private configService: ConfigService) {}

  recordFeatureEvaluation(
    featureName: string,
    enabled: boolean,
    variant?: string,
    evaluationTime?: number,
  ): void {
    const metric: FeatureMetric = {
      featureName,
      timestamp: new Date(),
      enabled,
      variant,
      evaluationTime,
    };

    this.metrics.push(metric);

    // In production, this would increment Prometheus counters/histograms
    this.logger.debug(`Recorded metric for feature: ${featureName}`, metric);
  }

  recordImpressionMetric(impression: {
    featureName: string;
    enabled: boolean;
    variant?: string;
    context?: any;
  }): void {
    const metric: FeatureMetric = {
      ...impression,
      timestamp: new Date(),
    };

    this.metrics.push(metric);
  }

  getMetricsSummary(
    featureName: string,
    from?: Date,
    to?: Date,
  ): {
    totalEvaluations: number;
    enabledCount: number;
    disabledCount: number;
    variantDistribution: Record<string, number>;
    averageEvaluationTime?: number;
  } {
    let relevantMetrics = this.metrics.filter((m) => m.featureName === featureName);

    if (from) {
      relevantMetrics = relevantMetrics.filter((m) => m.timestamp >= from);
    }
    if (to) {
      relevantMetrics = relevantMetrics.filter((m) => m.timestamp <= to);
    }

    const enabledCount = relevantMetrics.filter((m) => m.enabled).length;
    const disabledCount = relevantMetrics.filter((m) => !m.enabled).length;

    const variantDistribution: Record<string, number> = {};
    relevantMetrics.forEach((m) => {
      if (m.variant) {
        variantDistribution[m.variant] = (variantDistribution[m.variant] || 0) + 1;
      }
    });

    const evaluationTimes = relevantMetrics
      .filter((m) => m.evaluationTime !== undefined)
      .map((m) => m.evaluationTime!);

    const averageEvaluationTime =
      evaluationTimes.length > 0
        ? evaluationTimes.reduce((a, b) => a + b, 0) / evaluationTimes.length
        : undefined;

    return {
      totalEvaluations: relevantMetrics.length,
      enabledCount,
      disabledCount,
      variantDistribution,
      averageEvaluationTime,
    };
  }

  getAllMetrics(): FeatureMetric[] {
    return [...this.metrics];
  }

  clearMetrics(): void {
    this.metrics = [];
    this.logger.warn('Metrics cleared');
  }

  // In production, these would be Prometheus metrics
  private incrementCounter(name: string, labels: Record<string, string>): void {
    // prometheus.counter(name).inc(labels);
  }

  private recordHistogram(name: string, value: number, labels: Record<string, string>): void {
    // prometheus.histogram(name).observe(labels, value);
  }
}
