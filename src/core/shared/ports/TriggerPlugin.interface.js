/**
 * Trigger Plugin Interface
 * 
 * Every trigger plugin must implement this contract.
 * A trigger plugin is responsible for:
 * - Polling its data source for ready events
 * - Claiming events to prevent duplicate processing
 * - Marking events as done or failed
 * 
 * @module TriggerPlugin.interface
 */

/**
 * Represents a trigger event ready for processing
 * 
 * @typedef {Object} TriggerEvent
 * @property {string} triggerType - Matches report.triggerType (e.g. 'FIN_CLOSE', 'OPS_CLOSE', 'CMP_CLOSE')
 * @property {string} triggerId - Unique identifier from source (e.g. closeDate string '20260216')
 * @property {number} close_date - YYYYMMDD as NUMBER (e.g. 20260216)
 * @property {Object} [meta] - Optional additional data (source table, domain info, etc.)
 */

/**
 * Trigger Plugin Contract
 * 
 * @typedef {Object} TriggerPlugin
 * 
 * @property {string} type
 *   - Unique trigger type identifier (e.g. 'FIN_CLOSE', 'OPS_CLOSE', 'CMP_CLOSE')
 *   - Must match report.triggerType in report configs
 * 
 * @property {() => Promise<TriggerEvent[]>} poll
 *   - Polls the data source for ready events
 *   - Returns array of TriggerEvent (empty array if nothing ready)
 *   - Should NOT throw on transient errors (log + return [])
 * 
 * @property {(triggerId: string) => Promise<ClaimResult>} claim
 *   - Attempts to claim an event for processing
 *   - Returns: { proceed: boolean, mode: 'full'|'partial', failedReports?: string[] }
 *   - If !proceed, the event is already processed or being processed
 * 
 * @property {(triggerId: string) => Promise<void>} markDone
 *   - Marks event as successfully completed
 *   - Prevents future reclaim attempts
 * 
 * @property {(triggerId: string, errorCode: string, errorMessage: string) => Promise<void>} markFailed
 *   - Marks event as failed
 *   - May allow retry depending on retry count
 */

/**
 * Result of claim operation
 * 
 * @typedef {Object} ClaimResult
 * @property {boolean} proceed - Whether to proceed with processing
 * @property {string} mode - 'full' (process all reports) | 'partial' (retry failed reports only)
 * @property {string[]} [failedReports] - Report IDs to retry (only in partial mode)
 */

export {};
