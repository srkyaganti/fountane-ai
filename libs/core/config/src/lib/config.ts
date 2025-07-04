import * as dotenv from 'dotenv';
import * as Joi from 'joi';
import { existsSync } from 'fs';
import { join } from 'path';

export interface ConfigOptions {
  envFilePath?: string;
  ignoreEnvFile?: boolean;
  expandVariables?: boolean;
  cache?: boolean;
  isGlobal?: boolean;
  load?: Array<() => Record<string, any>>;
}

export interface ValidationSchema {
  [key: string]: Joi.Schema;
}

export class ConfigService {
  private readonly envConfig: Record<string, any> = {};
  private readonly cache = new Map<string, any>();
  private readonly validationSchema?: Joi.ObjectSchema;

  constructor(
    schema?: ValidationSchema,
    options: ConfigOptions = {},
  ) {
    const {
      envFilePath = '.env',
      ignoreEnvFile = false,
      expandVariables = true,
      cache = true,
      load = [],
    } = options;

    // Load .env file
    if (!ignoreEnvFile) {
      const envFile = this.getEnvFilePath(envFilePath);
      if (envFile && existsSync(envFile)) {
        const config = dotenv.config({
          path: envFile,
          override: false,
        });
        if (config.error) {
          throw new Error(`Failed to load .env file: ${config.error.message}`);
        }
      }
    }

    // Load from process.env
    this.envConfig = { ...process.env };

    // Load from custom loaders
    for (const loader of load) {
      const config = loader();
      Object.assign(this.envConfig, config);
    }

    // Validate if schema provided
    if (schema) {
      this.validationSchema = Joi.object(schema);
      const { error, value } = this.validationSchema.validate(this.envConfig, {
        allowUnknown: true,
        abortEarly: false,
      });

      if (error) {
        throw new Error(
          `Configuration validation error: ${error.message}`,
        );
      }

      // Use validated values (with defaults applied)
      Object.assign(this.envConfig, value);
    }

    // Enable caching
    this.cache.clear();
    if (!cache) {
      this.cache.clear = () => undefined;
      this.cache.set = () => undefined;
      this.cache.get = () => undefined;
    }
  }

  private getEnvFilePath(envFilePath: string): string | null {
    // Check if absolute path
    if (envFilePath.startsWith('/')) {
      return envFilePath;
    }

    // Check relative to current working directory
    const cwdPath = join(process.cwd(), envFilePath);
    if (existsSync(cwdPath)) {
      return cwdPath;
    }

    // Check relative to project root (traverse up to find package.json)
    let currentDir = process.cwd();
    while (currentDir !== '/') {
      const packageJsonPath = join(currentDir, 'package.json');
      if (existsSync(packageJsonPath)) {
        const envPath = join(currentDir, envFilePath);
        if (existsSync(envPath)) {
          return envPath;
        }
      }
      currentDir = join(currentDir, '..');
    }

    return null;
  }

  /**
   * Get a configuration value
   */
  get<T = string>(key: string): T | undefined;
  get<T = string>(key: string, defaultValue: T): T;
  get<T = string>(key: string, defaultValue?: T): T | undefined {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }

    // Get value from config
    const value = this.getFromPath(key);

    // Apply type conversion
    const converted = this.convertValue<T>(value);

    // Cache the result
    if (converted !== undefined) {
      this.cache.set(key, converted);
    }

    return converted !== undefined ? converted : defaultValue;
  }

  /**
   * Get a required configuration value
   */
  getOrThrow<T = string>(key: string): T {
    const value = this.get<T>(key);
    if (value === undefined) {
      throw new Error(`Configuration key "${key}" is required but not defined`);
    }
    return value;
  }

  /**
   * Check if a configuration key exists
   */
  has(key: string): boolean {
    return this.getFromPath(key) !== undefined;
  }

  /**
   * Get all configuration values
   */
  getAll(): Record<string, any> {
    return { ...this.envConfig };
  }

  /**
   * Get a subset of configuration
   */
  getNamespace(namespace: string): Record<string, any> {
    const prefix = `${namespace}_`;
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(this.envConfig)) {
      if (key.startsWith(prefix)) {
        const subKey = key.slice(prefix.length);
        result[subKey] = value;
      }
    }

    return result;
  }

  /**
   * Validate configuration against schema
   */
  validate(schema: Joi.ObjectSchema): void {
    const { error } = schema.validate(this.envConfig, {
      allowUnknown: true,
      abortEarly: false,
    });

    if (error) {
      throw new Error(`Configuration validation error: ${error.message}`);
    }
  }

  private getFromPath(path: string): any {
    // Support nested paths like 'database.host'
    const keys = path.split('.');
    let value: any = this.envConfig;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private convertValue<T>(value: any): T | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    // Handle string conversions
    if (typeof value === 'string') {
      // Boolean
      if (value.toLowerCase() === 'true') return true as T;
      if (value.toLowerCase() === 'false') return false as T;

      // Number
      const num = Number(value);
      if (!isNaN(num) && value !== '') return num as T;

      // JSON
      if (value.startsWith('{') || value.startsWith('[')) {
        try {
          return JSON.parse(value) as T;
        } catch {
          // Not valid JSON, return as string
        }
      }

      // Comma-separated array
      if (value.includes(',')) {
        return value.split(',').map(s => s.trim()) as T;
      }
    }

    return value as T;
  }
}

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  port: Joi.number().port().default(3000),
  host: Joi.string().hostname().default('localhost'),
  nodeEnv: Joi.string()
    .valid('development', 'test', 'production', 'staging')
    .default('development'),
  logLevel: Joi.string()
    .valid('trace', 'debug', 'info', 'warn', 'error', 'fatal')
    .default('info'),
  databaseUrl: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
  redisUrl: Joi.string().uri({ scheme: ['redis', 'rediss'] }).required(),
  jwtSecret: Joi.string().min(32).required(),
  corsOrigins: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string()),
  ),
  boolean: Joi.boolean(),
  required: Joi.required(),
};

/**
 * Environment-specific configuration loader
 */
export class EnvironmentConfigLoader {
  static load(): Record<string, any> {
    const env = process.env.NODE_ENV || 'development';
    const config: Record<string, any> = {};

    // Load environment-specific defaults
    switch (env) {
      case 'production':
        config.LOG_LEVEL = 'info';
        config.CACHE_TTL = 3600;
        config.RATE_LIMIT_MAX = 100;
        break;
      case 'development':
        config.LOG_LEVEL = 'debug';
        config.CACHE_TTL = 60;
        config.RATE_LIMIT_MAX = 1000;
        break;
      case 'test':
        config.LOG_LEVEL = 'error';
        config.CACHE_TTL = 0;
        config.RATE_LIMIT_MAX = 10000;
        break;
    }

    return config;
  }
}

/**
 * Configuration factory
 */
export function createConfig(
  schema?: ValidationSchema,
  options?: ConfigOptions,
): ConfigService {
  return new ConfigService(schema, options);
}

/**
 * Global configuration instance
 */
let globalConfig: ConfigService | null = null;

export function setGlobalConfig(config: ConfigService): void {
  globalConfig = config;
}

export function getGlobalConfig(): ConfigService {
  if (!globalConfig) {
    throw new Error('Global configuration not initialized. Call setGlobalConfig() first.');
  }
  return globalConfig;
}