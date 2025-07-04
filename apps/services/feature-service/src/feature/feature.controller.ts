import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { FeatureService } from './feature.service';
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

@Controller()
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @GrpcMethod('FeatureService', 'CreateFeature')
  createFeature(request: CreateFeatureRequest): Observable<any> {
    return this.featureService.createFeature(request);
  }

  @GrpcMethod('FeatureService', 'UpdateFeature')
  updateFeature(request: UpdateFeatureRequest): Observable<any> {
    return this.featureService.updateFeature(request);
  }

  @GrpcMethod('FeatureService', 'DeleteFeature')
  deleteFeature(request: DeleteFeatureRequest): Observable<any> {
    return this.featureService.deleteFeature(request);
  }

  @GrpcMethod('FeatureService', 'GetFeature')
  getFeature(request: GetFeatureRequest): Observable<any> {
    return this.featureService.getFeature(request);
  }

  @GrpcMethod('FeatureService', 'ListFeatures')
  listFeatures(request: ListFeaturesRequest): Observable<any> {
    return this.featureService.listFeatures(request);
  }

  @GrpcMethod('FeatureService', 'IsEnabled')
  isEnabled(request: IsEnabledRequest): Observable<any> {
    return this.featureService.isEnabled(request);
  }

  @GrpcMethod('FeatureService', 'GetVariant')
  getVariant(request: GetVariantRequest): Observable<any> {
    return this.featureService.getVariant(request);
  }

  @GrpcMethod('FeatureService', 'EvaluateFeatures')
  evaluateFeatures(request: EvaluateFeaturesRequest): Observable<any> {
    return this.featureService.evaluateFeatures(request);
  }

  @GrpcMethod('FeatureService', 'AddTargetingRule')
  addTargetingRule(request: AddTargetingRuleRequest): Observable<any> {
    return this.featureService.addTargetingRule(request);
  }

  @GrpcMethod('FeatureService', 'RemoveTargetingRule')
  removeTargetingRule(request: RemoveTargetingRuleRequest): Observable<any> {
    return this.featureService.removeTargetingRule(request);
  }

  @GrpcMethod('FeatureService', 'UpdateTargetingRule')
  updateTargetingRule(request: UpdateTargetingRuleRequest): Observable<any> {
    return this.featureService.updateTargetingRule(request);
  }

  @GrpcMethod('FeatureService', 'RecordImpression')
  recordImpression(request: RecordImpressionRequest): Observable<any> {
    return this.featureService.recordImpression(request);
  }

  @GrpcMethod('FeatureService', 'GetFeatureMetrics')
  getFeatureMetrics(request: GetFeatureMetricsRequest): Observable<any> {
    return this.featureService.getFeatureMetrics(request);
  }

  @GrpcMethod('FeatureService', 'CreateEnvironment')
  createEnvironment(request: CreateEnvironmentRequest): Observable<any> {
    return this.featureService.createEnvironment(request);
  }

  @GrpcMethod('FeatureService', 'CopyEnvironment')
  copyEnvironment(request: CopyEnvironmentRequest): Observable<any> {
    return this.featureService.copyEnvironment(request);
  }
}
