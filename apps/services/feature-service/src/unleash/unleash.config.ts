import { registerAs } from '@nestjs/config';

export default registerAs('unleash', () => ({
  url: process.env.UNLEASH_URL || 'http://unleash:4242/api',
  appName: process.env.UNLEASH_APP_NAME || 'fountane-feature-service',
  instanceId: process.env.UNLEASH_INSTANCE_ID || 'fountane-feature-service-instance',
  refreshInterval: parseInt(process.env.UNLEASH_REFRESH_INTERVAL || '15000', 10),
  metricsInterval: parseInt(process.env.UNLEASH_METRICS_INTERVAL || '60000', 10),
  environment: process.env.UNLEASH_ENVIRONMENT || 'development',
  customHeaders: {
    Authorization: process.env.UNLEASH_API_TOKEN || '',
  },
  strategies: [
    'default',
    'userWithId',
    'gradualRolloutUserId',
    'gradualRolloutSessionId',
    'remoteAddress',
    'flexibleRollout',
  ],
}));
