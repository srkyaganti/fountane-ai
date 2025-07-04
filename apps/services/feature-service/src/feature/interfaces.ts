export interface CreateFeatureRequest {
  name: string;
  description: string;
  type: string;
  tags: string[];
  projectId: string;
  variants?: any[];
}

export interface UpdateFeatureRequest {
  id: string;
  description?: string;
  tags?: string[];
  variants?: any[];
}

export interface DeleteFeatureRequest {
  id: string;
}

export interface GetFeatureRequest {
  id: string;
}

export interface ListFeaturesRequest {
  projectId?: string;
  tags?: string[];
  pageSize?: number;
  pageToken?: string;
}

export interface IsEnabledRequest {
  featureName: string;
  context?: EvaluationContext;
}

export interface GetVariantRequest {
  featureName: string;
  context?: EvaluationContext;
}

export interface EvaluateFeaturesRequest {
  featureNames: string[];
  context?: EvaluationContext;
}

export interface AddTargetingRuleRequest {
  featureId: string;
  environment: string;
  rule: any;
}

export interface RemoveTargetingRuleRequest {
  featureId: string;
  environment: string;
  ruleId: string;
}

export interface UpdateTargetingRuleRequest {
  featureId: string;
  environment: string;
  rule: any;
}

export interface RecordImpressionRequest {
  featureName: string;
  context?: EvaluationContext;
  enabled: boolean;
  variant?: string;
}

export interface GetFeatureMetricsRequest {
  featureId: string;
  from?: Date;
  to?: Date;
}

export interface CreateEnvironmentRequest {
  name: string;
  description: string;
  sortOrder?: number;
}

export interface CopyEnvironmentRequest {
  sourceEnvironmentId: string;
  targetName: string;
  targetDescription: string;
}

export interface EvaluationContext {
  userId?: string;
  sessionId?: string;
  tenantId?: string;
  properties?: Record<string, string>;
  environment?: string;
}
