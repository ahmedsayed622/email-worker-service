/**
 * Trigger Port
 * 
 * Abstract interface for trigger operations.
 * Replaces the combination of DayClosePort + RunStatePort with a generic trigger interface.
 * 
 * This port is implemented by trigger plugins in core/shared/triggers/plugins/
 * 
 * @module TriggerPort
 */

/**
 * Trigger Port Interface
 * 
 * @typedef {Object} TriggerPort
 * 
 * @property {() => Promise<import('../triggers/TriggerPlugin.interface.js').TriggerEvent[]>} poll
 *   - Poll for ready events from the trigger source
 * 
 * @property {(triggerId: string) => Promise<import('../triggers/TriggerPlugin.interface.js').ClaimResult>} claim
 *   - Claim an event for processing
 * 
 * @property {(triggerId: string) => Promise<void>} markDone
 *   - Mark event as successfully processed
 * 
 * @property {(triggerId: string, errorCode: string, errorMessage: string) => Promise<void>} markFailed
 *   - Mark event as failed
 */

/**
 * Note: This port replaces DayClosePort and RunStatePort.
 * The old ports are kept for backward compatibility but should be considered deprecated.
 * 
 * Migration path:
 * - Old: dayClosePort.getTodayCloseDateIfClosed() + runStatePort.claim()
 * - New: triggerPlugin.poll() + triggerPlugin.claim()
 */

export {};
