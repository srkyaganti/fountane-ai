import { faker } from '@faker-js/faker';
import type { User, Tenant, TenantSize, TenantStatus, UserStatus } from '@fountane/core/types';

/**
 * Test data factories for creating mock entities
 */
export class TestFactory {
  /**
   * Create a mock user
   */
  static createUser(overrides: Partial<User> = {}): User {
    const now = new Date();
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      avatar: faker.image.avatar(),
      roles: ['user'],
      permissions: [],
      status: 'active' as UserStatus,
      tenantId: faker.string.uuid(),
      createdAt: now,
      updatedAt: now,
      metadata: {},
      ...overrides,
    };
  }

  /**
   * Create a mock tenant
   */
  static createTenant(overrides: Partial<Tenant> = {}): Tenant {
    const now = new Date();
    return {
      id: faker.string.uuid(),
      name: faker.company.name(),
      slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
      status: 'active' as TenantStatus,
      size: 'small' as TenantSize,
      settings: {
        features: {},
        limits: {
          maxUsers: 100,
          maxProjects: 10,
          maxStorage: 10,
          maxApiRequests: 100000,
        },
      },
      metadata: {},
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }

  /**
   * Create multiple mock entities
   */
  static createMany<T>(
    factory: () => T,
    count: number,
    overrides?: (index: number) => Partial<T>,
  ): T[] {
    return Array.from({ length: count }, (_, index) =>
      overrides ? { ...factory(), ...overrides(index) } : factory(),
    );
  }
}

/**
 * Test database utilities
 */
export class TestDatabase {
  private static cleanupFns: Array<() => Promise<void>> = [];

  /**
   * Register a cleanup function to be called after tests
   */
  static registerCleanup(fn: () => Promise<void>): void {
    this.cleanupFns.push(fn);
  }

  /**
   * Clean up all test data
   */
  static async cleanup(): Promise<void> {
    await Promise.all(this.cleanupFns.map((fn) => fn()));
    this.cleanupFns = [];
  }

  /**
   * Create a test transaction that automatically rolls back
   */
  static async withTransaction<T>(fn: (trx: any) => Promise<T>, db: any): Promise<T> {
    const trx = await db.transaction();
    try {
      const result = await fn(trx);
      await trx.rollback();
      return result;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }
}

/**
 * Test timing utilities
 */
export class TestTimer {
  private static timers: Map<string, number> = new Map();

  /**
   * Start a timer
   */
  static start(name: string): void {
    this.timers.set(name, Date.now());
  }

  /**
   * Stop a timer and return elapsed time in ms
   */
  static stop(name: string): number {
    const start = this.timers.get(name);
    if (!start) {
      throw new Error(`Timer '${name}' not found`);
    }
    const elapsed = Date.now() - start;
    this.timers.delete(name);
    return elapsed;
  }

  /**
   * Measure async function execution time
   */
  static async measure<T>(
    name: string,
    fn: () => Promise<T>,
  ): Promise<{ result: T; elapsed: number }> {
    this.start(name);
    try {
      const result = await fn();
      const elapsed = this.stop(name);
      return { result, elapsed };
    } catch (error) {
      this.stop(name);
      throw error;
    }
  }
}

/**
 * Mock implementations for common services
 */
export class TestMocks {
  /**
   * Create a mock logger
   */
  static createLogger() {
    return {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      child: jest.fn().mockReturnThis(),
      setContext: jest.fn(),
      clearContext: jest.fn(),
      time: jest.fn(),
      timeEnd: jest.fn(),
      audit: jest.fn(),
      metric: jest.fn(),
      logRequest: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
    };
  }

  /**
   * Create a mock config service
   */
  static createConfig(config: Record<string, any> = {}) {
    return {
      get: jest.fn((key: string) => config[key]),
      getOrThrow: jest.fn((key: string) => {
        if (!(key in config)) {
          throw new Error(`Configuration key "${key}" is required but not defined`);
        }
        return config[key];
      }),
      has: jest.fn((key: string) => key in config),
      getAll: jest.fn(() => ({ ...config })),
      getNamespace: jest.fn((namespace: string) => {
        const prefix = `${namespace}_`;
        const result: Record<string, any> = {};
        for (const [key, value] of Object.entries(config)) {
          if (key.startsWith(prefix)) {
            result[key.slice(prefix.length)] = value;
          }
        }
        return result;
      }),
      validate: jest.fn(),
    };
  }

