import oracledb from 'oracledb';
import logger from '../../shared/logger/logger.js';
import { normalizeError } from '../../shared/errors/normalizeError.js';

const MERGE_SQL = `
MERGE INTO back_office.WORKER_REPORT_LOG t
USING (SELECT :closeDate AS CLOSE_DATE, :reportId AS REPORT_ID FROM DUAL) s
ON (t.CLOSE_DATE = s.CLOSE_DATE AND t.REPORT_ID = s.REPORT_ID)
WHEN MATCHED THEN UPDATE SET
  STATUS = :status,
  ROW_COUNT = :rowCount,
  FILE_PATH = :filePath,
  ERROR_CODE = :errorCode,
  ERROR_MSG = :errorMsg,
  RETRYABLE = :retryable,
  ATTEMPT_NO = :attemptNo,
  FINISHED_AT = SYSTIMESTAMP
WHEN NOT MATCHED THEN INSERT
  (CLOSE_DATE, REPORT_ID, DOMAIN, STATUS, ROW_COUNT, FILE_PATH,
   ERROR_CODE, ERROR_MSG, RETRYABLE, ATTEMPT_NO)
VALUES
  (:closeDate, :reportId, :domain, :status, :rowCount, :filePath,
   :errorCode, :errorMsg, :retryable, :attemptNo)
`;

export function createAuditAdapter() {
  return {
    async log(closeDate, reportId, status, details = {}) {
      let conn;
      try {
        const errorMsg = details.errorMsg ? String(details.errorMsg).slice(0, 2000) : null;
        const binds = {
          closeDate,
          reportId,
          status,
          domain: details.domain ?? null,
          rowCount: details.rowCount ?? null,
          filePath: details.filePath ?? null,
          errorCode: details.errorCode ?? null,
          errorMsg,
          retryable: details.retryable ?? 'N',
          attemptNo: details.attemptNo ?? 1,
        };

        conn = await oracledb.getPool('emailWorker').getConnection();
        await conn.execute(MERGE_SQL, binds);
        logger.info('Audit log upserted', { closeDate, reportId, status });
      } catch (err) {
        const appError = normalizeError(err, 'audit');
        logger.error('Audit log failed', { closeDate, reportId, error: appError.message });
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
