import { jest } from '@jest/globals';
import * as fs from 'fs';
import * as lnService from 'ln-service';
import { LndClient, createLndClient } from '../../lnd/client';
import { Config } from '../../config';
import logger from '../../utils/logger';

// Mock dependencies
jest.mock('fs');
jest.mock('../../utils/logger');

describe('LndClient', () => {
  // Sample configuration for testing
  const mockConfig: Config = {
    lnd: {
      tlsCertPath: '/path/to/tls.cert',
      macaroonPath: '/path/to/macaroon',
      host: 'localhost',
      port: '10009',
      useMockLnd: false,
    },
    server: {
      port: 3000,
      logLevel: 'info',
      environment: 'test',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock fs.readFileSync
    (fs.readFileSync as jest.Mock).mockImplementation((path) => {
      if (path === mockConfig.lnd.tlsCertPath) {
        return 'mock-tls-cert';
      }
      if (path === mockConfig.lnd.macaroonPath) {
        return 'mock-macaroon';
      }
      throw new Error(`Unexpected path: ${path}`);
    });
  });

  describe('constructor', () => {
    test('should create an LND connection with proper authentication', () => {
      // Act - create client
      new LndClient(mockConfig);

      // Assert
      expect(fs.readFileSync).toHaveBeenCalledWith(mockConfig.lnd.tlsCertPath, 'utf8');
      expect(fs.readFileSync).toHaveBeenCalledWith(mockConfig.lnd.macaroonPath, 'hex');
      expect(lnService.authenticatedLndGrpc).toHaveBeenCalledWith({
        cert: 'mock-tls-cert',
        macaroon: 'mock-macaroon',
        socket: 'localhost:10009',
      });
      // Check for both log messages in the correct order
      expect(logger.info).toHaveBeenNthCalledWith(1, 'Creating real LND service');
      expect(logger.info).toHaveBeenNthCalledWith(2, 'Creating real LND connection to localhost:10009');
    });

    test('should throw an error if TLS certificate file read fails', () => {
      // Arrange
      (fs.readFileSync as jest.Mock).mockImplementationOnce(() => {
        throw new Error('TLS cert file not found');
      });

      // Act & Assert
      expect(() => new LndClient(mockConfig)).toThrow(
        'LND connection error: TLS cert file not found'
      );
      expect(logger.error).toHaveBeenCalled();
    });

    test('should throw an error if macaroon file read fails', () => {
      // Arrange - First call succeeds (TLS cert), second call fails (macaroon)
      (fs.readFileSync as jest.Mock).mockImplementationOnce(() => 'mock-tls-cert');
      (fs.readFileSync as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Macaroon file not found');
      });

      // Act & Assert
      expect(() => new LndClient(mockConfig)).toThrow(
        'LND connection error: Macaroon file not found'
      );
      expect(logger.error).toHaveBeenCalled();
    });

    test('should throw an error if LND authentication fails', () => {
      // Arrange
      (lnService.authenticatedLndGrpc as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Authentication failed');
      });

      // Act & Assert
      expect(() => new LndClient(mockConfig)).toThrow(
        'LND connection error: Authentication failed'
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getLnd', () => {
    test('should return the LND instance', () => {
      // Arrange
      const client = new LndClient(mockConfig);

      // Act
      const result = client.getLnd();

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe('checkConnection', () => {
    test('should resolve to true if connection is successful', async () => {
      // Arrange
      const client = new LndClient(mockConfig);

      // Act
      const result = await client.checkConnection();

      // Assert
      expect(result).toBe(true);
      expect(lnService.getWalletInfo).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('LND connection successful');
    });

    test('should throw an error if connection check fails', async () => {
      // Mock the getWalletInfo function to reject with an error
      // Use explicit any type to avoid TypeScript errors
      (lnService.getWalletInfo as jest.Mock<any>).mockRejectedValueOnce(
        new Error('Connection failed')
      );

      const client = new LndClient(mockConfig);

      // Act & Assert
      await expect(client.checkConnection()).rejects.toThrow(
        'LND connection check failed: Connection failed'
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    test('should log a message when closing the connection', () => {
      // Arrange
      const client = new LndClient(mockConfig);

      // Act
      client.close();

      // Assert
      expect(logger.info).toHaveBeenCalledWith('LND connection closed');
    });

    test('should handle errors gracefully', () => {
      // Arrange
      const client = new LndClient(mockConfig);
      jest.spyOn(logger, 'info').mockImplementationOnce(() => {
        throw new Error('Logger error');
      });

      // Act & Assert
      expect(() => client.close()).not.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('createLndClient', () => {
    test('should create and return an LndClient instance', () => {
      // Act
      const client = createLndClient(mockConfig);

      // Assert
      expect(client).toBeInstanceOf(LndClient);
    });
  });
});
