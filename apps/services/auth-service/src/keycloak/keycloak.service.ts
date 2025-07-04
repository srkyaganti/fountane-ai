import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { KeycloakConfigService, KeycloakConfig } from './keycloak.config';

export interface KeycloakUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  enabled: boolean;
  attributes: Record<string, string[]>;
  createdTimestamp: number;
}

export interface KeycloakRole {
  id: string;
  name: string;
  description?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

@Injectable()
export class KeycloakService implements OnModuleInit {
  private readonly logger = new Logger(KeycloakService.name);
  private config: KeycloakConfig;
  private adminToken: string;
  private tokenExpiry: number;

  constructor(
    private readonly keycloakConfig: KeycloakConfigService,
    private readonly httpService: HttpService,
  ) {
    this.config = this.keycloakConfig.getConfig();
  }

  async onModuleInit() {
    await this.refreshAdminToken();
  }

  private async refreshAdminToken(): Promise<void> {
    try {
      const params = new URLSearchParams({
        grant_type: 'password',
        client_id: 'admin-cli',
        username: this.config.adminUsername,
        password: this.config.adminPassword,
      });

      const response = await firstValueFrom(
        this.httpService.post<TokenResponse>(
          `${this.config.authServerUrl}/realms/master/protocol/openid-connect/token`,
          params.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      this.adminToken = response.data.access_token;
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000;
    } catch (error) {
      this.logger.error('Failed to refresh admin token', error);
      throw error;
    }
  }

  private async getAdminHeaders(): Promise<Record<string, string>> {
    if (!this.adminToken || Date.now() >= this.tokenExpiry) {
      await this.refreshAdminToken();
    }

    return {
      Authorization: `Bearer ${this.adminToken}`,
      'Content-Type': 'application/json',
    };
  }

  async authenticate(username: string, password: string, tenantId: string): Promise<TokenResponse> {
    try {
      const params = new URLSearchParams({
        grant_type: 'password',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        username,
        password,
        scope: 'openid profile email',
      });

      const response = await firstValueFrom(
        this.httpService.post<TokenResponse>(
          `${this.config.authServerUrl}/realms/${this.config.realm}/protocol/openid-connect/token`,
          params.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error('Authentication failed', error);
      throw error;
    }
  }

  async validateToken(token: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.config.authServerUrl}/realms/${this.config.realm}/protocol/openid-connect/token/introspect`,
          new URLSearchParams({
            token,
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
          }).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error('Token validation failed', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      });

      const response = await firstValueFrom(
        this.httpService.post<TokenResponse>(
          `${this.config.authServerUrl}/realms/${this.config.realm}/protocol/openid-connect/token`,
          params.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error('Token refresh failed', error);
      throw error;
    }
  }

  async getUser(userId: string): Promise<KeycloakUser> {
    try {
      const headers = await this.getAdminHeaders();
      const response = await firstValueFrom(
        this.httpService.get<KeycloakUser>(
          `${this.config.authServerUrl}/admin/realms/${this.config.realm}/users/${userId}`,
          { headers },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get user', error);
      throw error;
    }
  }

  async createUser(userData: {
    email: string;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    tenantId: string;
    attributes?: Record<string, string>;
  }): Promise<KeycloakUser> {
    try {
      const headers = await this.getAdminHeaders();

      const userPayload = {
        username: userData.username,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        enabled: true,
        attributes: {
          tenantId: [userData.tenantId],
          ...Object.entries(userData.attributes || {}).reduce(
            (acc, [key, value]) => ({ ...acc, [key]: [value] }),
            {},
          ),
        },
        credentials: [
          {
            type: 'password',
            value: userData.password,
            temporary: false,
          },
        ],
      };

      const createResponse = await firstValueFrom(
        this.httpService.post(
          `${this.config.authServerUrl}/admin/realms/${this.config.realm}/users`,
          userPayload,
          { headers },
        ),
      );

      const locationHeader = createResponse.headers.location;
      const userId = locationHeader.split('/').pop();

      return this.getUser(userId);
    } catch (error) {
      this.logger.error('Failed to create user', error);
      throw error;
    }
  }

  async updateUser(
    userId: string,
    updates: {
      email?: string;
      firstName?: string;
      lastName?: string;
      attributes?: Record<string, string>;
    },
  ): Promise<KeycloakUser> {
    try {
      const headers = await this.getAdminHeaders();
      const currentUser = await this.getUser(userId);

      const updatePayload: any = {
        ...currentUser,
        email: updates.email || currentUser.email,
        firstName: updates.firstName || currentUser.firstName,
        lastName: updates.lastName || currentUser.lastName,
      };

      if (updates.attributes) {
        updatePayload.attributes = {
          ...currentUser.attributes,
          ...Object.entries(updates.attributes).reduce(
            (acc, [key, value]) => ({ ...acc, [key]: [value] }),
            {},
          ),
        };
      }

      await firstValueFrom(
        this.httpService.put(
          `${this.config.authServerUrl}/admin/realms/${this.config.realm}/users/${userId}`,
          updatePayload,
          { headers },
        ),
      );

      return this.getUser(userId);
    } catch (error) {
      this.logger.error('Failed to update user', error);
      throw error;
    }
  }

  async assignRole(userId: string, roleName: string): Promise<void> {
    try {
      const headers = await this.getAdminHeaders();

      const rolesResponse = await firstValueFrom(
        this.httpService.get<KeycloakRole[]>(
          `${this.config.authServerUrl}/admin/realms/${this.config.realm}/roles`,
          { headers },
        ),
      );

      const role = rolesResponse.data.find((r) => r.name === roleName);
      if (!role) {
        throw new Error(`Role ${roleName} not found`);
      }

      await firstValueFrom(
        this.httpService.post(
          `${this.config.authServerUrl}/admin/realms/${this.config.realm}/users/${userId}/role-mappings/realm`,
          [role],
          { headers },
        ),
      );
    } catch (error) {
      this.logger.error('Failed to assign role', error);
      throw error;
    }
  }

  async revokeRole(userId: string, roleName: string): Promise<void> {
    try {
      const headers = await this.getAdminHeaders();

      const rolesResponse = await firstValueFrom(
        this.httpService.get<KeycloakRole[]>(
          `${this.config.authServerUrl}/admin/realms/${this.config.realm}/roles`,
          { headers },
        ),
      );

      const role = rolesResponse.data.find((r) => r.name === roleName);
      if (!role) {
        throw new Error(`Role ${roleName} not found`);
      }

      await firstValueFrom(
        this.httpService.delete(
          `${this.config.authServerUrl}/admin/realms/${this.config.realm}/users/${userId}/role-mappings/realm`,
          {
            headers,
            data: [role],
          },
        ),
      );
    } catch (error) {
      this.logger.error('Failed to revoke role', error);
      throw error;
    }
  }

  async getUserRoles(userId: string): Promise<KeycloakRole[]> {
    try {
      const headers = await this.getAdminHeaders();

      const response = await firstValueFrom(
        this.httpService.get<KeycloakRole[]>(
          `${this.config.authServerUrl}/admin/realms/${this.config.realm}/users/${userId}/role-mappings/realm`,
          { headers },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get user roles', error);
      throw error;
    }
  }
}
