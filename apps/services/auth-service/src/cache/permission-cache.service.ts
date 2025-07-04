import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

export interface UserPermissions {
  userId: string;
  tenantId: string;
  permissions: string[];
  roles: string[];
}

@Injectable()
export class PermissionCacheService {
  private readonly logger = new Logger(PermissionCacheService.name);
  private readonly cacheTTL: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.cacheTTL = this.configService.get<number>('PERMISSION_CACHE_TTL', 300); // 5 minutes default
  }

  async getCachedPermissions(userId: string, tenantId: string): Promise<UserPermissions | null> {
    const cached = await this.prisma.userPermissionCache.findUnique({
      where: {
        userId_tenantId: { userId, tenantId },
      },
    });

    if (!cached) return null;

    // Check if cache is expired
    if (cached.expiresAt < new Date()) {
      await this.invalidateCache(userId, tenantId);
      return null;
    }

    return {
      userId: cached.userId,
      tenantId: cached.tenantId,
      permissions: cached.permissions as string[],
      roles: cached.roles as string[],
    };
  }

  async setCachedPermissions(permissions: UserPermissions): Promise<void> {
    const expiresAt = new Date(Date.now() + this.cacheTTL * 1000);

    await this.prisma.userPermissionCache.upsert({
      where: {
        userId_tenantId: {
          userId: permissions.userId,
          tenantId: permissions.tenantId,
        },
      },
      update: {
        permissions: permissions.permissions,
        roles: permissions.roles,
        expiresAt,
      },
      create: {
        userId: permissions.userId,
        tenantId: permissions.tenantId,
        permissions: permissions.permissions,
        roles: permissions.roles,
        expiresAt,
      },
    });
  }

  async invalidateCache(userId: string, tenantId?: string): Promise<void> {
    const where: any = { userId };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    await this.prisma.userPermissionCache.deleteMany({ where });
  }

  async invalidateTenantCache(tenantId: string): Promise<number> {
    const result = await this.prisma.userPermissionCache.deleteMany({
      where: { tenantId },
    });
    return result.count;
  }

  async warmCache(
    userId: string,
    tenantId: string,
    fetchPermissionsFn: () => Promise<UserPermissions>,
  ): Promise<UserPermissions> {
    // Try to get from cache first
    const cached = await this.getCachedPermissions(userId, tenantId);
    if (cached) return cached;

    // Fetch fresh permissions
    const permissions = await fetchPermissionsFn();

    // Cache them
    await this.setCachedPermissions(permissions);

    return permissions;
  }

  async cleanupExpiredCache(): Promise<number> {
    const result = await this.prisma.userPermissionCache.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired permission cache entries`);
    }

    return result.count;
  }

  async getCacheStats(): Promise<{
    totalEntries: number;
    expiredEntries: number;
    byTenant: Record<string, number>;
  }> {
    const now = new Date();

    const [total, expired, allEntries] = await Promise.all([
      this.prisma.userPermissionCache.count(),
      this.prisma.userPermissionCache.count({
        where: { expiresAt: { lt: now } },
      }),
      this.prisma.userPermissionCache.findMany({
        select: { tenantId: true },
      }),
    ]);

    const byTenant = allEntries.reduce(
      (acc, entry) => {
        acc[entry.tenantId] = (acc[entry.tenantId] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalEntries: total,
      expiredEntries: expired,
      byTenant,
    };
  }
}
