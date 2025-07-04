import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthEvent } from '.prisma/auth-client';

export interface AuditLogEntry {
  userId?: string;
  tenantId: string;
  event: AuthEvent;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  errorCode?: string;
  errorMessage?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logEvent(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.authAuditLog.create({
        data: {
          userId: entry.userId,
          tenantId: entry.tenantId,
          event: entry.event,
          success: entry.success,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          metadata: entry.metadata || {},
          errorCode: entry.errorCode,
          errorMessage: entry.errorMessage,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create audit log entry', error);
      // Don't throw - audit logging should not break the main flow
    }
  }

  async logLoginSuccess(
    userId: string,
    tenantId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logEvent({
      userId,
      tenantId,
      event: AuthEvent.LOGIN_SUCCESS,
      success: true,
      ipAddress,
      userAgent,
    });
  }

  async logLoginFailure(
    username: string,
    tenantId: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logEvent({
      tenantId,
      event: AuthEvent.LOGIN_FAILED,
      success: false,
      ipAddress,
      userAgent,
      metadata: { username },
      errorMessage: reason,
    });
  }

  async logTokenRefresh(
    userId: string,
    tenantId: string,
    success: boolean,
    errorMessage?: string,
  ): Promise<void> {
    await this.logEvent({
      userId,
      tenantId,
      event: AuthEvent.TOKEN_REFRESH,
      success,
      errorMessage,
    });
  }

  async logTokenValidation(
    userId: string,
    tenantId: string,
    success: boolean,
    errorMessage?: string,
  ): Promise<void> {
    await this.logEvent({
      userId,
      tenantId,
      event: AuthEvent.TOKEN_VALIDATE,
      success,
      errorMessage,
    });
  }

  async logUserCreation(
    createdUserId: string,
    tenantId: string,
    createdBy: string,
    success: boolean,
    errorMessage?: string,
  ): Promise<void> {
    await this.logEvent({
      userId: createdBy,
      tenantId,
      event: AuthEvent.USER_CREATE,
      success,
      metadata: { createdUserId },
      errorMessage,
    });
  }

  async logRoleAssignment(
    userId: string,
    tenantId: string,
    assignedBy: string,
    role: string,
    success: boolean,
    errorMessage?: string,
  ): Promise<void> {
    await this.logEvent({
      userId: assignedBy,
      tenantId,
      event: AuthEvent.ROLE_ASSIGN,
      success,
      metadata: { targetUserId: userId, role },
      errorMessage,
    });
  }

  async getAuditLogs(
    filters: {
      userId?: string;
      tenantId?: string;
      event?: AuthEvent;
      startDate?: Date;
      endDate?: Date;
      success?: boolean;
    },
    pagination: {
      skip?: number;
      take?: number;
    } = {},
  ) {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.tenantId) where.tenantId = filters.tenantId;
    if (filters.event) where.event = filters.event;
    if (filters.success !== undefined) where.success = filters.success;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.authAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip || 0,
        take: pagination.take || 50,
      }),
      this.prisma.authAuditLog.count({ where }),
    ]);

    return { logs, total };
  }

  async detectSuspiciousActivity(userId: string, tenantId: string): Promise<boolean> {
    const recentFailures = await this.prisma.authAuditLog.count({
      where: {
        userId,
        tenantId,
        event: AuthEvent.LOGIN_FAILED,
        success: false,
        createdAt: {
          gte: new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
        },
      },
    });

    if (recentFailures >= 5) {
      await this.logEvent({
        userId,
        tenantId,
        event: AuthEvent.SUSPICIOUS_ACTIVITY,
        success: false,
        metadata: { failedAttempts: recentFailures },
      });
      return true;
    }

    return false;
  }
}
