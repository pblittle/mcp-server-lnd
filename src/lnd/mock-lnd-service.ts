import { LndService } from './lnd-service.interface';
import logger from '../utils/logger';

/**
 * Mock implementation of the LND service for testing
 * This is used in test environments when USE_MOCK_LND is true
 */
export class MockLndService implements LndService {
  /**
   * Create a mock authenticated LND gRPC connection
   * @param auth Authentication details including certificate, macaroon, and socket
   * @returns Mock LND instance
   */
  authenticatedLndGrpc(_auth: {
    cert: string;
    macaroon: string;
    socket: string;
  }): any {
    logger.debug('Creating mock LND gRPC connection');
    return { id: 'mock-lnd-instance' };
  }
  
  /**
   * Get mock wallet information
   * @param params Parameters including the LND instance
   * @returns Mock wallet information
   */
  async getWalletInfo(_params: { lnd: any }): Promise<any> {
    logger.debug('Getting wallet info from mock LND');
    return {
      alias: 'mock-node',
      public_key: 'mock-pubkey',
      version: '0.15.1',
      active_channels_count: 5,
      peers_count: 10,
      block_height: 700000,
      is_synced_to_chain: true,
      is_testnet: false,
      chains: ['bitcoin'],
    };
  }
  
  /**
   * Get mock on-chain balance
   * @param params Parameters including the LND instance
   * @returns Mock chain balance information
   */
  async getChainBalance(_params: { lnd: any }): Promise<any> {
    logger.debug('Getting chain balance from mock LND');
    return {
      confirmed_balance: 90000000,
      unconfirmed_balance: 10000000,
    };
  }
  
  /**
   * Get mock channel balance
   * @param params Parameters including the LND instance
   * @returns Mock channel balance information
   */
  async getChannelBalance(_params: { lnd: any }): Promise<any> {
    logger.debug('Getting channel balance from mock LND');
    return {
      channel_balance: 50000000,
      pending_balance: 20000000,
    };
  }
  
  /**
   * Get mock channels
   * @param params Parameters including the LND instance
   * @returns Mock channel information
   */
  async getChannels(_params: { lnd: any }): Promise<any> {
    logger.debug('Getting channels from mock LND');
    return {
      channels: [
        {
          id: 'channel-1',
          capacity: 10000000,
          local_balance: 5000000,
          remote_balance: 5000000,
          channel_point: 'txid:0',
          active: true,
          remote_pubkey: '03864ef025fde8fb587d989186ce6a4a186895ee44a926bfc370e2c366597a3f8f',
        },
        {
          id: 'channel-2',
          capacity: 5000000,
          local_balance: 2500000,
          remote_balance: 2500000,
          channel_point: 'txid:1',
          active: true,
          remote_pubkey: '02a1c6e284a5ddf9cbb4ff50e84abb1d3c0f74d733385cb7f3631d57a35c3bfbec',
        },
        {
          id: 'channel-3',
          capacity: 2000000,
          local_balance: 1000000,
          remote_balance: 1000000,
          channel_point: 'txid:2',
          active: false,
          remote_pubkey: '03abf6f44c355dec0d5aa155bdbdd6e0c8fefe318eff402de65c6eb2e1be55dc3e',
        },
      ],
    };
  }
  
  /**
   * Get mock node information
   * @param params Parameters including the LND instance and public key
   * @returns Mock node information
   */
  async getNodeInfo(params: { lnd: any; public_key: string }): Promise<any> {
    logger.debug(`Getting node info from mock LND for public key: ${params.public_key}`);
    
    // Return different aliases based on public key to simulate different nodes
    let alias = 'Unknown';
    
    if (params.public_key === '03864ef025fde8fb587d989186ce6a4a186895ee44a926bfc370e2c366597a3f8f') {
      alias = 'ACINQ';
    } else if (params.public_key === '02a1c6e284a5ddf9cbb4ff50e84abb1d3c0f74d733385cb7f3631d57a35c3bfbec') {
      alias = 'Bitrefill';
    } else if (params.public_key === '03abf6f44c355dec0d5aa155bdbdd6e0c8fefe318eff402de65c6eb2e1be55dc3e') {
      alias = 'LN+';
    }
    
    return {
      alias,
      color: '#3399ff',
      public_key: params.public_key,
      sockets: [`${alias.toLowerCase()}.com:9735`],
      updated_at: new Date().toISOString(),
    };
  }
}
