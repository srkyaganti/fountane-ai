import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Unleash, UnleashConfig, Context, Variant } from 'unleash-client';
import { FeatureToggleStatus } from './types';

@Injectable()
export class UnleashService implements OnModuleInit {
  private readonly logger = new Logger(UnleashService.name);
  private unleash: Unleash;
  private isReady = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeUnleash();
  }

  private async initializeUnleash() {
    try {
      const config: UnleashConfig = {
        url: this.configService.get<string>('unleash.url'),
        appName: this.configService.get<string>('unleash.appName'),
        instanceId: this.configService.get<string>('unleash.instanceId'),
        refreshInterval: this.configService.get<number>('unleash.refreshInterval'),
        metricsInterval: this.configService.get<number>('unleash.metricsInterval'),
        environment: this.configService.get<string>('unleash.environment'),
        customHeaders: this.configService.get<any>('unleash.customHeaders'),
      };

      this.unleash = new Unleash(config);

      this.unleash.on('ready', () => {
        this.isReady = true;
        this.logger.log('Unleash client is ready');
      });

      this.unleash.on('error', (error) => {
        this.logger.error('Unleash client error:', error);
      });

      this.unleash.on('warn', (message) => {
        this.logger.warn('Unleash client warning:', message);
      });

      this.unleash.on('synchronized', () => {
        this.logger.debug('Unleash client synchronized with server');
      });
    } catch (error) {
      this.logger.error('Failed to initialize Unleash client', error);
      throw error;
    }
  }

  isEnabled(toggleName: string, context?: Context): boolean {
    if (!this.isReady) {
      this.logger.warn(`Unleash not ready, returning false for toggle: ${toggleName}`);
      return false;
    }
    return this.unleash.isEnabled(toggleName, context);
  }

  getVariant(toggleName: string, context?: Context): Variant {
    if (!this.isReady) {
      this.logger.warn(`Unleash not ready, returning default variant for toggle: ${toggleName}`);
      return {
        name: 'disabled',
        enabled: false,
        payload: undefined,
      };
    }
    return this.unleash.getVariant(toggleName, context);
  }

  getAllToggles(): FeatureToggleStatus[] {
    if (!this.isReady) {
      return [];
    }

    const toggles = this.unleash.getFeatureToggleDefinitions();
    return toggles.map((toggle) => ({
      name: toggle.name,
      enabled: toggle.enabled,
      description: toggle.description,
      strategies: toggle.strategies,
      variants: toggle.variants,
      impressionData: toggle.impressionData,
    }));
  }

  destroy(): void {
    if (this.unleash) {
      this.unleash.destroy();
    }
  }

  getUnleashInstance(): Unleash {
    return this.unleash;
  }

  isInitialized(): boolean {
    return this.isReady;
  }
}
