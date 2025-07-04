/**
 * Base error class for all Fountane AI errors
 */
export abstract class FountaneError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly correlationId?: string;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    details?: Record<string, unknown>,
    correlationId?: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date();
    this.correlationId = correlationId;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      correlationId: this.correlationId,
      stack: this.stack,
    };
  }
}

/**
 * Validation errors (400)
 */
export class ValidationError extends FountaneError {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    correlationId?: string,
  ) {
    super(message, 'VALIDATION_ERROR', 400, details, correlationId);
  }
}

/**
 * Authentication errors (401)
 */
export class AuthenticationError extends FountaneError {
  constructor(
    message = 'Authentication required',
    details?: Record<string, unknown>,
    correlationId?: string,
  ) {
    super(message, 'AUTHENTICATION_ERROR', 401, details, correlationId);
  }
}

/**
 * Authorization errors (403)
 */
export class AuthorizationError extends FountaneError {
  constructor(
    message = 'Access denied',
    details?: Record<string, unknown>,
    correlationId?: string,
  ) {
    super(message, 'AUTHORIZATION_ERROR', 403, details, correlationId);
  }
}

/**
 * Not found errors (404)
 */
export class NotFoundError extends FountaneError {
  constructor(
    resource: string,
    identifier?: string,
    correlationId?: string,
  ) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 'NOT_FOUND', 404, { resource, identifier }, correlationId);
  }
}

/**
 * Conflict errors (409)
 */
export class ConflictError extends FountaneError {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    correlationId?: string,
  ) {
    super(message, 'CONFLICT', 409, details, correlationId);
  }
}

/**
 * Rate limit errors (429)
 */
export class RateLimitError extends FountaneError {
  public readonly retryAfter?: number;

  constructor(
    message = 'Rate limit exceeded',
    retryAfter?: number,
    correlationId?: string,
  ) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, { retryAfter }, correlationId);
    this.retryAfter = retryAfter;
  }
}

/**
 * Internal server errors (500)
 */
export class InternalError extends FountaneError {
  constructor(
    message = 'Internal server error',
    details?: Record<string, unknown>,
    correlationId?: string,
  ) {
    super(message, 'INTERNAL_ERROR', 500, details, correlationId);
  }
}

/**
 * Service unavailable errors (503)
 */
export class ServiceUnavailableError extends FountaneError {
  public readonly retryAfter?: number;

  constructor(
    message = 'Service temporarily unavailable',
    retryAfter?: number,
    correlationId?: string,
  ) {
    super(
      message,
      'SERVICE_UNAVAILABLE',
      503,
      { retryAfter },
      correlationId,
    );
    this.retryAfter = retryAfter;
  }
}

/**
 * Business logic errors
 */
export class BusinessError extends FountaneError {
  constructor(
    message: string,
    code: string,
    details?: Record<string, unknown>,
    correlationId?: string,
  ) {
    super(message, code, 422, details, correlationId);
  }
}

/**
 * Integration errors
 */
export class IntegrationError extends FountaneError {
  public readonly service: string;

  constructor(
    service: string,
    message: string,
    details?: Record<string, unknown>,
    correlationId?: string,
  ) {
    super(
      `Integration error with ${service}: ${message}`,
      'INTEGRATION_ERROR',
      502,
      { service, ...details },
      correlationId,
    );
    this.service = service;
  }
}

/**
 * AI Generation errors
 */
export class GenerationError extends FountaneError {
  public readonly phase: string;

  constructor(
    phase: string,
    message: string,
    details?: Record<string, unknown>,
    correlationId?: string,
  ) {
    super(
      `Generation error in ${phase}: ${message}`,
      'GENERATION_ERROR',
      500,
      { phase, ...details },
      correlationId,
    );
    this.phase = phase;
  }
}

/**
 * Tenant-related errors
 */
export class TenantError extends FountaneError {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    correlationId?: string,
  ) {
    super(message, 'TENANT_ERROR', 403, details, correlationId);
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends FountaneError {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    correlationId?: string,
  ) {
    super(message, 'CONFIGURATION_ERROR', 500, details, correlationId);
  }
}

/**
 * Error handler utility
 */
export class ErrorHandler {
  /**
   * Checks if an error is a FountaneError
   */
  static isFountaneError(error: unknown): error is FountaneError {
    return error instanceof FountaneError;
  }

  /**
   * Normalizes any error to a FountaneError
   */
  static normalize(
    error: unknown,
    correlationId?: string,
  ): FountaneError {
    if (ErrorHandler.isFountaneError(error)) {
      return error;
    }

    if (error instanceof Error) {
      return new InternalError(
        error.message,
        { originalError: error.name, stack: error.stack },
        correlationId,
      );
    }

    return new InternalError(
      'An unknown error occurred',
      { originalError: String(error) },
      correlationId,
    );
  }

  /**
   * Creates an error response object
   */
  static toResponse(error: FountaneError): Record<string, unknown> {
    return {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: error.timestamp,
        correlationId: error.correlationId,
      },
    };
  }

  /**
   * Extracts correlation ID from various sources
   */
  static getCorrelationId(
    req?: any,
    headers?: Record<string, string>,
  ): string | undefined {
    if (req?.headers?.['x-correlation-id']) {
      return req.headers['x-correlation-id'];
    }
    if (headers?.['x-correlation-id']) {
      return headers['x-correlation-id'];
    }
    if (req?.correlationId) {
      return req.correlationId;
    }
    return undefined;
  }
}

/**
 * Error codes enum for consistency
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  INTEGRATION_ERROR = 'INTEGRATION_ERROR',
  GENERATION_ERROR = 'GENERATION_ERROR',
  TENANT_ERROR = 'TENANT_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
}

/**
 * Validation error field
 */
export interface ValidationErrorField {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Creates a validation error with field-level details
 */
export function createValidationError(
  fields: ValidationErrorField[],
  correlationId?: string,
): ValidationError {
  const message = `Validation failed: ${fields
    .map((f) => f.message)
    .join(', ')}`;
  return new ValidationError(message, { fields }, correlationId);
}