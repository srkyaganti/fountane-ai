import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AuditEvent {
  id: string;
  timestamp: Date;
  action: string;
  entityType: string;
  entityId: string;
  userId?: string;
  details: any;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private auditEvents: AuditEvent[] = []; // In production, this would go to a database

  constructor(private configService: ConfigService) {}

  async logFeatureCreated(featureId: string, details: any): Promise<void> {
    await this.logEvent({
      action: 'FEATURE_CREATED',
      entityType: 'feature',
      entityId: featureId,
      details,
    });
  }

  async logFeatureUpdated(featureId: string, details: any): Promise<void> {
    await this.logEvent({
      action: 'FEATURE_UPDATED',
      entityType: 'feature',
      entityId: featureId,
      details,
    });
  }

  async logFeatureDeleted(featureId: string): Promise<void> {
    await this.logEvent({
      action: 'FEATURE_DELETED',
      entityType: 'feature',
      entityId: featureId,
      details: {},
    });
  }

  async logFeatureEvaluated(featureName: string, context: any, result: boolean): Promise<void> {
    // High-volume event - might want to sample or aggregate these
    if (this.shouldLogEvaluation()) {
      await this.logEvent({
        action: 'FEATURE_EVALUATED',
        entityType: 'feature',
        entityId: featureName,
        details: { context, result },
      });
    }
  }

  async logTargetingRuleAdded(featureId: string, rule: any): Promise<void> {
    await this.logEvent({
      action: 'TARGETING_RULE_ADDED',
      entityType: 'feature',
      entityId: featureId,
      details: { rule },
    });
  }

  async logTargetingRuleUpdated(featureId: string, rule: any): Promise<void> {
    await this.logEvent({
      action: 'TARGETING_RULE_UPDATED',
      entityType: 'feature',
      entityId: featureId,
      details: { rule },
    });
  }

  async logTargetingRuleRemoved(featureId: string, ruleId: string): Promise<void> {
    await this.logEvent({
      action: 'TARGETING_RULE_REMOVED',
      entityType: 'feature',
      entityId: featureId,
      details: { ruleId },
    });
  }

  async logEnvironmentCreated(environmentId: string, details: any): Promise<void> {
    await this.logEvent({
      action: 'ENVIRONMENT_CREATED',
      entityType: 'environment',
      entityId: environmentId,
      details,
    });
  }

  async logEnvironmentCopied(sourceId: string, targetId: string): Promise<void> {
    await this.logEvent({
      action: 'ENVIRONMENT_COPIED',
      entityType: 'environment',
      entityId: targetId,
      details: { sourceId },
    });
  }

  async getAuditLog(filters?: {
    entityType?: string;
    entityId?: string;
    action?: string;
    userId?: string;
    from?: Date;
    to?: Date;
    limit?: number;
  }): Promise<AuditEvent[]> {
    let events = [...this.auditEvents];

    if (filters) {
      if (filters.entityType) {
        events = events.filter((e) => e.entityType === filters.entityType);
      }
      if (filters.entityId) {
        events = events.filter((e) => e.entityId === filters.entityId);
      }
      if (filters.action) {
        events = events.filter((e) => e.action === filters.action);
      }
      if (filters.userId) {
        events = events.filter((e) => e.userId === filters.userId);
      }
      if (filters.from) {
        events = events.filter((e) => e.timestamp >= filters.from);
      }
      if (filters.to) {
        events = events.filter((e) => e.timestamp <= filters.to);
      }
    }

    // Sort by timestamp descending
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filters?.limit) {
      events = events.slice(0, filters.limit);
    }

    return events;
  }

  private async logEvent(params: {
    action: string;
    entityType: string;
    entityId: string;
    details: any;
    userId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const event: AuditEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      userId: params.userId || 'system',
      details: params.details,
      metadata: params.metadata || {},
    };

    this.auditEvents.push(event);

    // Log to application logs as well
    this.logger.log(`Audit Event: ${event.action} on ${event.entityType}:${event.entityId}`, {
      event,
    });

    // In production, this would:
    // 1. Save to a database
    // 2. Send to an audit log aggregation service
    // 3. Potentially trigger webhooks for certain events
  }

  private shouldLogEvaluation(): boolean {
    // Implement sampling logic here
    // For now, log only 1% of evaluations to avoid overwhelming logs
    return Math.random() < 0.01;
  }

  private generateId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
