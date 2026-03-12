/**
 * @fileoverview DB adapter for Compliance trigger.
 * Reads from CMP_EMP_TBL_DAILY_ORDERS to detect if compliance data exists for today.
 *
 * Unlike BO_END_OF_DAY / BO_OMNI_END_OF_DAY, this table is NOT a close-event table.
 * The trigger fires when rows with INVOICE_DATE = today exist (data presence = ready).
 *
 * @module adapters/db/triggers/cmpClose.adapter
 */

import logger from '../../../shared/logger/logger.js';

export class CmpCloseAdapter {
  /**
   * @param {import('oracledb').Pool} pool - Oracle connection pool
   */
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Check if compliance data exists for a given date.
   * Returns an object with closeDate and flag if data exists, or null if not.
   *
   * FLAG indicates data type:
   * - FLAG = 0: Placeholder record (no real data, should send NO_DATA email)
   * - FLAG = 1: Real compliance data (should query and send DATA email)
   *
   * @param {number} today - Today's date as YYYYMMDD number
   * @returns {Promise<{closeDate: number, flag: number}|null>} Object with closeDate and flag, or null
   */
  async getCloseDateIfClosed(today) {
    let conn;
    try {
      conn = await this.pool.getConnection();

      const result = await conn.execute(
        `SELECT INVOICE_DATE AS CLOSE_DATE, FLAG
         FROM back_office.CMP_EMP_TBL_DAILY_ORDERS
         WHERE INVOICE_DATE = :today
         AND ROWNUM = 1`,
        { today: Number(today) },
        { outFormat: 4002 }
      );

      if (result.rows && result.rows.length > 0) {
        const closeDate = Number(result.rows[0].CLOSE_DATE);
        const flag = Number(result.rows[0].FLAG);
        logger.info('CMP_CLOSE detected', { closeDate, flag, today });
        return { closeDate, flag };
      }

      logger.debug('CMP_CLOSE not detected', { today });
      return null;
    } catch (err) {
      logger.error('CmpCloseAdapter.getCloseDateIfClosed failed', { today, error: err.message });
      throw err;
    } finally {
      if (conn) await conn.close();
    }
  }
}
