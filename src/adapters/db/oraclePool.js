import oracledb from 'oracledb';
import { env } from '../../config/env.js';
import logger from '../../shared/logger/logger.js';

const POOL_ALIAS = 'emailWorker';

async function initPool() {
  if (env.ORACLE_CLIENT_PATH) {
    try {
      oracledb.initOracleClient({ libDir: env.ORACLE_CLIENT_PATH });
    } catch (err) {
      logger.warn('Oracle client init failed or already initialized', { error: err.message });
    }
  }

  oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
  oracledb.autoCommit = true;

  try {
    const pool = await oracledb.createPool({
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      connectString: env.DB_CONNECT_STRING,
      poolMin: env.ORA_POOL_MIN,
      poolMax: env.ORA_POOL_MAX,
      poolAlias: POOL_ALIAS,
    });

    logger.info('Oracle pool created', {
      poolAlias: POOL_ALIAS,
      poolMin: env.ORA_POOL_MIN,
      poolMax: env.ORA_POOL_MAX,
    });

    return pool;
  } catch (err) {
    logger.error('Oracle pool creation failed', { error: err.message });
    throw err;
  }
}

async function closePool() {
  try {
    const pool = oracledb.getPool(POOL_ALIAS);
    await pool.close(10);
    logger.info('Oracle pool closed');
  } catch (err) {
    logger.warn('Oracle pool close skipped or failed', { error: err.message });
  }
}

export { initPool, closePool };
