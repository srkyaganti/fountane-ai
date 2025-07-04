import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateFeatureRequest,
  UpdateFeatureRequest,
  ListFeaturesRequest,
  AddTargetingRuleRequest,
  RemoveTargetingRuleRequest,
  UpdateTargetingRuleRequest,
  GetFeatureMetricsRequest,
  CreateEnvironmentRequest,
  CopyEnvironmentRequest,
} from './interfaces';

@Injectable()
export class FeatureRepository {
  // In a real implementation, this would connect to PostgreSQL
  // For now, using in-memory storage as a placeholder
  private features = new Map<string, any>();
  private environments = new Map<string, any>();
  private impressions: any[] = [];
  private metrics: any[] = [];

  constructor(private configService: ConfigService) {}

  async createFeature(request: CreateFeatureRequest): Promise<any> {
    const feature = {
      id: this.generateId(),
      ...request,
      enabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      environments: {},
    };

    this.features.set(feature.id, feature);
    return feature;
  }

  async updateFeature(request: UpdateFeatureRequest): Promise<any> {
    const feature = this.features.get(request.id);
    if (!feature) {
      throw new Error('Feature not found');
    }

    const updated = {
      ...feature,
      ...request,
      updatedAt: new Date(),
    };

    this.features.set(request.id, updated);
    return updated;
  }

  async deleteFeature(id: string): Promise<void> {
    if (!this.features.has(id)) {
      throw new Error('Feature not found');
    }
    this.features.delete(id);
  }

  async getFeature(id: string): Promise<any> {
    return this.features.get(id);
  }

  async listFeatures(request: ListFeaturesRequest): Promise<any> {
    const allFeatures = Array.from(this.features.values());
    let filtered = allFeatures;

    if (request.projectId) {
      filtered = filtered.filter((f) => f.projectId === request.projectId);
    }

    if (request.tags && request.tags.length > 0) {
      filtered = filtered.filter((f) => request.tags.some((tag) => f.tags.includes(tag)));
    }

    const pageSize = request.pageSize || 50;
    const startIndex = request.pageToken ? parseInt(request.pageToken) : 0;
    const endIndex = startIndex + pageSize;
    const paginatedFeatures = filtered.slice(startIndex, endIndex);

    return {
      features: paginatedFeatures,
      nextPageToken: endIndex < filtered.length ? endIndex.toString() : null,
      totalCount: filtered.length,
    };
  }

  async addTargetingRule(request: AddTargetingRuleRequest): Promise<any> {
    const feature = this.features.get(request.featureId);
    if (!feature) {
      throw new Error('Feature not found');
    }

    const rule = {
      ...request.rule,
      id: this.generateId(),
    };

    if (!feature.environments[request.environment]) {
      feature.environments[request.environment] = {
        environment: request.environment,
        enabled: false,
        rules: [],
        parameters: {},
      };
    }

    feature.environments[request.environment].rules.push(rule);
    feature.updatedAt = new Date();

    this.features.set(request.featureId, feature);
    return rule;
  }

  async removeTargetingRule(request: RemoveTargetingRuleRequest): Promise<void> {
    const feature = this.features.get(request.featureId);
    if (!feature) {
      throw new Error('Feature not found');
    }

    if (feature.environments[request.environment]) {
      feature.environments[request.environment].rules = feature.environments[
        request.environment
      ].rules.filter((r: any) => r.id !== request.ruleId);
      feature.updatedAt = new Date();
      this.features.set(request.featureId, feature);
    }
  }

  async updateTargetingRule(request: UpdateTargetingRuleRequest): Promise<any> {
    const feature = this.features.get(request.featureId);
    if (!feature) {
      throw new Error('Feature not found');
    }

    if (feature.environments[request.environment]) {
      const ruleIndex = feature.environments[request.environment].rules.findIndex(
        (r: any) => r.id === request.rule.id,
      );

      if (ruleIndex !== -1) {
        feature.environments[request.environment].rules[ruleIndex] = request.rule;
        feature.updatedAt = new Date();
        this.features.set(request.featureId, feature);
        return request.rule;
      }
    }

    throw new Error('Targeting rule not found');
  }

  async recordImpression(impression: any): Promise<void> {
    this.impressions.push(impression);
  }

  async recordMetric(metric: any): Promise<void> {
    this.metrics.push(metric);
  }

  async getFeatureMetrics(request: GetFeatureMetricsRequest): Promise<any> {
    const relevantImpressions = this.impressions.filter(
      (imp) =>
        imp.featureName === request.featureId &&
        (!request.from || imp.timestamp >= request.from) &&
        (!request.to || imp.timestamp <= request.to),
    );

    const variantCounts: Record<string, number> = {};
    let enabledCount = 0;
    let disabledCount = 0;

    relevantImpressions.forEach((imp) => {
      if (imp.enabled) {
        enabledCount++;
        if (imp.variant) {
          variantCounts[imp.variant] = (variantCounts[imp.variant] || 0) + 1;
        }
      } else {
        disabledCount++;
      }
    });

    return {
      featureId: request.featureId,
      totalImpressions: relevantImpressions.length,
      enabledCount,
      disabledCount,
      variantCounts,
      from: request.from,
      to: request.to,
    };
  }

  async createEnvironment(request: CreateEnvironmentRequest): Promise<any> {
    const environment = {
      id: this.generateId(),
      ...request,
      createdAt: new Date(),
    };

    this.environments.set(environment.id, environment);
    return environment;
  }

  async copyEnvironment(request: CopyEnvironmentRequest): Promise<any> {
    const sourceEnv = this.environments.get(request.sourceEnvironmentId);
    if (!sourceEnv) {
      throw new Error('Source environment not found');
    }

    const newEnvironment = {
      id: this.generateId(),
      name: request.targetName,
      description: request.targetDescription,
      sortOrder: sourceEnv.sortOrder,
      createdAt: new Date(),
    };

    // Copy all feature configurations from source to target
    this.features.forEach((feature) => {
      if (feature.environments[sourceEnv.name]) {
        feature.environments[request.targetName] = {
          ...feature.environments[sourceEnv.name],
          environment: request.targetName,
        };
      }
    });

    this.environments.set(newEnvironment.id, newEnvironment);
    return newEnvironment;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
