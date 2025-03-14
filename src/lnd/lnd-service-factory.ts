import { LndService } from './lnd-service.interface';
import { RealLndService } from './real-lnd-service';
import { MockLndService } from './mock-lnd-service';
import { Config } from '../config';
import logger from '../utils/logger';

/**
 * Factory for creating LND service instances
 * This factory provides either a real or mock implementation based on configuration
 */
export class LndServiceFactory {
  /**
   * Create an LND service instance based on configuration
   * @param config Application configuration
   * @returns LND service instance (real or mock)
   */
  static createLndService(config: Config): LndService {
    if (config.lnd.useMockLnd) {
      logger.info('Creating mock LND service');
      return new MockLndService();
    }
    
    logger.info('Creating real LND service');
    return new RealLndService();
  }
}
