import { LndClient } from './client';
import {
  WalletBalanceResponse,
  ChannelBalanceResponse,
  AllBalancesResponse,
  NodeData,
} from '../types';
import logger from '../utils/logger';
import { sanitizeError } from '../utils/sanitize';

/**
 * Format a satoshi amount to BTC with proper decimal places
 * @param sats Amount in satoshis
 * @returns Formatted string in BTC
 */
export function formatSatsToBtc(sats: number): string {
  return (sats / 100000000).toFixed(8) + ' BTC';
}

/**
 * Get the on-chain wallet balance from LND
 * @param client LND client instance
 * @returns Wallet balance information
 */
export async function getWalletBalance(client: LndClient): Promise<WalletBalanceResponse> {
  try {
    const lnd = client.getLnd();

    // Get wallet balance from LND using the client's LndService
    const { confirmed_balance, unconfirmed_balance } = await client.getLndService().getChainBalance({ lnd });

    // Calculate total balance
    const total_balance = confirmed_balance + unconfirmed_balance;

    // Format the response
    const response: WalletBalanceResponse = {
      total_balance,
      confirmed_balance,
      unconfirmed_balance,
      formatted: {
        total_balance: formatSatsToBtc(total_balance),
        confirmed_balance: formatSatsToBtc(confirmed_balance),
        unconfirmed_balance: formatSatsToBtc(unconfirmed_balance),
      },
    };

    logger.debug('Retrieved wallet balance', { balance: response });
    return response;
  } catch (error) {
    const sanitizedError = sanitizeError(error);
    logger.error(`Failed to get wallet balance: ${sanitizedError.message}`);
    throw new Error(`Failed to get wallet balance: ${sanitizedError.message}`);
  }
}

/**
 * Get the channel balance from LND
 * @param client LND client instance
 * @returns Channel balance information
 */
export async function getChannelBalance(client: LndClient): Promise<ChannelBalanceResponse> {
  try {
    const lnd = client.getLnd();

    // Get channel balance from LND using the client's LndService
    const { channel_balance, pending_balance } = await client.getLndService().getChannelBalance({ lnd });

    // Format the response
    const response: ChannelBalanceResponse = {
      balance: channel_balance,
      pending_open_balance: pending_balance,
      formatted: {
        balance: formatSatsToBtc(channel_balance),
        pending_open_balance: formatSatsToBtc(pending_balance),
      },
    };

    logger.debug('Retrieved channel balance', { balance: response });
    return response;
  } catch (error) {
    const sanitizedError = sanitizeError(error);
    logger.error(`Failed to get channel balance: ${sanitizedError.message}`);
    throw new Error(`Failed to get channel balance: ${sanitizedError.message}`);
  }
}

/**
 * Get all balances (on-chain and channels)
 * @param client LND client instance
 * @returns Combined balance information
 */
export async function getAllBalances(client: LndClient): Promise<AllBalancesResponse> {
  try {
    // Get both wallet and channel balances
    const walletBalance = await getWalletBalance(client);
    const channelBalance = await getChannelBalance(client);

    // Calculate total balance across all sources
    const totalBalance = walletBalance.total_balance + channelBalance.balance;

    // Format the combined response
    const response: AllBalancesResponse = {
      onchain: walletBalance,
      channels: channelBalance,
      total: {
        balance: totalBalance,
        formatted: formatSatsToBtc(totalBalance),
      },
    };

    logger.debug('Retrieved all balances', { balance: response });
    return response;
  } catch (error) {
    const sanitizedError = sanitizeError(error);
    logger.error(`Failed to get all balances: ${sanitizedError.message}`);
    throw new Error(`Failed to get all balances: ${sanitizedError.message}`);
  }
}

/**
 * Get node information including balances
 * @param client LND client instance
 * @returns Node data information
 */
export async function getNodeData(client: LndClient): Promise<NodeData> {
  try {
    const lnd = client.getLnd();

    // Get node info from LND using the client's LndService
    const {
      alias,
      public_key: identity_pubkey,
      version,
      active_channels_count: num_active_channels,
      peers_count: num_peers,
      block_height,
      is_synced_to_chain: synced_to_chain,
      is_testnet: testnet,
      chains,
    } = await client.getLndService().getWalletInfo({ lnd });

    // Get balance information
    const walletBalance = await getWalletBalance(client);
    const channelBalance = await getChannelBalance(client);

    // Format node data response
    const nodeData: NodeData = {
      node_info: {
        alias,
        identity_pubkey,
        version,
        num_active_channels,
        num_peers,
        block_height,
        synced_to_chain,
        testnet,
        chains,
      },
      wallet_balance: {
        total_balance: walletBalance.formatted.total_balance,
        confirmed_balance: walletBalance.formatted.confirmed_balance,
        unconfirmed_balance: walletBalance.formatted.unconfirmed_balance,
      },
      channel_balance: {
        balance: channelBalance.formatted.balance,
        pending_open_balance: channelBalance.formatted.pending_open_balance,
      },
    };

    logger.debug('Retrieved node data', { nodeData });
    return nodeData;
  } catch (error) {
    const sanitizedError = sanitizeError(error);
    logger.error(`Failed to get node data: ${sanitizedError.message}`);
    throw new Error(`Failed to get node data: ${sanitizedError.message}`);
  }
}
