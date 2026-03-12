/**
 * @fileoverview DB adapter for Finance day-close trigger.
 * Reads from BO_OMNI_END_OF_DAY table to detect if the Omni finance system has closed.
 *
 * @module adapters/db/triggers/finClose.adapter
 */

import logger from '../../../shared/logger/logger.js';

export class FinCloseAdapter {
  /**
   * @param {import('oracledb').Pool} pool - Oracle connection pool
   */
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Check if finance day-close has occurred for a given date.
   * Returns the close_date as NUMBER (YYYYMMDD) if closed, or null if not.
   * 
   * Note: END_OF_DAY_DATE column is NUMBER(8,0) in YYYYMMDD format.
   * Compatible with Oracle 11g (uses ROWNUM instead of FETCH FIRST).
   *
   * @param {number} today - Today's date as YYYYMMDD number (e.g., 20260219)
   * @returns {Promise<number|null>} close_date or null
   */
  async getCloseDateIfClosed(today) {
    let conn;
    try {
      conn = await this.pool.getConnection();

      // Simple direct query - END_OF_DAY_DATE is already NUMBER(8,0) in YYYYMMDD format
      // Using ROWNUM for Oracle 11g compatibility (FETCH FIRST is 12c+)
      const result = await conn.execute(
        `SELECT END_OF_DAY_DATE AS CLOSE_DATE
         FROM back_office.BO_OMNI_END_OF_DAY
         WHERE END_OF_DAY_DATE = :today
         AND ROWNUM = 1`,
        { today: Number(today) },
        { outFormat: 4002 }
      );

      if (result.rows && result.rows.length > 0) {
        const closeDate = Number(result.rows[0].CLOSE_DATE);
        logger.info('FIN_CLOSE detected', { closeDate, today });
        return closeDate;
      }

      logger.debug('FIN_CLOSE not detected', { today });
      return null;
    } catch (err) {
      logger.error('FinCloseAdapter.getCloseDateIfClosed failed', { today, error: err.message });
      throw err;
    } finally {
      if (conn) await conn.close();
    }
  }
}
