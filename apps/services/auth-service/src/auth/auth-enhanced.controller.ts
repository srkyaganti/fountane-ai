import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { KeycloakService } from '../keycloak/keycloak.service';
import { AuditService } from '../audit/audit.service';
import { SessionService } from '../session/session.service';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import { TokenBlacklistService } from '../token/token-blacklist.service';
import { PermissionCacheService } from '../cache/permission-cache.service';
import { fountane } from '@fountane/core/proto';
import { AuthEvent, TokenType } from '.prisma/auth-client';

@Controller()
export class AuthEnhancedController {
  private readonly logger = new Logger(AuthEnhancedController.name);

  constructor(
    private readonly keycloakService: KeycloakService,
    private readonly auditService: AuditService,
    private readonly sessionService: SessionService,
    private readonly rateLimitService: RateLimitService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly permissionCacheService: PermissionCacheService,
  ) {}

  @GrpcMethod('AuthService', 'Authenticate')
  async authenticate(
    data: fountane.auth.IAuthenticateRequest,
    metadata?: any,
  ): Promise<fountane.auth.IAuthenticateResponse> {
    const ipAddress = metadata?.get('x-forwarded-for')?.[0] || metadata?.get('x-real-ip')?.[0];
    const userAgent = metadata?.get('user-agent')?.[0];

    try {
      // Check rate limit
      const rateLimitKey = data.username || ipAddress || 'unknown';
      const rateLimit = await this.rateLimitService.checkLimit(rateLimitKey, 'auth');

      if (!rateLimit.allowed) {
        await this.auditService.logLoginFailure(
          data.username!,
          data.tenantId!,
          'Rate limit exceeded',
          ipAddress,
          userAgent,
        );
        throw new RpcException({
          code: status.RESOURCE_EXHAUSTED,
          message: 'Too many authentication attempts. Please try again later.',
        });
      }

      // Authenticate with Keycloak
      const tokenResponse = await this.keycloakService.authenticate(
        data.username!,
        data.password!,
        data.tenantId!,
      );

      // Get user details
      const introspection = await this.keycloakService.validateToken(tokenResponse.access_token);
      const user = await this.keycloakService.getUser(introspection.sub);

      // Create session
      await this.sessionService.createSession({
        userId: user.id,
        tenantId: data.tenantId!,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        ipAddress,
        userAgent,
        expiresIn: tokenResponse.expires_in,
      });

      // Get user roles and cache permissions
      const roles = await this.keycloakService.getUserRoles(user.id);
      await this.permissionCacheService.setCachedPermissions({
        userId: user.id,
        tenantId: data.tenantId!,
        roles: roles.map((r) => r.name),
        permissions: [], // Would be populated based on role-permission mapping
      });

      // Log successful authentication
      await this.auditService.logLoginSuccess(user.id, data.tenantId!, ipAddress, userAgent);

      return {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresIn: tokenResponse.expires_in,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          tenantId: user.attributes.tenantId?.[0] || data.tenantId!,
          enabled: user.enabled,
          attributes: Object.entries(user.attributes).reduce(
            (acc, [key, value]) => ({ ...acc, [key]: value[0] }),
            {},
          ),
          createdAt: user.createdTimestamp,
          updatedAt: user.createdTimestamp,
        },
      };
    } catch (error: any) {
      // Log failed authentication
      await this.auditService.logLoginFailure(
        data.username!,
        data.tenantId!,
        error.message || 'Authentication failed',
        ipAddress,
        userAgent,
      );

      // Check for suspicious activity
      if (introspection?.sub) {
        await this.auditService.detectSuspiciousActivity(introspection.sub, data.tenantId!);
      }

      if (error instanceof RpcException) {
        throw error;
      }

      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'Invalid credentials',
      });
    }
  }

  @GrpcMethod('AuthService', 'ValidateToken')
  async validateToken(
    data: fountane.auth.IValidateTokenRequest,
  ): Promise<fountane.auth.IValidateTokenResponse> {
    try {
      // Check if token is blacklisted
      const isRevoked = await this.tokenBlacklistService.isTokenRevoked(data.token!);
      if (isRevoked) {
        return {
          valid: false,
          userId: '',
          tenantId: '',
          roles: [],
        };
      }

      // Check session validity
      const session = await this.sessionService.findSessionByAccessToken(data.token!);
      if (!session || session.expiresAt < new Date()) {
        return {
          valid: false,
          userId: '',
          tenantId: '',
          roles: [],
        };
      }

      // Validate with Keycloak
      const introspection = await this.keycloakService.validateToken(data.token!);
      if (!introspection.active) {
        await this.auditService.logTokenValidation(
          session.userId,
          session.tenantId,
          false,
          'Token inactive',
        );
        return {
          valid: false,
          userId: '',
          tenantId: '',
          roles: [],
        };
      }

      // Update session activity
      await this.sessionService.updateSessionActivity(session.id);

      // Get cached permissions or fetch from Keycloak
      const permissions = await this.permissionCacheService.warmCache(
        session.userId,
        session.tenantId,
        async () => {
          const roles = await this.keycloakService.getUserRoles(session.userId);
          return {
            userId: session.userId,
            tenantId: session.tenantId,
            roles: roles.map((r) => r.name),
            permissions: [],
          };
        },
      );

      await this.auditService.logTokenValidation(session.userId, session.tenantId, true);

      return {
        valid: true,
        userId: session.userId,
        tenantId: session.tenantId,
        roles: permissions.roles,
      };
    } catch (error: any) {
      this.logger.error('Token validation failed', error);
      return {
        valid: false,
        userId: '',
        tenantId: '',
        roles: [],
      };
    }
  }

  @GrpcMethod('AuthService', 'RefreshToken')
  async refreshToken(
    data: fountane.auth.IRefreshTokenRequest,
  ): Promise<fountane.auth.IRefreshTokenResponse> {
    try {
      // Check rate limit
      const session = await this.sessionService.findSessionByRefreshToken(data.refreshToken!);
      if (!session) {
        throw new RpcException({
          code: status.UNAUTHENTICATED,
          message: 'Invalid refresh token',
        });
      }

      const rateLimit = await this.rateLimitService.checkLimit(session.userId, 'refresh');
      if (!rateLimit.allowed) {
        await this.auditService.logTokenRefresh(
          session.userId,
          session.tenantId,
          false,
          'Rate limit exceeded',
        );
        throw new RpcException({
          code: status.RESOURCE_EXHAUSTED,
          message: 'Too many refresh attempts. Please try again later.',
        });
      }

      // Refresh with Keycloak
      const tokenResponse = await this.keycloakService.refreshToken(data.refreshToken!);

      // Update session
      await this.sessionService.refreshSession(
        data.refreshToken!,
        tokenResponse.access_token,
        tokenResponse.refresh_token,
        tokenResponse.expires_in,
      );

      await this.auditService.logTokenRefresh(session.userId, session.tenantId, true);

      return {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresIn: tokenResponse.expires_in,
      };
    } catch (error: any) {
      if (error instanceof RpcException) {
        throw error;
      }

      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'Failed to refresh token',
      });
    }
  }

  @GrpcMethod('AuthService', 'CreateUser')
  async createUser(
    data: fountane.auth.ICreateUserRequest,
    metadata?: any,
  ): Promise<fountane.auth.ICreateUserResponse> {
    const createdBy = metadata?.get('user-id')?.[0] || 'system';

    try {
      const user = await this.keycloakService.createUser({
        email: data.email!,
        username: data.username!,
        password: data.password!,
        firstName: data.firstName!,
        lastName: data.lastName!,
        tenantId: data.tenantId!,
        attributes: data.attributes,
      });

      await this.auditService.logUserCreation(user.id, data.tenantId!, createdBy, true);

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          tenantId: data.tenantId!,
          enabled: user.enabled,
          attributes: Object.entries(user.attributes).reduce(
            (acc, [key, value]) => ({ ...acc, [key]: value[0] }),
            {},
          ),
          createdAt: user.createdTimestamp,
          updatedAt: user.createdTimestamp,
        },
      };
    } catch (error: any) {
      await this.auditService.logUserCreation('', data.tenantId!, createdBy, false, error.message);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Failed to create user',
      });
    }
  }

  @GrpcMethod('AuthService', 'AssignRole')
  async assignRole(
    data: fountane.auth.IAssignRoleRequest,
    metadata?: any,
  ): Promise<fountane.auth.IAssignRoleResponse> {
    const assignedBy = metadata?.get('user-id')?.[0] || 'system';

    try {
      await this.keycloakService.assignRole(data.userId!, data.roleName!);

      // Invalidate permission cache
      await this.permissionCacheService.invalidateCache(data.userId!, data.tenantId);

      await this.auditService.logRoleAssignment(
        data.userId!,
        data.tenantId!,
        assignedBy,
        data.roleName!,
        true,
      );

      return { success: true };
    } catch (error: any) {
      await this.auditService.logRoleAssignment(
        data.userId!,
        data.tenantId!,
        assignedBy,
        data.roleName!,
        false,
        error.message,
      );
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Failed to assign role',
      });
    }
  }
}
