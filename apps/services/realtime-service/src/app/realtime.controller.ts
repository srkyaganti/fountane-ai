import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ChannelService, ChannelType } from '../channels/channel.service';
import { MessageService } from '../messages/message.service';
import { PresenceService } from '../presence/presence.service';
import { CentrifugoService } from '../centrifugo/centrifugo.service';
import { Metadata } from '@grpc/grpc-js';

@Controller()
export class RealtimeController {
  constructor(
    private channelService: ChannelService,
    private messageService: MessageService,
    private presenceService: PresenceService,
    private centrifugoService: CentrifugoService,
  ) {}

  @GrpcMethod('RealtimeService', 'CreateChannel')
  async createChannel(data: any, metadata: Metadata) {
    const { name, type, tenantId, metadata: channelMetadata, settings } = data;

    const channel = await this.channelService.createChannel(
      name,
      this.mapChannelType(type),
      tenantId,
      channelMetadata,
      settings,
    );

    return this.mapChannelToProto(channel);
  }

  @GrpcMethod('RealtimeService', 'DeleteChannel')
  async deleteChannel(data: any, metadata: Metadata) {
    const { channelId } = data;
    await this.channelService.deleteChannel(channelId);
    return {};
  }

  @GrpcMethod('RealtimeService', 'ListChannels')
  async listChannels(data: any, metadata: Metadata) {
    const { tenantId, type, pageSize, pageToken } = data;

    const result = await this.channelService.listChannels(
      tenantId,
      type ? this.mapChannelType(type) : undefined,
      pageSize || 100,
      pageToken,
    );

    return {
      channels: result.channels.map((ch) => this.mapChannelToProto(ch)),
      nextPageToken: result.nextPageToken,
      totalCount: result.totalCount,
    };
  }

  @GrpcMethod('RealtimeService', 'Publish')
  async publish(data: any, metadata: Metadata) {
    const { channelId, content, metadata: msgMetadata, userId } = data;

    const result = await this.messageService.publish(channelId, userId, content, msgMetadata);

    return {
      messageId: result.messageId,
      timestamp: result.timestamp.toISOString(),
    };
  }

  @GrpcMethod('RealtimeService', 'PublishBatch')
  async publishBatch(data: any, metadata: Metadata) {
    const { messages } = data;

    const results = await this.messageService.publishBatch(
      messages.map((msg: any) => ({
        channelId: msg.channelId,
        userId: msg.userId,
        content: msg.content,
        metadata: msg.metadata,
      })),
    );

    return {
      results: results.map((r) => ({
        messageId: r.messageId,
        timestamp: r.timestamp.toISOString(),
      })),
    };
  }

  @GrpcMethod('RealtimeService', 'GetPresence')
  async getPresence(data: any, metadata: Metadata) {
    const { channelId } = data;
    // Extract userId from metadata or authentication context
    const userId = 'system'; // TODO: Get from auth context

    const users = await this.presenceService.getPresence(channelId, userId);

    return {
      users: users.map((u) => ({
        userId: u.userId,
        clientId: u.clientId,
        metadata: u.metadata,
        joinedAt: u.joinedAt.toISOString(),
      })),
    };
  }

  @GrpcMethod('RealtimeService', 'GetPresenceStats')
  async getPresenceStats(data: any, metadata: Metadata) {
    const { channelId } = data;
    const userId = 'system'; // TODO: Get from auth context

    const stats = await this.presenceService.getPresenceStats(channelId, userId);

    return {
      totalUsers: stats.totalUsers,
      totalClients: stats.totalClients,
      lastActivity: stats.lastActivity.toISOString(),
    };
  }

  @GrpcMethod('RealtimeService', 'GetHistory')
  async getHistory(data: any, metadata: Metadata) {
    const { channelId, limit, since, until, reverse } = data;
    const userId = 'system'; // TODO: Get from auth context

    const result = await this.messageService.getHistory(
      channelId,
      userId,
      limit || 100,
      since ? new Date(since) : undefined,
      until ? new Date(until) : undefined,
      reverse || false,
    );

    return {
      messages: result.messages.map((msg) => ({
        id: msg.id,
        channelId: msg.channelId,
        userId: msg.userId,
        content: msg.content,
        metadata: msg.metadata,
        timestamp: msg.timestamp.toISOString(),
      })),
      hasMore: result.hasMore,
    };
  }

  @GrpcMethod('RealtimeService', 'RemoveHistory')
  async removeHistory(data: any, metadata: Metadata) {
    const { channelId, until } = data;

    await this.messageService.removeHistory(channelId, until ? new Date(until) : undefined);

    return {};
  }

  @GrpcMethod('RealtimeService', 'DisconnectUser')
  async disconnectUser(data: any, metadata: Metadata) {
    const { userId, reason } = data;

    await this.centrifugoService.disconnect(userId, true);

    return {};
  }

  @GrpcMethod('RealtimeService', 'RefreshConnection')
  async refreshConnection(data: any, metadata: Metadata) {
    const { userId, token } = data;

    await this.centrifugoService.refresh(userId);

    return {};
  }

  @GrpcMethod('RealtimeService', 'Subscribe')
  async subscribe(data: any, metadata: Metadata) {
    const { userId, channelId, metadata: subMetadata } = data;

    try {
      // Check access
      const hasAccess = await this.channelService.checkChannelAccess(userId, channelId);
      if (!hasAccess) {
        return {
          success: false,
          error: 'Access denied',
        };
      }

      await this.centrifugoService.subscribe(userId, channelId);

      return {
        success: true,
        subscriptionId: `${userId}:${channelId}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @GrpcMethod('RealtimeService', 'Unsubscribe')
  async unsubscribe(data: any, metadata: Metadata) {
    const { userId, channelId } = data;

    await this.centrifugoService.unsubscribe(userId, channelId);

    return {};
  }

  private mapChannelType(protoType: number): ChannelType {
    switch (protoType) {
      case 1:
        return ChannelType.USER;
      case 2:
        return ChannelType.TEAM;
      case 3:
        return ChannelType.SYSTEM;
      case 4:
        return ChannelType.PRESENCE;
      case 5:
        return ChannelType.PRIVATE;
      default:
        return ChannelType.USER;
    }
  }

  private mapChannelToProto(channel: any) {
    return {
      id: channel.id,
      name: channel.name,
      type: this.mapChannelTypeToProto(channel.type),
      tenantId: channel.tenantId,
      metadata: channel.metadata,
      createdAt: channel.createdAt.toISOString(),
      updatedAt: channel.updatedAt.toISOString(),
      settings: {
        historyEnabled: channel.settings.historyEnabled,
        historyTtlSeconds: channel.settings.historyTtlSeconds,
        presenceEnabled: channel.settings.presenceEnabled,
        pushNotificationsEnabled: channel.settings.pushNotificationsEnabled,
        maxSubscribers: channel.settings.maxSubscribers,
      },
    };
  }

  private mapChannelTypeToProto(type: ChannelType): number {
    switch (type) {
      case ChannelType.USER:
        return 1;
      case ChannelType.TEAM:
        return 2;
      case ChannelType.SYSTEM:
        return 3;
      case ChannelType.PRESENCE:
        return 4;
      case ChannelType.PRIVATE:
        return 5;
      default:
        return 0;
    }
  }
}
