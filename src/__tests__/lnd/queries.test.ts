import { jest } from '@jest/globals';
import * as lnService from 'ln-service';
import { LndClient } from '../../lnd/client';
import * as queries from '../../lnd/queries';
import logger from '../../utils/logger';

// Mock dependencies
jest.mock('../../utils/logger');

describe('LND Queries', () => {
  // Destructure methods from queries module for easier testing
  const { formatSatsToBtc, getWalletBalance, getChannelBalance, getAllBalances, getNodeData } =
    queries;

  // Mock LND client
  const mockLnd = { id: 'mock-lnd-instance' };
  const mockClient = {
    getLnd: jest.fn().mockReturnValue(mockLnd),
    // Add getLndService method to mock the new dependency injection approach
    getLndService: jest.fn().mockReturnValue({
      getChainBalance: lnService.getChainBalance,
      getChannelBalance: lnService.getChannelBalance,
      getWalletInfo: lnService.getWalletInfo,
      getNodeInfo: lnService.getNodeInfo,
      // Add any other methods that might be needed
      authenticatedLndGrpc: lnService.authenticatedLndGrpc
    }),
  } as unknown as LndClient;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the mock implementations from the ln-service mock
    // Use mockImplementation with any type to avoid TypeScript errors
    (lnService.getChainBalance as jest.Mock<any>).mockImplementation(() => {
      return Promise.resolve({
        confirmed_balance: 90000000,
        unconfirmed_balance: 10000000,
      });
    });

    (lnService.getChannelBalance as jest.Mock<any>).mockImplementation(() => {
      return Promise.resolve({
        channel_balance: 50000000,
        pending_balance: 20000000,
      });
    });

    (lnService.getWalletInfo as jest.Mock<any>).mockImplementation(() => {
      return Promise.resolve({
        alias: 'test-node',
        public_key: 'test-pubkey',
        version: '0.15.1',
        active_channels_count: 5,
        peers_count: 10,
        block_height: 700000,
        is_synced_to_chain: true,
        is_testnet: false,
        chains: ['bitcoin'],
      });
    });
  });

  describe('formatSatsToBtc', () => {
    test('should format satoshis to BTC correctly', () => {
      expect(formatSatsToBtc(100000000)).toBe('1.00000000 BTC');
      expect(formatSatsToBtc(10000000)).toBe('0.10000000 BTC');
      expect(formatSatsToBtc(1000)).toBe('0.00001000 BTC');
      expect(formatSatsToBtc(0)).toBe('0.00000000 BTC');
    });
  });

  describe('getWalletBalance', () => {
    test('should return formatted wallet balance', async () => {
      // Get wallet balance
      const result = await getWalletBalance(mockClient);

      // Verify ln-service was called correctly
      expect(mockClient.getLnd).toHaveBeenCalled();
      expect(lnService.getChainBalance).toHaveBeenCalledWith({ lnd: mockLnd });

      // Verify response format
      expect(result).toEqual({
        total_balance: 100000000,
        confirmed_balance: 90000000,
        unconfirmed_balance: 10000000,
        formatted: {
          total_balance: '1.00000000 BTC',
          confirmed_balance: '0.90000000 BTC',
          unconfirmed_balance: '0.10000000 BTC',
        },
      });

      // Verify logging
      expect(logger.debug).toHaveBeenCalled();
    });

    test('should handle errors properly', async () => {
      // Mock ln-service getChainBalance to throw an error
      (lnService.getChainBalance as jest.Mock<any>).mockRejectedValueOnce(new Error('RPC error'));

      // Attempt to get wallet balance
      await expect(getWalletBalance(mockClient)).rejects.toThrow(
        'Failed to get wallet balance: RPC error'
      );

      // Verify error logging
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getChannelBalance', () => {
    test('should return formatted channel balance', async () => {
      // Get channel balance
      const result = await getChannelBalance(mockClient);

      // Verify ln-service was called correctly
      expect(mockClient.getLnd).toHaveBeenCalled();
      expect(lnService.getChannelBalance).toHaveBeenCalledWith({ lnd: mockLnd });

      // Verify response format
      expect(result).toEqual({
        balance: 50000000,
        pending_open_balance: 20000000,
        formatted: {
          balance: '0.50000000 BTC',
          pending_open_balance: '0.20000000 BTC',
        },
      });

      // Verify logging
      expect(logger.debug).toHaveBeenCalled();
    });

    test('should handle errors properly', async () => {
      // Mock ln-service getChannelBalance to throw an error
      (lnService.getChannelBalance as jest.Mock<any>).mockRejectedValueOnce(
        new Error('Channel error')
      );

      // Attempt to get channel balance
      await expect(getChannelBalance(mockClient)).rejects.toThrow(
        'Failed to get channel balance: Channel error'
      );

      // Verify error logging
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getAllBalances', () => {
    test('should return combined balance information', async () => {
      // Set up the mock responses for the ln-service functions
      // These will be used by both getWalletBalance and getChannelBalance
      (lnService.getChainBalance as jest.Mock<any>).mockImplementation(() => {
        return Promise.resolve({
          confirmed_balance: 90000000,
          unconfirmed_balance: 10000000,
        });
      });

      (lnService.getChannelBalance as jest.Mock<any>).mockImplementation(() => {
        return Promise.resolve({
          channel_balance: 50000000,
          pending_balance: 20000000,
        });
      });

      // Get all balances
      const result = await getAllBalances(mockClient);

      // Verify ln-service was called correctly
      expect(mockClient.getLnd).toHaveBeenCalled();
      expect(lnService.getChainBalance).toHaveBeenCalledWith({ lnd: mockLnd });
      expect(lnService.getChannelBalance).toHaveBeenCalledWith({ lnd: mockLnd });

      // Verify the combined response
      expect(result).toEqual({
        onchain: {
          total_balance: 100000000,
          confirmed_balance: 90000000,
          unconfirmed_balance: 10000000,
          formatted: {
            total_balance: '1.00000000 BTC',
            confirmed_balance: '0.90000000 BTC',
            unconfirmed_balance: '0.10000000 BTC',
          },
        },
        channels: {
          balance: 50000000,
          pending_open_balance: 20000000,
          formatted: {
            balance: '0.50000000 BTC',
            pending_open_balance: '0.20000000 BTC',
          },
        },
        total: {
          balance: 150000000,
          formatted: '1.50000000 BTC',
        },
      });

      // Verify logging
      expect(logger.debug).toHaveBeenCalled();
    });

    test('should handle errors properly', async () => {
      // Instead of testing getAllBalances with a mocked getWalletBalance,
      // let's test it directly by mocking the underlying ln-service call

      // Mock ln-service getChainBalance to throw an error with the exact message we want
      (lnService.getChainBalance as jest.Mock<any>).mockRejectedValueOnce(
        new Error('Balance error')
      );

      // Attempt to get all balances - the error from getChainBalance should propagate
      // through getWalletBalance and then to getAllBalances
      await expect(getAllBalances(mockClient)).rejects.toThrow(
        'Failed to get all balances: Failed to get wallet balance: Balance error'
      );

      // Verify error logging
      expect(logger.error).toHaveBeenCalled();

      // Reset mocks to ensure they don't affect other tests
      jest.clearAllMocks();

      // Reset the mock implementations to their default values
      (lnService.getChainBalance as jest.Mock<any>).mockImplementation(() => {
        return Promise.resolve({
          confirmed_balance: 90000000,
          unconfirmed_balance: 10000000,
        });
      });

      (lnService.getChannelBalance as jest.Mock<any>).mockImplementation(() => {
        return Promise.resolve({
          channel_balance: 50000000,
          pending_balance: 20000000,
        });
      });
    });
  });

  describe('getNodeData', () => {
    test('should return formatted node data', async () => {
      // Set up the mock responses for the ln-service functions
      (lnService.getWalletInfo as jest.Mock<any>).mockImplementation(() => {
        return Promise.resolve({
          alias: 'test-node',
          public_key: 'test-pubkey',
          version: '0.15.1',
          active_channels_count: 5,
          peers_count: 10,
          block_height: 700000,
          is_synced_to_chain: true,
          is_testnet: false,
          chains: ['bitcoin'],
        });
      });

      (lnService.getChainBalance as jest.Mock<any>).mockImplementation(() => {
        return Promise.resolve({
          confirmed_balance: 90000000,
          unconfirmed_balance: 10000000,
        });
      });

      (lnService.getChannelBalance as jest.Mock<any>).mockImplementation(() => {
        return Promise.resolve({
          channel_balance: 50000000,
          pending_balance: 20000000,
        });
      });

      // Get node data
      const result = await getNodeData(mockClient);

      // Verify ln-service was called correctly
      expect(mockClient.getLnd).toHaveBeenCalled();
      expect(lnService.getWalletInfo).toHaveBeenCalledWith({ lnd: mockLnd });
      expect(lnService.getChainBalance).toHaveBeenCalledWith({ lnd: mockLnd });
      expect(lnService.getChannelBalance).toHaveBeenCalledWith({ lnd: mockLnd });

      // Verify response format
      expect(result).toEqual({
        node_info: {
          alias: 'test-node',
          identity_pubkey: 'test-pubkey',
          version: '0.15.1',
          num_active_channels: 5,
          num_peers: 10,
          block_height: 700000,
          synced_to_chain: true,
          testnet: false,
          chains: ['bitcoin'],
        },
        wallet_balance: {
          total_balance: '1.00000000 BTC',
          confirmed_balance: '0.90000000 BTC',
          unconfirmed_balance: '0.10000000 BTC',
        },
        channel_balance: {
          balance: '0.50000000 BTC',
          pending_open_balance: '0.20000000 BTC',
        },
      });

      // Verify logging
      expect(logger.debug).toHaveBeenCalled();
    });

    test('should handle errors properly', async () => {
      // Mock ln-service getWalletInfo to throw an error
      (lnService.getWalletInfo as jest.Mock<any>).mockRejectedValueOnce(
        new Error('Node info error')
      );

      // Attempt to get node data
      await expect(getNodeData(mockClient)).rejects.toThrow(
        'Failed to get node data: Node info error'
      );

      // Verify error logging
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
