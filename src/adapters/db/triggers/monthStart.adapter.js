/**
 * @fileoverview DB adapter for MONTH_START trigger.
 * Reads from CMP_CLIENTS_TBL_CTRL_DOB to detect if the monthly DOB
 * procedure has run for today's date (1st of month, inserted by Oracle Scheduler).
 * Also reads FLAG from CMP_CLIENTS_TBL_DOB to determine data availability.
 *
 * FLAG semantics (same as CMP_CLOSE pattern):
 * - FLAG = 1: Real DOB data exists → send DATA email with Excel attachment
 * - FLAG = 0: Procedure ran but no clients found → send NO_DATA email
 *
 * @module adapters/db/triggers/monthStart.adapter
 */

import oracledb from 'oracledb';
import logger from '../../../shared/logger/logger.js';

export class MonthStartAdapter {
  /**
   * @param {import('oracledb').Pool} pool - Oracle connection pool
   */
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Check if the monthly DOB procedure has run for today.
   * Returns closeDate and flag if the control record exists, null otherwise.
   *
   * @param {number} today - Today's date as YYYYMMDD number
   * @returns {Promise<{closeDate: number, flag: number}|null>}
   */
  async getPendingTrigger(today) {
    let conn;
    try {
      conn = await this.pool.getConnection();

      // Step 1: Check if procedure ran today (control record exists)
      const ctrlResult = await conn.execute(
        `SELECT MONTHLY_DATE
         FROM back_office.CMP_CLIENTS_TBL_CTRL_DOB
         WHERE MONTHLY_DATE = :today
         AND ROWNUM = 1`,
        { today: Number(today) },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!ctrlResult.rows || ctrlResult.rows.length === 0) {
        logger.debug('MONTH_START not detected', { today });
        return null;
      }

      const closeDate = Number(ctrlResult.rows[0].MONTHLY_DATE);

      // Step 2: Read FLAG from DOB staging table
      const flagResult = await conn.execute(
        `SELECT FLAG
         FROM back_office.CMP_CLIENTS_TBL_DOB
         WHERE INSERT_DATE = :today
         AND ROWNUM = 1`,
        { today: Number(today) },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const flag = flagResult.rows && flagResult.rows.length > 0
        ? Number(flagResult.rows[0].FLAG)
        : 1;

      logger.info('MONTH_START detected', { closeDate, flag, today });
      return { closeDate, flag };
    } catch (err) {
      logger.error('MonthStartAdapter.getPendingTrigger failed', { today, error: err.message });
      throw err;
    } finally {
      if (conn) await conn.close();
    }
  }
}
