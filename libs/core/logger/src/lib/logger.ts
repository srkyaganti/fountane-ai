import pino from 'pino';
import type { Logger as PinoLogger, LoggerOptions } from 'pino';
import { randomUUID } from 'crypto';

export interface LogContext {
  userId?: string;
  tenantId?: string;
  correlationId?: string;
  requestId?: string;
  service?: string;
  [key: string]: unknown;
}

export interface LoggerConfig {
  level?: string;
  pretty?: boolean;
  service: string;
  environment?: string;
  redact?: string[];
}

class Logger {
  private pino: PinoLogger;
  private context: LogContext = {};

  constructor(config: LoggerConfig) {
    const options: LoggerOptions = {
      level: config.level ?? (config.environment === 'production' ? 'info' : 'debug'),
      formatters: {
        level: (label: string) => ({ level: label }),
        bindings: (bindings) => ({
          pid: bindings['pid'],
          hostname: bindings['hostname'],
          service: config.service,
          environment: config.environment ?? 'development',
        }),
      },
      messageKey: 'message',
      errorKey: 'error',
      timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
      serializers: {
        error: pino.stdSerializers.err,
        request: (req: any) => ({
          method: req.method,
          url: req.url,
          headers: req.headers,
          params: req.params,
          query: req.query,
        }),
        response: (res: any) => ({
          statusCode: res.statusCode,
          headers: res.headers,
        }),
      },
      redact: config.redact ?? [
        'password',
        'token',
        'secret',
        'authorization',
        'cookie',
        'api_key',
        'apiKey',
        'access_token',
        'refresh_token',
      ],
    };

    if (config.pretty && config.environment !== 'production') {
      this.pino = pino({
        ...options,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'HH:MM:ss.l',
          },
        },
      });
    } else {
      this.pino = pino(options);
    }
  }

  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  clearContext(): void {
    this.context = {};
  }

  child(context: LogContext): Logger {
    const childLogger = Object.create(this);
    childLogger.pino = this.pino.child(context);
    childLogger.context = { ...this.context, ...context };
    return childLogger;
  }

  private formatMessage(
    message: string,
    meta?: Record<string, unknown>,
  ): [string, Record<string, unknown>] {
    const correlationId = this.context.correlationId ?? randomUUID();
    const logMeta = {
      ...this.context,
      correlationId,
      ...meta,
    };
    return [message, logMeta];
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    const [msg, logMeta] = this.formatMessage(message, meta);
    this.pino.debug(logMeta, msg);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    const [msg, logMeta] = this.formatMessage(message, meta);
    this.pino.info(logMeta, msg);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    const [msg, logMeta] = this.formatMessage(message, meta);
    this.pino.warn(logMeta, msg);
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    const [msg, logMeta] = this.formatMessage(message, meta);
    if (error instanceof Error) {
      this.pino.error({ ...logMeta, error }, msg);
    } else if (error) {
      this.pino.error({ ...logMeta, error: String(error) }, msg);
    } else {
      this.pino.error(logMeta, msg);
    }
  }

  fatal(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    const [msg, logMeta] = this.formatMessage(message, meta);
    if (error instanceof Error) {
      this.pino.fatal({ ...logMeta, error }, msg);
    } else if (error) {
      this.pino.fatal({ ...logMeta, error: String(error) }, msg);
    } else {
      this.pino.fatal(logMeta, msg);
    }
  }

  // Performance logging
  time(label: string): void {
    // Note: time/timeEnd methods are not available in current pino version
    this.debug(`Timer started: ${label}`);
  }

  timeEnd(label: string, meta?: Record<string, unknown>): void {
    // Note: time/timeEnd methods are not available in current pino version
    this.debug(`Timer ended: ${label}`, meta);
  }

  // Audit logging
  audit(action: string, resource: string, meta?: Record<string, unknown>): void {
    this.info('Audit log', {
      ...meta,
      audit: true,
      action,
      resource,
      timestamp: new Date().toISOString(),
    });
  }

  // Metric logging
  metric(name: string, value: number, unit?: string, tags?: Record<string, string>): void {
    this.info('Metric', {
      metric: true,
      name,
      value,
      unit,
      tags,
      timestamp: new Date().toISOString(),
    });
  }

  // HTTP request/response logging
  logRequest(req: any, res: any, responseTime: number): void {
    const statusCode = res.statusCode;
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    this.pino[level](
      {
        request: req,
        response: res,
        responseTime,
        type: 'http',
      },
      `${req.method} ${req.url} ${statusCode} ${responseTime}ms`,
    );
  }

  // Flush logs (useful for Lambda/serverless)
  flush(): Promise<void> {
    return new Promise((resolve) => {
      this.pino.flush(() => resolve());
    });
  }
}

// Factory function for creating loggers
export function createLogger(config: LoggerConfig): Logger {
  return new Logger(config);
}

// Default logger instance (should be configured in application startup)
let defaultLogger: Logger | null = null;

export function setDefaultLogger(logger: Logger): void {
  defaultLogger = logger;
}

export function getDefaultLogger(): Logger {
  if (!defaultLogger) {
    throw new Error('Default logger not initialized. Call setDefaultLogger() first.');
  }
  return defaultLogger;
}

// Export types
export type { Logger, PinoLogger };
