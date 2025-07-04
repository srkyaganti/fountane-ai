import {
  Controller,
  All,
  Req,
  Res,
  UseGuards,
  HttpException,
  HttpStatus,
  Next,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ProxyService } from './proxy.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller()
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @UseGuards(AuthGuard)
  @All('*')
  async handleRequest(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    const path = req.path;

    // Validate if the path corresponds to a known service
    if (!this.proxyService.validateServicePath(path)) {
      throw new HttpException('Service not found', HttpStatus.NOT_FOUND);
    }

    // Get the appropriate proxy handler
    const proxy = this.proxyService.getProxyForPath(path);

    if (!proxy) {
      throw new HttpException('Proxy configuration error', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Execute the proxy
    proxy(req, res, next);
  }
}
