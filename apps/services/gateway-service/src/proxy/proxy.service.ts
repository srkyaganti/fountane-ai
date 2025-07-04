import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createProxyMiddleware, RequestHandler } from 'http-proxy-middleware';

interface ServiceConfig {
  url: string;
  path: string;
}

@Injectable()
export class ProxyService {
  private services: Map<string, ServiceConfig>;
  private proxies: Map<string, RequestHandler>;

  constructor(private configService: ConfigService) {
    this.services = new Map();
    this.proxies = new Map();
    this.initializeServices();
  }

  private initializeServices() {
    // Initialize service configurations
    const servicesConfig = this.configService.get('services');

    // Map service paths to their configurations
    this.services.set('workflow', {
      url: servicesConfig.workflow.url,
      path: '/workflow',
    });

    this.services.set('queue', {
      url: servicesConfig.queue.url,
      path: '/queue',
    });

    this.services.set('realtime', {
      url: servicesConfig.realtime.url,
      path: '/realtime',
    });

    this.services.set('feature', {
      url: servicesConfig.feature.url,
      path: '/feature',
    });

    this.services.set('payment', {
      url: servicesConfig.payment.url,
      path: '/payment',
    });

    // Create proxy middleware for each service
    this.services.forEach((config, serviceName) => {
      const proxy = createProxyMiddleware({
        target: `http://${config.url}`,
        changeOrigin: true,
        pathRewrite: {
          [`^/api${config.path}`]: '',
        },
        onError: (err, req, res) => {
          console.error(`Proxy error for ${serviceName}:`, err);
          res.writeHead(502, {
            'Content-Type': 'application/json',
          });
          res.end(
            JSON.stringify({
              error: 'Service unavailable',
              service: serviceName,
              message: err.message,
            }),
          );
        },
        onProxyReq: (proxyReq, req: any) => {
          // Forward user context from JWT
          if (req.user) {
            proxyReq.setHeader('X-User-Id', req.user.userId);
            proxyReq.setHeader('X-Tenant-Id', req.user.tenantId);
            proxyReq.setHeader('X-User-Roles', JSON.stringify(req.user.roles || []));
          }
        },
      });

      this.proxies.set(serviceName, proxy);
    });
  }

  getProxyForPath(path: string): RequestHandler | null {
    // Extract service name from path
    const pathSegments = path.split('/').filter(Boolean);
    if (pathSegments.length < 2) return null;

    const serviceName = pathSegments[1]; // Assuming /api/{service}/...
    return this.proxies.get(serviceName) || null;
  }

  validateServicePath(path: string): boolean {
    const pathSegments = path.split('/').filter(Boolean);
    if (pathSegments.length < 2) return false;

    const serviceName = pathSegments[1];
    return this.services.has(serviceName);
  }
}