  /**
   * Create a mock Redis client
   */
  static createRedis() {
    const store = new Map<string, string>();
    return {
      get: jest.fn((key: string) => Promise.resolve(store.get(key) || null)),
      set: jest.fn((key: string, value: string, options?: any) => {
        store.set(key, value);
        if (options?.EX) {
          setTimeout(() => store.delete(key), options.EX * 1000);
        }
        return Promise.resolve('OK');
      }),
      del: jest.fn((key: string) => {
        const existed = store.has(key);
        store.delete(key);
        return Promise.resolve(existed ? 1 : 0);
      }),
      exists: jest.fn((key: string) => Promise.resolve(store.has(key) ? 1 : 0)),
      expire: jest.fn(() => Promise.resolve(1)),
      ttl: jest.fn(() => Promise.resolve(-1)),
      mget: jest.fn((keys: string[]) => Promise.resolve(keys.map((key) => store.get(key) || null))),
      mset: jest.fn((pairs: Record<string, string>) => {
        Object.entries(pairs).forEach(([key, value]) => store.set(key, value));
        return Promise.resolve('OK');
      }),
      clear: () => store.clear(),
    };
  }
}

/**
 * Test environment utilities
 */
export class TestEnvironment {
  private static originalEnv: NodeJS.ProcessEnv;

  /**
   * Set up test environment variables
   */
  static setup(env: Record<string, string>): void {
    this.originalEnv = { ...process.env };
    Object.assign(process.env, env);
  }

  /**
   * Restore original environment variables
   */
  static restore(): void {
    if (this.originalEnv) {
      process.env = this.originalEnv;
    }
  }

  /**
   * Run a function with temporary environment variables
   */
  static async withEnv<T>(env: Record<string, string>, fn: () => Promise<T>): Promise<T> {
    this.setup(env);
    try {
      return await fn();
    } finally {
      this.restore();
    }
  }
}

/**
 * Assertion helpers
 */
export class TestAssertions {
  /**
   * Assert that a promise rejects with a specific error
   */
  static async assertRejects(
    promise: Promise<any>,
    errorType?: new (...args: any[]) => Error,
    message?: string | RegExp,
  ): Promise<void> {
    try {
      await promise;
      throw new Error('Expected promise to reject');
    } catch (error) {
      if (errorType && !(error instanceof errorType)) {
        throw new Error(
          `Expected error to be instance of ${errorType.name}, got ${error.constructor.name}`,
        );
      }
      if (message) {
        const errorMessage = (error as Error).message;
        if (message instanceof RegExp) {
          if (!message.test(errorMessage)) {
            throw new Error(`Expected error message to match ${message}, got "${errorMessage}"`);
          }
        } else if (!errorMessage.includes(message)) {
          throw new Error(`Expected error message to include "${message}", got "${errorMessage}"`);
        }
      }
    }
  }

  /**
   * Assert that an object matches a partial shape
   */
  static assertPartialMatch<T>(actual: T, expected: Partial<T>): void {
    for (const [key, value] of Object.entries(expected)) {
      expect(actual[key as keyof T]).toEqual(value);
    }
  }
}

/**
 * Wait utilities for testing async operations
 */
export class TestWait {
  /**
   * Wait for a condition to be true
   */
  static async forCondition(
    condition: () => boolean | Promise<boolean>,
    options: {
      timeout?: number;
      interval?: number;
      message?: string;
    } = {},
  ): Promise<void> {
    const { timeout = 5000, interval = 100, message = 'Condition not met' } = options;
    const start = Date.now();

    while (Date.now() - start < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(`${message} (timeout: ${timeout}ms)`);
  }

  /**
   * Wait for a specific amount of time
   */
  static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
