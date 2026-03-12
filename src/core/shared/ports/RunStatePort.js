/**
 * @typedef {Object} ClaimResult
 * @property {boolean} proceed - true if this poll tick should process reports
 * @property {'full'|'partial'|null} mode - 'full' = new day or retry-all, 'partial' = retry failed only
 * @property {Array} failedReports - list of report IDs to retry (only when mode='partial')
 */

/**
 * @typedef {Object} RunStatePort
 * @property {function(string): Promise<ClaimResult>} claim
 *   Attempts to claim a close date for processing.
 *   - No row exists → INSERT with STATUS='RUNNING' → { proceed: true, mode: 'full' }
 *   - STATUS='DONE' → { proceed: false }
 *   - STATUS='RUNNING' → { proceed: false } (already being processed)
 *   - STATUS='FAILED' → UPDATE to RUNNING → { proceed: true, mode: 'full' }
 *   - STATUS='PARTIAL' → get failed retryable reports → { proceed: true, mode: 'partial', failedReports }
 *
 * @property {function(string): Promise<void>} markDone
 *   Sets STATUS='DONE', FINISHED_AT=SYSTIMESTAMP, DETAILS=JSON summary
 *
 * @property {function(string, string?, string?): Promise<void>} markFailed
 *   Sets STATUS='FAILED', ERROR_CODE, ERROR_MSG, FINISHED_AT
 *
 * @property {function(string, object?): Promise<void>} markPartial
 *   Sets STATUS='PARTIAL', DETAILS=JSON summary, UPDATED_AT
 *
 * @property {function(string, number): Promise<Array>} getFailedReports
 *   Returns failed retryable reports: WHERE CLOSE_DATE=:date AND STATUS='FAILED'
 *   AND RETRYABLE='Y' AND ATTEMPT_NO < :maxAttempts
 *
 * @property {function(number): Promise<void>} recoverStuckRuns
 *   Finds RUNNING entries older than staleMinutes.
 *   - If WORKER_REPORT_LOG has some DONE rows → markPartial
 *   - If WORKER_REPORT_LOG has no rows → markFailed
 */
