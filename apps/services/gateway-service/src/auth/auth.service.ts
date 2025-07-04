import { Injectable, Inject, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import { firstValueFrom } from 'rxjs';

interface AuthServiceGrpc {
  authenticate(data: any): any;
  validateToken(data: any): any;
  refreshToken(data: any): any;
  getUser(data: any): any;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private authServiceGrpc: AuthServiceGrpc;

  constructor(
    @Inject('AUTH_SERVICE') private client: ClientGrpc,
    private jwtService: JwtService,
  ) {}

  onModuleInit() {
    this.authServiceGrpc = this.client.getService<AuthServiceGrpc>('AuthService');
  }

  async authenticate(username: string, password: string, tenantId?: string) {
    try {
      const response = await firstValueFrom(
        this.authServiceGrpc.authenticate({
          username,
          password,
          tenant_id: tenantId,
        }),
      );
      return response;
    } catch (error) {
      throw new UnauthorizedException('Authentication failed');
    }
  }

  async validateToken(token: string) {
    try {
      const response = await firstValueFrom(this.authServiceGrpc.validateToken({ token }));
      return response;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const response = await firstValueFrom(
        this.authServiceGrpc.refreshToken({ refresh_token: refreshToken }),
      );
      return response;
    } catch (error) {
      throw new UnauthorizedException('Token refresh failed');
    }
  }

  async getUser(userId: string) {
    try {
      const response = await firstValueFrom(this.authServiceGrpc.getUser({ user_id: userId }));
      return response;
    } catch (error) {
      throw new UnauthorizedException('User not found');
    }
  }

  async generateGatewayToken(payload: any) {
    return this.jwtService.sign(payload);
  }

  async verifyGatewayToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid gateway token');
    }
  }
}
