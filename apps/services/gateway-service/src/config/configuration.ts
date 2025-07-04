export const configuration = () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  globalPrefix: process.env.GLOBAL_PREFIX || 'api',
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  services: {
    auth: {
      url: process.env.AUTH_SERVICE_URL || 'localhost:50051',
    },
    workflow: {
      url: process.env.WORKFLOW_SERVICE_URL || 'localhost:50052',
    },
    queue: {
      url: process.env.QUEUE_SERVICE_URL || 'localhost:50053',
    },
    realtime: {
      url: process.env.REALTIME_SERVICE_URL || 'localhost:50054',
    },
    feature: {
      url: process.env.FEATURE_SERVICE_URL || 'localhost:50055',
    },
    payment: {
      url: process.env.PAYMENT_SERVICE_URL || 'localhost:50056',
    },
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60000', 10),
    limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
});
