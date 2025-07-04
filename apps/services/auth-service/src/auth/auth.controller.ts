import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { KeycloakService } from '../keycloak/keycloak.service';
import { fountane } from '@fountane/core/proto';

@Controller()
export class AuthController {
  constructor(private readonly keycloakService: KeycloakService) {}

  @GrpcMethod('AuthService', 'Authenticate')
  async authenticate(
    data: fountane.auth.IAuthenticateRequest,
  ): Promise<fountane.auth.IAuthenticateResponse> {
    const tokenResponse = await this.keycloakService.authenticate(
      data.username,
      data.password,
      data.tenantId,
    );

    const introspection = await this.keycloakService.validateToken(tokenResponse.access_token);
    const user = await this.keycloakService.getUser(introspection.sub);

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
        tenantId: user.attributes.tenantId?.[0] || data.tenantId,
        enabled: user.enabled,
        attributes: Object.entries(user.attributes).reduce(
          (acc, [key, value]) => ({ ...acc, [key]: value[0] }),
          {},
        ),
        createdAt: user.createdTimestamp,
        updatedAt: user.createdTimestamp,
      },
    };
  }

  @GrpcMethod('AuthService', 'ValidateToken')
  async validateToken(
    data: fountane.auth.IValidateTokenRequest,
  ): Promise<fountane.auth.IValidateTokenResponse> {
    const introspection = await this.keycloakService.validateToken(data.token);

    if (!introspection.active) {
      return {
        valid: false,
        userId: '',
        tenantId: '',
        roles: [],
      };
    }

    const roles = await this.keycloakService.getUserRoles(introspection.sub);

    return {
      valid: true,
      userId: introspection.sub,
      tenantId: introspection.tenant_id || '',
      roles: roles.map((role) => role.name),
    };
  }

  @GrpcMethod('AuthService', 'RefreshToken')
  async refreshToken(
    data: fountane.auth.IRefreshTokenRequest,
  ): Promise<fountane.auth.IRefreshTokenResponse> {
    const tokenResponse = await this.keycloakService.refreshToken(data.refreshToken);

    return {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresIn: tokenResponse.expires_in,
    };
  }

  @GrpcMethod('AuthService', 'GetUser')
  async getUser(data: fountane.auth.IGetUserRequest): Promise<fountane.auth.IGetUserResponse> {
    const user = await this.keycloakService.getUser(data.userId);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.attributes.tenantId?.[0] || '',
        enabled: user.enabled,
        attributes: Object.entries(user.attributes).reduce(
          (acc, [key, value]) => ({ ...acc, [key]: value[0] }),
          {},
        ),
        createdAt: user.createdTimestamp,
        updatedAt: user.createdTimestamp,
      },
    };
  }

  @GrpcMethod('AuthService', 'CreateUser')
  async createUser(
    data: fountane.auth.ICreateUserRequest,
  ): Promise<fountane.auth.ICreateUserResponse> {
    const user = await this.keycloakService.createUser({
      email: data.email,
      username: data.username,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      tenantId: data.tenantId,
      attributes: data.attributes,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: data.tenantId,
        enabled: user.enabled,
        attributes: Object.entries(user.attributes).reduce(
          (acc, [key, value]) => ({ ...acc, [key]: value[0] }),
          {},
        ),
        createdAt: user.createdTimestamp,
        updatedAt: user.createdTimestamp,
      },
    };
  }

  @GrpcMethod('AuthService', 'UpdateUser')
  async updateUser(
    data: fountane.auth.IUpdateUserRequest,
  ): Promise<fountane.auth.IUpdateUserResponse> {
    const updates: any = {};
    if (data.email !== undefined) updates.email = data.email;
    if (data.firstName !== undefined) updates.firstName = data.firstName;
    if (data.lastName !== undefined) updates.lastName = data.lastName;
    if (data.attributes) updates.attributes = data.attributes;

    const user = await this.keycloakService.updateUser(data.userId, updates);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.attributes.tenantId?.[0] || '',
        enabled: user.enabled,
        attributes: Object.entries(user.attributes).reduce(
          (acc, [key, value]) => ({ ...acc, [key]: value[0] }),
          {},
        ),
        createdAt: user.createdTimestamp,
        updatedAt: user.createdTimestamp,
      },
    };
  }

  @GrpcMethod('AuthService', 'AssignRole')
  async assignRole(
    data: fountane.auth.IAssignRoleRequest,
  ): Promise<fountane.auth.IAssignRoleResponse> {
    await this.keycloakService.assignRole(data.userId, data.roleName);
    return { success: true };
  }

  @GrpcMethod('AuthService', 'RevokeRole')
  async revokeRole(
    data: fountane.auth.IRevokeRoleRequest,
  ): Promise<fountane.auth.IRevokeRoleResponse> {
    await this.keycloakService.revokeRole(data.userId, data.roleName);
    return { success: true };
  }

  @GrpcMethod('AuthService', 'GetUserRoles')
  async getUserRoles(
    data: fountane.auth.IGetUserRolesRequest,
  ): Promise<fountane.auth.IGetUserRolesResponse> {
    const roles = await this.keycloakService.getUserRoles(data.userId);

    return {
      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description || '',
      })),
    };
  }
}
