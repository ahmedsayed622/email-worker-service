/**
 * @fileoverview DB adapter for Operations day-close trigger.
 * Reads from BO_END_OF_DAY table to detect if operations has closed for the day.
 *
 * @module adapters/db/triggers/opsClose.adapter
 */

import logger from '../../../shared/logger/logger.js';

/**
 * Create the Operations day-close trigger adapter.
 *
 * @param {import('oracledb').Pool} pool - Oracle connection pool
 * @returns {{ getCloseDateIfClosed: (today: number) => Promise<number|null> }}
 */
export function createOpsCloseAdapter(pool) {
  /**
   * Check if operations day-close has occurred for a given date.
   * Returns the close_date as NUMBER (YYYYMMDD) if closed, or null if not.
   *
   * @param {number} today - Today's date as YYYYMMDD number
   * @returns {Promise<number|null>} close_date or null
   */
  async function getCloseDateIfClosed(today) {
    let conn;
    try {
      conn = await pool.getConnection();
      const result = await conn.execute(
        `SELECT END_OF_DAY_DATE
         FROM back_office.BO_END_OF_DAY
         WHERE END_OF_DAY_DATE = :today
           AND ROWNUM = 1`,
        { today },
        { outFormat: 4002 } // oracledb.OUT_FORMAT_OBJECT
      );

      if (result.rows && result.rows.length > 0) {
        const closeDate = result.rows[0].END_OF_DAY_DATE;
        logger.info('OPS_CLOSE detected', { closeDate });
        return closeDate;
      }

      return null;
    } catch (err) {
      logger.error('opsCloseAdapter.getCloseDateIfClosed failed', { today, error: err.message });
      throw err;
    } finally {
      if (conn) await conn.close();
    }
  }

  return { getCloseDateIfClosed };
}
