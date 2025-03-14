import * as lnService from 'ln-service';
import { LndService } from './lnd-service.interface';
import logger from '../utils/logger';

/**
 * Real implementation of the LND service that uses the ln-service module
 * This is used in production and development environments
 */
export class RealLndService implements LndService {
  /**
   * Create an authenticated LND gRPC connection
   * @param auth Authentication details including certificate, macaroon, and socket
   * @returns Authenticated LND instance
   */
  authenticatedLndGrpc(auth: {
    cert: string;
    macaroon: string;
    socket: string;
  }): any {
    logger.debug('Creating real LND gRPC connection');
    return lnService.authenticatedLndGrpc(auth);
  }
  
  /**
   * Get wallet information from LND
   * @param params Parameters including the LND instance
   * @returns Wallet information
   */
  async getWalletInfo(params: { lnd: any }): Promise<any> {
    logger.debug('Getting wallet info from real LND');
    return lnService.getWalletInfo(params);
  }
  
  /**
   * Get on-chain balance from LND
   * @param params Parameters including the LND instance
   * @returns Chain balance information
   */
  async getChainBalance(params: { lnd: any }): Promise<any> {
    logger.debug('Getting chain balance from real LND');
    return lnService.getChainBalance(params);
  }
  
  /**
   * Get channel balance from LND
   * @param params Parameters including the LND instance
   * @returns Channel balance information
   */
  async getChannelBalance(params: { lnd: any }): Promise<any> {
    logger.debug('Getting channel balance from real LND');
    return lnService.getChannelBalance(params);
  }
  
  /**
   * Get channels from LND
   * @param params Parameters including the LND instance
   * @returns Channel information
   */
  async getChannels(params: { lnd: any }): Promise<any> {
    logger.debug('Getting channels from real LND');
    return lnService.getChannels(params);
  }
  
  /**
   * Get node information from LND
   * @param params Parameters including the LND instance and public key
   * @returns Node information
   */
  async getNodeInfo(params: { lnd: any; public_key: string }): Promise<any> {
    logger.debug('Getting node info from real LND');
    return lnService.getNodeInfo(params);
  }
}
