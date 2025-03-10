import dotenv from 'dotenv';
import { existsSync } from 'fs';
import logger from '../utils/logger';

// Load environment variables
dotenv.config();

/**
 * Configuration interface
 */
export interface Config {
  lnd: {
    tlsCertPath: string;
    macaroonPath: string;
    host: string;
    port: string;
  };
  server: {
    port: number;
  };
}

/**
 * Validate required environment variables
 */
function validateEnv(): void {
  const requiredVars = ['LND_TLS_CERT_PATH', 'LND_MACAROON_PATH'];
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate that the files exist
  const tlsCertPath = process.env.LND_TLS_CERT_PATH as string;
  const macaroonPath = process.env.LND_MACAROON_PATH as string;

  if (!existsSync(tlsCertPath)) {
    throw new Error(`TLS certificate file not found at: ${tlsCertPath}`);
  }

  if (!existsSync(macaroonPath)) {
    throw new Error(`Macaroon file not found at: ${macaroonPath}`);
  }
}

/**
 * Get configuration
 */
export function getConfig(): Config {
  try {
    validateEnv();

    const config: Config = {
      lnd: {
        tlsCertPath: process.env.LND_TLS_CERT_PATH as string,
        macaroonPath: process.env.LND_MACAROON_PATH as string,
        host: process.env.LND_HOST || 'localhost',
        port: process.env.LND_PORT || '10009',
      },
      server: {
        port: parseInt(process.env.PORT || '3000', 10),
      },
    };

    logger.info('Configuration loaded successfully');
    return config;
  } catch (error) {
    logger.fatal({ error }, 'Failed to load configuration');
    throw error;
  }
}
