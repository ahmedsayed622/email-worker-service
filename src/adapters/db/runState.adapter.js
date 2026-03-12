import oracledb from 'oracledb';
import logger from '../../shared/logger/logger.js';
import { normalizeError } from '../../shared/errors/normalizeError.js';

const UNIQUE_VIOLATION = 1;

export function createRunStateAdapter(maxRetryAttempts) {
  const pool = oracledb.getPool('emailWorker');

  function normalizeCounts(counts = {}) {
    return {
      total: Number(counts.total || 0),
      done: Number(counts.done || 0),
      failed: Number(counts.failed || 0),
      skipped: Number(counts.skipped || 0),
    };
  }

  function parseDetails(detailsStr) {
    if (!detailsStr) return {};
    try {
      return JSON.parse(detailsStr);
    } catch {
      return {};
    }
  }

  function buildTerminalDetails(oldDetails = {}, execution = {}, error = null) {
    const details = {
      attemptNo: Number(execution.attemptNo || oldDetails.attemptNo || 1),
      counts: normalizeCounts(execution.counts || oldDetails.counts || {}),
    };

    if (Array.isArray(execution.failedReports)) {
      details.failedReports = execution.failedReports;
    } else if (Array.isArray(oldDetails.failedReports) && oldDetails.failedReports.length > 0) {
      details.failedReports = oldDetails.failedReports;
    }

    if (error && (error.code || error.message || error.stack)) {
      details.error = {};
      if (error.code) details.error.code = error.code;
      if (error.message) details.error.message = String(error.message).substring(0, 4000);
      if (error.stack) details.error.stack = String(error.stack).substring(0, 4000);
    } else if (oldDetails.error) {
      details.error = oldDetails.error;
    }

    return details;
  }

  async function readExistingDetails(conn, closeDate, triggerType) {
    const existing = await conn.execute(
      `SELECT DETAILS
       FROM back_office.WORKER_EXECUTION
       WHERE CLOSE_DATE = :closeDate
         AND TRIGGER_TYPE = :triggerType`,
      { closeDate: Number(closeDate), triggerType },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!existing.rows || existing.rows.length === 0) return {};
    let detailsStr = existing.rows[0].DETAILS || null;
    if (detailsStr && typeof detailsStr === 'object' && detailsStr.constructor.name === 'Lob') {
      detailsStr = await detailsStr.getData();
    }
    return parseDetails(detailsStr);
  }

  async function markReady(closeDate, triggerType = 'LEGACY', context = {}) {
    let conn;
    try {
      conn = await pool.getConnection();
      const readyDetails = JSON.stringify({
        attemptNo: 1,
        counts: normalizeCounts(context.counts || {}),
      });

      await conn.execute(
        `MERGE INTO back_office.WORKER_EXECUTION t
         USING (SELECT :closeDate AS CLOSE_DATE, :triggerType AS TRIGGER_TYPE FROM DUAL) s
         ON (t.CLOSE_DATE = s.CLOSE_DATE AND t.TRIGGER_TYPE = s.TRIGGER_TYPE)
         WHEN MATCHED THEN UPDATE SET
           t.STATUS = 'READY',
           t.UPDATED_AT = SYSDATE,
           t.STARTED_AT = COALESCE(t.STARTED_AT, SYSDATE),
           t.DETAILS = CASE
             WHEN t.DETAILS IS NULL THEN TO_CLOB(:details)
             ELSE t.DETAILS
           END
         WHERE (t.STATUS IS NULL OR t.STATUS = 'READY')
         WHEN NOT MATCHED THEN INSERT
           (CLOSE_DATE, TRIGGER_TYPE, STATUS, DETAILS, STARTED_AT, UPDATED_AT)
         VALUES
           (:closeDate, :triggerType, 'READY', TO_CLOB(:details), SYSDATE, SYSDATE)`,
        { closeDate: Number(closeDate), triggerType, details: readyDetails }
      );
      await conn.commit();
      logger.info('Marked READY', { closeDate, triggerType });
    } catch (err) {
      if (conn) await conn.rollback();
      const appError = normalizeError(err, 'runState.markReady');
      logger.error('markReady() failed', { closeDate, triggerType, error: appError.message });
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
  }

  /**
   * Attempt to claim a close event for processing.
   * Uses composite key (CLOSE_DATE + TRIGGER_TYPE) for isolation.
   *
   * @param {string|number} closeDate - YYYYMMDD
   * @param {string} triggerType - e.g. 'OPS_CLOSE', 'FIN_CLOSE', 'CMP_CLOSE'
   * @returns {Promise<{proceed: boolean, mode: string, failedReports?: string[]}>}
   */
  async function claim(closeDate, triggerType = 'LEGACY') {
    let conn;
    try {
      conn = await pool.getConnection();

      // Check existing row for this (closeDate + triggerType) pair
      const existing = await conn.execute(
        `SELECT STATUS, DETAILS
         FROM back_office.WORKER_EXECUTION
         WHERE CLOSE_DATE = :closeDate
           AND TRIGGER_TYPE = :triggerType`,
        { closeDate: Number(closeDate), triggerType },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (existing.rows && existing.rows.length > 0) {
        const row = existing.rows[0];
        // Handle CLOB: Oracle returns CLOB as Lob object, need to read it
        let detailsStr = row.DETAILS;
        if (detailsStr && typeof detailsStr === 'object' && detailsStr.constructor.name === 'Lob') {
          detailsStr = await detailsStr.getData();
        }
        const details = detailsStr ? JSON.parse(detailsStr) : {};

        // Already DONE → skip
        if (row.STATUS === 'DONE') {
          logger.info('Already processed', { closeDate, triggerType, status: 'DONE' });
          return { proceed: false };
        }

        // RUNNING → check if stuck (crash recovery handled by recoverStuckRuns)
        if (row.STATUS === 'RUNNING') {
          logger.info('Already running', { closeDate, triggerType });
          return { proceed: false };
        }

        // PARTIAL or FAILED → reclaim for retry
        if (row.STATUS === 'PARTIAL' || row.STATUS === 'FAILED') {
          const attemptNo = (details.attemptNo || 1);
          if (attemptNo >= maxRetryAttempts) {
            logger.warn('Max retries reached', { closeDate, triggerType, attempts: attemptNo });
            return { proceed: false };
          }

          const newDetails = { ...details, attemptNo: attemptNo + 1 };
          await conn.execute(
            `UPDATE back_office.WORKER_EXECUTION
             SET STATUS = 'RUNNING', 
                 DETAILS = :details, 
                 UPDATED_AT = SYSDATE, 
                 FINISHED_AT = NULL,
                 ERROR_CODE = NULL,
                 ERROR_MSG = NULL
             WHERE CLOSE_DATE = :closeDate AND TRIGGER_TYPE = :triggerType`,
            { closeDate: Number(closeDate), triggerType, details: JSON.stringify(newDetails) }
          );
          await conn.commit();

          const failedReports = details.failedReports || [];
          logger.info('Reclaimed for retry', { closeDate, triggerType, attempt: attemptNo + 1 });
          return { proceed: true, mode: 'partial', failedReports };
        }

        if (row.STATUS === 'READY') {
          const newDetails = {
            ...details,
            attemptNo: Number(details.attemptNo || 1),
            counts: normalizeCounts(details.counts || {}),
          };
          await conn.execute(
            `UPDATE back_office.WORKER_EXECUTION
             SET STATUS = 'RUNNING',
                 DETAILS = :details,
                 UPDATED_AT = SYSDATE,
                 FINISHED_AT = NULL,
                 ERROR_CODE = NULL,
                 ERROR_MSG = NULL
             WHERE CLOSE_DATE = :closeDate AND TRIGGER_TYPE = :triggerType`,
            { closeDate: Number(closeDate), triggerType, details: JSON.stringify(newDetails) }
          );
          await conn.commit();
          logger.info('Claimed READY event for processing', { closeDate, triggerType, mode: 'full' });
          return { proceed: true, mode: 'full' };
        }

        const fallbackDetails = {
          ...details,
          attemptNo: Number(details.attemptNo || 1),
          counts: normalizeCounts(details.counts || {}),
        };
        await conn.execute(
          `UPDATE back_office.WORKER_EXECUTION
           SET STATUS = 'RUNNING',
               DETAILS = :details,
               UPDATED_AT = SYSDATE,
               FINISHED_AT = NULL,
               ERROR_CODE = NULL,
               ERROR_MSG = NULL
           WHERE CLOSE_DATE = :closeDate AND TRIGGER_TYPE = :triggerType`,
          { closeDate: Number(closeDate), triggerType, details: JSON.stringify(fallbackDetails) }
        );
        await conn.commit();
        logger.info('Claimed existing event for processing', { closeDate, triggerType, mode: 'full', status: row.STATUS });
        return { proceed: true, mode: 'full' };
      }

      // No existing record → INSERT new row (first run for this triggerType + closeDate)
      const initialDetails = JSON.stringify({
        attemptNo: 1,
        counts: normalizeCounts(),
      });
      await conn.execute(
        `INSERT INTO back_office.WORKER_EXECUTION
           (CLOSE_DATE, TRIGGER_TYPE, STATUS, DETAILS, STARTED_AT, UPDATED_AT)
         VALUES
           (:closeDate, :triggerType, 'RUNNING', :details, SYSDATE, SYSDATE)`,
        { closeDate: Number(closeDate), triggerType, details: initialDetails }
      );
      await conn.commit();

      logger.info('Claimed for processing', { closeDate, triggerType, mode: 'full' });
      return { proceed: true, mode: 'full' };

    } catch (err) {
      if (conn) {
        try {
          await conn.rollback();
        } catch (rbErr) {
          logger.warn('Rollback failed', { error: rbErr.message });
        }
      }
      // ORA-00001: unique constraint violation (race condition)
      if (err.errorNum === 1 || (err?.message || '').includes('ORA-00001')) {
        logger.info('Claim race: another instance claimed first', { closeDate, triggerType });
        return { proceed: false };
      }
      const appError = normalizeError(err, 'runState.claim');
      logger.error('Claim failed', { closeDate, triggerType, error: appError.message });
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
  }

  async function markDone(closeDate, triggerType = 'LEGACY', execution = {}) {
    let conn;
    try {
      conn = await pool.getConnection();
      const oldDetails = await readExistingDetails(conn, closeDate, triggerType);
      const details = buildTerminalDetails(oldDetails, execution);
      await conn.execute(
        `UPDATE back_office.WORKER_EXECUTION
         SET STATUS = 'DONE',
             DETAILS = :details,
             ERROR_CODE = NULL,
             ERROR_MSG = NULL,
             FINISHED_AT = SYSDATE,
             UPDATED_AT = SYSDATE
         WHERE CLOSE_DATE = :closeDate AND TRIGGER_TYPE = :triggerType`,
        { closeDate: Number(closeDate), triggerType, details: JSON.stringify(details) }
      );
      await conn.commit();
      logger.info('Marked DONE', { closeDate, triggerType });
    } catch (err) {
      if (conn) await conn.rollback();
      const appError = normalizeError(err, 'runState.markDone');
      logger.error('markDone() failed', { closeDate, triggerType, error: appError.message });
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
  }

  async function markFailed(closeDate, triggerType = 'LEGACY', errorCode = 'UNKNOWN', errorMsg = '', execution = {}) {
    let conn;
    try {
      conn = await pool.getConnection();
      const oldDetails = await readExistingDetails(conn, closeDate, triggerType);
      const details = buildTerminalDetails(oldDetails, execution, {
        code: errorCode,
        message: errorMsg,
        stack: execution?.error?.stack,
      });
      await conn.execute(
        `UPDATE back_office.WORKER_EXECUTION
         SET STATUS = 'FAILED',
             DETAILS = :details,
             ERROR_CODE = :errorCode,
             ERROR_MSG = :errorMsg,
             FINISHED_AT = SYSDATE,
             UPDATED_AT = SYSDATE
         WHERE CLOSE_DATE = :closeDate AND TRIGGER_TYPE = :triggerType`,
        {
          closeDate: Number(closeDate),
          triggerType,
          details: JSON.stringify(details),
          errorCode,
          errorMsg: String(errorMsg).substring(0, 4000)
        }
      );
      await conn.commit();
      logger.error('Marked FAILED', { closeDate, triggerType, errorCode });
    } catch (err) {
      if (conn) await conn.rollback();
      const appError = normalizeError(err, 'runState.markFailed');
      logger.error('markFailed() failed', { closeDate, triggerType, error: appError.message });
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
  }

  async function markPartial(closeDate, triggerType = 'LEGACY', execution = {}) {
    let conn;
    try {
      conn = await pool.getConnection();
      const payload = Array.isArray(execution) ? { failedReports: execution } : (execution || {});
      const oldDetails = await readExistingDetails(conn, closeDate, triggerType);
      const newDetails = buildTerminalDetails(oldDetails, payload);

      await conn.execute(
        `UPDATE back_office.WORKER_EXECUTION
         SET STATUS = 'PARTIAL',
             DETAILS = :details,
             UPDATED_AT = SYSDATE
         WHERE CLOSE_DATE = :closeDate AND TRIGGER_TYPE = :triggerType`,
        {
          closeDate: Number(closeDate),
          triggerType,
          details: JSON.stringify(newDetails)
        }
      );
      await conn.commit();
      logger.warn('Marked PARTIAL', {
        closeDate,
        triggerType,
        failedCount: (newDetails.failedReports || []).length,
      });
    } catch (err) {
      if (conn) await conn.rollback();
      const appError = normalizeError(err, 'runState.markPartial');
      logger.error('markPartial() failed', { closeDate, triggerType, error: appError.message });
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
  }

  async function getFailedReports(closeDate, triggerType = 'LEGACY') {
    let conn;
    try {
      conn = await pool.getConnection();
      // Read DETAILS JSON for failed reports
      const result = await conn.execute(
        `SELECT DETAILS FROM back_office.WORKER_EXECUTION
         WHERE CLOSE_DATE = :closeDate AND TRIGGER_TYPE = :triggerType`,
        { closeDate: Number(closeDate), triggerType },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (result.rows && result.rows[0]?.DETAILS) {
        let detailsStr = result.rows[0].DETAILS;
        if (detailsStr && typeof detailsStr === 'object' && detailsStr.constructor.name === 'Lob') {
          detailsStr = await detailsStr.getData();
        }
        const details = JSON.parse(detailsStr);
        return details.failedReports || [];
      }

      return [];
    } catch (err) {
      const appError = normalizeError(err, 'runState.getFailedReports');
      logger.error('getFailedReports() failed', { closeDate, triggerType, error: appError.message });
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
  }

  /**
   * Recover runs left in RUNNING status (crash recovery).
   * Recovers all stuck runs regardless of trigger type.
   */
  async function recoverStuckRuns(staleTimeoutMin = 30) {
    let conn;
    try {
      conn = await pool.getConnection();
      const result = await conn.execute(
        `UPDATE back_office.WORKER_EXECUTION
         SET STATUS = 'FAILED',
             ERROR_CODE = 'CRASH_RECOVERY',
             ERROR_MSG = 'Recovered from stuck RUNNING state',
             FINISHED_AT = SYSDATE,
             UPDATED_AT = SYSDATE
         WHERE STATUS = 'RUNNING'
           AND UPDATED_AT < SYSDATE - (:staleMin / 1440)`,
        { staleMin: staleTimeoutMin }
      );
      await conn.commit();

      if (result.rowsAffected > 0) {
        logger.warn('Recovered stuck runs', { count: result.rowsAffected, staleTimeoutMin });
      }
      return result.rowsAffected || 0;
    } catch (err) {
      if (conn) await conn.rollback();
      const appError = normalizeError(err, 'runState.recoverStuckRuns');
      logger.error('recoverStuckRuns() failed', { error: appError.message });
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
  }

  return {
    markReady,
    claim,
    markDone,
    markFailed,
    markPartial,
    getFailedReports,
    recoverStuckRuns,
  };
}
