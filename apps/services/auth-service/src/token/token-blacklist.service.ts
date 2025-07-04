import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TokenType } from '.prisma/auth-client';

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);

  constructor(private readonly prisma: PrismaService) {}

  async revokeToken(
    token: string,
    tokenType: TokenType,
    userId: string,
    revokedBy: string,
    reason?: string,
    expiresAt?: Date,
  ): Promise<void> {
    try {
      await this.prisma.revokedToken.create({
        data: {
          token,
          tokenType,
          userId,
          revokedBy,
          reason,
          expiresAt: expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours default
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Token already revoked
        this.logger.warn(`Token already revoked: ${token.substring(0, 10)}...`);
      } else {
        throw error;
      }
    }
  }

  async isTokenRevoked(token: string): Promise<boolean> {
    const revokedToken = await this.prisma.revokedToken.findUnique({
      where: { token },
    });

    if (!revokedToken) return false;

    // Check if the revocation has expired
    if (revokedToken.expiresAt < new Date()) {
      // Clean up expired entry
      await this.prisma.revokedToken.delete({
        where: { id: revokedToken.id },
      });
      return false;
    }

    return true;
  }

  async revokeAllUserTokens(userId: string, revokedBy: string, reason?: string): Promise<number> {
    // This would typically be done by:
    // 1. Getting all active tokens for the user from sessions
    // 2. Adding them to the blacklist
    // 3. Removing the sessions

    const sessions = await this.prisma.userSession.findMany({
      where: { userId },
      select: { accessToken: true, refreshToken: true },
    });

    const tokensToRevoke = [
      ...sessions.map((s) => ({
        token: s.accessToken,
        tokenType: TokenType.ACCESS as TokenType,
      })),
      ...sessions.map((s) => ({
        token: s.refreshToken,
        tokenType: TokenType.REFRESH as TokenType,
      })),
    ];

    if (tokensToRevoke.length === 0) return 0;

    await this.prisma.revokedToken.createMany({
      data: tokensToRevoke.map((t) => ({
        token: t.token,
        tokenType: t.tokenType,
        userId,
        revokedBy,
        reason: reason || 'Bulk revocation',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })),
      skipDuplicates: true,
    });

    // Delete all user sessions
    const result = await this.prisma.userSession.deleteMany({
      where: { userId },
    });

    return result.count;
  }

  async cleanupExpiredRevocations(): Promise<number> {
    const result = await this.prisma.revokedToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired token revocations`);
    }

    return result.count;
  }

  async getRevokedTokens(
    filters: {
      userId?: string;
      revokedBy?: string;
      tokenType?: TokenType;
      startDate?: Date;
      endDate?: Date;
    },
    pagination: {
      skip?: number;
      take?: number;
    } = {},
  ) {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.revokedBy) where.revokedBy = filters.revokedBy;
    if (filters.tokenType) where.tokenType = filters.tokenType;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [tokens, total] = await Promise.all([
      this.prisma.revokedToken.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip || 0,
        take: pagination.take || 50,
        select: {
          id: true,
          tokenType: true,
          userId: true,
          revokedBy: true,
          reason: true,
          createdAt: true,
          expiresAt: true,
        },
      }),
      this.prisma.revokedToken.count({ where }),
    ]);

    return { tokens, total };
  }
}
