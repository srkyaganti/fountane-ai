import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as jwt from 'jsonwebtoken';

export interface CentrifugoConfig {
  url: string;
  apiKey: string;
  secret: string;
  tokenHmacSecretKey: string;
}

export interface CentrifugoPublishData {
  channel: string;
  data: any;
}

export interface CentrifugoPresenceStats {
  numClients: number;
  numUsers: number;
}

export interface CentrifugoClient {
  client: string;
  user: string;
  connInfo?: any;
  chanInfo?: any;
}

@Injectable()
export class CentrifugoService implements OnModuleInit {
  private readonly logger = new Logger(CentrifugoService.name);
  private client: AxiosInstance;
  private config: CentrifugoConfig;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.config = {
      url: this.configService.get<string>('CENTRIFUGO_URL', 'http://localhost:8000'),
      apiKey: this.configService.get<string>('CENTRIFUGO_API_KEY', ''),
      secret: this.configService.get<string>('CENTRIFUGO_SECRET', ''),
      tokenHmacSecretKey: this.configService.get<string>('CENTRIFUGO_TOKEN_HMAC_SECRET_KEY', ''),
    };

    this.client = axios.create({
      baseURL: `${this.config.url}/api`,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
      },
    });

    this.logger.log('Centrifugo service initialized');
  }

  /**
   * Generate JWT token for client authentication
   */
  generateConnectionToken(userId: string, expiresIn: number = 3600): string {
    const payload = {
      sub: userId,
      exp: Math.floor(Date.now() / 1000) + expiresIn,
    };

    return jwt.sign(payload, this.config.tokenHmacSecretKey);
  }

  /**
   * Generate subscription token for private channels
   */
  generateSubscriptionToken(userId: string, channel: string, expiresIn: number = 3600): string {
    const payload = {
      sub: userId,
      channel,
      exp: Math.floor(Date.now() / 1000) + expiresIn,
    };

    return jwt.sign(payload, this.config.tokenHmacSecretKey);
  }

  /**
   * Publish message to a channel
   */
  async publish(channel: string, data: any): Promise<void> {
    try {
      const response = await this.client.post('/', {
        method: 'publish',
        params: {
          channel,
          data,
        },
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
    } catch (error) {
      this.logger.error(`Failed to publish to channel ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Publish multiple messages
   */
  async publishBatch(publishes: CentrifugoPublishData[]): Promise<void> {
    try {
      const commands = publishes.map((pub) => ({
        method: 'publish',
        params: {
          channel: pub.channel,
          data: pub.data,
        },
      }));

      const response = await this.client.post('/', {
        commands,
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
    } catch (error) {
      this.logger.error('Failed to publish batch:', error);
      throw error;
    }
  }

  /**
   * Get presence information for a channel
   */
  async presence(channel: string): Promise<CentrifugoClient[]> {
    try {
      const response = await this.client.post('/', {
        method: 'presence',
        params: {
          channel,
        },
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return response.data.result.presence || [];
    } catch (error) {
      this.logger.error(`Failed to get presence for channel ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Get presence stats for a channel
   */
  async presenceStats(channel: string): Promise<CentrifugoPresenceStats> {
    try {
      const response = await this.client.post('/', {
        method: 'presence_stats',
        params: {
          channel,
        },
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return response.data.result;
    } catch (error) {
      this.logger.error(`Failed to get presence stats for channel ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Get channel history
   */
  async history(channel: string, limit: number = 100, reverse: boolean = false): Promise<any[]> {
    try {
      const response = await this.client.post('/', {
        method: 'history',
        params: {
          channel,
          limit,
          reverse,
        },
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return response.data.result.publications || [];
    } catch (error) {
      this.logger.error(`Failed to get history for channel ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Remove channel history
   */
  async historyRemove(channel: string): Promise<void> {
    try {
      const response = await this.client.post('/', {
        method: 'history_remove',
        params: {
          channel,
        },
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
    } catch (error) {
      this.logger.error(`Failed to remove history for channel ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Disconnect a user
   */
  async disconnect(user: string, disconnect?: boolean): Promise<void> {
    try {
      const response = await this.client.post('/', {
        method: 'disconnect',
        params: {
          user,
          disconnect,
        },
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
    } catch (error) {
      this.logger.error(`Failed to disconnect user ${user}:`, error);
      throw error;
    }
  }

  /**
   * Refresh user connection
   */
  async refresh(user: string, client?: string, expired?: boolean): Promise<void> {
    try {
      const response = await this.client.post('/', {
        method: 'refresh',
        params: {
          user,
          client,
          expired,
        },
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
    } catch (error) {
      this.logger.error(`Failed to refresh connection for user ${user}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe user to a channel
   */
  async subscribe(user: string, channel: string): Promise<void> {
    try {
      const response = await this.client.post('/', {
        method: 'subscribe',
        params: {
          user,
          channel,
        },
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
    } catch (error) {
      this.logger.error(`Failed to subscribe user ${user} to channel ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe user from a channel
   */
  async unsubscribe(user: string, channel: string): Promise<void> {
    try {
      const response = await this.client.post('/', {
        method: 'unsubscribe',
        params: {
          user,
          channel,
        },
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
    } catch (error) {
      this.logger.error(`Failed to unsubscribe user ${user} from channel ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Get channels list
   */
  async channels(pattern?: string): Promise<string[]> {
    try {
      const response = await this.client.post('/', {
        method: 'channels',
        params: pattern ? { pattern } : {},
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return response.data.result.channels || [];
    } catch (error) {
      this.logger.error('Failed to get channels:', error);
      throw error;
    }
  }
}
