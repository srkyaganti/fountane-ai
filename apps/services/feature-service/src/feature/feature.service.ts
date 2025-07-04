import { Injectable, Logger } from '@nestjs/common';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { UnleashService } from '../unleash/unleash.service';
import { CacheService } from '../cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { FeatureRepository } from './feature.repository';
import {
  CreateFeatureRequest,
  UpdateFeatureRequest,
  DeleteFeatureRequest,
  GetFeatureRequest,
  ListFeaturesRequest,
  IsEnabledRequest,
  GetVariantRequest,
  EvaluateFeaturesRequest,
  AddTargetingRuleRequest,
  RemoveTargetingRuleRequest,
  UpdateTargetingRuleRequest,
  RecordImpressionRequest,
  GetFeatureMetricsRequest,
  CreateEnvironmentRequest,
  CopyEnvironmentRequest,
} from './interfaces';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';

@Injectable()
export class FeatureService {
  private readonly logger = new Logger(FeatureService.name);

  constructor(
    private readonly unleashService: UnleashService,
    private readonly cacheService: CacheService,
    private readonly auditService: AuditService,
    private readonly repository: FeatureRepository,
  ) {}

  createFeature(request: CreateFeatureRequest): Observable<any> {
    return from(this.repository.createFeature(request)).pipe(
      map((feature) => {
        this.auditService.logFeatureCreated(feature.id, request);
        return feature;
      }),
      catchError((error) => {
        this.logger.error('Failed to create feature', error);
        throw new RpcException({
          code: status.INTERNAL,
          message: 'Failed to create feature',
        });
      }),
    );
  }

  updateFeature(request: UpdateFeatureRequest): Observable<any> {
    return from(this.repository.updateFeature(request)).pipe(
      map((feature) => {
        this.auditService.logFeatureUpdated(feature.id, request);
        this.cacheService.invalidateFeature(feature.name);
        return feature;
      }),
      catchError((error) => {
        this.logger.error('Failed to update feature', error);
        throw new RpcException({
          code: status.INTERNAL,
          message: 'Failed to update feature',
        });
      }),
    );
  }

  deleteFeature(request: DeleteFeatureRequest): Observable<any> {
    return from(this.repository.deleteFeature(request.id)).pipe(
      map(() => {
        this.auditService.logFeatureDeleted(request.id);
        return {};
      }),
      catchError((error) => {
        this.logger.error('Failed to delete feature', error);
        throw new RpcException({
          code: status.INTERNAL,
          message: 'Failed to delete feature',
        });
      }),
    );
  }

  getFeature(request: GetFeatureRequest): Observable<any> {
    return from(this.repository.getFeature(request.id)).pipe(
      map((feature) => {
        if (!feature) {
          throw new RpcException({
            code: status.NOT_FOUND,
            message: 'Feature not found',
          });
        }
        return feature;
      }),
      catchError((error) => {
        if (error instanceof RpcException) throw error;
        this.logger.error('Failed to get feature', error);
        throw new RpcException({
          code: status.INTERNAL,
          message: 'Failed to get feature',
        });
      }),
    );
  }

  listFeatures(request: ListFeaturesRequest): Observable<any> {
    return from(this.repository.listFeatures(request)).pipe(
      catchError((error) => {
        this.logger.error('Failed to list features', error);
        throw new RpcException({
          code: status.INTERNAL,
          message: 'Failed to list features',
        });
      }),
    );
  }

  isEnabled(request: IsEnabledRequest): Observable<any> {
    const cacheKey = `feature:${request.featureName}:${JSON.stringify(request.context)}`;

    return from(this.cacheService.get(cacheKey)).pipe(
      map((cached) => {
        if (cached !== null) {
          return { enabled: cached, reason: 'Cached result' };
        }

        const context = this.convertEvaluationContext(request.context);
        const enabled = this.unleashService.isEnabled(request.featureName, context);

        this.cacheService.set(cacheKey, enabled, 300); // Cache for 5 minutes
        this.recordMetrics(request.featureName, enabled);

        return { enabled, reason: 'Evaluated' };
      }),
      catchError((error) => {
        this.logger.error('Failed to evaluate feature', error);
        return of({ enabled: false, reason: 'Error occurred' });
      }),
    );
  }

  getVariant(request: GetVariantRequest): Observable<any> {
    const context = this.convertEvaluationContext(request.context);
    const variant = this.unleashService.getVariant(request.featureName, context);

    return of({
      variantName: variant.name,
      payload: variant.payload || {},
      enabled: variant.enabled,
    });
  }

