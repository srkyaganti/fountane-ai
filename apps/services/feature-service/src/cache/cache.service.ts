import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async get(key: string): Promise<any> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Failed to get cache key: ${key}`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error) {
      this.logger.error(`Failed to set cache key: ${key}`, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete cache key: ${key}`, error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Failed to invalidate pattern: ${pattern}`, error);
    }
  }

  async invalidateFeature(featureName: string): Promise<void> {
    const pattern = `feature:${featureName}:*`;
    await this.invalidatePattern(pattern);
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check existence of key: ${key}`, error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      this.logger.error(`Failed to get TTL for key: ${key}`, error);
      return -1;
    }
  }

  async multiGet(keys: string[]): Promise<Record<string, any>> {
    try {
      const values = await this.redis.mget(keys);
      const result: Record<string, any> = {};

      keys.forEach((key, index) => {
        if (values[index]) {
          result[key] = JSON.parse(values[index]);
        }
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to get multiple cache keys', error);
      return {};
    }
  }

  async multiSet(entries: Record<string, any>, ttl?: number): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();

      Object.entries(entries).forEach(([key, value]) => {
        const serialized = JSON.stringify(value);
        if (ttl) {
          pipeline.setex(key, ttl, serialized);
        } else {
          pipeline.set(key, serialized);
        }
      });

      await pipeline.exec();
    } catch (error) {
      this.logger.error('Failed to set multiple cache keys', error);
    }
  }

  async flush(): Promise<void> {
    try {
      await this.redis.flushdb();
      this.logger.warn('Cache flushed');
    } catch (error) {
      this.logger.error('Failed to flush cache', error);
    }
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }
}
