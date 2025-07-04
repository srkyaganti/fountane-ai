import { Injectable, Logger } from '@nestjs/common';
import { CentrifugoService } from '../centrifugo/centrifugo.service';
import { v4 as uuidv4 } from 'uuid';

export enum ChannelType {
  USER = 'USER',
  TEAM = 'TEAM',
  SYSTEM = 'SYSTEM',
  PRESENCE = 'PRESENCE',
  PRIVATE = 'PRIVATE',
}

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  tenantId: string;
  metadata: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
  settings: ChannelSettings;
}

export interface ChannelSettings {
  historyEnabled: boolean;
  historyTtlSeconds: number;
  presenceEnabled: boolean;
  pushNotificationsEnabled: boolean;
  maxSubscribers: number;
}

@Injectable()
export class ChannelService {
  private readonly logger = new Logger(ChannelService.name);
  private channels: Map<string, Channel> = new Map();

  constructor(private centrifugoService: CentrifugoService) {}

  /**
   * Create a new channel
   */
  async createChannel(
    name: string,
    type: ChannelType,
    tenantId: string,
    metadata: Record<string, string> = {},
    settings: Partial<ChannelSettings> = {},
  ): Promise<Channel> {
    const channelId = this.generateChannelId(type, tenantId, name);

    const channel: Channel = {
      id: channelId,
      name,
      type,
      tenantId,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {
        historyEnabled: settings.historyEnabled ?? true,
        historyTtlSeconds: settings.historyTtlSeconds ?? 86400, // 24 hours
        presenceEnabled: settings.presenceEnabled ?? true,
        pushNotificationsEnabled: settings.pushNotificationsEnabled ?? false,
        maxSubscribers: settings.maxSubscribers ?? 1000,
        ...settings,
      },
    };

    this.channels.set(channelId, channel);
    this.logger.log(`Channel created: ${channelId}`);

    return channel;
  }

  /**
   * Delete a channel
   */
  async deleteChannel(channelId: string): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel not found: ${channelId}`);
    }

    // Remove history if exists
    if (channel.settings.historyEnabled) {
      await this.centrifugoService.historyRemove(channelId);
    }

    this.channels.delete(channelId);
    this.logger.log(`Channel deleted: ${channelId}`);
  }

  /**
   * Get channel by ID
   */
  async getChannel(channelId: string): Promise<Channel | null> {
    return this.channels.get(channelId) || null;
  }

  /**
   * List channels
   */
  async listChannels(
    tenantId: string,
    type?: ChannelType,
    pageSize: number = 100,
    pageToken?: string,
  ): Promise<{
    channels: Channel[];
    nextPageToken?: string;
    totalCount: number;
  }> {
    let channels = Array.from(this.channels.values()).filter(
      (channel) => channel.tenantId === tenantId,
    );

    if (type) {
      channels = channels.filter((channel) => channel.type === type);
    }

    // Simple pagination using offset
    const offset = pageToken ? parseInt(pageToken, 10) : 0;
    const paginatedChannels = channels.slice(offset, offset + pageSize);
    const hasMore = offset + pageSize < channels.length;

    return {
      channels: paginatedChannels,
      nextPageToken: hasMore ? String(offset + pageSize) : undefined,
      totalCount: channels.length,
    };
  }

  /**
   * Update channel settings
   */
  async updateChannelSettings(
    channelId: string,
    settings: Partial<ChannelSettings>,
  ): Promise<Channel> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel not found: ${channelId}`);
    }

    channel.settings = { ...channel.settings, ...settings };
    channel.updatedAt = new Date();

    this.channels.set(channelId, channel);
    this.logger.log(`Channel settings updated: ${channelId}`);

    return channel;
  }

  /**
   * Generate channel ID based on type
   */
  private generateChannelId(type: ChannelType, tenantId: string, name: string): string {
    switch (type) {
      case ChannelType.USER:
        return `user:${tenantId}:${name}`;
      case ChannelType.TEAM:
        return `team:${tenantId}:${name}`;
      case ChannelType.SYSTEM:
        return `system:${tenantId}:${name}`;
      case ChannelType.PRESENCE:
        return `presence:${tenantId}:${name}`;
      case ChannelType.PRIVATE:
        return `private:${tenantId}:${uuidv4()}`;
      default:
        return `channel:${tenantId}:${name}`;
    }
  }

  /**
   * Check if user has access to channel
   */
  async checkChannelAccess(userId: string, channelId: string): Promise<boolean> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return false;
    }

    // Implement your access control logic here
    // For now, we'll allow access to all channels
    // In production, you'd check against permissions, team membership, etc.
    return true;
  }

  /**
   * Get channels for a user
   */
  async getUserChannels(userId: string, tenantId: string): Promise<Channel[]> {
    // In a real implementation, this would query channels based on user permissions
    const channels = Array.from(this.channels.values()).filter(
      (channel) => channel.tenantId === tenantId,
    );

    // Filter channels user has access to
    const accessibleChannels: Channel[] = [];
    for (const channel of channels) {
      if (await this.checkChannelAccess(userId, channel.id)) {
        accessibleChannels.push(channel);
      }
    }

    return accessibleChannels;
  }
}
