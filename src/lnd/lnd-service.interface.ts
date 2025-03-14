/**
 * Interface for LND service operations
 * This abstraction allows for easy mocking and testing
 */
export interface LndService {
  /**
   * Create an authenticated LND gRPC connection
   * @param auth Authentication details including certificate, macaroon, and socket
   * @returns Authenticated LND instance
   */
  authenticatedLndGrpc(auth: {
    cert: string;
    macaroon: string;
    socket: string;
  }): any;
  
  /**
   * Get wallet information from LND
   * @param params Parameters including the LND instance
   * @returns Wallet information
   */
  getWalletInfo(params: { lnd: any }): Promise<any>;
  
  /**
   * Get on-chain balance from LND
   * @param params Parameters including the LND instance
   * @returns Chain balance information
   */
  getChainBalance(params: { lnd: any }): Promise<any>;
  
  /**
   * Get channel balance from LND
   * @param params Parameters including the LND instance
   * @returns Channel balance information
   */
  getChannelBalance(params: { lnd: any }): Promise<any>;
  
  /**
   * Get channels from LND
   * @param params Parameters including the LND instance
   * @returns Channel information
   */
  getChannels(params: { lnd: any }): Promise<any>;
  
  /**
   * Get node information from LND
   * @param params Parameters including the LND instance and public key
   * @returns Node information
   */
  getNodeInfo(params: { lnd: any; public_key: string }): Promise<any>;
}
