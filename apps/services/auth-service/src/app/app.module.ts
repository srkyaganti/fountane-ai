import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthController } from '../auth/auth.controller';
import { AuthEnhancedController } from '../auth/auth-enhanced.controller';
import { KeycloakService } from '../keycloak/keycloak.service';
import { KeycloakConfigService } from '../keycloak/keycloak.config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SessionService } from '../session/session.service';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import { TokenBlacklistService } from '../token/token-blacklist.service';
import { PermissionCacheService } from '../cache/permission-cache.service';
import { CleanupService } from '../cleanup/cleanup.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local', '.env.production'],
    }),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        timeout: 5000,
        maxRedirects: 5,
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [AuthController, AuthEnhancedController],
  providers: [
    PrismaService,
    KeycloakService,
    KeycloakConfigService,
    AuditService,
    SessionService,
    RateLimitService,
    TokenBlacklistService,
    PermissionCacheService,
    CleanupService,
  ],
})
export class AppModule {}
