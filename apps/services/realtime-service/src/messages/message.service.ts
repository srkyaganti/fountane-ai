import { Injectable, Logger } from '@nestjs/common';
import { CentrifugoService } from '../centrifugo/centrifugo.service';
import { ChannelService } from '../channels/channel.service';
import { v4 as uuidv4 } from 'uuid';

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  metadata: Record<string, string>;
  timestamp: Date;
}

export interface PublishResult {
  messageId: string;
  timestamp: Date;
}

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    private centrifugoService: CentrifugoService,
    private channelService: ChannelService,
  ) {}

  /**
   * Publish a message to a channel
   */
  async publish(
    channelId: string,
    userId: string,
    content: string,
    metadata: Record<string, string> = {},
  ): Promise<PublishResult> {
    // Verify channel exists
    const channel = await this.channelService.getChannel(channelId);
    if (!channel) {
      throw new Error(`Channel not found: ${channelId}`);
    }

    // Check user has access to publish
    const hasAccess = await this.channelService.checkChannelAccess(userId, channelId);
    if (!hasAccess) {
      throw new Error('User does not have access to this channel');
    }

    const message: Message = {
      id: uuidv4(),
      channelId,
      userId,
      content,
      metadata,
      timestamp: new Date(),
    };

    // Publish to Centrifugo
    await this.centrifugoService.publish(channelId, message);

    this.logger.log(`Message published to channel ${channelId} by user ${userId}`);

    return {
      messageId: message.id,
      timestamp: message.timestamp,
    };
  }

  /**
   * Publish multiple messages
   */
  async publishBatch(
    messages: Array<{
      channelId: string;
      userId: string;
      content: string;
      metadata?: Record<string, string>;
    }>,
  ): Promise<PublishResult[]> {
    const results: PublishResult[] = [];
    const publishData: any[] = [];

    for (const msg of messages) {
      // Verify channel exists and user has access
      const channel = await this.channelService.getChannel(msg.channelId);
      if (!channel) {
        throw new Error(`Channel not found: ${msg.channelId}`);
      }

      const hasAccess = await this.channelService.checkChannelAccess(msg.userId, msg.channelId);
      if (!hasAccess) {
        throw new Error(`User ${msg.userId} does not have access to channel ${msg.channelId}`);
      }

      const message: Message = {
        id: uuidv4(),
        channelId: msg.channelId,
        userId: msg.userId,
        content: msg.content,
        metadata: msg.metadata || {},
        timestamp: new Date(),
      };

      publishData.push({
        channel: msg.channelId,
        data: message,
      });

      results.push({
        messageId: message.id,
        timestamp: message.timestamp,
      });
    }

    // Batch publish to Centrifugo
    await this.centrifugoService.publishBatch(publishData);

    this.logger.log(`Batch published ${messages.length} messages`);

    return results;
  }

  /**
   * Get message history for a channel
   */
  async getHistory(
    channelId: string,
    userId: string,
    limit: number = 100,
    since?: Date,
    until?: Date,
    reverse: boolean = false,
  ): Promise<{ messages: Message[]; hasMore: boolean }> {
    // Verify channel exists and user has access
    const channel = await this.channelService.getChannel(channelId);
    if (!channel) {
      throw new Error(`Channel not found: ${channelId}`);
    }

    const hasAccess = await this.channelService.checkChannelAccess(userId, channelId);
    if (!hasAccess) {
      throw new Error('User does not have access to this channel');
    }

    if (!channel.settings.historyEnabled) {
      return { messages: [], hasMore: false };
    }

    // Get history from Centrifugo
    const publications = await this.centrifugoService.history(channelId, limit, reverse);

    // Filter by time range if provided
    let messages: Message[] = publications
      .map((pub) => pub.data as Message)
      .filter((msg) => {
        const msgTime = new Date(msg.timestamp).getTime();
        if (since && msgTime < since.getTime()) return false;
        if (until && msgTime > until.getTime()) return false;
        return true;
      });

    // Limit results
    const hasMore = messages.length > limit;
    if (hasMore) {
      messages = messages.slice(0, limit);
    }

    return { messages, hasMore };
  }

  /**
   * Remove message history for a channel
   */
  async removeHistory(channelId: string, until?: Date): Promise<void> {
    const channel = await this.channelService.getChannel(channelId);
    if (!channel) {
      throw new Error(`Channel not found: ${channelId}`);
    }

    // For now, we remove all history
    // In a real implementation, you'd filter by date
    await this.centrifugoService.historyRemove(channelId);

    this.logger.log(`History removed for channel ${channelId}`);
  }

  /**
   * Send a system message
   */
  async sendSystemMessage(
    channelId: string,
    content: string,
    metadata: Record<string, string> = {},
  ): Promise<PublishResult> {
    return this.publish(channelId, 'system', content, {
      ...metadata,
      type: 'system',
    });
  }

  /**
   * Send a notification to a user
   */
  async sendUserNotification(
    userId: string,
    tenantId: string,
    content: string,
    metadata: Record<string, string> = {},
  ): Promise<PublishResult> {
    const channelId = `user:${tenantId}:${userId}`;

    // Ensure user channel exists
    let channel = await this.channelService.getChannel(channelId);
    if (!channel) {
      channel = await this.channelService.createChannel(userId, 'USER' as any, tenantId, {
        userId,
      });
    }

    return this.publish(channelId, 'system', content, {
      ...metadata,
      type: 'notification',
    });
  }
}
