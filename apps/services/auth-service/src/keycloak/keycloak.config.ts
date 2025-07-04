import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface KeycloakConfig {
  authServerUrl: string;
  realm: string;
  clientId: string;
  clientSecret: string;
  adminUsername: string;
  adminPassword: string;
}

@Injectable()
export class KeycloakConfigService {
  constructor(private configService: ConfigService) {}

  getConfig(): KeycloakConfig {
    return {
      authServerUrl: this.configService.get<string>(
        'KEYCLOAK_AUTH_SERVER_URL',
        'http://keycloak:8080',
      ),
      realm: this.configService.get<string>('KEYCLOAK_REALM', 'fountane'),
      clientId: this.configService.get<string>('KEYCLOAK_CLIENT_ID', 'fountane-auth-service'),
      clientSecret: this.configService.get<string>('KEYCLOAK_CLIENT_SECRET', 'secret'),
      adminUsername: this.configService.get<string>('KEYCLOAK_ADMIN_USERNAME', 'admin'),
      adminPassword: this.configService.get<string>('KEYCLOAK_ADMIN_PASSWORD', 'admin'),
    };
  }
}
