import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: { username: string; password: string; tenantId?: string }) {
    const response = await this.authService.authenticate(
      loginDto.username,
      loginDto.password,
      loginDto.tenantId,
    );

    // Generate gateway-specific token with user info
    const gatewayToken = await this.authService.generateGatewayToken({
      userId: response.user.id,
      email: response.user.email,
      tenantId: response.user.tenant_id,
      roles: response.user.roles,
    });

    return {
      ...response,
      gatewayToken,
    };
  }

  @Post('refresh')
  async refresh(@Body() refreshDto: { refreshToken: string }) {
    return this.authService.refreshToken(refreshDto.refreshToken);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async getProfile(@Request() req: any) {
    return this.authService.getUser(req.user.userId);
  }

  @UseGuards(AuthGuard)
  @Post('validate')
  async validate(@Request() req: any) {
    return {
      valid: true,
      user: req.user,
    };
  }
}
