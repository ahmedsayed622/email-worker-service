/**
 * @deprecated This adapter has been replaced by trigger-specific adapters:
 *   - src/adapters/db/triggers/opsClose.adapter.js  (BO_END_OF_DAY)
 *   - src/adapters/db/triggers/finClose.adapter.js  (BO_OMNI_END_OF_DAY)
 *   - src/adapters/db/triggers/cmpClose.adapter.js  (CMP_EMP_TBL_DAILY_ORDERS)
 *
 * This file will be removed in a future version.
 * Do not import or use this adapter in new code.
 */

import oracledb from 'oracledb';
import logger from '../../shared/logger/logger.js';
import { normalizeError } from '../../shared/errors/normalizeError.js';

/**
 * Get today's date in YYYYMMDD format (Africa/Cairo timezone)
 * @returns {string} YYYYMMDD string
 */
export function getTodayYYYYMMDD() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

export function createDayCloseAdapter() {
  return {
    /**
     * Check if END_OF_DAY has a row for today's date (Oracle 11g compatible)
     * @returns {Promise<string|null>} Today's date as YYYYMMDD string if exists, null otherwise
     */
    async getTodayCloseDateIfClosed() {
      let conn;
      try {
        const today = getTodayYYYYMMDD();
        const todayAsNumber = parseInt(today, 10);
        
        conn = await oracledb.getPool('emailWorker').getConnection();
        const result = await conn.execute(
          'SELECT END_OF_DAY_DATE FROM back_office.BO_END_OF_DAY WHERE END_OF_DAY_DATE = :today AND ROWNUM = 1',
          { today: todayAsNumber }
        );
        
        const row = result.rows && result.rows[0];
        if (row && row.END_OF_DAY_DATE) {
          // Convert NUMBER back to YYYYMMDD string
          const closeDateStr = String(row.END_OF_DAY_DATE);
          logger.debug('Today close date found', { closeDate: closeDateStr, today });
          return closeDateStr;
        }
        
        logger.debug('No close date for today', { today });
        return null;
      } catch (err) {
        const appError = normalizeError(err, 'dayClose');
        logger.error('Failed to check today close date', { error: appError.message });
        throw appError;
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch (closeErr) {
            logger.warn('Failed to close Oracle connection', { error: closeErr.message });
          }
        }
      }
    },
  };
}
