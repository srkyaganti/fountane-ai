import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SessionService } from '../session/session.service';
import { TokenBlacklistService } from '../token/token-blacklist.service';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import { PermissionCacheService } from '../cache/permission-cache.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private readonly sessionService: SessionService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly rateLimitService: RateLimitService,
    private readonly permissionCacheService: PermissionCacheService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredData() {
    this.logger.log('Starting scheduled cleanup of expired data...');

    try {
      const results = await Promise.allSettled([
        this.sessionService.cleanupExpiredSessions(),
        this.tokenBlacklistService.cleanupExpiredRevocations(),
        this.rateLimitService.cleanupExpiredEntries(),
        this.permissionCacheService.cleanupExpiredCache(),
      ]);

      results.forEach((result, index) => {
        const serviceName = ['Sessions', 'Token Blacklist', 'Rate Limits', 'Permission Cache'][
          index
        ];
        if (result.status === 'fulfilled') {
          if (result.value > 0) {
            this.logger.log(`${serviceName}: Cleaned ${result.value} entries`);
          }
        } else {
          this.logger.error(`${serviceName}: Cleanup failed`, result.reason);
        }
      });
    } catch (error) {
      this.logger.error('Cleanup task failed', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async generateDailyReport() {
    this.logger.log('Generating daily auth service report...');

    try {
      const [sessionMetrics, cacheStats] = await Promise.all([
        this.sessionService.getSessionMetrics(),
        this.permissionCacheService.getCacheStats(),
      ]);

      this.logger.log('Daily Report:', {
        sessions: sessionMetrics,
        cache: cacheStats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to generate daily report', error);
    }
  }
}