  evaluateFeatures(request: EvaluateFeaturesRequest): Observable<any> {
    const evaluations: Record<string, any> = {};
    const context = this.convertEvaluationContext(request.context);

    request.featureNames.forEach((featureName) => {
      const enabled = this.unleashService.isEnabled(featureName, context);
      const variant = this.unleashService.getVariant(featureName, context);

      evaluations[featureName] = {
        enabled,
        variant: variant.name,
        payload: variant.payload || {},
        reason: 'Evaluated',
      };
    });

    return of({ evaluations });
  }

  addTargetingRule(request: AddTargetingRuleRequest): Observable<any> {
    return from(this.repository.addTargetingRule(request)).pipe(
      map((rule) => {
        this.auditService.logTargetingRuleAdded(request.featureId, rule);
        return rule;
      }),
      catchError((error) => {
        this.logger.error('Failed to add targeting rule', error);
        throw new RpcException({
          code: status.INTERNAL,
          message: 'Failed to add targeting rule',
        });
      }),
    );
  }

  removeTargetingRule(request: RemoveTargetingRuleRequest): Observable<any> {
    return from(this.repository.removeTargetingRule(request)).pipe(
      map(() => {
        this.auditService.logTargetingRuleRemoved(request.featureId, request.ruleId);
        return {};
      }),
      catchError((error) => {
        this.logger.error('Failed to remove targeting rule', error);
        throw new RpcException({
          code: status.INTERNAL,
          message: 'Failed to remove targeting rule',
        });
      }),
    );
  }

  updateTargetingRule(request: UpdateTargetingRuleRequest): Observable<any> {
    return from(this.repository.updateTargetingRule(request)).pipe(
      map((rule) => {
        this.auditService.logTargetingRuleUpdated(request.featureId, rule);
        return rule;
      }),
      catchError((error) => {
        this.logger.error('Failed to update targeting rule', error);
        throw new RpcException({
          code: status.INTERNAL,
          message: 'Failed to update targeting rule',
        });
      }),
    );
  }

  recordImpression(request: RecordImpressionRequest): Observable<any> {
    const impression = {
      featureName: request.featureName,
      context: request.context,
      enabled: request.enabled,
      variant: request.variant,
      timestamp: new Date(),
    };

    return from(this.repository.recordImpression(impression)).pipe(
      map(() => ({})),
      catchError((error) => {
        this.logger.error('Failed to record impression', error);
        return of({});
      }),
    );
  }

  getFeatureMetrics(request: GetFeatureMetricsRequest): Observable<any> {
    return from(this.repository.getFeatureMetrics(request)).pipe(
      catchError((error) => {
        this.logger.error('Failed to get feature metrics', error);
        throw new RpcException({
          code: status.INTERNAL,
          message: 'Failed to get feature metrics',
        });
      }),
    );
  }

  createEnvironment(request: CreateEnvironmentRequest): Observable<any> {
    return from(this.repository.createEnvironment(request)).pipe(
      map((environment) => {
        this.auditService.logEnvironmentCreated(environment.id, request);
        return environment;
      }),
      catchError((error) => {
        this.logger.error('Failed to create environment', error);
        throw new RpcException({
          code: status.INTERNAL,
          message: 'Failed to create environment',
        });
      }),
    );
  }

  copyEnvironment(request: CopyEnvironmentRequest): Observable<any> {
    return from(this.repository.copyEnvironment(request)).pipe(
      map((environment) => {
        this.auditService.logEnvironmentCopied(request.sourceEnvironmentId, environment.id);
        return environment;
      }),
      catchError((error) => {
        this.logger.error('Failed to copy environment', error);
        throw new RpcException({
          code: status.INTERNAL,
          message: 'Failed to copy environment',
        });
      }),
    );
  }

  private convertEvaluationContext(context?: any): any {
    if (!context) return undefined;

    return {
      userId: context.userId,
      sessionId: context.sessionId,
      remoteAddress: context.remoteAddress,
      environment: context.environment,
      appName: 'fountane',
      properties: {
        ...context.properties,
        tenantId: context.tenantId,
      },
    };
  }

  private recordMetrics(featureName: string, enabled: boolean): void {
    try {
      // Record metrics asynchronously
      this.repository.recordMetric({
        featureName,
        enabled,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Failed to record metrics', error);
    }
  }
}
