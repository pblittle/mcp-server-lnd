import { readFileSync } from 'fs';
import { Config } from '../config';
import logger from '../utils/logger';
import { sanitizeError } from '../utils/sanitize';
import { LndService } from './lnd-service.interface';
import { LndServiceFactory } from './lnd-service-factory';

/**
 * LND Authentication type for connecting to an LND node
 */
export interface LndAuthentication {
  /** TLS certificate content */
  cert: string;
  /** Hex-encoded macaroon for authentication */
  macaroon: string;
  /** Socket address in format host:port */
  socket: string;
}

/**
 * LND Client class to handle interactions with the Lightning Network Daemon
 */
export class LndClient {
  private lnd: any; // Using any instead of lnService.AuthenticatedLnd to support both real and mock
  private config: Config;
  // Make lndService protected so it can be accessed by derived classes and within the same package
  protected lndService: LndService;

  /**
   * Initialize the LND client with configuration and optional LND service
   * @param config Application configuration containing LND connection details
   * @param lndService Optional LND service implementation (for dependency injection)
   * @throws Error if connection cannot be established
   */
  constructor(config: Config, lndService?: LndService) {
    this.config = config;
    // Use provided service or create one using the factory
    this.lndService = lndService || LndServiceFactory.createLndService(config);
    this.lnd = this.createLndConnection();
  }

  /**
   * Create LND connection with proper authentication
   * @returns Authenticated LND instance
   * @throws Error if TLS certificate or macaroon cannot be read
   */
  private createLndConnection(): any {
    try {
      // Read the TLS certificate and macaroon files
      const tlsCert = readFileSync(this.config.lnd.tlsCertPath, 'utf8');
      const macaroon = readFileSync(this.config.lnd.macaroonPath, 'hex');

      // Create the socket string
      const socket = `${this.config.lnd.host}:${this.config.lnd.port}`;

      // Create the authentication object
      const auth: LndAuthentication = {
        cert: tlsCert,
        macaroon,
        socket,
      };

      // Create the authenticated LND client using the service
      logger.info(`Creating ${this.config.lnd.useMockLnd ? 'mock' : 'real'} LND connection to ${socket}`);
      return this.lndService.authenticatedLndGrpc(auth);
    } catch (error) {
      const sanitizedError = sanitizeError(error);
      logger.error(`Failed to create LND connection: ${sanitizedError.message}`);
      throw new Error(`LND connection error: ${sanitizedError.message}`);
    }
  }

  /**
   * Get the LND client instance
   * @returns Authenticated LND instance
   */
  getLnd(): any {
    return this.lnd;
  }

  /**
   * Get the LND service instance
   * @returns LND service instance
   */
  getLndService(): LndService {
    return this.lndService;
  }

  /**
   * Check the connection to the LND node by fetching wallet info
   * @returns Promise that resolves to true when connection is confirmed
   * @throws Error if connection check fails
   */
  async checkConnection(): Promise<boolean> {
    try {
      // Get wallet info as a simple check using the service
      await this.lndService.getWalletInfo({ lnd: this.lnd });
      logger.info('LND connection successful');
      return true;
    } catch (error) {
      const sanitizedError = sanitizeError(error);
      logger.error(`LND connection check failed: ${sanitizedError.message}`);
      throw new Error(`LND connection check failed: ${sanitizedError.message}`);
    }
  }

  /**
   * Properly close the LND connection
   * Note: ln-service doesn't expose a specific close method,
   * but this method is kept for future compatibility
   */
  close(): void {
    try {
      logger.info('LND connection closed');
    } catch (error) {
      const sanitizedError = sanitizeError(error);
      logger.error(`Error closing LND connection: ${sanitizedError.message}`);
    }
  }
}

/**
 * Create an instance of the LND client
 * @param config Application configuration
 * @returns LND client instance
 */
export function createLndClient(config: Config): LndClient {
  const lndService = LndServiceFactory.createLndService(config);
  return new LndClient(config, lndService);
}
