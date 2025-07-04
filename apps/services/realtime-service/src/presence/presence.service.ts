import { Injectable, Logger } from '@nestjs/common';
import { CentrifugoService } from '../centrifugo/centrifugo.service';
import { ChannelService } from '../channels/channel.service';

export interface PresenceInfo {
  userId: string;
  clientId: string;
  metadata: Record<string, string>;
  joinedAt: Date;
}

export interface PresenceStats {
  totalUsers: number;
  totalClients: number;
  lastActivity: Date;
}

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  constructor(
    private centrifugoService: CentrifugoService,
    private channelService: ChannelService,
  ) {}

  /**
   * Get presence information for a channel
   */
  async getPresence(channelId: string, userId: string): Promise<PresenceInfo[]> {
    // Verify channel exists and user has access
    const channel = await this.channelService.getChannel(channelId);
    if (!channel) {
      throw new Error(`Channel not found: ${channelId}`);
    }

    const hasAccess = await this.channelService.checkChannelAccess(userId, channelId);
    if (!hasAccess) {
      throw new Error('User does not have access to this channel');
    }

    if (!channel.settings.presenceEnabled) {
      return [];
    }

    // Get presence from Centrifugo
    const clients = await this.centrifugoService.presence(channelId);

    // Transform to our format
    const presenceInfo: PresenceInfo[] = clients.map((client) => ({
      userId: client.user,
      clientId: client.client,
      metadata: client.chanInfo || {},
      joinedAt: new Date(), // Centrifugo doesn't provide join time directly
    }));

    return presenceInfo;
  }

  /**
   * Get presence statistics for a channel
   */
  async getPresenceStats(channelId: string, userId: string): Promise<PresenceStats> {
    // Verify channel exists and user has access
    const channel = await this.channelService.getChannel(channelId);
    if (!channel) {
      throw new Error(`Channel not found: ${channelId}`);
    }

    const hasAccess = await this.channelService.checkChannelAccess(userId, channelId);
    if (!hasAccess) {
      throw new Error('User does not have access to this channel');
    }

    if (!channel.settings.presenceEnabled) {
      return {
        totalUsers: 0,
        totalClients: 0,
        lastActivity: new Date(),
      };
    }

    // Get stats from Centrifugo
    const stats = await this.centrifugoService.presenceStats(channelId);

    return {
      totalUsers: stats.numUsers,
      totalClients: stats.numClients,
      lastActivity: new Date(), // Would need to track this separately
    };
  }

  /**
   * Get all online users in a tenant
   */
  async getOnlineUsers(tenantId: string): Promise<Set<string>> {
    const onlineUsers = new Set<string>();

    // Get all channels for the tenant
    const { channels } = await this.channelService.listChannels(tenantId);

    // Check presence in each channel
    for (const channel of channels) {
      if (channel.settings.presenceEnabled) {
        try {
          const clients = await this.centrifugoService.presence(channel.id);
          clients.forEach((client) => onlineUsers.add(client.user));
        } catch (error) {
          this.logger.warn(`Failed to get presence for channel ${channel.id}:`, error);
        }
      }
    }

    return onlineUsers;
  }

  /**
   * Check if a user is online
   */
  async isUserOnline(userId: string, tenantId: string): Promise<boolean> {
    const onlineUsers = await this.getOnlineUsers(tenantId);
    return onlineUsers.has(userId);
  }

  /**
   * Get channels where user is present
   */
  async getUserChannels(userId: string, tenantId: string): Promise<string[]> {
    const userChannels: string[] = [];
    const { channels } = await this.channelService.listChannels(tenantId);

    for (const channel of channels) {
      if (channel.settings.presenceEnabled) {
        try {
          const clients = await this.centrifugoService.presence(channel.id);
          if (clients.some((client) => client.user === userId)) {
            userChannels.push(channel.id);
          }
        } catch (error) {
          this.logger.warn(`Failed to check presence in channel ${channel.id}:`, error);
        }
      }
    }

    return userChannels;
  }

  /**
   * Update user presence metadata
   */
  async updatePresenceMetadata(
    userId: string,
    channelId: string,
    metadata: Record<string, string>,
  ): Promise<void> {
    // This would require custom Centrifugo implementation
    // For now, we log the intent
    this.logger.log(
      `Update presence metadata for user ${userId} in channel ${channelId}:`,
      metadata,
    );
  }

  /**
   * Track user activity
   */
  async trackActivity(userId: string, channelId: string, activity: string): Promise<void> {
    // Publish activity as a special message
    const message = {
      type: 'activity',
      activity,
      userId,
      timestamp: new Date(),
    };

    await this.centrifugoService.publish(`${channelId}:activity`, message);
  }

  /**
   * Get active users count by channel type
   */
  async getActiveUsersByChannelType(tenantId: string): Promise<Record<string, number>> {
    const stats: Record<string, number> = {
      USER: 0,
      TEAM: 0,
      SYSTEM: 0,
      PRESENCE: 0,
      PRIVATE: 0,
    };

    const { channels } = await this.channelService.listChannels(tenantId);

    for (const channel of channels) {
      if (channel.settings.presenceEnabled) {
        try {
          const presenceStats = await this.centrifugoService.presenceStats(channel.id);
          stats[channel.type] += presenceStats.numUsers;
        } catch (error) {
          this.logger.warn(`Failed to get stats for channel ${channel.id}:`, error);
        }
      }
    }

    return stats;
  }
}
