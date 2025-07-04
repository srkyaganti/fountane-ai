import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { UserSession } from '.prisma/auth-client';

export interface SessionData {
  userId: string;
  tenantId: string;
  accessToken: string;
  refreshToken: string;
  ipAddress?: string;
  userAgent?: string;
  expiresIn: number;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly sessionTTL: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.sessionTTL = this.configService.get<number>('SESSION_TTL', 3600); // 1 hour default
  }

  async createSession(data: SessionData): Promise<UserSession> {
    const expiresAt = new Date(Date.now() + data.expiresIn * 1000);

    // Clean up any existing sessions with the same tokens
    await this.prisma.userSession.deleteMany({
      where: {
        OR: [{ accessToken: data.accessToken }, { refreshToken: data.refreshToken }],
      },
    });

    return this.prisma.userSession.create({
      data: {
        userId: data.userId,
        tenantId: data.tenantId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        expiresAt,
      },
    });
  }

  async findSessionByAccessToken(accessToken: string): Promise<UserSession | null> {
    return this.prisma.userSession.findUnique({
      where: { accessToken },
    });
  }

  async findSessionByRefreshToken(refreshToken: string): Promise<UserSession | null> {
    return this.prisma.userSession.findUnique({
      where: { refreshToken },
    });
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { lastActivity: new Date() },
    });
  }

  async refreshSession(
    oldRefreshToken: string,
    newAccessToken: string,
    newRefreshToken: string,
    expiresIn: number,
  ): Promise<UserSession | null> {
    const session = await this.findSessionByRefreshToken(oldRefreshToken);
    if (!session) return null;

    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return this.prisma.userSession.update({
      where: { id: session.id },
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt,
        lastActivity: new Date(),
      },
    });
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.userSession.delete({
      where: { id: sessionId },
    });
  }

  async revokeUserSessions(userId: string, tenantId?: string): Promise<number> {
    const where: any = { userId };
    if (tenantId) where.tenantId = tenantId;

    const result = await this.prisma.userSession.deleteMany({ where });
    return result.count;
  }

  async getActiveSessions(userId: string, tenantId?: string): Promise<UserSession[]> {
    const where: any = {
      userId,
      expiresAt: { gt: new Date() },
    };
    if (tenantId) where.tenantId = tenantId;

    return this.prisma.userSession.findMany({
      where,
      orderBy: { lastActivity: 'desc' },
    });
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prisma.userSession.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired sessions`);
    }

    return result.count;
  }

  async isSessionValid(accessToken: string): Promise<boolean> {
    const session = await this.findSessionByAccessToken(accessToken);
    if (!session) return false;

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await this.revokeSession(session.id);
      return false;
    }

    // Update last activity
    await this.updateSessionActivity(session.id);
    return true;
  }

  async getSessionMetrics(tenantId?: string): Promise<{
    totalActive: number;
    byUser: Record<string, number>;
  }> {
    const where: any = {
      expiresAt: { gt: new Date() },
    };
    if (tenantId) where.tenantId = tenantId;

    const sessions = await this.prisma.userSession.findMany({
      where,
      select: { userId: true },
    });

    const byUser = sessions.reduce(
      (acc, session) => {
        acc[session.userId] = (acc[session.userId] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalActive: sessions.length,
      byUser,
    };
  }
}
