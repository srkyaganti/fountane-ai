export default () => ({
  service: {
    name: 'realtime-service',
    port: parseInt(process.env.PORT, 10) || 50054,
  },
  centrifugo: {
    url: process.env.CENTRIFUGO_URL || 'http://localhost:8000',
    apiKey: process.env.CENTRIFUGO_API_KEY || '',
    secret: process.env.CENTRIFUGO_SECRET || '',
    tokenHmacSecretKey: process.env.CENTRIFUGO_TOKEN_HMAC_SECRET_KEY || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fountane-jwt-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '',
  },
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
    username: process.env.POSTGRES_USER || 'fountane',
    password: process.env.POSTGRES_PASSWORD || 'fountane',
    database: process.env.POSTGRES_DATABASE || 'fountane_realtime',
  },
});
