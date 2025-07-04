export interface FeatureToggleStatus {
  name: string;
  enabled: boolean;
  description?: string;
  strategies?: any[];
  variants?: any[];
  impressionData?: boolean;
}

export interface EvaluationContext {
  userId?: string;
  sessionId?: string;
  tenantId?: string;
  properties?: Record<string, string>;
  environment?: string;
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  type: FeatureFlagType;
  enabled: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  projectId: string;
  environments: Map<string, FeatureEnvironment>;
  variants?: Variant[];
}

export enum FeatureFlagType {
  BOOLEAN = 'BOOLEAN',
  PERCENTAGE = 'PERCENTAGE',
  VARIANT = 'VARIANT',
  GRADUAL_ROLLOUT = 'GRADUAL_ROLLOUT',
}

export interface FeatureEnvironment {
  environment: string;
  enabled: boolean;
  rules: TargetingRule[];
  parameters: Record<string, string>;
}

export interface Variant {
  name: string;
  weight: number;
  payload?: Record<string, string>;
  overrides?: Override[];
}

export interface Override {
  contextField: string;
  values: string[];
}

export interface TargetingRule {
  id: string;
  type: TargetingRuleType;
  parameters: Record<string, string>;
  constraints: Constraint[];
  segments: string[];
}

export enum TargetingRuleType {
  USER_ID = 'USER_ID',
  GROUP_ID = 'GROUP_ID',
  PERCENTAGE = 'PERCENTAGE',
  TIME_BASED = 'TIME_BASED',
  CUSTOM_ATTRIBUTE = 'CUSTOM_ATTRIBUTE',
}

export interface Constraint {
  field: string;
  operator: ConstraintOperator;
  values: string[];
}

export enum ConstraintOperator {
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  CONTAINS = 'CONTAINS',
  NOT_CONTAINS = 'NOT_CONTAINS',
}
