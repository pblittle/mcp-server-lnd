import { LndClient } from '../../lnd/client';
import { Intent } from '../../types/intent';
import { Channel, ChannelQueryResult, ChannelSummary } from '../../types/channel';
import { ChannelFormatter } from '../formatters/channelFormatter';
import logger from '../../utils/logger';
import { sanitizeError } from '../../utils/sanitize';

export interface QueryResult {
  response: string;
  data: Record<string, any>;
}

export class ChannelQueryHandler {
  private formatter: ChannelFormatter;

  constructor(private readonly lndClient: LndClient) {
    this.formatter = new ChannelFormatter();
  }

  async handleQuery(intent: Intent): Promise<QueryResult> {
    logger.info(`Handling channel query intent: ${intent.type}`);

    try {
      const channelData = await this.getChannelData();

      switch (intent.type) {
        case 'channel_list':
          return {
            response: this.formatter.formatChannelList(channelData),
            data: channelData,
          };

        case 'channel_health':
          return {
            response: this.formatter.formatChannelHealth(channelData),
            data: channelData,
          };

        case 'channel_liquidity':
          return {
            response: this.formatter.formatChannelLiquidity(channelData),
            data: channelData,
          };

        default:
          return {
            response: `I'm sorry, I don't understand how to answer: "${intent.originalQuery}"`,
            data: {},
          };
      }
    } catch (error) {
      const sanitizedError = sanitizeError(error);
      logger.error(`Error handling channel query: ${sanitizedError.message}`);

      return {
        response: `I encountered an error while processing your channel query: ${sanitizedError.message}`,
        data: {},
      };
    }
  }

  private async getChannelData(): Promise<ChannelQueryResult> {
    try {
      // Get channels from LND using the client's LndService
      const lnd = this.lndClient.getLnd();
      const { channels } = await this.lndClient.getLndService().getChannels({ lnd });

      if (!channels || !Array.isArray(channels)) {
        return {
          channels: [],
          summary: this.calculateChannelSummary([]),
        };
      }

      // Get node aliases for each channel
      const channelsWithAliases = await this.addNodeAliases(channels);

      // Calculate summary statistics
      const summary = this.calculateChannelSummary(channelsWithAliases);

      return {
        channels: channelsWithAliases,
        summary,
      };
    } catch (error) {
      const sanitizedError = sanitizeError(error);
      logger.error(`Error fetching channel data: ${sanitizedError.message}`);
      throw sanitizedError;
    }
  }

  private async addNodeAliases(channels: Channel[]): Promise<Channel[]> {
    try {
      const lnd = this.lndClient.getLnd();
      const channelsWithAliases = await Promise.all(
        channels.map(async (channel) => {
          try {
            // Get node info to get alias using the client's LndService
            const nodeInfo = await this.lndClient.getLndService().getNodeInfo({
              lnd,
              public_key: channel.remote_pubkey,
            });

            return {
              ...channel,
              remote_alias: nodeInfo?.alias || 'Unknown',
            };
          } catch (error) {
            // If we can't get the alias, just return the channel without it
            return channel;
          }
        })
      );

      return channelsWithAliases;
    } catch (error) {
      const sanitizedError = sanitizeError(error);
      logger.error(`Error adding node aliases: ${sanitizedError.message}`);
      // Return original channels if we can't add aliases
      return channels;
    }
  }

  private calculateChannelSummary(channels: Channel[]): ChannelSummary {
    if (channels.length === 0) {
      return {
        totalCapacity: 0,
        totalLocalBalance: 0,
        totalRemoteBalance: 0,
        activeChannels: 0,
        inactiveChannels: 0,
        averageCapacity: 0,
        healthyChannels: 0,
        unhealthyChannels: 0,
      };
    }

    const activeChannels = channels.filter((c) => c.active);
    const inactiveChannels = channels.filter((c) => !c.active);

    const totalCapacity = channels.reduce((sum, channel) => sum + channel.capacity, 0);
    const totalLocalBalance = channels.reduce((sum, channel) => sum + channel.local_balance, 0);
    const totalRemoteBalance = channels.reduce((sum, channel) => sum + channel.remote_balance, 0);

    // Find most imbalanced channel
    let mostImbalancedChannel: Channel | undefined;
    let highestImbalanceRatio = 0;

    channels.forEach((channel) => {
      if (channel.capacity > 0) {
        const localRatio = channel.local_balance / channel.capacity;
        const imbalanceRatio = Math.abs(0.5 - localRatio);

        if (imbalanceRatio > highestImbalanceRatio) {
          highestImbalanceRatio = imbalanceRatio;
          mostImbalancedChannel = channel;
        }
      }
    });

    // Count healthy vs unhealthy channels
    // A channel is considered unhealthy if it's inactive or has extreme imbalance
    const unhealthyChannels = channels.filter((channel) => {
      if (!channel.active) return true;

      const localRatio = channel.local_balance / channel.capacity;
      return localRatio < 0.1 || localRatio > 0.9; // Extreme imbalance
    }).length;

    return {
      totalCapacity,
      totalLocalBalance,
      totalRemoteBalance,
      activeChannels: activeChannels.length,
      inactiveChannels: inactiveChannels.length,
      averageCapacity: totalCapacity / channels.length,
      mostImbalancedChannel,
      healthyChannels: channels.length - unhealthyChannels,
      unhealthyChannels,
    };
  }
}
