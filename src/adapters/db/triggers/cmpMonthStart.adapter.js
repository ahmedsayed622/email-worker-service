/**
 * @fileoverview DB adapter for CMP_MONTH_START trigger.
 * Reads from CMP_CLIENTS_TBL_CTRL_DOB to detect if the monthly DOB
 * procedure has run for today's date (1st of month, inserted by Oracle Scheduler).
 * Also reads FLAG from CMP_CLIENTS_TBL_DOB to determine data availability.
 *
 * FLAG semantics (same as CMP_CLOSE pattern):
 * - FLAG = 1: Real DOB data exists → send DATA email with Excel attachment
 * - FLAG = 0: Procedure ran but no clients found → send NO_DATA email
 *
 * @module adapters/db/triggers/cmpMonthStart.adapter
 */

import oracledb from 'oracledb';
import logger from '../../../shared/logger/logger.js';

/**
 * Create the CMP_MONTH_START trigger adapter.
 *
 * @param {import('oracledb').Pool} pool - Oracle connection pool
 * @returns {{ getPendingTrigger: (today: number) => Promise<{closeDate: number, flag: number}|null> }}
 */
export function createCmpMonthStartAdapter(pool) {
  /**
   * Check if the monthly DOB procedure has run for today.
   * Returns closeDate and flag if the control record exists, null otherwise.
   *
   * @param {number} today - Today's date as YYYYMMDD number
   * @returns {Promise<{closeDate: number, flag: number}|null>}
   */
  async function getPendingTrigger(today) {
    let conn;
    try {
      conn = await pool.getConnection();

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
        logger.debug('CMP_MONTH_START not detected', { today });
        return null;
      }

      const closeDate = Number(ctrlResult.rows[0].MONTHLY_DATE);

      // Step 2: Count real DOB rows (FLAG=1) for today.
      // Procedure invariant: a given INSERT_DATE has either N rows with FLAG=1
      // (real data) or exactly 1 placeholder row with FLAG=0 (no data).
      // So COUNT(FLAG=1) > 0 ⇒ DATA, COUNT(FLAG=1) = 0 ⇒ NO_DATA.
      const countResult = await conn.execute(
        `SELECT COUNT(*) AS CNT
         FROM back_office.CMP_CLIENTS_TBL_DOB
         WHERE INSERT_DATE = :today
         AND FLAG = 1`,
        { today: Number(today) },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const dataCount = Number(countResult.rows[0].CNT);
      const flag = dataCount > 0 ? 1 : 0;

      logger.info('CMP_MONTH_START detected', { closeDate, flag, dataCount, today });
      return { closeDate, flag };
    } catch (err) {
      logger.error('cmpMonthStartAdapter.getPendingTrigger failed', { today, error: err.message });
      throw err;
    } finally {
      if (conn) await conn.close();
    }
  }

  return { getPendingTrigger };
}
