import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly configs: Map<string, RateLimitConfig>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.configs = new Map([
      ['auth', { windowMs: 60000, maxRequests: 10 }], // 10 requests per minute
      ['refresh', { windowMs: 60000, maxRequests: 5 }], // 5 refreshes per minute
      ['api', { windowMs: 60000, maxRequests: 100 }], // 100 API calls per minute
    ]);

    // Override with environment configs if available
    const authLimit = this.configService.get<number>('RATE_LIMIT_AUTH');
    if (authLimit) {
      this.configs.get('auth')!.maxRequests = authLimit;
    }
  }

  async checkLimit(key: string, bucket: string = 'auth'): Promise<RateLimitResult> {
    const config = this.configs.get(bucket) || this.configs.get('auth')!;
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowMs);
    const windowEnd = new Date(now.getTime() + config.windowMs);

    try {
      // Clean up expired entries
      await this.prisma.rateLimitEntry.deleteMany({
        where: {
          expiresAt: { lt: now },
        },
      });

      // Find or create rate limit entry
      let entry = await this.prisma.rateLimitEntry.findUnique({
        where: {
          key_bucket: { key, bucket },
        },
      });

      // If entry exists and window has passed, reset it
      if (entry && entry.windowStart < windowStart) {
        entry = await this.prisma.rateLimitEntry.update({
          where: { id: entry.id },
          data: {
            count: 1,
            windowStart: now,
            expiresAt: windowEnd,
          },
        });
      } else if (entry) {
        // Increment counter
        entry = await this.prisma.rateLimitEntry.update({
          where: { id: entry.id },
          data: {
            count: { increment: 1 },
          },
        });
      } else {
        // Create new entry
        entry = await this.prisma.rateLimitEntry.create({
          data: {
            key,
            bucket,
            count: 1,
            windowStart: now,
            expiresAt: windowEnd,
          },
        });
      }

      const allowed = entry.count <= config.maxRequests;
      const remaining = Math.max(0, config.maxRequests - entry.count);

      return {
        allowed,
        limit: config.maxRequests,
        remaining,
        resetAt: entry.expiresAt,
      };
    } catch (error) {
      this.logger.error('Rate limit check failed', error);
      // On error, allow the request but log it
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetAt: windowEnd,
      };
    }
  }

  async resetLimit(key: string, bucket?: string): Promise<void> {
    const where: any = { key };
    if (bucket) where.bucket = bucket;

    await this.prisma.rateLimitEntry.deleteMany({ where });
  }

  async getRateLimitInfo(key: string): Promise<Record<string, RateLimitResult>> {
    const results: Record<string, RateLimitResult> = {};

    for (const [bucket, config] of this.configs.entries()) {
      const entry = await this.prisma.rateLimitEntry.findUnique({
        where: {
          key_bucket: { key, bucket },
        },
      });

      if (entry && entry.expiresAt > new Date()) {
        results[bucket] = {
          allowed: entry.count <= config.maxRequests,
          limit: config.maxRequests,
          remaining: Math.max(0, config.maxRequests - entry.count),
          resetAt: entry.expiresAt,
        };
      } else {
        results[bucket] = {
          allowed: true,
          limit: config.maxRequests,
          remaining: config.maxRequests,
          resetAt: new Date(Date.now() + config.windowMs),
        };
      }
    }

    return results;
  }

  async cleanupExpiredEntries(): Promise<number> {
    const result = await this.prisma.rateLimitEntry.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired rate limit entries`);
    }

    return result.count;
  }
}
