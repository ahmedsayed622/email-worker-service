/**
 * @typedef {Object} AuditPort
 * @property {function(string, string, string, Object): Promise<void>} log
 *   Logs a report execution result to WORKER_REPORT_LOG.
 *   Uses MERGE (upsert) on CLOSE_DATE + REPORT_ID for retry updates.
 *
 *   @param {string} closeDate - YYYYMMDD
 *   @param {string} reportId - e.g. 'fin-daily-trading'
 *   @param {string} status - 'DONE' | 'FAILED' | 'SKIPPED'
 *   @param {Object} details
 *   @param {string} [details.domain] - 'finance', 'compliance', etc.
 *   @param {string} [details.errorCode] - AppError.code
 *   @param {string} [details.errorMsg] - AppError.message (truncated to 2000 chars)
 *   @param {string} [details.retryable] - 'Y' or 'N'
 *   @param {number} [details.attemptNo] - current attempt number
 *   @param {number} [details.rowCount] - number of data rows
 *   @param {string} [details.filePath] - generated file path
 */
